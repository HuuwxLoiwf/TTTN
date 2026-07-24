import prisma from "../configs/prisma.js";
import { notifyUser, logActivity } from "../utils/notify.js";
import { userRelation } from "../utils/safeSelect.js";

export const getWorkspaces = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          include: {
            members: { include: { user: userRelation } },
            projects: {
              where: { deletedAt: null },
              include: {
                members: { include: { user: userRelation } },
                tasks: {
                  where: { deletedAt: null },
                  include: { assignee: userRelation },
                  orderBy: { createdAt: "desc" },
                },
                owner: userRelation,
                department: true,
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
        members: { include: { user: userRelation } },
        projects: {
          include: {
            members: { include: { user: userRelation } },
            tasks: {
              include: { assignee: userRelation },
              orderBy: { createdAt: "desc" },
            },
            owner: userRelation,
            department: true,
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
        members: { include: { user: userRelation } },
        projects: {
          include: {
            members: { include: { user: userRelation } },
            tasks: { include: { assignee: userRelation } },
            department: true,
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
    const { name, slug, description, image_url, settings } = req.body;

    // settings (chính sách quyền + automation + webhook): merge nông với settings hiện có
    let settingsData;
    if (settings !== undefined) {
      if (typeof settings !== "object" || settings === null) {
        return res.status(400).json({ error: "settings phải là object" });
      }
      const cur = await prisma.workspace.findUnique({ where: { id }, select: { settings: true } });
      const base = cur?.settings && typeof cur.settings === "object" ? cur.settings : {};
      settingsData = {
        ...base,
        ...settings,
        // merge sâu 1 cấp cho policies & automations để không mất key cũ
        ...(settings.policies ? { policies: { ...(base.policies || {}), ...settings.policies } } : {}),
        ...(settings.automations ? { automations: { ...(base.automations || {}), ...settings.automations } } : {}),
      };
    }

    const workspace = await prisma.workspace.update({
      where: { id },
      data: { name, slug, description, image_url, ...(settingsData !== undefined && { settings: settingsData }) },
      include: {
        members: { include: { user: userRelation } },
        projects: {
          include: {
            members: { include: { user: userRelation } },
            tasks: { include: { assignee: userRelation } },
            department: true,
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

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Email không hợp lệ" });
    }

    // Mỗi workspace chỉ có MỘT quản trị viên (chủ sở hữu) — không mời thêm ADMIN
    if (role === "ADMIN") {
      return res.status(400).json({ error: "Không thể mời với vai trò Quản trị viên — mỗi không gian làm việc chỉ có một quản trị viên (chủ sở hữu). Hãy dùng vai trò Quản lý." });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "Không tìm thấy người dùng với email này. Họ cần đăng ký tài khoản trước." });

    // Đã là thành viên rồi?
    const existing = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: user.id, workspaceId: id } },
    });
    if (existing) return res.status(400).json({ error: "Người này đã là thành viên không gian làm việc" });

    const member = await prisma.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId: id,
        role: role || "MEMBER",
      },
      include: { user: userRelation },
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

export const updateMemberRole = async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const { role, hourlyRate } = req.body;

    // Đổi vai trò (nếu có gửi role)
    if (role !== undefined) {
      if (!["MANAGER", "MEMBER"].includes(role)) {
        // Không có ADMIN trong danh sách: quản trị viên là duy nhất (chủ sở hữu),
        // chỉ được nâng thành viên tối đa lên Quản lý (MANAGER).
        return res.status(400).json({ error: "Vai trò không hợp lệ — chỉ được gán Quản lý hoặc Thành viên. Mỗi không gian làm việc chỉ có một Quản trị viên." });
      }
      // Không cho hạ cấp chính chủ sở hữu workspace
      const workspace = await prisma.workspace.findUnique({ where: { id }, select: { ownerId: true } });
      const member = await prisma.workspaceMember.findUnique({ where: { id: memberId }, select: { userId: true } });
      if (workspace?.ownerId === member?.userId) {
        return res.status(400).json({ error: "Không thể đổi vai trò của chủ sở hữu (Quản trị viên duy nhất)" });
      }
    }

    // Đơn giá giờ công (VNĐ/giờ): số không âm hoặc null (xóa)
    let rateData;
    if (hourlyRate !== undefined) {
      if (hourlyRate === null || hourlyRate === "") rateData = null;
      else {
        const r = Number(hourlyRate);
        if (!Number.isFinite(r) || r < 0) return res.status(400).json({ error: "Đơn giá giờ công phải là số không âm" });
        rateData = r;
      }
    }

    if (role === undefined && hourlyRate === undefined) {
      return res.status(400).json({ error: "Không có dữ liệu để cập nhật" });
    }

    const updated = await prisma.workspaceMember.update({
      where: { id: memberId, workspaceId: id },
      data: {
        ...(role !== undefined && { role }),
        ...(hourlyRate !== undefined && { hourlyRate: rateData }),
      },
      include: { user: userRelation },
    });
    res.json(updated);
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
