import { Router } from "express";
import { getMessages, sendMessage } from "../controllers/projectMessageController.js";
import { requireMember } from "../middleware/authz.js";

const router = Router();

// Chỉ thành viên workspace của dự án mới xem/gửi
router.get("/project/:projectId", requireMember({ from: "project", param: "projectId" }), getMessages);
router.post("/project/:projectId", requireMember({ from: "project", param: "projectId" }), sendMessage);

export default router;
