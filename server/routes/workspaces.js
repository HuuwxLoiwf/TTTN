import { Router } from "express";
import {
  getWorkspaces,
  getWorkspace,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  inviteMember,
  removeMember,
} from "../controllers/workspaceController.js";
import { requireAuth, requireMember } from "../middleware/authz.js";

const router = Router();

router.get("/", requireAuth, getWorkspaces);
router.get("/:id", requireMember({ from: "workspace", param: "id" }), getWorkspace);
router.post("/", requireAuth, createWorkspace);
router.put("/:id", requireMember({ from: "workspace", param: "id", role: "ADMIN" }), updateWorkspace);
router.delete("/:id", requireMember({ from: "workspace", param: "id", role: "ADMIN" }), deleteWorkspace);
router.post("/:id/members", requireMember({ from: "workspace", param: "id", role: "ADMIN" }), inviteMember);
router.delete("/:id/members/:memberId", requireMember({ from: "workspace", param: "id", role: "ADMIN" }), removeMember);

export default router;
