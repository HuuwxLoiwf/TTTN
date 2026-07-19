import { Router } from "express";
import { getExpenses, createExpense, deleteExpense } from "../controllers/expenseController.js";
import { requireMember, requireProjectMember } from "../middleware/authz.js";

const router = Router();

// Xem chi phí: thành viên dự án
router.get(
    "/project/:projectId",
    requireMember({ from: "project", param: "projectId" }),
    requireProjectMember({ from: "project", param: "projectId" }),
    getExpenses
);

// Ghi nhận chi phí: thành viên dự án (controller giới hạn ADMIN/MANAGER/trưởng dự án)
router.post(
    "/project/:projectId",
    requireMember({ from: "project", param: "projectId" }),
    requireProjectMember({ from: "project", param: "projectId" }),
    createExpense
);

// Xóa khoản chi: kiểm tra quyền chi tiết trong controller
router.delete(
    "/:id",
    requireMember({ from: "expense", param: "id" }),
    requireProjectMember({ from: "project" }),
    deleteExpense
);

export default router;
