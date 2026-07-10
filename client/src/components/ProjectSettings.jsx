import { format } from "date-fns";
import { Plus, Save, Trash2, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useAuth, useUser } from "../context/AuthContext";
import toast from "react-hot-toast";
import { apiFetch } from "../lib/api";
import { updateProject, removeProject, addProject } from "../features/workspaceSlice";
import AddProjectMember from "./AddProjectMember";
import PendingMemberRequests from "./PendingMemberRequests";

export default function ProjectSettings({ project }) {

    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { getToken } = useAuth();
    const { user } = useUser();
    const { currentWorkspace } = useSelector((state) => state.workspace);
    const [isDeleting, setIsDeleting] = useState(false);

    // Chỉ ADMIN của workspace mới được xóa dự án (khớp phân quyền backend)
    const isAdmin = currentWorkspace?.members?.some(
        (m) => m.userId === user?.id && m.role === "ADMIN"
    );
    // Admin hoặc trưởng dự án mới được duyệt yêu cầu thành viên
    const canReview = isAdmin || project?.team_lead === user?.id;

    // Sau khi duyệt yêu cầu: tải lại dự án để cập nhật danh sách thành viên
    const refetchProject = async () => {
        try {
            const token = await getToken();
            const updated = await apiFetch(token, `/projects/${project.id}`);
            dispatch(updateProject(updated));
        } catch {
            /* silent */
        }
    };

    const handleDelete = async () => {
        if (!project) return;
        if (!window.confirm(`Xóa dự án "${project.name}"? Toàn bộ công việc, bình luận, tài liệu sẽ bị xóa vĩnh viễn.`)) return;
        setIsDeleting(true);
        try {
            const token = await getToken();
            await apiFetch(token, `/projects/${project.id}`, { method: "DELETE" });
            dispatch(removeProject(project.id));
            toast.success("Đã xóa dự án");
            navigate("/projects");
        } catch (err) {
            toast.error("Xóa thất bại: " + err.message);
        } finally {
            setIsDeleting(false);
        }
    };

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        status: "PLANNING",
        priority: "MEDIUM",
        start_date: "",
        end_date: "",
        budget: "",
    });
    const [duplicating, setDuplicating] = useState(false);

    // Nhân bản dự án làm mẫu (copy giai đoạn + công việc, reset trạng thái)
    const handleDuplicate = async () => {
        if (!window.confirm(`Nhân bản dự án "${project.name}"? Toàn bộ giai đoạn + công việc sẽ được sao chép (đưa về Chờ làm, bỏ người được giao).`)) return;
        setDuplicating(true);
        try {
            const token = await getToken();
            const copy = await apiFetch(token, `/projects/${project.id}/duplicate`, { method: "POST" });
            dispatch(addProject(copy));
            toast.success("Đã nhân bản dự án");
            navigate(`/projectsDetail?id=${copy.id}&tab=tasks`);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setDuplicating(false);
        }
    };

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!project) return;
        setIsSubmitting(true);
        try {
            const token = await getToken();
            const updated = await apiFetch(token, `/projects/${project.id}`, {
                method: 'PUT',
                body: {
                    ...formData,
                    start_date: formData.start_date ? new Date(formData.start_date).toISOString() : undefined,
                    end_date: formData.end_date ? new Date(formData.end_date).toISOString() : undefined,
                    budget: formData.budget === "" ? null : Number(formData.budget),
                },
            });
            dispatch(updateProject(updated));
            toast.success("Lưu thay đổi thành công!");
        } catch (err) {
            toast.error("Lưu thất bại: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (project) {
            setFormData({
                name: project.name || "",
                description: project.description || "",
                status: project.status || "PLANNING",
                priority: project.priority || "MEDIUM",
                start_date: project.start_date ? format(new Date(project.start_date), "yyyy-MM-dd") : "",
                end_date: project.end_date ? format(new Date(project.end_date), "yyyy-MM-dd") : "",
                budget: project.budget ?? "",
            });
        }
    }, [project]);

    const inputClasses = "w-full px-3 py-2 mt-2 rounded text-sm bg-gray-50 dark:bg-surface-elevated text-gray-900 dark:text-ink focus:outline-none shadow-spotify-inset transition";
    const cardClasses = "bg-white dark:bg-surface-card rounded-lg p-6 shadow-spotify-md";
    const labelClasses = "text-sm text-gray-600 dark:text-muted";

    return (
        <div className="grid lg:grid-cols-2 gap-8">
            {/* Project Details */}
            <div className={cardClasses}>
                <h2 className="text-lg font-bold text-gray-900 dark:text-ink mb-4">Thông tin dự án</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name */}
                    <div className="space-y-2">
                        <label className={labelClasses}>Tên dự án</label>
                        <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputClasses} required />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className={labelClasses}>Mô tả</label>
                        <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className={inputClasses + " h-24"} />
                    </div>

                    {/* Status & Priority */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className={labelClasses}>Trạng thái</label>
                            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className={inputClasses} >
                                <option value="PLANNING">Lên kế hoạch</option>
                                <option value="ACTIVE">Đang hoạt động</option>
                                <option value="ON_HOLD">Tạm dừng</option>
                                <option value="COMPLETED">Hoàn thành</option>
                                <option value="CANCELLED">Đã hủy</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className={labelClasses}>Độ ưu tiên</label>
                            <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className={inputClasses} >
                                <option value="LOW">Thấp</option>
                                <option value="MEDIUM">Trung bình</option>
                                <option value="HIGH">Cao</option>
                            </select>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className={labelClasses}>Ngày bắt đầu</label>
                            <input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className={inputClasses} />
                        </div>
                        <div className="space-y-2">
                            <label className={labelClasses}>Ngày kết thúc</label>
                            <input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className={inputClasses} />
                        </div>
                    </div>

                    {/* Ngân sách dự án */}
                    <div className="space-y-2">
                        <label className={labelClasses}>Ngân sách (VNĐ) <span className="text-xs text-muted">— để trống nếu không quản lý</span></label>
                        <input type="number" min="0" step="100000" value={formData.budget}
                            onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                            placeholder="VD: 50000000" className={inputClasses} />
                    </div>

                    {/* Progress — tự động tính theo % công việc hoàn thành */}
                    <div className="space-y-2">
                        <label className={labelClasses}>Tiến độ: {project.progress || 0}% <span className="text-xs text-muted">(tự động theo công việc hoàn thành)</span></label>
                        <div className="w-full h-1.5 bg-gray-200 dark:bg-surface-elevated rounded-full overflow-hidden">
                            <div className="h-full bg-m-blue-light rounded-full transition-all" style={{ width: `${project.progress || 0}%` }} />
                        </div>
                    </div>

                    {/* Save Button */}
                    <button type="submit" disabled={isSubmitting} className="ml-auto flex items-center text-sm justify-center gap-2 bg-m-blue-light text-black uppercase font-bold tracking-[1.4px] rounded-full px-6 h-11 hover:scale-105 transition disabled:opacity-40 disabled:hover:scale-100" >
                        <Save className="size-4" /> {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
                </form>
            </div>

            {/* Team Members */}
            <div className="space-y-6">
                <div className={cardClasses}>
                    <div className="flex items-center justify-between gap-4">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-ink mb-4">
                            Thành viên nhóm <span className="text-sm font-normal text-gray-600 dark:text-muted">({project.members.length})</span>
                        </h2>
                        <button type="button" onClick={() => setIsDialogOpen(true)} className="p-2 rounded-full bg-gray-100 dark:bg-surface-elevated hover:scale-105 transition" >
                            <Plus className="size-4 text-gray-900 dark:text-ink" />
                        </button>
                        <AddProjectMember isDialogOpen={isDialogOpen} setIsDialogOpen={setIsDialogOpen} />
                    </div>

                    {/* Member List */}
                    {project.members.length > 0 && (
                        <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
                            {project.members.map((member, index) => (
                                <div key={index} className="flex items-center justify-between px-3 py-2 rounded-full bg-gray-50 dark:bg-surface-soft text-sm text-gray-900 dark:text-body" >
                                    <span> {member?.user?.email || "Unknown"} </span>
                                    {project.team_lead === member.user.id && <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-surface-elevated text-muted">Trưởng nhóm</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Yêu cầu chờ duyệt — chỉ admin/trưởng dự án */}
                {canReview && (
                    <PendingMemberRequests projectId={project.id} onApproved={refetchProject} />
                )}

                {/* Nhân bản dự án — dùng làm mẫu (template) */}
                {canReview && (
                    <div className={cardClasses}>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-ink mb-1">Dùng làm mẫu</h2>
                        <p className="text-sm text-gray-500 dark:text-muted mb-3">
                            Tạo dự án mới từ dự án này: sao chép toàn bộ giai đoạn và công việc (đưa về &quot;Chờ làm&quot;).
                        </p>
                        <button type="button" onClick={handleDuplicate} disabled={duplicating}
                            className="flex items-center gap-2 text-sm uppercase font-bold tracking-[1.4px] rounded-full px-5 h-11 bg-gray-100 dark:bg-surface-elevated text-gray-900 dark:text-ink hover:scale-105 transition disabled:opacity-40 disabled:hover:scale-100">
                            <Copy className="size-4" /> {duplicating ? "Đang nhân bản..." : "Nhân bản dự án"}
                        </button>
                    </div>
                )}

                {/* Vùng nguy hiểm — chỉ ADMIN */}
                {isAdmin && (
                    <div className="rounded-lg p-6 bg-surface-card shadow-spotify-md">
                        <h2 className="text-lg font-bold text-m-red mb-1">Vùng nguy hiểm</h2>
                        <p className="text-sm text-m-red/80 mb-4">
                            Xóa dự án là hành động không thể hoàn tác. Toàn bộ công việc, bình luận và tài liệu sẽ bị xóa.
                        </p>
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="flex items-center gap-2 text-sm uppercase font-bold tracking-[1.4px] rounded-full border border-m-red text-m-red px-5 h-11 hover:bg-m-red hover:text-white transition disabled:opacity-40"
                        >
                            <Trash2 className="size-4" /> {isDeleting ? "Đang xóa..." : "Xóa dự án"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
