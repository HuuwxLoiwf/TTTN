import prisma from "../configs/prisma.js";
import { emitToProject } from "../socket.js";
import { sendTaskAssignedEmail } from "../utils/emailService.js";
import { notifyUser, logActivity } from "../utils/notify.js";
import { userRelation } from "../utils/safeSelect.js";
import { doneAllowedFrom } from "../utils/autoStatus.js";
import { sendWorkspaceWebhook, getWorkspaceSettings } from "../utils/webhook.js";

// Chuẩn hóa nhãn: mảng chuỗi, bỏ rỗng/trùng, mỗi nhãn ≤30 ký tự, tối đa 10 nhãn
const normalizeLabels = (labels) => {
  if (!Array.isArray(labels)) return null;
  const clean = [...new Set(
    labels.map((l) => String(l).trim()).filter((l) => l.length > 0 && l.length <= 30),
  )].slice(0, 10);
  return clean;
};

/**
 * Tính lại tiến độ dự án = % task ở trạng thái DONE, lưu DB và emit realtime.
 * Trả về giá trị progress mới.
 */
const recalcProjectProgress = async (projectId) => {
  try {
    const [total, done, current] = await Promise.all([
      prisma.task.count({ where: { projectId, deletedAt: null } }),
      prisma.task.count({ where: { projectId, status: "DONE", deletedAt: null } }),
      prisma.project.findUnique({ where: { id: projectId }, select: { status: true } }),
    ]);
    const progress = total === 0 ? 0 : Math.round((done / total) * 100);

    // Tự đồng bộ trạng thái dự án theo tiến độ — không động vào ON_HOLD/CANCELLED (do người quản lý đặt).
    let statusUpdate = {};
    const cur = current?.status;
    if (progress === 100 && total > 0 && (cur === "ACTIVE" || cur === "PLANNING")) {
      statusUpdate = { status: "COMPLETED" };
    } else if (progress < 100 && cur === "COMPLETED") {
      statusUpdate = { status: "ACTIVE" };
    }

    await prisma.project.update({ where: { id: projectId }, data: { progress, ...statusUpdate } });
    emitToProject(projectId, "project:progress", { projectId, progress, ...statusUpdate });
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
      where: { projectId, deletedAt: null },
      include: { assignee: userRelation },
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
        assignee: userRelation,
        comments: {
          include: { user: userRelation },
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
    const { title, description, type, priority, status, assigneeId, due_date, phaseId, labels } = req.body;

    // Quyền tạo công việc theo CHÍNH SÁCH workspace (settings.policies.taskCreate):
    //  - "managers" (mặc định): chỉ ADMIN / MANAGER / trưởng dự án
    //  - "members": mọi thành viên của dự án cũng được tạo
    const projForPerm = await prisma.project.findUnique({
      where: { id: projectId },
      select: { team_lead: true, workspace: { select: { settings: true } } },
    });
    const policy = projForPerm?.workspace?.settings?.policies?.taskCreate || "managers";
    const isManagerRole = req.memberRole === "ADMIN" || req.memberRole === "MANAGER" || projForPerm?.team_lead === userId;
    let canCreate = isManagerRole;
    if (!canCreate && policy === "members") {
      const pm = await prisma.projectMember.findUnique({
        where: { userId_projectId: { userId, projectId } },
        select: { id: true },
      });
      canCreate = !!pm;
    }
    if (!canCreate) {
      return res.status(403).json({ error: "Chỉ quản trị viên hoặc trưởng dự án mới được tạo công việc (chính sách workspace)" });
    }

    if (!title?.trim()) return res.status(400).json({ error: "Tiêu đề công việc là bắt buộc" });
    if (title.length > 200) return res.status(400).json({ error: "Tiêu đề quá dài (tối đa 200 ký tự)" });

    // Chuẩn hóa + validate hạn chót so với mốc thời gian dự án.
    let dueDate = null;
    if (due_date) {
      dueDate = new Date(due_date);
      if (isNaN(dueDate.getTime())) return res.status(400).json({ error: "Ngày hết hạn không hợp lệ" });

      const proj = await prisma.project.findUnique({
        where: { id: projectId },
        select: { end_date: true },
      });
      if (proj?.end_date && dueDate > proj.end_date) {
        return res.status(400).json({ error: "Hạn công việc không được sau ngày kết thúc dự án" });
      }
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        type: type || "TASK",
        priority: priority || "MEDIUM",
        status: status || "TODO",
        assigneeId: assigneeId || userId || null,
        due_date: dueDate,
        ...(phaseId ? { phaseId } : {}),
        ...(normalizeLabels(labels) ? { labels: normalizeLabels(labels) } : {}),
        projectId,
      },
      include: { assignee: userRelation },
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

    // Webhook Slack/Discord (nếu workspace có cấu hình)
    sendWorkspaceWebhook(project?.workspaceId, `🆕 Công việc mới: "${task.title}" — dự án ${project?.name || ""}`);

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
    const { title, description, status, type, priority, assigneeId, due_date, phaseId, autoStatus, statusPlan, labels } = req.body;

    const prev = await prisma.task.findUnique({
      where: { id },
      select: {
        status: true, assigneeId: true, createdAt: true, due_date: true, statusPlan: true,
        project: { select: { team_lead: true, workspaceId: true, name: true } },
      },
    });

    const isManager = req.memberRole === "ADMIN" || req.memberRole === "MANAGER";
    const isLead = prev?.project?.team_lead === userId;

    // Chuẩn hóa due_date: chuỗi rỗng / null → xóa hạn; chuỗi không hợp lệ → 400.
    let dueDateData;
    if (due_date !== undefined) {
      if (due_date === null || due_date === "") {
        dueDateData = null;
      } else {
        const d = new Date(due_date);
        if (isNaN(d.getTime())) return res.status(400).json({ error: "Ngày hết hạn không hợp lệ" });
        dueDateData = d;
      }
    }

    // Bật/tắt tự động chuyển trạng thái + chỉnh kế hoạch số ngày mỗi trạng thái.
    // Chỉ ADMIN/MANAGER/trưởng dự án được chỉnh (kế hoạch quyết định mốc được phép DONE).
    const autoData = {};
    if (autoStatus !== undefined || statusPlan !== undefined) {
      if (!isManager && !isLead) {
        return res.status(403).json({ error: "Chỉ quản trị viên/quản lý/trưởng dự án mới chỉnh chế độ tự động" });
      }
      if (autoStatus !== undefined) autoData.autoStatus = !!autoStatus;
      if (statusPlan !== undefined) {
        if (statusPlan === null) {
          autoData.statusPlan = null; // quay về chia mặc định
        } else {
          const plan = {};
          for (const k of ["TODO", "IN_PROGRESS", "REVIEW", "DONE"]) {
            const v = Number(statusPlan?.[k]);
            if (!Number.isFinite(v) || v < 0) {
              return res.status(400).json({ error: "Kế hoạch trạng thái không hợp lệ (số ngày phải ≥ 0)" });
            }
            plan[k] = v;
          }
          if (plan.TODO + plan.IN_PROGRESS + plan.REVIEW + plan.DONE <= 0) {
            return res.status(400).json({ error: "Tổng số ngày trong kế hoạch phải lớn hơn 0" });
          }
          autoData.statusPlan = plan;
        }
      }
    }

    // Đổi trạng thái: ADMIN / MANAGER / trưởng dự án / người được giao việc.
    // (Khớp với kéo-thả Kanban — không chỉ riêng ADMIN.)
    if (status !== undefined && status !== prev?.status) {
      const isAssignee = prev?.assigneeId === userId;
      if (!isManager && !isLead && !isAssignee) {
        return res.status(403).json({ error: "Bạn không có quyền đổi trạng thái công việc này" });
      }

      if (status === "DONE") {
        // Chặn hoàn thành (DONE) khi còn công việc tiên quyết chưa xong
        const deps = await prisma.taskDependency.findMany({
          where: { taskId: id },
          include: { dependsOn: { select: { title: true, status: true, deletedAt: true } } },
        });
        // Task tiên quyết đã vào thùng rác thì không chặn nữa
        const blocking = deps.filter((d) => d.dependsOn.status !== "DONE" && !d.dependsOn.deletedAt);
        if (blocking.length > 0) {
          const names = blocking.map((d) => `"${d.dependsOn.title}"`).join(", ");
          return res.status(400).json({ error: `Phải hoàn thành công việc tiên quyết trước: ${names}` });
        }

        // Chặn hoàn thành QUÁ SỚM so với kế hoạch thời gian
        // (VD: hạn 10 ngày mà mới ngày thứ 2 đã đánh Hoàn thành là phi lý).
        // Mốc cho phép = đầu khoảng DONE trong kế hoạch (mặc định 3/4 chặng đường).
        const guardTask = {
          createdAt: prev.createdAt,
          due_date: dueDateData !== undefined ? dueDateData : prev.due_date,
          statusPlan: autoData.statusPlan !== undefined ? autoData.statusPlan : prev.statusPlan,
        };
        const allowedFrom = doneAllowedFrom(guardTask);
        if (allowedFrom && new Date() < allowedFrom) {
          return res.status(400).json({
            error: `Chưa thể đánh dấu Hoàn thành: theo kế hoạch thời gian, sớm nhất từ ${allowedFrom.toLocaleDateString("vi-VN")}. Nếu công việc thực sự xong sớm, hãy chỉnh lại kế hoạch trạng thái hoặc hạn chót trước.`,
          });
        }
      }

      // Người quản lý chỉnh tay trạng thái ⇒ tắt chế độ tự động (tránh cron ghi đè),
      // trừ khi request chủ động bật/tắt lại autoStatus.
      if (autoData.autoStatus === undefined) autoData.autoStatus = false;
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(type !== undefined && { type }),
        ...(priority !== undefined && { priority }),
        ...(assigneeId !== undefined && { assigneeId }),
        ...(due_date !== undefined && { due_date: dueDateData }),
        ...(phaseId !== undefined && { phaseId: phaseId || null }),
        ...(labels !== undefined && normalizeLabels(labels) ? { labels: normalizeLabels(labels) } : {}),
        ...autoData,
      },
      include: { assignee: userRelation },
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

      // AUTOMATION khi hoàn thành công việc
      if (status === "DONE") {
        const wsId = prev?.project?.workspaceId;
        const settings = await getWorkspaceSettings(wsId);
        // Báo trưởng dự án + các ADMIN (nếu bật automation "notifyOnDone")
        if (settings?.automations?.notifyOnDone) {
          const admins = await prisma.workspaceMember.findMany({
            where: { workspaceId: wsId, role: "ADMIN" },
            select: { userId: true },
          });
          const recipients = new Set([prev?.project?.team_lead, ...admins.map((a) => a.userId)]);
          recipients.delete(userId);
          for (const rid of recipients) {
            if (!rid) continue;
            notifyUser({
              userId: rid,
              actorId: userId,
              title: "Công việc đã hoàn thành",
              message: `"${task.title}" trong dự án ${prev?.project?.name || ""} đã được đánh dấu Hoàn thành.`,
            });
          }
        }
        // Webhook Slack/Discord
        sendWorkspaceWebhook(wsId, `✅ Hoàn thành: "${task.title}" — dự án ${prev?.project?.name || ""}`);
      }
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteTask = async (req, res) => {
  try {
    // Xóa công việc: CHỈ Quản trị viên (ADMIN) của không gian làm việc
    if (req.memberRole !== "ADMIN") {
      return res.status(403).json({ error: "Chỉ quản trị viên mới được xóa công việc" });
    }
    const { id } = req.params;
    const task = await prisma.task.findUnique({ where: { id }, select: { projectId: true } });
    // Soft-delete: chuyển vào thùng rác (khôi phục/xóa hẳn ở /api/trash)
    await prisma.task.update({ where: { id }, data: { deletedAt: new Date() } });
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
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: "Chưa đăng nhập" });

    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Danh sách công việc trống" });
    }

    // Lấy workspace của từng task, chỉ giữ task thuộc workspace user là thành viên
    const tasks = await prisma.task.findMany({
      where: { id: { in: ids } },
      select: { id: true, projectId: true, project: { select: { workspaceId: true } } },
    });

    const workspaceIds = [...new Set(tasks.map((t) => t.project?.workspaceId).filter(Boolean))];
    // Chỉ giữ task thuộc workspace mà user là ADMIN (xóa công việc = quyền quản trị viên)
    const adminMemberships = await prisma.workspaceMember.findMany({
      where: { userId, workspaceId: { in: workspaceIds }, role: "ADMIN" },
      select: { workspaceId: true },
    });
    const adminWs = new Set(adminMemberships.map((m) => m.workspaceId));

    const allowedTasks = tasks.filter((t) => adminWs.has(t.project?.workspaceId));
    const allowedIds = allowedTasks.map((t) => t.id);

    if (allowedIds.length === 0) {
      return res.status(403).json({ error: "Chỉ quản trị viên mới được xóa công việc" });
    }

    await prisma.task.updateMany({ where: { id: { in: allowedIds } }, data: { deletedAt: new Date() } });
    const projectIds = [...new Set(allowedTasks.map((t) => t.projectId))];
    projectIds.forEach((pid) => emitToProject(pid, "tasks:bulkDeleted", { ids: allowedIds }));
    await Promise.all(projectIds.map((pid) => recalcProjectProgress(pid)));
    res.json({ message: `${allowedIds.length} tasks deleted` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
