import { format } from "date-fns";
import { Plus, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import { apiFetch } from "../lib/api";
import { updateProject } from "../features/workspaceSlice";
import AddProjectMember from "./AddProjectMember";

export default function ProjectSettings({ project }) {

    const dispatch = useDispatch();
    const { getToken } = useAuth();

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        status: "PLANNING",
        priority: "MEDIUM",
        start_date: "",
        end_date: "",
        progress: 0,
    });

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
                progress: project.progress || 0,
            });
        }
    }, [project]);

    const inputClasses = "w-full px-3 py-2 rounded mt-2 border text-sm dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-300";
    const cardClasses = "rounded-lg border p-6 not-dark:bg-white dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border-zinc-300 dark:border-zinc-800";
    const labelClasses = "text-sm text-zinc-600 dark:text-zinc-400";

    return (
        <div className="grid lg:grid-cols-2 gap-8">
            {/* Project Details */}
            <div className={cardClasses}>
                <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-300 mb-4">Thông tin dự án</h2>
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

                    {/* Progress */}
                    <div className="space-y-2">
                        <label className={labelClasses}>Tiến độ: {formData.progress}%</label>
                        <input type="range" min="0" max="100" step="5" value={formData.progress} onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })} className="w-full accent-blue-500 dark:accent-blue-400" />
                    </div>

                    {/* Save Button */}
                    <button type="submit" disabled={isSubmitting} className="ml-auto flex items-center text-sm justify-center gap-2 bg-gradient-to-br from-blue-500 to-blue-600 text-white px-4 py-2 rounded disabled:opacity-50" >
                        <Save className="size-4" /> {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
                </form>
            </div>

            {/* Team Members */}
            <div className="space-y-6">
                <div className={cardClasses}>
                    <div className="flex items-center justify-between gap-4">
                        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-300 mb-4">
                            Thành viên nhóm <span className="text-sm text-zinc-600 dark:text-zinc-400">({project.members.length})</span>
                        </h2>
                        <button type="button" onClick={() => setIsDialogOpen(true)} className="p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800" >
                            <Plus className="size-4 text-zinc-900 dark:text-zinc-300" />
                        </button>
                        <AddProjectMember isDialogOpen={isDialogOpen} setIsDialogOpen={setIsDialogOpen} />
                    </div>

                    {/* Member List */}
                    {project.members.length > 0 && (
                        <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
                            {project.members.map((member, index) => (
                                <div key={index} className="flex items-center justify-between px-3 py-2 rounded dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-300" >
                                    <span> {member?.user?.email || "Unknown"} </span>
                                    {project.team_lead === member.user.id && <span className="px-2 py-0.5 rounded-xs ring ring-zinc-200 dark:ring-zinc-600">Trưởng nhóm</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
