import { Router } from "express";
import { getTimeLogs, createTimeLog, deleteTimeLog, getProjectTimeReport } from "../controllers/timeLogController.js";
import { requireMember, requireProjectMember } from "../middleware/authz.js";

const router = Router();

// Báo cáo tổng giờ theo dự án
router.get("/project/:projectId/report", requireMember({ from: "project", param: "projectId" }), getProjectTimeReport);
// Xem: mọi thành viên workspace. Ghi giờ: thành viên dự án. Xóa: chủ bản ghi (controller kiểm tra).
router.get("/task/:taskId", requireMember({ from: "task", param: "taskId" }), getTimeLogs);
router.post("/task/:taskId", requireMember({ from: "task", param: "taskId" }), requireProjectMember({ from: "task", param: "taskId" }), createTimeLog);
router.delete("/:id", requireMember({ from: "timelog", param: "id" }), requireProjectMember({ from: "project" }), deleteTimeLog);

export default router;
