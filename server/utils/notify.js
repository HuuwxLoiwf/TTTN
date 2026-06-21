import prisma from "../configs/prisma.js";
import { emitToUser, emitToWorkspace } from "../socket.js";

/**
 * Create an in-app notification for a user and push it in real time.
 * Silently skips if userId is falsy or equals the actor (don't notify yourself).
 */
export const notifyUser = async ({ userId, actorId, title, message }) => {
    try {
        if (!userId || userId === actorId) return null;
        const notification = await prisma.notification.create({
            data: { userId, title, message },
        });
        emitToUser(userId, "notification:new", notification);
        return notification;
    } catch (err) {
        console.error("[notify] notifyUser failed:", err.message);
        return null;
    }
};

/**
 * Write an activity log entry for a workspace.
 * Accepts either a workspaceId directly or a projectId to resolve it from.
 */
/**
 * Ghi audit log chi tiết (ai làm gì, thay đổi gì). Resolve workspaceId từ projectId nếu cần.
 */
export const logAudit = async ({ workspaceId, projectId, userId, action, entityType, entityId, entityName, changes }) => {
    try {
        let wsId = workspaceId;
        if (!wsId && projectId) {
            const project = await prisma.project.findUnique({
                where: { id: projectId },
                select: { workspaceId: true },
            });
            wsId = project?.workspaceId;
        }
        if (!wsId || !userId) return null;
        return await prisma.auditLog.create({
            data: { workspaceId: wsId, userId, action, entityType, entityId, entityName: entityName || null, changes: changes || undefined },
        });
    } catch (err) {
        console.error("[notify] logAudit failed:", err.message);
        return null;
    }
};

/**
 * Phát hiện @mention trong nội dung (dạng @email) và thông báo cho người được nhắc.
 * Chỉ notify người là thành viên của dự án. Bỏ qua chính người gửi.
 */
export const notifyMentions = async ({ content, projectId, actorId, contextLabel }) => {
    try {
        if (!content || !projectId) return;
        // Bắt các chuỗi @something (email hoặc tên không dấu cách)
        const matches = content.match(/@([^\s@]+@[^\s@]+\.[^\s@]+|\S+)/g);
        if (!matches) return;
        const handles = matches.map((m) => m.slice(1).toLowerCase());

        const members = await prisma.projectMember.findMany({
            where: { projectId },
            include: { user: { select: { id: true, email: true, name: true } } },
        });

        const mentioned = members.filter((m) => {
            const email = m.user.email?.toLowerCase() || "";
            const nameKey = (m.user.name || "").toLowerCase().replace(/\s+/g, "");
            return handles.some((h) => email === h || email.split("@")[0] === h || nameKey === h);
        });

        for (const m of mentioned) {
            await notifyUser({
                userId: m.user.id,
                actorId,
                title: "Bạn được nhắc đến",
                message: `Bạn được nhắc trong ${contextLabel || "một bình luận"}`,
            });
        }
    } catch (err) {
        console.error("[notify] notifyMentions failed:", err.message);
    }
};

export const logActivity = async ({ workspaceId, projectId, userId, action, entityType, entityId }) => {
    try {
        let wsId = workspaceId;
        if (!wsId && projectId) {
            const project = await prisma.project.findUnique({
                where: { id: projectId },
                select: { workspaceId: true },
            });
            wsId = project?.workspaceId;
        }
        if (!wsId || !userId) return null;
        const activity = await prisma.activity.create({
            data: { workspaceId: wsId, userId, action, entityType, entityId },
            include: { user: true },
        });
        emitToWorkspace(wsId, "activity:new", activity);
        return activity;
    } catch (err) {
        console.error("[notify] logActivity failed:", err.message);
        return null;
    }
};
