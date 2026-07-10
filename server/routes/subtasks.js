import { Router } from "express";
import { getSubtasks, createSubtask, updateSubtask, deleteSubtask } from "../controllers/subtaskController.js";
import { requireMember, requireAdmin } from "../middleware/authz.js";

const router = Router();

// Xem: mọi thành viên workspace. Thêm/sửa/xóa: CHỈ quản trị viên (ADMIN).
router.get("/task/:taskId", requireMember({ from: "task", param: "taskId" }), getSubtasks);
router.post("/task/:taskId", requireMember({ from: "task", param: "taskId" }), requireAdmin, createSubtask);
router.put("/:id", requireMember({ from: "subtask", param: "id" }), requireAdmin, updateSubtask);
router.delete("/:id", requireMember({ from: "subtask", param: "id" }), requireAdmin, deleteSubtask);

export default router;
