import prisma from "../configs/prisma.js";
import { logAudit } from "../utils/notify.js";

// Danh sách mục trong thùng rác của 1 workspace (project + task đã soft-delete).
// Quyền: ADMIN/MANAGER (requireMember role ở route).
export const getTrash = async (req, res) => {
    try {
        const { workspaceId } = req.params;

        const [projects, tasks] = await Promise.all([
            prisma.project.findMany({
                where: { workspaceId, deletedAt: { not: null } },
                select: { id: true, name: true, deletedAt: true, department: { select: { name: true } } },
                orderBy: { deletedAt: "desc" },
            }),
            prisma.task.findMany({
                where: { deletedAt: { not: null }, project: { workspaceId } },
                select: {
                    id: true, title: true, status: true, deletedAt: true,
                    project: { select: { id: true, name: true, deletedAt: true } },
                },
                orderBy: { deletedAt: "desc" },
            }),
        ]);

        res.json({
            projects,
            // Bỏ task thuộc project cũng đã bị xóa (sẽ khôi phục theo project)
            tasks: tasks.filter((t) => !t.project?.deletedAt),
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Khôi phục project
export const restoreProject = async (req, res) => {
    try {
        const { id } = req.params;
        const project = await prisma.project.update({
            where: { id },
            data: { deletedAt: null },
            select: { name: true, workspaceId: true },
        });
        logAudit({
            workspaceId: project.workspaceId,
            userId: req.auth?.userId,
            action: "RESTORE",
            entityType: "PROJECT",
            entityId: id,
            entityName: project.name,
        });
        res.json({ message: "Đã khôi phục dự án" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Xóa hẳn project (không thể hoàn tác)
export const purgeProject = async (req, res) => {
    try {
        const { id } = req.params;
        const project = await prisma.project.findUnique({ where: { id }, select: { name: true, workspaceId: true } });
        await prisma.project.delete({ where: { id } });
        if (project) {
            logAudit({
                workspaceId: project.workspaceId,
                userId: req.auth?.userId,
                action: "PURGE",
                entityType: "PROJECT",
                entityId: id,
                entityName: project.name,
            });
        }
        res.json({ message: "Đã xóa vĩnh viễn dự án" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Khôi phục task
export const restoreTask = async (req, res) => {
    try {
        const { id } = req.params;
        const task = await prisma.task.update({
            where: { id },
            data: { deletedAt: null },
            select: { projectId: true },
        });
        res.json({ message: "Đã khôi phục công việc", projectId: task.projectId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Xóa hẳn task
export const purgeTask = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.task.delete({ where: { id } });
        res.json({ message: "Đã xóa vĩnh viễn công việc" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
