import { Router } from "express";
import { summarizeDiscussion, analyzeProject } from "../controllers/aiController.js";
import { requireMember } from "../middleware/authz.js";

const router = Router();

router.get("/summarize/:projectId", requireMember({ from: "project", param: "projectId" }), summarizeDiscussion);
router.get("/analyze/:projectId", requireMember({ from: "project", param: "projectId" }), analyzeProject);

export default router;
