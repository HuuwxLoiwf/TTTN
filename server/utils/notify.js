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
