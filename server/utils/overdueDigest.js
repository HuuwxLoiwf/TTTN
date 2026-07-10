import prisma from "../configs/prisma.js";
import { notifyUser } from "./notify.js";
import { sendWorkspaceWebhook } from "./webhook.js";

/**
 * AUTOMATION: NHẮC VIỆC QUÁ HẠN HẰNG NGÀY
 * Với các workspace bật settings.automations.dailyOverdueDigest:
 *  - Thông báo cho từng người có việc quá hạn (gom 1 thông báo/ngày, chống trùng 20h)
 *  - Bắn webhook tổng hợp (nếu có cấu hình)
 * Chạy 1 lần lúc khởi động + lặp mỗi 24h.
 */

const DEDUP_TITLE = "Nhắc việc quá hạn hằng ngày";

export const overdueDigestTick = async () => {
    const workspaces = await prisma.workspace.findMany({
        select: { id: true, name: true, settings: true },
    });

    let notified = 0;
    for (const ws of workspaces) {
        const auto = ws.settings && typeof ws.settings === "object" ? ws.settings.automations : null;
        if (!auto?.dailyOverdueDigest) continue;

        const overdue = await prisma.task.findMany({
            where: {
                deletedAt: null,
                status: { not: "DONE" },
                due_date: { lt: new Date() },
                project: { workspaceId: ws.id, deletedAt: null },
            },
            select: {
                id: true, title: true, due_date: true, assigneeId: true,
                project: { select: { name: true } },
            },
        });
        if (overdue.length === 0) continue;

        // Gom theo người được giao
        const byUser = new Map();
        for (const t of overdue) {
            if (!t.assigneeId) continue;
            const list = byUser.get(t.assigneeId) || [];
            list.push(t);
            byUser.set(t.assigneeId, list);
        }

        const cutoff = new Date(Date.now() - 20 * 60 * 60 * 1000); // chống trùng trong ngày
        for (const [userId, tasks] of byUser) {
            const existed = await prisma.notification.findFirst({
                where: { userId, title: DEDUP_TITLE, createdAt: { gt: cutoff } },
                select: { id: true },
            });
            if (existed) continue;
            const names = tasks.slice(0, 3).map((t) => `"${t.title}"`).join(", ");
            const more = tasks.length > 3 ? ` và ${tasks.length - 3} việc khác` : "";
            await notifyUser({
                userId,
                title: DEDUP_TITLE,
                message: `Bạn có ${tasks.length} công việc quá hạn: ${names}${more}. Vui lòng xử lý sớm.`,
            });
            notified++;
        }

        // Webhook tổng hợp cho cả nhóm
        sendWorkspaceWebhook(
            ws.id,
            `⏰ [${ws.name}] Có ${overdue.length} công việc QUÁ HẠN chưa xử lý. Vào hệ thống để xem chi tiết.`,
        );
    }
    if (notified) console.log(`[overdueDigest] Đã nhắc ${notified} người có việc quá hạn`);
    return notified;
};

export const startOverdueDigest = () => {
    overdueDigestTick().catch((e) => console.error("[overdueDigest] failed:", e.message));
    setInterval(
        () => overdueDigestTick().catch((e) => console.error("[overdueDigest] failed:", e.message)),
        24 * 60 * 60 * 1000,
    );
};
