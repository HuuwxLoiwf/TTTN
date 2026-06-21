import prisma from "../configs/prisma.js";

// Lấy time log của 1 task (kèm tổng phút)
export const getTimeLogs = async (req, res) => {
    try {
        const { taskId } = req.params;
        const logs = await prisma.timeLog.findMany({
            where: { taskId },
            include: { user: { select: { id: true, name: true, email: true, image: true } } },
            orderBy: { workDate: "desc" },
        });
        const totalMinutes = logs.reduce((sum, l) => sum + l.minutes, 0);
        res.json({ logs, totalMinutes });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Ghi nhận giờ làm
export const createTimeLog = async (req, res) => {
    try {
        const userId = req.auth?.userId;
        if (!userId) return res.status(401).json({ error: "Chưa đăng nhập" });

        const { taskId } = req.params;
        const { minutes, note, workDate } = req.body;
        const mins = Number(minutes);
        if (!mins || mins <= 0) return res.status(400).json({ error: "Số phút phải lớn hơn 0" });

        const log = await prisma.timeLog.create({
            data: {
                taskId,
                userId,
                minutes: Math.round(mins),
                note: note || null,
                workDate: workDate ? new Date(workDate) : new Date(),
            },
            include: { user: { select: { id: true, name: true, email: true, image: true } } },
        });
        res.status(201).json(log);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Báo cáo tổng giờ làm của 1 dự án, nhóm theo thành viên
export const getProjectTimeReport = async (req, res) => {
    try {
        const { projectId } = req.params;
        const logs = await prisma.timeLog.findMany({
            where: { task: { projectId } },
            include: {
                user: { select: { id: true, name: true, email: true } },
                task: { select: { id: true, title: true } },
            },
        });

        // Gộp theo người
        const byUser = {};
        let totalMinutes = 0;
        for (const l of logs) {
            const uid = l.userId;
            if (!byUser[uid]) {
                byUser[uid] = { user: l.user, minutes: 0, entries: 0 };
            }
            byUser[uid].minutes += l.minutes;
            byUser[uid].entries += 1;
            totalMinutes += l.minutes;
        }

        res.json({
            totalMinutes,
            byUser: Object.values(byUser).sort((a, b) => b.minutes - a.minutes),
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Xóa time log (chỉ chủ sở hữu)
export const deleteTimeLog = async (req, res) => {
    try {
        const userId = req.auth?.userId;
        const { id } = req.params;
        const log = await prisma.timeLog.findUnique({ where: { id }, select: { userId: true } });
        if (!log) return res.status(404).json({ error: "Không tìm thấy bản ghi" });
        if (log.userId !== userId) return res.status(403).json({ error: "Chỉ người tạo mới được xóa" });

        await prisma.timeLog.delete({ where: { id } });
        res.json({ message: "Đã xóa" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
