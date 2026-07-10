import { Router } from "express";
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  bulkDeleteTasks,
} from "../controllers/taskController.js";
import { requireAuth, requireMember, requireProjectMember } from "../middleware/authz.js";

const router = Router();

router.get("/project/:projectId", requireMember({ from: "project", param: "projectId" }), getTasks);
router.get("/:id", requireMember({ from: "task", param: "id" }), getTask);
router.post("/project/:projectId", requireMember({ from: "project", param: "projectId" }), requireProjectMember({ from: "project", param: "projectId" }), createTask);
router.put("/:id", requireMember({ from: "task", param: "id" }), requireProjectMember({ from: "task", param: "id" }), updateTask);
router.delete("/:id", requireMember({ from: "task", param: "id" }), requireProjectMember({ from: "task", param: "id" }), deleteTask);
router.post("/bulk-delete", requireAuth, bulkDeleteTasks);

export default router;
