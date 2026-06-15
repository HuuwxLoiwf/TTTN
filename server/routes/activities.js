import { Router } from "express";
import { getActivities, createActivity, deleteActivity } from "../controllers/activityController.js";
import { requireAuth, requireMember } from "../middleware/authz.js";

const router = Router();

router.get("/workspace/:workspaceId", requireMember({ from: "workspace", param: "workspaceId" }), getActivities);
router.post("/workspace/:workspaceId", requireMember({ from: "workspace", param: "workspaceId" }), createActivity);
router.delete("/:id", requireAuth, deleteActivity); // controller tự kiểm tra ADMIN

export default router;
