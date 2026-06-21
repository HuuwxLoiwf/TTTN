import { Router } from "express";
import { getSubtasks, createSubtask, updateSubtask, deleteSubtask } from "../controllers/subtaskController.js";
import { requireAuth, requireMember } from "../middleware/authz.js";

const router = Router();

router.get("/task/:taskId", requireMember({ from: "task", param: "taskId" }), getSubtasks);
router.post("/task/:taskId", requireMember({ from: "task", param: "taskId" }), createSubtask);
router.put("/:id", requireAuth, updateSubtask);
router.delete("/:id", requireAuth, deleteSubtask);

export default router;
