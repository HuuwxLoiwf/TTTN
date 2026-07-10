import { Router } from "express";
import { getTimeLogs, createTimeLog, deleteTimeLog, getProjectTimeReport } from "../controllers/timeLogController.js";
import { requireMember, requireAdmin } from "../middleware/authz.js";

const router = Router();

// Báo cáo tổng giờ theo dự án
router.get("/project/:projectId/report", requireMember({ from: "project", param: "projectId" }), getProjectTimeReport);
// Xem: mọi thành viên workspace. Ghi/xóa nhật ký thời gian: CHỈ quản trị viên (ADMIN).
router.get("/task/:taskId", requireMember({ from: "task", param: "taskId" }), getTimeLogs);
router.post("/task/:taskId", requireMember({ from: "task", param: "taskId" }), requireAdmin, createTimeLog);
router.delete("/:id", requireMember({ from: "timelog", param: "id" }), requireAdmin, deleteTimeLog);

export default router;
