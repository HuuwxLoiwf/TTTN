import { Router } from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  createNotification,
} from "../controllers/notificationController.js";

const router = Router();

router.get("/", getNotifications);
router.post("/", createNotification);
router.put("/:id/read", markAsRead);
router.put("/read-all", markAllAsRead);

export default router;
