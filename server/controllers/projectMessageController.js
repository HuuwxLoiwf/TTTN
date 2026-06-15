import prisma from "../configs/prisma.js";
import { emitToProject } from "../socket.js";

// Lấy lịch sử chat nhóm dự án (mới nhất ở cuối)
export const getMessages = async (req, res) => {
    try {
        const { projectId } = req.params;
        const messages = await prisma.projectMessage.findMany({
            where: { projectId },
            include: { user: { select: { id: true, name: true, email: true, image: true } } },
            orderBy: { createdAt: "asc" },
            take: 200,
        });
        res.json(messages);
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
        const { content } = req.body;
        if (!content?.trim()) return res.status(400).json({ error: "Nội dung không được để trống" });

        const message = await prisma.projectMessage.create({
            data: { projectId, userId, content: content.trim() },
            include: { user: { select: { id: true, name: true, email: true, image: true } } },
        });

        emitToProject(projectId, "projectMessage:new", message);
        res.status(201).json(message);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
