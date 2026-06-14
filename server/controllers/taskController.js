import prisma from "../configs/prisma.js";
import { emitToProject } from "../socket.js";
import { sendTaskAssignedEmail } from "../utils/emailService.js";

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

    // Send email notification to assignee if different from creator
    if (task.assigneeId !== userId && task.assignee?.email) {
      const project = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } });
      sendTaskAssignedEmail({
        to: task.assignee.email,
        taskTitle: task.title,
        projectName: project?.name || "Dự án",
        dueDate: task.due_date,
        assigneeName: task.assignee.name,
      }).catch(() => {}); // fire-and-forget
    }

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, type, priority, assigneeId, due_date } = req.body;
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
    if (task) emitToProject(task.projectId, "task:deleted", { id });
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
    res.json({ message: `${ids.length} tasks deleted` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
