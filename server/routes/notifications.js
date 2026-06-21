import { Router } from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  createNotification,
  checkDueTasks,
} from "../controllers/notificationController.js";
import { requireAuth } from "../middleware/authz.js";

const router = Router();

router.get("/check-due", requireAuth, checkDueTasks);
router.get("/", requireAuth, getNotifications);
router.post("/", requireAuth, createNotification);
router.put("/read-all", requireAuth, markAllAsRead);
router.put("/:id/read", requireAuth, markAsRead);

export default router;
