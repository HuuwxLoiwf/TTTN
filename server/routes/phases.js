import { Router } from "express";
import { getPhases, createPhase, updatePhase, deletePhase } from "../controllers/phaseController.js";
import { requireMember } from "../middleware/authz.js";

const router = Router();

router.get("/project/:projectId", requireMember({ from: "project", param: "projectId" }), getPhases);
router.post("/project/:projectId", requireMember({ from: "project", param: "projectId" }), createPhase);
router.put("/:id", requireMember({ from: "phase", param: "id" }), updatePhase);
router.delete("/:id", requireMember({ from: "phase", param: "id" }), deletePhase);

export default router;
