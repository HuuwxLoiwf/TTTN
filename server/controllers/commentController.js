import prisma from "../configs/prisma.js";
import { emitToProject } from "../socket.js";
import { sendCommentNotificationEmail } from "../utils/emailService.js";

export const getComments = async (req, res) => {
  try {
    const { taskId } = req.params;
    const comments = await prisma.comment.findMany({
      where: { taskId },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createComment = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { taskId } = req.params;
    const { content } = req.body;

    const comment = await prisma.comment.create({
      data: { content, userId, taskId },
      include: { user: true },
    });

    // Emit to all clients watching this task's project
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { projectId: true, title: true, assigneeId: true, assignee: { select: { email: true, name: true } } },
    });
    if (task) {
      emitToProject(task.projectId, "comment:added", { taskId, comment });

      // Notify task assignee if different from commenter
      if (task.assigneeId !== userId && task.assignee?.email) {
        sendCommentNotificationEmail({
          to: task.assignee.email,
          commenterName: comment.user?.name || comment.user?.email || "Thành viên",
          taskTitle: task.title,
          commentContent: content,
        }).catch(() => {});
      }
    }

    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.comment.delete({ where: { id } });
    res.json({ message: "Comment deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
