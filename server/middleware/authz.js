import prisma from "../configs/prisma.js";

/**
 * Yêu cầu đã đăng nhập (req.auth.userId được set bởi verifyToken ở server.js).
 */
export const requireAuth = (req, res, next) => {
    if (!req.auth?.userId) return res.status(401).json({ error: "Chưa đăng nhập" });
    next();
};

/**
 * Trả về membership của user trong workspace, hoặc null.
 */
const getMembership = (userId, workspaceId) =>
    prisma.workspaceMember.findUnique({
        where: { userId_workspaceId: { userId, workspaceId } },
        select: { role: true },
    });

/**
 * Factory: yêu cầu user là thành viên của workspace (xác định qua nhiều nguồn id).
 * options.from: 'workspace' | 'project' | 'task' | 'comment' — id lấy ở đâu để suy ra workspace.
 * options.param: tên param chứa id (mặc định 'id').
 * options.role: nếu = 'ADMIN' thì bắt buộc quyền ADMIN.
 *
 * Gắn req.workspaceId và req.memberRole để controller dùng lại.
 */
export const requireMember = ({ from = "workspace", param = "id", role } = {}) => {
    return async (req, res, next) => {
        try {
            const userId = req.auth?.userId;
            if (!userId) return res.status(401).json({ error: "Chưa đăng nhập" });

            let workspaceId;

            if (from === "workspace") {
                workspaceId = req.params[param];
            } else if (from === "project") {
                const project = await prisma.project.findUnique({
                    where: { id: req.params[param] },
                    select: { workspaceId: true },
                });
                if (!project) return res.status(404).json({ error: "Dự án không tồn tại" });
                workspaceId = project.workspaceId;
            } else if (from === "task") {
                const task = await prisma.task.findUnique({
                    where: { id: req.params[param] },
                    select: { projectId: true, project: { select: { workspaceId: true } } },
                });
                if (!task) return res.status(404).json({ error: "Công việc không tồn tại" });
                workspaceId = task.project?.workspaceId;
                req.projectId = task.projectId;
            } else if (from === "department") {
                const dept = await prisma.department.findUnique({
                    where: { id: req.params[param] },
                    select: { workspaceId: true },
                });
                if (!dept) return res.status(404).json({ error: "Phòng ban không tồn tại" });
                workspaceId = dept.workspaceId;
            } else if (from === "comment") {
                const comment = await prisma.comment.findUnique({
                    where: { id: req.params[param] },
                    select: { userId: true, task: { select: { project: { select: { workspaceId: true } } } } },
                });
                if (!comment) return res.status(404).json({ error: "Bình luận không tồn tại" });
                workspaceId = comment.task?.project?.workspaceId;
                req.commentOwnerId = comment.userId;
            } else if (from === "subtask") {
                const subtask = await prisma.subtask.findUnique({
                    where: { id: req.params[param] },
                    select: { task: { select: { projectId: true, project: { select: { workspaceId: true } } } } },
                });
                if (!subtask) return res.status(404).json({ error: "Mục con không tồn tại" });
                workspaceId = subtask.task?.project?.workspaceId;
                req.projectId = subtask.task?.projectId;
            } else if (from === "phase") {
                const phase = await prisma.phase.findUnique({
                    where: { id: req.params[param] },
                    select: { projectId: true, project: { select: { workspaceId: true } } },
                });
                if (!phase) return res.status(404).json({ error: "Giai đoạn không tồn tại" });
                workspaceId = phase.project?.workspaceId;
                req.projectId = phase.projectId;
            } else if (from === "dependency") {
                const dep = await prisma.taskDependency.findUnique({
                    where: { id: req.params[param] },
                    select: { task: { select: { projectId: true, project: { select: { workspaceId: true } } } } },
                });
                if (!dep) return res.status(404).json({ error: "Phụ thuộc không tồn tại" });
                workspaceId = dep.task?.project?.workspaceId;
                req.projectId = dep.task?.projectId;
            } else if (from === "timelog") {
                const log = await prisma.timeLog.findUnique({
                    where: { id: req.params[param] },
                    select: { userId: true, task: { select: { projectId: true, project: { select: { workspaceId: true } } } } },
                });
                if (!log) return res.status(404).json({ error: "Bản ghi thời gian không tồn tại" });
                workspaceId = log.task?.project?.workspaceId;
                req.projectId = log.task?.projectId;
                req.timeLogOwnerId = log.userId;
            } else if (from === "equipment") {
                const eq = await prisma.equipment.findUnique({
                    where: { id: req.params[param] },
                    select: { workspaceId: true },
                });
                if (!eq) return res.status(404).json({ error: "Thiết bị không tồn tại" });
                workspaceId = eq.workspaceId;
            } else if (from === "risk") {
                const risk = await prisma.risk.findUnique({
                    where: { id: req.params[param] },
                    select: { createdBy: true, projectId: true, project: { select: { workspaceId: true, team_lead: true } } },
                });
                if (!risk) return res.status(404).json({ error: "Rủi ro không tồn tại" });
                workspaceId = risk.project?.workspaceId;
                req.projectId = risk.projectId;
                req.riskCreatorId = risk.createdBy;
                req.projectTeamLead = risk.project?.team_lead;
            } else if (from === "expense") {
                const exp = await prisma.expense.findUnique({
                    where: { id: req.params[param] },
                    select: { createdBy: true, projectId: true, project: { select: { workspaceId: true, team_lead: true } } },
                });
                if (!exp) return res.status(404).json({ error: "Khoản chi không tồn tại" });
                workspaceId = exp.project?.workspaceId;
                req.projectId = exp.projectId;
                req.expenseCreatorId = exp.createdBy;
                req.projectTeamLead = exp.project?.team_lead;
            } else if (from === "file") {
                const file = await prisma.file.findUnique({
                    where: { id: req.params[param] },
                    select: {
                        uploadedBy: true,
                        projectId: true,
                        project: { select: { workspaceId: true, team_lead: true } },
                        task: { select: { projectId: true, project: { select: { workspaceId: true, team_lead: true } } } },
                    },
                });
                if (!file) return res.status(404).json({ error: "File không tồn tại" });
                workspaceId = file.project?.workspaceId || file.task?.project?.workspaceId;
                req.fileOwnerId = file.uploadedBy;
                req.fileProjectId = file.projectId || file.task?.projectId || null;
                req.fileTeamLead = file.project?.team_lead || file.task?.project?.team_lead || null;
            }

            if (!workspaceId) return res.status(404).json({ error: "Không tìm thấy không gian làm việc" });

            const membership = await getMembership(userId, workspaceId);
            if (!membership) {
                return res.status(403).json({ error: "Bạn không phải thành viên của không gian làm việc này" });
            }

            // role có thể là chuỗi hoặc mảng vai trò được phép
            if (role) {
                const allowed = Array.isArray(role) ? role : [role];
                if (!allowed.includes(membership.role)) {
                    return res.status(403).json({ error: "Bạn không đủ quyền thực hiện thao tác này" });
                }
            }

            req.workspaceId = workspaceId;
            req.memberRole = membership.role;
            next();
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    };
};

/**
 * Yêu cầu vai trò ADMIN trong workspace. Phải chạy SAU requireMember
 * (cần req.memberRole). Dùng cho các thao tác chỉ quản trị viên được làm.
 */
export const requireAdmin = (req, res, next) => {
    if (req.memberRole !== "ADMIN") {
        return res.status(403).json({ error: "Chỉ quản trị viên mới được thực hiện thao tác này" });
    }
    next();
};

/**
 * Kiểm tra user là THÀNH VIÊN CỦA DỰ ÁN (không chỉ workspace).
 * Phải chạy SAU requireMember (cần req.workspaceId, req.memberRole).
 * ADMIN/MANAGER workspace được bỏ qua kiểm tra (quản lý toàn bộ dự án trong workspace).
 *
 * options.from: 'project' | 'task' | 'subtask' | 'phase' | 'timelog' — id lấy ở đâu để suy ra projectId.
 * options.param: tên param chứa id (mặc định 'id').
 */
export const requireProjectMember = ({ from = "project", param = "id" } = {}) => {
    return async (req, res, next) => {
        try {
            const userId = req.auth?.userId;
            if (!userId) return res.status(401).json({ error: "Chưa đăng nhập" });

            // ADMIN/MANAGER workspace quản lý mọi dự án — không cần là member dự án
            if (req.memberRole === "ADMIN" || req.memberRole === "MANAGER") return next();

            // Suy ra projectId (ưu tiên giá trị đã được requireMember gắn sẵn)
            let projectId = req.projectId;
            if (!projectId) {
                if (from === "project") {
                    projectId = req.params[param];
                } else if (from === "task") {
                    const task = await prisma.task.findUnique({
                        where: { id: req.params[param] },
                        select: { projectId: true },
                    });
                    projectId = task?.projectId;
                }
            }
            if (!projectId) return res.status(404).json({ error: "Không tìm thấy dự án" });

            // Trưởng dự án luôn được phép
            const project = await prisma.project.findUnique({
                where: { id: projectId },
                select: { team_lead: true },
            });
            if (project?.team_lead === userId) {
                req.projectId = projectId;
                return next();
            }

            const member = await prisma.projectMember.findUnique({
                where: { userId_projectId: { userId, projectId } },
                select: { id: true },
            });
            if (!member) {
                return res.status(403).json({ error: "Bạn không phải thành viên của dự án này" });
            }
            req.projectId = projectId;
            next();
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    };
};
