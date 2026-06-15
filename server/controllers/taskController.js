import prisma from "../configs/prisma.js";
import { emitToProject } from "../socket.js";
import { sendTaskAssignedEmail } from "../utils/emailService.js";
import { notifyUser, logActivity } from "../utils/notify.js";

/**
 * Tính lại tiến độ dự án = % task ở trạng thái DONE, lưu DB và emit realtime.
 * Trả về giá trị progress mới.
 */
const recalcProjectProgress = async (projectId) => {
  try {
    const [total, done] = await Promise.all([
      prisma.task.count({ where: { projectId } }),
      prisma.task.count({ where: { projectId, status: "DONE" } }),
    ]);
    const progress = total === 0 ? 0 : Math.round((done / total) * 100);
    await prisma.project.update({ where: { id: projectId }, data: { progress } });
    emitToProject(projectId, "project:progress", { projectId, progress });
    return progress;
  } catch (err) {
    console.error("[recalcProjectProgress] failed:", err.message);
    return null;
  }
};

export const getTasks = async (req, res) => {
  try {
    const { projectId } = req.params;
    const tasks = await prisma.task.findMany({
      where: { projectId },
      include: { assignee: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: true,
        comments: {
          include: { user: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createTask = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { projectId } = req.params;
    const { title, description, type, priority, status, assigneeId, due_date } = req.body;

    const task = await prisma.task.create({
      data: {
        title,
        description,
        type: type || "TASK",
        priority: priority || "MEDIUM",
        status: status || "TODO",
        assigneeId: assigneeId || userId || null,
        due_date: due_date ? new Date(due_date) : null,
        projectId,
      },
      include: { assignee: true },
    });

    emitToProject(projectId, "task:created", task);
    await recalcProjectProgress(projectId);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true, workspaceId: true },
    });

    // Activity log
    logActivity({
      workspaceId: project?.workspaceId,
      userId,
      action: `đã tạo công việc "${task.title}"`,
      entityType: "TASK",
      entityId: task.id,
    });

    // Notify + email assignee if different from creator
    if (task.assigneeId && task.assigneeId !== userId) {
      notifyUser({
        userId: task.assigneeId,
        actorId: userId,
        title: "Bạn được giao công việc mới",
        message: `Bạn được giao "${task.title}" trong dự án ${project?.name || "Dự án"}`,
      });
      if (task.assignee?.email) {
        sendTaskAssignedEmail({
          to: task.assignee.email,
          taskTitle: task.title,
          projectName: project?.name || "Dự án",
          dueDate: task.due_date,
          assigneeName: task.assignee.name,
        }).catch(() => {}); // fire-and-forget
      }
    }

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateTask = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    const { id } = req.params;
    const { title, description, status, type, priority, assigneeId, due_date } = req.body;

    const prev = await prisma.task.findUnique({
      where: { id },
      select: { status: true, assigneeId: true },
    });

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(type !== undefined && { type }),
        ...(priority !== undefined && { priority }),
        ...(assigneeId !== undefined && { assigneeId }),
        ...(due_date !== undefined && { due_date: new Date(due_date) }),
      },
      include: { assignee: true },
    });

    emitToProject(task.projectId, "task:updated", task);

    // Notify newly assigned user
    if (assigneeId !== undefined && assigneeId && assigneeId !== prev?.assigneeId) {
      notifyUser({
        userId: assigneeId,
        actorId: userId,
        title: "Bạn được giao công việc",
        message: `Bạn được giao "${task.title}"`,
      });
    }

    // Log status change + tính lại tiến độ dự án
    if (status !== undefined && status !== prev?.status) {
      logActivity({
        projectId: task.projectId,
        userId,
        action: `đổi trạng thái "${task.title}" → ${status.replace("_", " ")}`,
        entityType: "TASK",
        entityId: task.id,
      });
      await recalcProjectProgress(task.projectId);
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await prisma.task.findUnique({ where: { id }, select: { projectId: true } });
    await prisma.task.delete({ where: { id } });
    if (task) {
      emitToProject(task.projectId, "task:deleted", { id });
      await recalcProjectProgress(task.projectId);
    }
    res.json({ message: "Task deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const bulkDeleteTasks = async (req, res) => {
  try {
    const { ids } = req.body;
    const tasks = await prisma.task.findMany({ where: { id: { in: ids } }, select: { projectId: true } });
    await prisma.task.deleteMany({ where: { id: { in: ids } } });
    const projectIds = [...new Set(tasks.map((t) => t.projectId))];
    projectIds.forEach((pid) => emitToProject(pid, "tasks:bulkDeleted", { ids }));
    await Promise.all(projectIds.map((pid) => recalcProjectProgress(pid)));
    res.json({ message: `${ids.length} tasks deleted` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
