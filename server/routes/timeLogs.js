import { Router } from "express";
import { getTimeLogs, createTimeLog, deleteTimeLog, getProjectTimeReport } from "../controllers/timeLogController.js";
import { requireAuth, requireMember } from "../middleware/authz.js";

const router = Router();

// Báo cáo tổng giờ theo dự án
router.get("/project/:projectId/report", requireMember({ from: "project", param: "projectId" }), getProjectTimeReport);
// Xem/ghi: thành viên workspace của task. Xóa: chủ sở hữu (controller kiểm tra).
router.get("/task/:taskId", requireMember({ from: "task", param: "taskId" }), getTimeLogs);
router.post("/task/:taskId", requireMember({ from: "task", param: "taskId" }), createTimeLog);
router.delete("/:id", requireAuth, deleteTimeLog);

export default router;
