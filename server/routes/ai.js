import { Router } from "express";
import { summarizeDiscussion, analyzeProject, suggestSubtasks, askAssistant } from "../controllers/aiController.js";
import { requireMember } from "../middleware/authz.js";

const router = Router();

router.get("/summarize/:projectId", requireMember({ from: "project", param: "projectId" }), summarizeDiscussion);
router.get("/analyze/:projectId", requireMember({ from: "project", param: "projectId" }), analyzeProject);
// AI gợi ý việc nhỏ cho 1 công việc
router.get("/subtasks/:taskId", requireMember({ from: "task", param: "taskId" }), suggestSubtasks);
// AI trợ lý hỏi-đáp trên dữ liệu workspace
router.post("/ask/:workspaceId", requireMember({ from: "workspace", param: "workspaceId" }), askAssistant);

export default router;
