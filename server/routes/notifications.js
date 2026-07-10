import { Router } from "express";
import {
  getNotifications,
  markAsRead,
  markManyAsRead,
  markAllAsRead,
  checkDueTasks,
} from "../controllers/notificationController.js";
import { requireAuth } from "../middleware/authz.js";

const router = Router();

router.get("/check-due", requireAuth, checkDueTasks);
router.get("/", requireAuth, getNotifications);
router.put("/read-all", requireAuth, markAllAsRead);
router.put("/read-many", requireAuth, markManyAsRead);
router.put("/:id/read", requireAuth, markAsRead);

export default router;
