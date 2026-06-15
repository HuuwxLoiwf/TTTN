import { Router } from "express";
import { getComments, createComment, deleteComment } from "../controllers/commentController.js";
import { requireMember } from "../middleware/authz.js";

const router = Router();

router.get("/task/:taskId", requireMember({ from: "task", param: "taskId" }), getComments);
router.post("/task/:taskId", requireMember({ from: "task", param: "taskId" }), createComment);
router.delete("/:id", requireMember({ from: "comment", param: "id" }), deleteComment);

export default router;
