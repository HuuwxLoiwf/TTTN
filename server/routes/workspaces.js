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

const router = Router();

router.get("/", getWorkspaces);
router.get("/:id", getWorkspace);
router.post("/", createWorkspace);
router.put("/:id", updateWorkspace);
router.delete("/:id", deleteWorkspace);
router.post("/:id/members", inviteMember);
router.delete("/:id/members/:memberId", removeMember);

export default router;
