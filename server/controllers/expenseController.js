import prisma from "../configs/prisma.js";
import { notifyUser, logActivity, logAudit } from "../utils/notify.js";
import { userRelation } from "../utils/safeSelect.js";

// Tổng chi của dự án
const sumExpenses = async (projectId) => {
    const agg = await prisma.expense.aggregate({
        where: { projectId },
        _sum: { amount: true },
    });
    return agg._sum.amount || 0;
};

// Danh sách khoản chi + tổng hợp so với ngân sách
export const getExpenses = async (req, res) => {
    try {
        const { projectId } = req.params;
        const [expenses, project] = await Promise.all([
            prisma.expense.findMany({
                where: { projectId },
                include: { creator: userRelation },
                orderBy: { spentAt: "desc" },
            }),
            prisma.project.findUnique({
                where: { id: projectId },
                select: { budget: true },
            }),
        ]);
        const total = expenses.reduce((s, e) => s + e.amount, 0);
        const budget = project?.budget ?? null;
        res.json({
            expenses,
            total,
            budget,
            remaining: budget != null ? budget - total : null,
            overBudget: budget != null && total > budget,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Ghi nhận khoản chi (ADMIN / MANAGER / trưởng dự án)
export const createExpense = async (req, res) => {
    try {
        const userId = req.auth?.userId;
        const { projectId } = req.params;
        const { title, amount, category, note, spentAt } = req.body;

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { name: true, budget: true, team_lead: true, workspaceId: true },
        });
        if (!project) return res.status(404).json({ error: "Dự án không tồn tại" });

        const isManager = req.memberRole === "ADMIN" || req.memberRole === "MANAGER" || project.team_lead === userId;
        if (!isManager) {
            return res.status(403).json({ error: "Chỉ quản trị viên, quản lý hoặc trưởng dự án mới được ghi nhận chi phí" });
        }

        if (!title?.trim()) return res.status(400).json({ error: "Nội dung khoản chi là bắt buộc" });
        const money = Number(amount);
        if (!Number.isFinite(money) || money <= 0) {
            return res.status(400).json({ error: "Số tiền phải là số dương" });
        }

        const expense = await prisma.expense.create({
            data: {
                projectId,
                title: title.trim(),
                amount: money,
                category: category || null,
                note: note || null,
                spentAt: spentAt ? new Date(spentAt) : new Date(),
                createdBy: userId,
            },
            include: { creator: userRelation },
        });

        logAudit({
            workspaceId: project.workspaceId,
            userId,
            action: "CREATE",
            entityType: "EXPENSE",
            entityId: expense.id,
            entityName: `${expense.title} (${money.toLocaleString("vi-VN")}đ) - ${project.name}`,
        });
        logActivity({
            projectId,
            userId,
            action: `đã ghi nhận khoản chi "${expense.title}" (${money.toLocaleString("vi-VN")}đ)`,
            entityType: "EXPENSE",
            entityId: expense.id,
        });

        // Cảnh báo VƯỢT NGÂN SÁCH: nếu khoản chi này đẩy tổng chi vượt budget
        const total = await sumExpenses(projectId);
        if (project.budget != null && total > project.budget) {
            const admins = await prisma.workspaceMember.findMany({
                where: { workspaceId: project.workspaceId, role: "ADMIN" },
                select: { userId: true },
            });
            const recipients = new Set([project.team_lead, ...admins.map((a) => a.userId)]);
            for (const rid of recipients) {
                if (!rid) continue;
                notifyUser({
                    userId: rid,
                    actorId: rid === userId ? null : userId, // vẫn báo cả người tạo nếu là lead/admin
                    title: "Cảnh báo vượt ngân sách",
                    message: `Dự án ${project.name} đã chi ${total.toLocaleString("vi-VN")}đ / ngân sách ${project.budget.toLocaleString("vi-VN")}đ (vượt ${(total - project.budget).toLocaleString("vi-VN")}đ).`,
                });
            }
        }

        res.status(201).json({ ...expense, total, overBudget: project.budget != null && total > project.budget });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Xóa khoản chi: người tạo, trưởng dự án, ADMIN hoặc MANAGER
export const deleteExpense = async (req, res) => {
    try {
        const userId = req.auth?.userId;
        const isManager = req.memberRole === "ADMIN" || req.memberRole === "MANAGER";
        const isLead = req.projectTeamLead === userId;
        const isCreator = req.expenseCreatorId === userId;
        if (!isManager && !isLead && !isCreator) {
            return res.status(403).json({ error: "Chỉ người tạo, trưởng dự án hoặc quản trị viên mới được xóa khoản chi" });
        }
        await prisma.expense.delete({ where: { id: req.params.id } });
        res.json({ message: "Đã xóa khoản chi" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
