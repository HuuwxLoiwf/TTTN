import { Router } from "express";
import { getDependencies, addDependency, removeDependency } from "../controllers/dependencyController.js";
import { requireMember, requireProjectMember } from "../middleware/authz.js";

const router = Router();

// Xem: mọi thành viên workspace. Thêm/xóa phụ thuộc: thành viên dự án.
router.get("/task/:taskId", requireMember({ from: "task", param: "taskId" }), getDependencies);
router.post("/task/:taskId", requireMember({ from: "task", param: "taskId" }), requireProjectMember({ from: "task", param: "taskId" }), addDependency);
// Xóa: param là depId (TaskDependency.id) — kiểm tra quyền qua task chủ
router.delete("/:depId", requireMember({ from: "dependency", param: "depId" }), requireProjectMember({ from: "project" }), removeDependency);

export default router;
