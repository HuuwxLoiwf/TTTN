import { Router } from "express";
import { getDependencies, addDependency, removeDependency } from "../controllers/dependencyController.js";
import { requireMember, requireAdmin } from "../middleware/authz.js";

const router = Router();

// Xem: mọi thành viên workspace. Thêm/xóa phụ thuộc: CHỈ quản trị viên (ADMIN).
router.get("/task/:taskId", requireMember({ from: "task", param: "taskId" }), getDependencies);
router.post("/task/:taskId", requireMember({ from: "task", param: "taskId" }), requireAdmin, addDependency);
// Xóa: param là depId (TaskDependency.id) — kiểm tra quyền qua task chủ
router.delete("/:depId", requireMember({ from: "dependency", param: "depId" }), requireAdmin, removeDependency);

export default router;
