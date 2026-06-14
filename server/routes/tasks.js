import { Router } from "express";
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  bulkDeleteTasks,
} from "../controllers/taskController.js";

const router = Router();

router.get("/project/:projectId", getTasks);
router.get("/:id", getTask);
router.post("/project/:projectId", createTask);
router.put("/:id", updateTask);
router.delete("/:id", deleteTask);
router.post("/bulk-delete", bulkDeleteTasks);

export default router;
