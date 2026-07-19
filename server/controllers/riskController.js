import prisma from "../configs/prisma.js";
import { notifyUser, logActivity } from "../utils/notify.js";
import { userRelation } from "../utils/safeSelect.js";

const LEVELS = ["LOW", "MEDIUM", "HIGH"];
const STATUSES = ["OPEN", "MITIGATING", "CLOSED"];

// Điểm rủi ro = khả năng × tác động (1..9) để sắp xếp mức ưu tiên xử lý
const riskScore = (r) => (LEVELS.indexOf(r.likelihood) + 1) * (LEVELS.indexOf(r.impact) + 1);

// Danh sách rủi ro của dự án, sắp theo điểm rủi ro giảm dần (OPEN lên trước)
export const getRisks = async (req, res) => {
    try {
        const { projectId } = req.params;
        const risks = await prisma.risk.findMany({
            where: { projectId },
            include: { owner: userRelation, creator: userRelation },
            orderBy: { createdAt: "desc" },
        });
        risks.sort((a, b) => {
            if ((a.status === "CLOSED") !== (b.status === "CLOSED")) return a.status === "CLOSED" ? 1 : -1;
            return riskScore(b) - riskScore(a);
        });
        res.json(risks.map((r) => ({ ...r, score: riskScore(r) })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Ghi nhận rủi ro mới (thành viên dự án)
export const createRisk = async (req, res) => {
    try {
        const userId = req.auth?.userId;
        const { projectId } = req.params;
        const { title, description, likelihood, impact, mitigation, ownerId } = req.body;

        if (!title?.trim()) return res.status(400).json({ error: "Tên rủi ro là bắt buộc" });
        if (likelihood && !LEVELS.includes(likelihood)) return res.status(400).json({ error: "Khả năng xảy ra không hợp lệ" });
        if (impact && !LEVELS.includes(impact)) return res.status(400).json({ error: "Mức tác động không hợp lệ" });

        const risk = await prisma.risk.create({
            data: {
                projectId,
                title: title.trim(),
                description: description || null,
                likelihood: likelihood || "MEDIUM",
                impact: impact || "MEDIUM",
                mitigation: mitigation || null,
                ownerId: ownerId || null,
                createdBy: userId,
            },
            include: { owner: userRelation, creator: userRelation },
        });

        logActivity({
            projectId,
            userId,
            action: `đã ghi nhận rủi ro "${risk.title}"`,
            entityType: "RISK",
            entityId: risk.id,
        });

        // Rủi ro CAO (điểm ≥ 6) → báo ngay trưởng dự án
        if (riskScore(risk) >= 6) {
            const project = await prisma.project.findUnique({
                where: { id: projectId },
                select: { name: true, team_lead: true },
            });
            if (project?.team_lead) {
                notifyUser({
                    userId: project.team_lead,
                    actorId: userId,
                    title: "Rủi ro mức cao được ghi nhận",
                    message: `Rủi ro "${risk.title}" (dự án ${project.name}) có mức độ cao — cần xem xét kế hoạch ứng phó.`,
                });
            }
        }
        // Báo người được phân công xử lý
        if (risk.ownerId && risk.ownerId !== userId) {
            notifyUser({
                userId: risk.ownerId,
                actorId: userId,
                title: "Bạn được phân công xử lý rủi ro",
                message: `Bạn phụ trách xử lý rủi ro "${risk.title}"`,
            });
        }

        res.status(201).json({ ...risk, score: riskScore(risk) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Cập nhật rủi ro (thành viên dự án)
export const updateRisk = async (req, res) => {
    try {
        const userId = req.auth?.userId;
        const { id } = req.params;
        const { title, description, likelihood, impact, status, mitigation, ownerId } = req.body;

        if (likelihood && !LEVELS.includes(likelihood)) return res.status(400).json({ error: "Khả năng xảy ra không hợp lệ" });
        if (impact && !LEVELS.includes(impact)) return res.status(400).json({ error: "Mức tác động không hợp lệ" });
        if (status && !STATUSES.includes(status)) return res.status(400).json({ error: "Trạng thái không hợp lệ" });

        const risk = await prisma.risk.update({
            where: { id },
            data: {
                ...(title !== undefined && { title: title.trim() }),
                ...(description !== undefined && { description: description || null }),
                ...(likelihood !== undefined && { likelihood }),
                ...(impact !== undefined && { impact }),
                ...(status !== undefined && { status }),
                ...(mitigation !== undefined && { mitigation: mitigation || null }),
                ...(ownerId !== undefined && { ownerId: ownerId || null }),
            },
            include: { owner: userRelation, creator: userRelation },
        });

        if (ownerId && ownerId !== userId) {
            notifyUser({
                userId: ownerId,
                actorId: userId,
                title: "Bạn được phân công xử lý rủi ro",
                message: `Bạn phụ trách xử lý rủi ro "${risk.title}"`,
            });
        }

        res.json({ ...risk, score: riskScore(risk) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Xóa rủi ro: người tạo, trưởng dự án, ADMIN hoặc MANAGER
export const deleteRisk = async (req, res) => {
    try {
        const userId = req.auth?.userId;
        const isManager = req.memberRole === "ADMIN" || req.memberRole === "MANAGER";
        const isLead = req.projectTeamLead === userId;
        const isCreator = req.riskCreatorId === userId;
        if (!isManager && !isLead && !isCreator) {
            return res.status(403).json({ error: "Chỉ người tạo, trưởng dự án hoặc quản trị viên mới được xóa rủi ro" });
        }
        await prisma.risk.delete({ where: { id: req.params.id } });
        res.json({ message: "Đã xóa rủi ro" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
