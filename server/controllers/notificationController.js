import prisma from "../configs/prisma.js";

export const getNotifications = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createNotification = async (req, res) => {
  try {
    const { userId, title, message } = req.body;
    const notification = await prisma.notification.create({
      data: { userId, title, message },
    });
    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
