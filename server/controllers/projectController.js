import prisma from "../configs/prisma.js";
import { notifyUser, logActivity, logAudit } from "../utils/notify.js";
import { userRelation } from "../utils/safeSelect.js";

export const getProjects = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const projects = await prisma.project.findMany({
      where: { workspaceId, deletedAt: null },
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
        members: { include: { user: userRelation } },
        tasks: {
          where: { deletedAt: null },
          include: { assignee: userRelation },
          orderBy: { createdAt: "desc" },
        },
        owner: userRelation,
        department: true,
        workspace: true,
      },
    });
    if (!project || project.deletedAt) return res.status(404).json({ error: "Project not found" });
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

    if (!name?.trim()) return res.status(400).json({ error: "Tên dự án là bắt buộc" });
    if (name.length > 200) return res.status(400).json({ error: "Tên dự án quá dài" });

    // Bắt buộc có phòng ban
    if (!departmentId) {
      return res.status(400).json({ error: "Vui lòng chọn phòng ban cho dự án" });
    }

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
        members: { include: { user: userRelation } },
        tasks: { include: { assignee: userRelation } },
        owner: userRelation,
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
        members: { include: { user: userRelation } },
        tasks: { include: { assignee: userRelation } },
        owner: userRelation,
      },
    });

    logActivity({
      workspaceId,
      userId,
      action: `đã tạo dự án "${project.name}"`,
      entityType: "PROJECT",
      entityId: project.id,
    });
    logAudit({
      workspaceId,
      userId,
      action: "CREATE",
      entityType: "PROJECT",
      entityId: project.id,
      entityName: project.name,
    });

    res.status(201).json(fullProject);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateProject = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    const { id } = req.params;
    // progress KHÔNG nhận từ client — luôn auto-tính theo % task DONE (recalcProjectProgress).
    const { name, description, priority, status, start_date, end_date, departmentId, budget } = req.body;

    // Ngân sách: số không âm hoặc null (bỏ ngân sách)
    let budgetData;
    if (budget !== undefined) {
      if (budget === null || budget === "") budgetData = null;
      else {
        const b = Number(budget);
        if (!Number.isFinite(b) || b < 0) return res.status(400).json({ error: "Ngân sách phải là số không âm" });
        budgetData = b;
      }
    }

    const before = await prisma.project.findUnique({
      where: { id },
      select: { name: true, status: true, priority: true, progress: true, team_lead: true },
    });

    // Chỉ ADMIN hoặc trưởng dự án được sửa thông tin dự án (Cài đặt)
    if (req.memberRole !== "ADMIN" && before?.team_lead !== userId) {
      return res.status(403).json({ error: "Chỉ quản trị viên hoặc trưởng dự án mới được sửa dự án" });
    }

    // Chặn đánh dấu dự án HOÀN THÀNH khi còn công việc chưa xong
    // (VD: dự án 10 ngày, mới ngày thứ 2 đã "hoàn thành" trong khi tiến độ 20% là phi lý).
    if (status === "COMPLETED" && (before?.progress ?? 0) < 100) {
      return res.status(400).json({
        error: `Không thể đánh dấu dự án hoàn thành: tiến độ mới đạt ${before?.progress ?? 0}% — vẫn còn công việc chưa xong. Hãy hoàn thành hết công việc trước.`,
      });
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        name,
        description,
        priority,
        status,
        start_date: start_date ? new Date(start_date) : undefined,
        end_date: end_date ? new Date(end_date) : undefined,
        ...(departmentId !== undefined && { departmentId: departmentId || null }),
        ...(budget !== undefined && { budget: budgetData }),
      },
      include: {
        members: { include: { user: userRelation } },
        tasks: { include: { assignee: userRelation } },
        owner: userRelation,
      },
    });

    // Ghi audit các trường thay đổi
    const changes = {};
    if (name !== undefined && name !== before?.name) changes.name = { old: before?.name, new: name };
    if (status !== undefined && status !== before?.status) changes.status = { old: before?.status, new: status };
    if (priority !== undefined && priority !== before?.priority) changes.priority = { old: before?.priority, new: priority };
    if (Object.keys(changes).length > 0) {
      logAudit({
        workspaceId: project.workspaceId,
        userId,
        action: "UPDATE",
        entityType: "PROJECT",
        entityId: id,
        entityName: project.name,
        changes,
      });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    const { id } = req.params;
    const proj = await prisma.project.findUnique({ where: { id }, select: { name: true, workspaceId: true } });
    // Soft-delete: vào thùng rác (khôi phục/xóa hẳn ở /api/trash)
    await prisma.project.update({ where: { id }, data: { deletedAt: new Date() } });
    if (proj) {
      logAudit({
        workspaceId: proj.workspaceId,
        userId,
        action: "DELETE",
        entityType: "PROJECT",
        entityId: id,
        entityName: proj.name,
      });
    }
    res.json({ message: "Project deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const addProjectMember = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    const { id } = req.params;
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Email không hợp lệ" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "Không tìm thấy người dùng với email này" });

    const project = await prisma.project.findUnique({
      where: { id },
      select: { name: true, workspaceId: true, team_lead: true },
    });
    if (!project) return res.status(404).json({ error: "Dự án không tồn tại" });

    // Chỉ ADMIN/MANAGER workspace hoặc trưởng dự án được thêm trực tiếp.
    // Thành viên thường phải dùng luồng yêu cầu duyệt (member-requests).
    const isManager = req.memberRole === "ADMIN" || req.memberRole === "MANAGER" || project.team_lead === userId;
    if (!isManager) {
      return res.status(403).json({ error: "Chỉ quản trị viên hoặc trưởng dự án mới thêm trực tiếp. Hãy gửi yêu cầu duyệt." });
    }

    // BẮT BUỘC: người được thêm phải là thành viên của workspace chứa dự án
    const inWorkspace = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: user.id, workspaceId: project.workspaceId } },
    });
    if (!inWorkspace) {
      return res.status(400).json({ error: "Người này chưa thuộc không gian làm việc. Hãy mời họ vào workspace trước." });
    }

    const existing = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: user.id, projectId: id } },
    });
    if (existing) return res.status(400).json({ error: "Người dùng đã là thành viên dự án" });

    const member = await prisma.projectMember.create({
      data: { userId: user.id, projectId: id },
      include: { user: userRelation },
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
    const userId = req.auth?.userId;
    const { id, memberId } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      select: { team_lead: true },
    });
    if (!project) return res.status(404).json({ error: "Dự án không tồn tại" });

    const target = await prisma.projectMember.findUnique({
      where: { id: memberId },
      select: { userId: true, projectId: true },
    });
    if (!target || target.projectId !== id) {
      return res.status(404).json({ error: "Thành viên không thuộc dự án này" });
    }

    // Quyền xóa: ADMIN/MANAGER, trưởng dự án, hoặc tự rời dự án.
    const isManager = req.memberRole === "ADMIN" || req.memberRole === "MANAGER" || project.team_lead === userId;
    const isSelf = target.userId === userId;
    if (!isManager && !isSelf) {
      return res.status(403).json({ error: "Bạn không có quyền xóa thành viên này" });
    }
    // Không cho xóa trưởng dự án khỏi chính dự án của họ
    if (target.userId === project.team_lead) {
      return res.status(400).json({ error: "Không thể xóa trưởng dự án khỏi dự án" });
    }

    await prisma.projectMember.delete({ where: { id: memberId } });
    res.json({ message: "Member removed" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * NHÂN BẢN DỰ ÁN (dùng dự án cũ làm MẪU) — POST /api/projects/:id/duplicate
 * Sao chép: thông tin dự án + toàn bộ giai đoạn + công việc (đưa về TODO, bỏ người
 * được giao & hạn chót). KHÔNG sao chép: bình luận, file, giờ công, tin nhắn.
 * Quyền: ADMIN / MANAGER / trưởng dự án.
 */
export const duplicateProject = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    const { id } = req.params;

    const source = await prisma.project.findUnique({
      where: { id },
      include: {
        phases: { orderBy: { order: "asc" } },
        tasks: { where: { deletedAt: null } },
      },
    });
    if (!source) return res.status(404).json({ error: "Dự án không tồn tại" });

    const isManager = req.memberRole === "ADMIN" || req.memberRole === "MANAGER" || source.team_lead === userId;
    if (!isManager) {
      return res.status(403).json({ error: "Chỉ quản trị viên/quản lý/trưởng dự án mới được nhân bản dự án" });
    }

    // Tạo dự án mới (người nhân bản làm trưởng dự án)
    const copy = await prisma.project.create({
      data: {
        name: `${source.name} (bản sao)`,
        description: source.description,
        priority: source.priority,
        status: "PLANNING",
        workspaceId: source.workspaceId,
        departmentId: source.departmentId,
        budget: source.budget,
        team_lead: userId,
        members: { create: [{ userId }] },
      },
    });

    // Sao chép giai đoạn (giữ thứ tự, bỏ ngày & người phụ trách — dự án mới tự đặt)
    const phaseIdMap = new Map();
    for (const ph of source.phases) {
      const newPh = await prisma.phase.create({
        data: {
          projectId: copy.id,
          name: ph.name,
          description: ph.description,
          order: ph.order,
        },
      });
      phaseIdMap.set(ph.id, newPh.id);
    }

    // Sao chép công việc: reset về TODO, bỏ assignee/hạn chót, giữ nhãn + giai đoạn tương ứng
    if (source.tasks.length > 0) {
      await prisma.task.createMany({
        data: source.tasks.map((t) => ({
          projectId: copy.id,
          title: t.title,
          description: t.description,
          type: t.type,
          priority: t.priority,
          labels: t.labels || [],
          status: "TODO",
          phaseId: t.phaseId ? phaseIdMap.get(t.phaseId) || null : null,
        })),
      });
    }

    const full = await prisma.project.findUnique({
      where: { id: copy.id },
      include: {
        members: { include: { user: userRelation } },
        tasks: { include: { assignee: userRelation } },
        owner: userRelation,
        department: true,
      },
    });

    logAudit({
      workspaceId: source.workspaceId,
      userId,
      action: "CREATE",
      entityType: "PROJECT",
      entityId: copy.id,
      entityName: full.name,
      changes: { duplicatedFrom: { old: null, new: source.name } },
    });

    res.status(201).json(full);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
