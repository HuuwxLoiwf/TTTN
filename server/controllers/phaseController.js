import prisma from "../configs/prisma.js";
import { userRelation } from "../utils/safeSelect.js";

// Kiểm tra khoảng thời gian hợp lệ (nếu có đủ 2 mốc)
const validateDates = (startDate, endDate) => {
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
        return "Ngày kết thúc giai đoạn phải sau ngày bắt đầu";
    }
    return null;
};

// Danh sách giai đoạn của dự án (kèm tiến độ tính từ task + người phụ trách + file đã nộp)
export const getPhases = async (req, res) => {
    try {
        const { projectId } = req.params;
        const phases = await prisma.phase.findMany({
            where: { projectId },
            include: {
                tasks: { where: { deletedAt: null }, select: { id: true, status: true } },
                assignee: userRelation,
                files: {
                    include: { uploader: { select: { id: true, name: true, email: true } } },
                    orderBy: { createdAt: "desc" },
                },
            },
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
                startDate: p.startDate,
                endDate: p.endDate,
                assignee: p.assignee,
                files: p.files,
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
        const { name, description, startDate, endDate, assigneeId } = req.body;
        if (!name?.trim()) return res.status(400).json({ error: "Tên giai đoạn là bắt buộc" });
        if (!startDate || !endDate) return res.status(400).json({ error: "Vui lòng nhập ngày bắt đầu và ngày kết thúc giai đoạn" });
        if (!assigneeId) return res.status(400).json({ error: "Vui lòng chọn người phụ trách giai đoạn" });

        const dateErr = validateDates(startDate, endDate);
        if (dateErr) return res.status(400).json({ error: dateErr });

        const count = await prisma.phase.count({ where: { projectId } });
        const phase = await prisma.phase.create({
            data: {
                projectId,
                name: name.trim(),
                description: description || null,
                order: count,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                assigneeId: assigneeId || null,
            },
            include: { assignee: userRelation },
        });
        res.status(201).json({ ...phase, files: [], totalTasks: 0, doneTasks: 0, progress: 0 });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updatePhase = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, startDate, endDate, assigneeId } = req.body;

        const dateErr = validateDates(startDate, endDate);
        if (dateErr) return res.status(400).json({ error: dateErr });

        const phase = await prisma.phase.update({
            where: { id },
            data: {
                ...(name !== undefined && { name: name.trim() }),
                ...(description !== undefined && { description }),
                ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
                ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
                ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
            },
            include: { assignee: userRelation },
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
