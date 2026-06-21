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
import { requireMember } from "../middleware/authz.js";

const router = Router();

router.get("/workspace/:workspaceId", requireMember({ from: "workspace", param: "workspaceId" }), getProjects);
router.get("/:id", requireMember({ from: "project", param: "id" }), getProject);
router.post("/workspace/:workspaceId", requireMember({ from: "workspace", param: "workspaceId" }), createProject);
router.put("/:id", requireMember({ from: "project", param: "id" }), updateProject);
router.delete("/:id", requireMember({ from: "project", param: "id", role: ["ADMIN", "MANAGER"] }), deleteProject);
router.post("/:id/members", requireMember({ from: "project", param: "id" }), addProjectMember);
router.delete("/:id/members/:memberId", requireMember({ from: "project", param: "id" }), removeProjectMember);

export default router;
