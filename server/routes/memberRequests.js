import { Router } from "express";
import {
    getRequests,
    createRequest,
    approveRequest,
    rejectRequest,
} from "../controllers/memberRequestController.js";
import { requireAuth, requireMember } from "../middleware/authz.js";

const router = Router();

// Danh sách yêu cầu của 1 dự án — chỉ thành viên workspace xem
router.get("/project/:projectId", requireMember({ from: "project", param: "projectId" }), getRequests);
// Tạo yêu cầu — thành viên dự án/workspace gửi
router.post("/project/:projectId", requireMember({ from: "project", param: "projectId" }), createRequest);
// Duyệt / từ chối — controller tự kiểm tra quyền admin/trưởng dự án
router.put("/:id/approve", requireAuth, approveRequest);
router.put("/:id/reject", requireAuth, rejectRequest);

export default router;
