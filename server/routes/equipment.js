import { Router } from "express";
import {
    getEquipments,
    getProjectEquipments,
    createEquipment,
    updateEquipment,
    deleteEquipment,
} from "../controllers/equipmentController.js";
import { requireMember } from "../middleware/authz.js";

const router = Router();

// Xem thiết bị: mọi thành viên workspace
router.get("/workspace/:workspaceId", requireMember({ from: "workspace", param: "workspaceId" }), getEquipments);

// Thiết bị đang dùng của một dự án
router.get("/project/:projectId", requireMember({ from: "project", param: "projectId" }), getProjectEquipments);

// Thêm thiết bị: ADMIN / MANAGER
router.post(
    "/workspace/:workspaceId",
    requireMember({ from: "workspace", param: "workspaceId", role: ["ADMIN", "MANAGER"] }),
    createEquipment
);

// Cập nhật / gán-trả thiết bị: ADMIN / MANAGER
router.put("/:id", requireMember({ from: "equipment", param: "id", role: ["ADMIN", "MANAGER"] }), updateEquipment);

// Xóa thiết bị: chỉ ADMIN
router.delete("/:id", requireMember({ from: "equipment", param: "id", role: "ADMIN" }), deleteEquipment);

export default router;
