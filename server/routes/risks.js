import { Router } from "express";
import { getRisks, createRisk, updateRisk, deleteRisk } from "../controllers/riskController.js";
import { requireMember, requireProjectMember } from "../middleware/authz.js";

const router = Router();

// Xem / ghi nhận / cập nhật rủi ro: thành viên dự án
router.get(
    "/project/:projectId",
    requireMember({ from: "project", param: "projectId" }),
    requireProjectMember({ from: "project", param: "projectId" }),
    getRisks
);
router.post(
    "/project/:projectId",
    requireMember({ from: "project", param: "projectId" }),
    requireProjectMember({ from: "project", param: "projectId" }),
    createRisk
);
router.put(
    "/:id",
    requireMember({ from: "risk", param: "id" }),
    requireProjectMember({ from: "project" }),
    updateRisk
);

// Xóa rủi ro: kiểm tra quyền chi tiết trong controller (người tạo / trưởng dự án / ADMIN / MANAGER)
router.delete(
    "/:id",
    requireMember({ from: "risk", param: "id" }),
    requireProjectMember({ from: "project" }),
    deleteRisk
);

export default router;
