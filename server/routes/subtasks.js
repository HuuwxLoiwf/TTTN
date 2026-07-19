import { Router } from "express";
import { getSubtasks, createSubtask, updateSubtask, deleteSubtask } from "../controllers/subtaskController.js";
import { requireMember, requireProjectMember } from "../middleware/authz.js";

const router = Router();

// Xem: mọi thành viên workspace. Thêm/sửa/xóa: thành viên dự án (gồm ADMIN/MANAGER/trưởng dự án).
router.get("/task/:taskId", requireMember({ from: "task", param: "taskId" }), getSubtasks);
router.post("/task/:taskId", requireMember({ from: "task", param: "taskId" }), requireProjectMember({ from: "task", param: "taskId" }), createSubtask);
router.put("/:id", requireMember({ from: "subtask", param: "id" }), requireProjectMember({ from: "project" }), updateSubtask);
router.delete("/:id", requireMember({ from: "subtask", param: "id" }), requireProjectMember({ from: "project" }), deleteSubtask);

export default router;
