import prisma from "../configs/prisma.js";
import { emitToProject } from "../socket.js";
import { notifyMentions, notifyUser } from "../utils/notify.js";

// Lấy lịch sử chat nhóm dự án, phân trang theo cursor.
// ?before=<ISO date> để lấy 30 tin cũ hơn mốc đó (cuộn lên).
// Trả về { messages: [cũ→mới], hasMore } để client biết còn tin cũ không.
const PAGE_SIZE = 30;
export const getMessages = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { before } = req.query;

        const messages = await prisma.projectMessage.findMany({
            where: {
                projectId,
                ...(before ? { createdAt: { lt: new Date(before) } } : {}),
            },
            include: { user: { select: { id: true, name: true, email: true, image: true } } },
            orderBy: { createdAt: "desc" }, // lấy mới nhất trước rồi đảo lại
            take: PAGE_SIZE + 1, // +1 để biết còn tin cũ hơn không
        });

        const hasMore = messages.length > PAGE_SIZE;
        const page = hasMore ? messages.slice(0, PAGE_SIZE) : messages;
        res.json({ messages: page.reverse(), hasMore }); // đảo về thứ tự cũ→mới
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Gửi tin nhắn nhóm
export const sendMessage = async (req, res) => {
    try {
        const userId = req.auth?.userId;
        if (!userId) return res.status(401).json({ error: "Chưa đăng nhập" });

        const { projectId } = req.params;
        const { content, fileUrl, fileName } = req.body;
        if (!content?.trim() && !fileUrl) {
            return res.status(400).json({ error: "Nội dung không được để trống" });
        }

        const message = await prisma.projectMessage.create({
            data: {
                projectId,
                userId,
                content: content?.trim() || "",
                fileUrl: fileUrl || null,
                fileName: fileName || null,
            },
            include: { user: { select: { id: true, name: true, email: true, image: true } } },
        });

        emitToProject(projectId, "projectMessage:new", message);

        // Thông báo cho TẤT CẢ thành viên dự án (trừ người gửi) về tin nhắn mới.
        const [project, members] = await Promise.all([
            prisma.project.findUnique({ where: { id: projectId }, select: { name: true, team_lead: true } }),
            prisma.projectMember.findMany({ where: { projectId }, select: { userId: true } }),
        ]);
        const senderName = message.user?.name || message.user?.email || "Thành viên";
        const preview = content?.trim() ? content.trim().slice(0, 60) : "đã gửi một tệp đính kèm";
        const recipients = new Set(members.map((m) => m.userId));
        if (project?.team_lead) recipients.add(project.team_lead); // đảm bảo cả trưởng dự án
        recipients.delete(userId);
        for (const rid of recipients) {
            notifyUser({
                userId: rid,
                actorId: userId,
                title: `Tin nhắn mới trong ${project?.name || "dự án"}`,
                message: `${senderName}: ${preview}`,
            });
        }

        if (content?.trim()) {
            notifyMentions({ content, projectId, actorId: userId, contextLabel: "thảo luận nhóm dự án" });
        }

        res.status(201).json(message);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
