import prisma from "../configs/prisma.js";
import { userRelation } from "../utils/safeSelect.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * BÁO CÁO ĐIỀU HÀNH — GET /api/reports/workspace/:workspaceId/overview
 * Tổng hợp KPI toàn workspace: sức khỏe từng dự án, tải công việc từng thành viên,
 * tổng giờ công + chi phí nhân công (đơn giá × giờ) so với ngân sách.
 */
export const getWorkspaceOverview = async (req, res) => {
    try {
        const { workspaceId } = req.params;
        const now = new Date();

        const [projects, members, timeLogs] = await Promise.all([
            prisma.project.findMany({
                where: { workspaceId, deletedAt: null },
                select: {
                    id: true, name: true, status: true, progress: true, budget: true,
                    start_date: true, end_date: true,
                    tasks: {
                        where: { deletedAt: null },
                        select: { id: true, status: true, due_date: true, assigneeId: true },
                    },
                },
                orderBy: { createdAt: "desc" },
            }),
            prisma.workspaceMember.findMany({
                where: { workspaceId },
                select: { userId: true, role: true, hourlyRate: true, user: userRelation },
            }),
            prisma.timeLog.findMany({
                where: { task: { deletedAt: null, project: { workspaceId, deletedAt: null } } },
                select: { userId: true, minutes: true, task: { select: { projectId: true } } },
            }),
        ]);

        // Bản đồ đơn giá giờ công theo user
        const rateOf = new Map(members.map((m) => [m.userId, m.hourlyRate || 0]));

        // Giờ + chi phí theo dự án và theo người
        const projMinutes = new Map();
        const projCost = new Map();
        const userMinutes = new Map();
        const userCost = new Map();
        for (const log of timeLogs) {
            const pid = log.task.projectId;
            const cost = (log.minutes / 60) * (rateOf.get(log.userId) || 0);
            projMinutes.set(pid, (projMinutes.get(pid) || 0) + log.minutes);
            projCost.set(pid, (projCost.get(pid) || 0) + cost);
            userMinutes.set(log.userId, (userMinutes.get(log.userId) || 0) + log.minutes);
            userCost.set(log.userId, (userCost.get(log.userId) || 0) + cost);
        }

        // KPI từng dự án
        const projectRows = projects.map((p) => {
            const total = p.tasks.length;
            const done = p.tasks.filter((t) => t.status === "DONE").length;
            const overdue = p.tasks.filter(
                (t) => t.due_date && new Date(t.due_date) < now && t.status !== "DONE",
            ).length;
            return {
                id: p.id, name: p.name, status: p.status, progress: p.progress,
                start_date: p.start_date, end_date: p.end_date,
                totalTasks: total, doneTasks: done, overdueTasks: overdue,
                budget: p.budget,
                minutes: projMinutes.get(p.id) || 0,
                cost: Math.round(projCost.get(p.id) || 0),
            };
        });

        // Tải công việc từng thành viên (mọi dự án trong workspace)
        const openBy = new Map();
        const overdueBy = new Map();
        for (const p of projects) {
            for (const t of p.tasks) {
                if (!t.assigneeId) continue;
                if (t.status !== "DONE") {
                    openBy.set(t.assigneeId, (openBy.get(t.assigneeId) || 0) + 1);
                    if (t.due_date && new Date(t.due_date) < now) {
                        overdueBy.set(t.assigneeId, (overdueBy.get(t.assigneeId) || 0) + 1);
                    }
                }
            }
        }
        const workload = members.map((m) => ({
            user: m.user,
            role: m.role,
            hourlyRate: m.hourlyRate,
            openTasks: openBy.get(m.userId) || 0,
            overdueTasks: overdueBy.get(m.userId) || 0,
            minutes: userMinutes.get(m.userId) || 0,
            cost: Math.round(userCost.get(m.userId) || 0),
        })).sort((a, b) => b.openTasks - a.openTasks);

        // Tổng hợp
        const allTasks = projects.flatMap((p) => p.tasks);
        const totals = {
            projects: projects.length,
            activeProjects: projects.filter((p) => p.status === "ACTIVE" || p.status === "PLANNING").length,
            completedProjects: projects.filter((p) => p.status === "COMPLETED").length,
            tasks: allTasks.length,
            doneTasks: allTasks.filter((t) => t.status === "DONE").length,
            overdueTasks: allTasks.filter((t) => t.due_date && new Date(t.due_date) < now && t.status !== "DONE").length,
            totalMinutes: [...userMinutes.values()].reduce((s, v) => s + v, 0),
            totalCost: Math.round([...userCost.values()].reduce((s, v) => s + v, 0)),
            totalBudget: projects.reduce((s, p) => s + (p.budget || 0), 0),
        };

        res.json({ totals, projects: projectRows, workload });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * BẢNG CHẤM CÔNG — GET /api/reports/workspace/:workspaceId/timesheet?from=&to=
 * Liệt kê giờ công trong khoảng thời gian (mặc định: tháng hiện tại),
 * nhóm theo người + tính chi phí (đơn giá × giờ). Dùng xuất cho kế toán/lương.
 */
export const getTimesheet = async (req, res) => {
    try {
        const { workspaceId } = req.params;
        const now = new Date();
        const from = req.query.from ? new Date(req.query.from) : new Date(now.getFullYear(), now.getMonth(), 1);
        const to = req.query.to ? new Date(req.query.to) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        if (isNaN(from.getTime()) || isNaN(to.getTime())) {
            return res.status(400).json({ error: "Khoảng thời gian không hợp lệ" });
        }

        const [logs, members] = await Promise.all([
            prisma.timeLog.findMany({
                where: {
                    workDate: { gte: from, lte: to },
                    task: { project: { workspaceId } },
                },
                select: {
                    id: true, minutes: true, note: true, workDate: true, userId: true,
                    user: userRelation,
                    task: { select: { title: true, project: { select: { id: true, name: true } } } },
                },
                orderBy: { workDate: "asc" },
            }),
            prisma.workspaceMember.findMany({
                where: { workspaceId },
                select: { userId: true, hourlyRate: true },
            }),
        ]);

        const rateOf = new Map(members.map((m) => [m.userId, m.hourlyRate || 0]));

        const entries = logs.map((l) => ({
            id: l.id,
            user: l.user,
            taskTitle: l.task.title,
            projectId: l.task.project.id,
            projectName: l.task.project.name,
            minutes: l.minutes,
            note: l.note,
            workDate: l.workDate,
            cost: Math.round((l.minutes / 60) * (rateOf.get(l.userId) || 0)),
        }));

        // Tổng theo người
        const byUserMap = new Map();
        for (const e of entries) {
            const key = e.user.id;
            const cur = byUserMap.get(key) || { user: e.user, minutes: 0, cost: 0 };
            cur.minutes += e.minutes;
            cur.cost += e.cost;
            byUserMap.set(key, cur);
        }
        const byUser = [...byUserMap.values()].sort((a, b) => b.minutes - a.minutes);

        res.json({
            from, to, entries, byUser,
            totalMinutes: entries.reduce((s, e) => s + e.minutes, 0),
            totalCost: entries.reduce((s, e) => s + e.cost, 0),
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * BIỂU ĐỒ BURNDOWN — GET /api/reports/project/:projectId/burndown
 * Số công việc còn lại theo từng ngày (ngày hoàn thành xấp xỉ bằng updatedAt của task DONE)
 * + đường lý tưởng (giảm đều từ tổng về 0).
 */
export const getBurndown = async (req, res) => {
    try {
        const { projectId } = req.params;
        const tasks = await prisma.task.findMany({
            where: { projectId, deletedAt: null },
            select: { createdAt: true, due_date: true, status: true, updatedAt: true },
        });
        if (tasks.length === 0) return res.json({ series: [], total: 0 });

        const now = new Date();
        const start = new Date(Math.min(...tasks.map((t) => new Date(t.createdAt).getTime())));
        const dueMax = Math.max(...tasks.map((t) => (t.due_date ? new Date(t.due_date).getTime() : 0)), now.getTime());
        const end = new Date(dueMax);

        // Giới hạn tối đa ~90 điểm — bước nhảy theo ngày hoặc thưa hơn nếu quá dài
        const totalDays = Math.max(1, Math.ceil((end - start) / DAY_MS));
        const step = Math.max(1, Math.ceil(totalDays / 90));

        const series = [];
        for (let d = 0; d <= totalDays; d += step) {
            const day = new Date(start.getTime() + d * DAY_MS);
            const created = tasks.filter((t) => new Date(t.createdAt) <= day).length;
            const doneByDay = tasks.filter(
                (t) => t.status === "DONE" && new Date(t.updatedAt) <= day,
            ).length;
            series.push({
                date: day.toISOString().slice(0, 10),
                remaining: Math.max(0, created - doneByDay),
                ideal: Math.round((tasks.length * (totalDays - d)) / totalDays),
            });
        }

        res.json({ series, total: tasks.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
