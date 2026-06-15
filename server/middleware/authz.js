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
                    select: { project: { select: { workspaceId: true } } },
                });
                if (!task) return res.status(404).json({ error: "Công việc không tồn tại" });
                workspaceId = task.project?.workspaceId;
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
            }

            if (!workspaceId) return res.status(404).json({ error: "Không tìm thấy không gian làm việc" });

            const membership = await getMembership(userId, workspaceId);
            if (!membership) {
                return res.status(403).json({ error: "Bạn không phải thành viên của không gian làm việc này" });
            }
            if (role === "ADMIN" && membership.role !== "ADMIN") {
                return res.status(403).json({ error: "Chỉ quản trị viên mới được thực hiện" });
            }

            req.workspaceId = workspaceId;
            req.memberRole = membership.role;
            next();
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    };
};
