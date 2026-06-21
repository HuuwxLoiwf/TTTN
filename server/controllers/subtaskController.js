import prisma from "../configs/prisma.js";

export const getSubtasks = async (req, res) => {
    try {
        const { taskId } = req.params;
        const subtasks = await prisma.subtask.findMany({
            where: { taskId },
            orderBy: { createdAt: "asc" },
        });
        res.json(subtasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createSubtask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { title } = req.body;
        if (!title?.trim()) return res.status(400).json({ error: "Nội dung không được để trống" });

        const subtask = await prisma.subtask.create({
            data: { taskId, title: title.trim() },
        });
        res.status(201).json(subtask);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateSubtask = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, done } = req.body;
        const subtask = await prisma.subtask.update({
            where: { id },
            data: {
                ...(title !== undefined && { title }),
                ...(done !== undefined && { done }),
            },
        });
        res.json(subtask);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteSubtask = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.subtask.delete({ where: { id } });
        res.json({ message: "Đã xóa" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
