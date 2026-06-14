import { Router } from "express";
import { getActivities, createActivity } from "../controllers/activityController.js";

const router = Router();

router.get("/workspace/:workspaceId", getActivities);
router.post("/workspace/:workspaceId", createActivity);

export default router;
