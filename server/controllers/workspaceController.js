import prisma from "../configs/prisma.js";
import { notifyUser, logActivity } from "../utils/notify.js";

export const getWorkspaces = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          include: {
            members: { include: { user: true } },
            projects: {
              include: {
                members: { include: { user: true } },
                tasks: {
                  include: { assignee: true },
                  orderBy: { createdAt: "desc" },
                },
                owner: true,
              },
            },
          },
        },
      },
    });

    const workspaces = memberships.map((m) => m.workspace);
    res.json(workspaces);
  } catch (error) {
    console.error("getWorkspaces error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    const workspace = await prisma.workspace.findUnique({
      where: { id },
      include: {
        members: { include: { user: true } },
        projects: {
          include: {
            members: { include: { user: true } },
            tasks: {
              include: { assignee: true },
              orderBy: { createdAt: "desc" },
            },
            owner: true,
          },
        },
      },
    });
    if (!workspace) return res.status(404).json({ error: "Workspace not found" });
    res.json(workspace);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createWorkspace = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "Tên không gian làm việc là bắt buộc" });

    const baseSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const slug = `${baseSlug}-${Date.now()}`;

    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug,
        description: description || '',
        ownerId: userId,
        members: {
          createMany: {
            data: [{ userId, role: "ADMIN" }],
            skipDuplicates: true,
          },
        },
      },
      include: {
        members: { include: { user: true } },
        projects: {
          include: {
            members: { include: { user: true } },
            tasks: { include: { assignee: true } },
          },
        },
      },
    });
    res.status(201).json(workspace);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, image_url } = req.body;
    const workspace = await prisma.workspace.update({
      where: { id },
      data: { name, slug, description, image_url },
      include: {
        members: { include: { user: true } },
        projects: {
          include: {
            members: { include: { user: true } },
            tasks: { include: { assignee: true } },
          },
        },
      },
    });
    res.json(workspace);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.workspace.delete({ where: { id } });
    res.json({ message: "Workspace deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const inviteMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, role } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const member = await prisma.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId: id,
        role: role || "MEMBER",
      },
      include: { user: true },
    });

    const workspace = await prisma.workspace.findUnique({
      where: { id },
      select: { name: true },
    });

    notifyUser({
      userId: user.id,
      actorId: req.auth?.userId,
      title: "Bạn được mời vào không gian làm việc",
      message: `Bạn được mời vào ${workspace?.name || "không gian làm việc"}`,
    });
    logActivity({
      workspaceId: id,
      userId: req.auth?.userId,
      action: `đã mời ${user.name || user.email} vào không gian làm việc`,
      entityType: "WORKSPACE",
      entityId: id,
    });

    res.status(201).json(member);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const removeMember = async (req, res) => {
  try {
    const { id, memberId } = req.params;
    await prisma.workspaceMember.delete({
      where: { id: memberId, workspaceId: id },
    });
    res.json({ message: "Member removed" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
