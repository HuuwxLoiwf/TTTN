import { Router } from "express";
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
} from "../controllers/projectController.js";

const router = Router();

router.get("/workspace/:workspaceId", getProjects);
router.get("/:id", getProject);
router.post("/workspace/:workspaceId", createProject);
router.put("/:id", updateProject);
router.delete("/:id", deleteProject);
router.post("/:id/members", addProjectMember);
router.delete("/:id/members/:memberId", removeProjectMember);

export default router;
