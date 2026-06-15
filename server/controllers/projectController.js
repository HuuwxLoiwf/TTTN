import prisma from "../configs/prisma.js";
import { notifyUser, logActivity } from "../utils/notify.js";

export const getProjects = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const projects = await prisma.project.findMany({
      where: { workspaceId },
      include: {
        members: { include: { user: true } },
        tasks: {
          include: { assignee: true },
          orderBy: { createdAt: "desc" },
        },
        owner: true,
        department: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getProject = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        members: { include: { user: true } },
        tasks: {
          include: { assignee: true },
          orderBy: { createdAt: "desc" },
        },
        owner: true,
        department: true,
        workspace: true,
      },
    });
    if (!project) return res.status(404).json({ error: "Project not found" });
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createProject = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { workspaceId } = req.params;
    const { name, description, priority, status, start_date, end_date, team_members, departmentId } = req.body;

    // Chặn ngày bắt đầu trong quá khứ (so theo ngày, bỏ giờ)
    if (start_date) {
      const start = new Date(start_date);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      if (start < todayStart) {
        return res.status(400).json({ error: "Ngày bắt đầu không được trước ngày hôm nay" });
      }
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        priority: priority || "MEDIUM",
        status: status || "PLANNING",
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null,
        team_lead: userId,
        workspaceId,
        ...(departmentId ? { departmentId } : {}),
        members: {
          create: [{ userId }],
        },
      },
      include: {
        members: { include: { user: true } },
        tasks: { include: { assignee: true } },
        owner: true,
      },
    });

    if (team_members?.length > 0) {
      const users = await prisma.user.findMany({ where: { email: { in: team_members } } });
      const extraMembers = users.filter((u) => u.id !== userId);
      if (extraMembers.length > 0) {
        await prisma.projectMember.createMany({
          data: extraMembers.map((u) => ({ userId: u.id, projectId: project.id })),
          skipDuplicates: true,
        });
      }
    }

    const fullProject = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        members: { include: { user: true } },
        tasks: { include: { assignee: true } },
        owner: true,
      },
    });

    logActivity({
      workspaceId,
      userId,
      action: `đã tạo dự án "${project.name}"`,
      entityType: "PROJECT",
      entityId: project.id,
    });

    res.status(201).json(fullProject);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, priority, status, start_date, end_date, progress, departmentId } = req.body;
    const project = await prisma.project.update({
      where: { id },
      data: {
        name,
        description,
        priority,
        status,
        start_date: start_date ? new Date(start_date) : undefined,
        end_date: end_date ? new Date(end_date) : undefined,
        progress,
        ...(departmentId !== undefined && { departmentId: departmentId || null }),
      },
      include: {
        members: { include: { user: true } },
        tasks: { include: { assignee: true } },
        owner: true,
      },
    });
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.project.delete({ where: { id } });
    res.json({ message: "Project deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const addProjectMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const existing = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: user.id, projectId: id } },
    });
    if (existing) return res.status(400).json({ error: "Người dùng đã là thành viên dự án" });

    const member = await prisma.projectMember.create({
      data: { userId: user.id, projectId: id },
      include: { user: true },
    });

    const project = await prisma.project.findUnique({
      where: { id },
      select: { name: true, workspaceId: true },
    });

    notifyUser({
      userId: user.id,
      actorId: req.auth?.userId,
      title: "Bạn được thêm vào dự án",
      message: `Bạn được thêm vào dự án ${project?.name || ""}`.trim(),
    });
    logActivity({
      workspaceId: project?.workspaceId,
      userId: req.auth?.userId,
      action: `đã thêm ${user.name || user.email} vào dự án ${project?.name || ""}`.trim(),
      entityType: "PROJECT",
      entityId: id,
    });

    res.status(201).json(member);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const removeProjectMember = async (req, res) => {
  try {
    const { id, memberId } = req.params;
    await prisma.projectMember.delete({
      where: { id: memberId, projectId: id },
    });
    res.json({ message: "Member removed" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
