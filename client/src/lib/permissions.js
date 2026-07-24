// Quyền thao tác cấp DỰ ÁN ở client — phải KHỚP với server
// (routes/tasks.js, subtasks.js... dùng requireMember + requireProjectMember).
//
// Ai được thao tác công việc (đổi trạng thái, mục con, ghi giờ, phụ thuộc):
//   - ADMIN / MANAGER của workspace  → mọi dự án
//   - Trưởng dự án (project.team_lead)
//   - Thành viên của dự án (project.members)
// Người ngoài dự án (thành viên workspace nhưng chưa vào dự án): chỉ xem.

export const canManageProject = (workspace, project, userId) => {
    if (!userId) return false;
    const role = workspace?.members?.find((m) => m.userId === userId)?.role;
    if (role === "ADMIN" || role === "MANAGER") return true;
    if (project?.team_lead === userId) return true;
    return !!project?.members?.some((m) => m.userId === userId);
};

// Vai trò workspace của user hiện tại (tiện dùng lại)
export const getWorkspaceRole = (workspace, userId) =>
    workspace?.members?.find((m) => m.userId === userId)?.role;
