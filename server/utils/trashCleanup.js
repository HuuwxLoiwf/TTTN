import prisma from "../configs/prisma.js";

// Mục trong thùng rác quá số ngày này sẽ bị xóa vĩnh viễn tự động.
const RETENTION_DAYS = 30;

export const purgeExpiredTrash = async () => {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    // Xóa project trước (cascade kéo theo task của nó); task lẻ trong dự án còn sống xóa riêng.
    const projects = await prisma.project.deleteMany({ where: { deletedAt: { lt: cutoff } } });
    const tasks = await prisma.task.deleteMany({ where: { deletedAt: { lt: cutoff } } });
    if (projects.count || tasks.count) {
        console.log(`[trash] Đã dọn thùng rác quá ${RETENTION_DAYS} ngày: ${projects.count} dự án, ${tasks.count} công việc`);
    }
    return { projects: projects.count, tasks: tasks.count };
};

// Chạy 1 lần lúc khởi động rồi lặp lại mỗi 24h.
export const startTrashCleanup = () => {
    purgeExpiredTrash().catch((e) => console.error("[trash] cleanup failed:", e.message));
    setInterval(
        () => purgeExpiredTrash().catch((e) => console.error("[trash] cleanup failed:", e.message)),
        24 * 60 * 60 * 1000,
    );
};
