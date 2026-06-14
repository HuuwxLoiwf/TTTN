import { Router } from "express";
import { getComments, createComment, deleteComment } from "../controllers/commentController.js";

const router = Router();

router.get("/task/:taskId", getComments);
router.post("/task/:taskId", createComment);
router.delete("/:id", deleteComment);

export default router;
