import { Router } from "express";
import {
    getDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
} from "../controllers/departmentController.js";
import { requireMember } from "../middleware/authz.js";

const router = Router();

// Xem: mọi thành viên workspace. Tạo/sửa/xóa: chỉ ADMIN.
router.get("/workspace/:workspaceId", requireMember({ from: "workspace", param: "workspaceId" }), getDepartments);
router.post("/workspace/:workspaceId", requireMember({ from: "workspace", param: "workspaceId", role: "ADMIN" }), createDepartment);
router.put("/:id", requireMember({ from: "department", param: "id", role: "ADMIN" }), updateDepartment);
router.delete("/:id", requireMember({ from: "department", param: "id", role: "ADMIN" }), deleteDepartment);

export default router;
