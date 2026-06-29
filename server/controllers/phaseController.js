import prisma from "../configs/prisma.js";

// Danh sách giai đoạn của dự án (kèm tiến độ tính từ task)
export const getPhases = async (req, res) => {
    try {
        const { projectId } = req.params;
        const phases = await prisma.phase.findMany({
            where: { projectId },
            include: { tasks: { select: { id: true, status: true } } },
            orderBy: { order: "asc" },
        });
        const result = phases.map((p) => {
            const total = p.tasks.length;
            const done = p.tasks.filter((t) => t.status === "DONE").length;
            return {
                id: p.id,
                name: p.name,
                description: p.description,
                order: p.order,
                projectId: p.projectId,
                totalTasks: total,
                doneTasks: done,
                progress: total === 0 ? 0 : Math.round((done / total) * 100),
            };
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createPhase = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { name, description } = req.body;
        if (!name?.trim()) return res.status(400).json({ error: "Tên giai đoạn là bắt buộc" });

        const count = await prisma.phase.count({ where: { projectId } });
        const phase = await prisma.phase.create({
            data: { projectId, name: name.trim(), description: description || null, order: count },
        });
        res.status(201).json({ ...phase, totalTasks: 0, doneTasks: 0, progress: 0 });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updatePhase = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const phase = await prisma.phase.update({
            where: { id },
            data: {
                ...(name !== undefined && { name: name.trim() }),
                ...(description !== undefined && { description }),
            },
        });
        res.json(phase);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deletePhase = async (req, res) => {
    try {
        const { id } = req.params;
        // Task thuộc giai đoạn này sẽ tự gỡ phaseId (onDelete: SetNull)
        await prisma.phase.delete({ where: { id } });
        res.json({ message: "Đã xóa giai đoạn" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
