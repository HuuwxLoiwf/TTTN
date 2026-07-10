import { Router } from "express";
import { getWorkspaceOverview, getTimesheet, getBurndown } from "../controllers/reportController.js";
import { requireMember } from "../middleware/authz.js";

const router = Router();

// Báo cáo tổng quan + bảng chấm công: mọi thành viên workspace xem được
router.get("/workspace/:workspaceId/overview", requireMember({ from: "workspace", param: "workspaceId" }), getWorkspaceOverview);
router.get("/workspace/:workspaceId/timesheet", requireMember({ from: "workspace", param: "workspaceId" }), getTimesheet);
router.get("/project/:projectId/burndown", requireMember({ from: "project", param: "projectId" }), getBurndown);

export default router;
