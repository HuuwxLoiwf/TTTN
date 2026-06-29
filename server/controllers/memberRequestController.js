import prisma from "../configs/prisma.js";
import { notifyUser, logActivity } from "../utils/notify.js";

/**
 * Kiểm tra user có phải ADMIN workspace của dự án không.
 */
const isWorkspaceAdmin = async (userId, projectId) => {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { workspaceId: true, team_lead: true },
    });
    if (!project) return { ok: false, project: null };
    const membership = await prisma.workspaceMember.findUnique({
        where: { userId_workspaceId: { userId, workspaceId: project.workspaceId } },
        select: { role: true },
    });
    // Trưởng dự án cũng có quyền duyệt
    const ok = membership?.role === "ADMIN" || project.team_lead === userId;
    return { ok, project };
};

// Danh sách yêu cầu tham gia của 1 dự án (cho admin xem)
export const getRequests = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { status } = req.query;
        const requests = await prisma.projectMemberRequest.findMany({
            where: { projectId, ...(status ? { status } : {}) },
            include: { user: { select: { id: true, name: true, email: true, image: true } } },
            orderBy: { createdAt: "desc" },
        });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Tạo yêu cầu thêm thành viên (chờ admin duyệt)
export const createRequest = async (req, res) => {
    try {
        const userId = req.auth?.userId;
        if (!userId) return res.status(401).json({ error: "Chưa đăng nhập" });

        const { projectId } = req.params;
        const { email } = req.body;

        const target = await prisma.user.findUnique({ where: { email } });
        if (!target) return res.status(404).json({ error: "Không tìm thấy người dùng với email này" });

        // Đã là thành viên rồi?
        const existingMember = await prisma.projectMember.findUnique({
            where: { userId_projectId: { userId: target.id, projectId } },
        });
        if (existingMember) return res.status(400).json({ error: "Người này đã là thành viên dự án" });

        // Đã có yêu cầu PENDING?
        const existingReq = await prisma.projectMemberRequest.findFirst({
            where: { projectId, userId: target.id, status: "PENDING" },
        });
        if (existingReq) return res.status(400).json({ error: "Đã có yêu cầu đang chờ duyệt cho người này" });

        const request = await prisma.projectMemberRequest.create({
            data: { projectId, userId: target.id, requestedBy: userId, status: "PENDING" },
            include: { user: { select: { id: true, name: true, email: true, image: true } } },
        });

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { name: true, team_lead: true, workspaceId: true },
        });

        // Thông báo cho trưởng dự án + các ADMIN workspace
        const admins = await prisma.workspaceMember.findMany({
            where: { workspaceId: project.workspaceId, role: "ADMIN" },
            select: { userId: true },
        });
        const recipientIds = new Set([project.team_lead, ...admins.map((a) => a.userId)]);
        recipientIds.delete(userId);
        for (const rid of recipientIds) {
            notifyUser({
                userId: rid,
                actorId: userId,
                title: "Yêu cầu thêm thành viên",
                message: `Có yêu cầu thêm ${target.name || target.email} vào dự án ${project.name}`,
            });
        }

        res.status(201).json(request);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Duyệt yêu cầu → tạo thành viên thật
export const approveRequest = async (req, res) => {
    try {
        const userId = req.auth?.userId;
        const { id } = req.params;

        const request = await prisma.projectMemberRequest.findUnique({ where: { id } });
        if (!request) return res.status(404).json({ error: "Yêu cầu không tồn tại" });
        if (request.status !== "PENDING") return res.status(400).json({ error: "Yêu cầu đã được xử lý" });

        const { ok, project } = await isWorkspaceAdmin(userId, request.projectId);
        if (!ok) return res.status(403).json({ error: "Chỉ quản trị viên hoặc trưởng dự án mới được duyệt" });

        // Người được duyệt phải còn là thành viên workspace
        const inWorkspace = await prisma.workspaceMember.findUnique({
            where: { userId_workspaceId: { userId: request.userId, workspaceId: project.workspaceId } },
        });
        if (!inWorkspace) {
            return res.status(400).json({ error: "Người này không còn thuộc không gian làm việc" });
        }

        // Tạo thành viên (bỏ qua nếu đã có)
        await prisma.projectMember.upsert({
            where: { userId_projectId: { userId: request.userId, projectId: request.projectId } },
            update: {},
            create: { userId: request.userId, projectId: request.projectId },
        });
        await prisma.projectMemberRequest.update({
            where: { id },
            data: { status: "APPROVED" },
        });

        notifyUser({
            userId: request.userId,
            actorId: userId,
            title: "Yêu cầu được chấp nhận",
            message: `Bạn đã được thêm vào dự án ${project?.name || ""}`.trim(),
        });
        logActivity({
            workspaceId: project?.workspaceId,
            userId,
            action: `đã duyệt thành viên mới vào dự án ${project?.name || ""}`.trim(),
            entityType: "PROJECT",
            entityId: request.projectId,
        });

        res.json({ message: "Đã duyệt yêu cầu" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Từ chối yêu cầu (kèm ghi chú)
export const rejectRequest = async (req, res) => {
    try {
        const userId = req.auth?.userId;
        const { id } = req.params;
        const { note } = req.body;

        const request = await prisma.projectMemberRequest.findUnique({ where: { id } });
        if (!request) return res.status(404).json({ error: "Yêu cầu không tồn tại" });
        if (request.status !== "PENDING") return res.status(400).json({ error: "Yêu cầu đã được xử lý" });

        const { ok, project } = await isWorkspaceAdmin(userId, request.projectId);
        if (!ok) return res.status(403).json({ error: "Chỉ quản trị viên hoặc trưởng dự án mới được từ chối" });

        await prisma.projectMemberRequest.update({
            where: { id },
            data: { status: "REJECTED", note: note || null },
        });

        notifyUser({
            userId: request.userId,
            actorId: userId,
            title: "Yêu cầu bị từ chối",
            message: `Yêu cầu vào dự án ${project?.name || ""} bị từ chối${note ? `: ${note}` : ""}`.trim(),
        });

        res.json({ message: "Đã từ chối yêu cầu" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
