import { Router } from "express";
import { getPhases, createPhase, updatePhase, deletePhase } from "../controllers/phaseController.js";
import { requireAuth, requireMember } from "../middleware/authz.js";

const router = Router();

router.get("/project/:projectId", requireMember({ from: "project", param: "projectId" }), getPhases);
router.post("/project/:projectId", requireMember({ from: "project", param: "projectId" }), createPhase);
router.put("/:id", requireAuth, updatePhase);
router.delete("/:id", requireAuth, deletePhase);

export default router;
