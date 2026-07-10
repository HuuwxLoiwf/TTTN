import prisma from "../configs/prisma.js";
import { emitToUser } from "../socket.js";

/**
 * Quét task của user sắp đến hạn (trong 24h) hoặc quá hạn mà chưa DONE,
 * tạo thông báo nhắc (không trùng trong ngày). Gọi khi user mở app.
 */
export const checkDueTasks = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: "Chưa đăng nhập" });

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const tasks = await prisma.task.findMany({
      where: {
        assigneeId: userId,
        status: { not: "DONE" },
        due_date: { not: null, lte: in24h },
        deletedAt: null, // không nhắc task đã nằm trong thùng rác
        project: { deletedAt: null },
      },
      select: { id: true, title: true, due_date: true },
    });

    // Tránh tạo trùng: bỏ qua nếu đã có notification cùng nội dung trong 12h qua
    const since = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    let created = 0;
    for (const t of tasks) {
      const overdue = new Date(t.due_date) < now;
      const title = overdue ? "Công việc quá hạn" : "Công việc sắp đến hạn";
      const message = `"${t.title}" ${overdue ? "đã quá hạn" : "sắp đến hạn"}`;

      const dup = await prisma.notification.findFirst({
        where: { userId, message, createdAt: { gte: since } },
        select: { id: true },
      });
      if (dup) continue;

      const n = await prisma.notification.create({ data: { userId, title, message } });
      emitToUser(userId, "notification:new", n);
      created++;
    }

    res.json({ checked: tasks.length, created });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

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
    const userId = req.auth?.userId;
    const { id } = req.params;
    // Chỉ cho đánh dấu thông báo của chính mình
    const result = await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    if (result.count === 0) return res.status(404).json({ error: "Không tìm thấy thông báo" });
    res.json({ message: "Đã đánh dấu đã đọc" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Đánh dấu đã đọc theo nhóm (mảng ids) — chỉ thông báo của chính mình
export const markManyAsRead = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Danh sách thông báo trống" });
    }
    const result = await prisma.notification.updateMany({
      where: { id: { in: ids }, userId },
      data: { isRead: true },
    });
    res.json({ updated: result.count });
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

