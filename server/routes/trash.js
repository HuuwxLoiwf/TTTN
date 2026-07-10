import { Router } from "express";
import {
    getTrash,
    restoreProject,
    purgeProject,
    restoreTask,
    purgeTask,
} from "../controllers/trashController.js";
import { requireMember } from "../middleware/authz.js";

const router = Router();

const MANAGERS = ["ADMIN", "MANAGER"];

// Thùng rác chỉ dành cho ADMIN/MANAGER workspace
router.get("/workspace/:workspaceId", requireMember({ from: "workspace", param: "workspaceId", role: MANAGERS }), getTrash);

router.put("/project/:id/restore", requireMember({ from: "project", param: "id", role: MANAGERS }), restoreProject);
router.delete("/project/:id", requireMember({ from: "project", param: "id", role: MANAGERS }), purgeProject);

router.put("/task/:id/restore", requireMember({ from: "task", param: "id", role: MANAGERS }), restoreTask);
router.delete("/task/:id", requireMember({ from: "task", param: "id", role: MANAGERS }), purgeTask);

export default router;
