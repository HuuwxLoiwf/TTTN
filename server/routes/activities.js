import { Router } from "express";
import { getActivities, createActivity, deleteActivity, getAuditLogs } from "../controllers/activityController.js";
import { requireAuth, requireMember } from "../middleware/authz.js";

const router = Router();

router.get("/workspace/:workspaceId", requireMember({ from: "workspace", param: "workspaceId" }), getActivities);
router.get("/audit/:workspaceId", requireMember({ from: "workspace", param: "workspaceId", role: "ADMIN" }), getAuditLogs);
router.post("/workspace/:workspaceId", requireMember({ from: "workspace", param: "workspaceId" }), createActivity);
router.delete("/:id", requireAuth, deleteActivity); // controller tự kiểm tra ADMIN

export default router;
