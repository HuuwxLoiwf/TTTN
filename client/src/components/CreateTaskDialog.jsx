import { useState, useEffect } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { useAuth } from "../context/AuthContext";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { apiFetch } from "../lib/api";
import { addTask } from "../features/workspaceSlice";

export default function CreateTaskDialog({ showCreateTask, setShowCreateTask, projectId }) {
    const currentWorkspace = useSelector((state) => state.workspace?.currentWorkspace || null);
    const project = currentWorkspace?.projects.find((p) => p.id === projectId);
    const teamMembers = project?.members || [];

    const dispatch = useDispatch();
    const { getToken } = useAuth();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [phases, setPhases] = useState([]);
    const [labelsText, setLabelsText] = useState(""); // nhãn: nhập cách nhau dấu phẩy
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        type: "TASK",
        status: "TODO",
        priority: "MEDIUM",
        assigneeId: "",
        due_date: "",
        phaseId: "",
    });

    useEffect(() => {
        if (!showCreateTask || !projectId) return;
        (async () => {
            try {
                const token = await getToken();
                const data = await apiFetch(token, `/phases/project/${projectId}`);
                setPhases(data);
            } catch { /* silent */ }
        })();
    }, [showCreateTask, projectId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!projectId) return;

        // Bắt buộc TẤT CẢ các trường — không để "không xác định"
        if (!formData.title.trim()) return toast.error("Vui lòng nhập tiêu đề công việc");
        if (!formData.description.trim()) return toast.error("Vui lòng nhập mô tả công việc");
        if (!formData.assigneeId) return toast.error("Vui lòng chọn người thực hiện");
        if (!formData.due_date) return toast.error("Vui lòng chọn hạn chót");
        if (phases.length === 0) return toast.error("Dự án chưa có giai đoạn nào. Hãy tạo giai đoạn ở tab Giai đoạn trước khi thêm công việc.");
        if (!formData.phaseId) return toast.error("Vui lòng chọn giai đoạn cho công việc");

        setIsSubmitting(true);
        try {
            const token = await getToken();
            const labels = labelsText.split(",").map((s) => s.trim()).filter(Boolean);
            const task = await apiFetch(token, `/tasks/project/${projectId}`, {
                method: 'POST',
                body: { ...formData, labels },
            });
            dispatch(addTask({ ...task, projectId }));
            setShowCreateTask(false);
            setFormData({ title: "", description: "", type: "TASK", status: "TODO", priority: "MEDIUM", assigneeId: "", due_date: "", phaseId: "" });
            toast.success("Tạo công việc thành công!");
        } catch (err) {
            toast.error("Tạo công việc thất bại: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return showCreateTask ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white dark:bg-surface-card rounded-lg w-full max-w-md p-6 text-gray-900 dark:text-ink max-h-[90vh] overflow-y-auto shadow-spotify-lg">
                <h2 className="text-xl font-bold mb-4">Tạo công việc mới</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Title */}
                    <div className="space-y-1">
                        <label htmlFor="title" className="text-xs font-bold uppercase tracking-[1.5px] text-gray-600 dark:text-body">Tiêu đề <span className="text-m-red">*</span></label>
                        <input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Tiêu đề công việc" className="w-full bg-white dark:bg-surface-elevated rounded px-3 py-2 text-gray-900 dark:text-ink text-sm mt-1 dark:shadow-spotify-inset focus:outline-none focus:outline-1 focus:outline-white" required />
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                        <label htmlFor="description" className="text-xs font-bold uppercase tracking-[1.5px] text-gray-600 dark:text-body">Mô tả <span className="text-m-red">*</span></label>
                        <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Mô tả công việc" className="w-full bg-white dark:bg-surface-elevated rounded px-3 py-2 text-gray-900 dark:text-ink text-sm mt-1 h-24 dark:shadow-spotify-inset focus:outline-none focus:outline-1 focus:outline-white" required />
                    </div>

                    {/* Type & Priority */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-[1.5px] text-gray-600 dark:text-body">Loại</label>
                            <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full bg-white dark:bg-surface-elevated rounded px-3 py-2 text-gray-900 dark:text-ink text-sm mt-1 dark:shadow-spotify-inset focus:outline-none focus:outline-1 focus:outline-white" >
                                <option value="BUG">Lỗi</option>
                                <option value="FEATURE">Tính năng</option>
                                <option value="TASK">Nhiệm vụ</option>
                                <option value="IMPROVEMENT">Cải tiến</option>
                                <option value="OTHER">Khác</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-[1.5px] text-gray-600 dark:text-body">Độ ưu tiên</label>
                            <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="w-full bg-white dark:bg-surface-elevated rounded px-3 py-2 text-gray-900 dark:text-ink text-sm mt-1 dark:shadow-spotify-inset focus:outline-none focus:outline-1 focus:outline-white" >
                                <option value="LOW">Thấp</option>
                                <option value="MEDIUM">Trung bình</option>
                                <option value="HIGH">Cao</option>
                            </select>
                        </div>
                    </div>

                    {/* Assignee and Status */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-[1.5px] text-gray-600 dark:text-body">Người thực hiện <span className="text-m-red">*</span></label>
                            <select value={formData.assigneeId} onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })} className="w-full bg-white dark:bg-surface-elevated rounded px-3 py-2 text-gray-900 dark:text-ink text-sm mt-1 dark:shadow-spotify-inset focus:outline-none focus:outline-1 focus:outline-white" required >
                                <option value="">— Chọn người —</option>
                                {teamMembers.map((member) => (
                                    <option key={member?.user.id} value={member?.user.id}>
                                        {member?.user.email}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-[1.5px] text-gray-600 dark:text-body">Trạng thái</label>
                            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full bg-white dark:bg-surface-elevated rounded px-3 py-2 text-gray-900 dark:text-ink text-sm mt-1 dark:shadow-spotify-inset focus:outline-none focus:outline-1 focus:outline-white" >
                                <option value="TODO">Chờ làm</option>
                                <option value="IN_PROGRESS">Đang làm</option>
                                <option value="REVIEW">Đang review</option>
                                <option value="DONE">Hoàn thành</option>
                            </select>
                        </div>
                    </div>

                    {/* Giai đoạn — bắt buộc */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-[1.5px] text-gray-600 dark:text-body">Giai đoạn <span className="text-m-red">*</span></label>
                        {phases.length === 0 ? (
                            <p className="text-xs text-m-warning mt-1">
                                Dự án chưa có giai đoạn nào. Hãy sang tab <strong>Giai đoạn</strong> tạo giai đoạn trước.
                            </p>
                        ) : (
                            <select value={formData.phaseId} onChange={(e) => setFormData({ ...formData, phaseId: e.target.value })} className="w-full bg-white dark:bg-surface-elevated rounded px-3 py-2 text-gray-900 dark:text-ink text-sm mt-1 dark:shadow-spotify-inset focus:outline-none focus:outline-1 focus:outline-white" required>
                                <option value="">— Chọn giai đoạn —</option>
                                {phases.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Nhãn (labels) */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-[1.5px] text-gray-600 dark:text-body">Nhãn <span className="text-xs text-muted normal-case font-normal tracking-normal">(cách nhau dấu phẩy, VD: khẩn, frontend)</span></label>
                        <input value={labelsText} onChange={(e) => setLabelsText(e.target.value)} placeholder="khẩn, frontend, khách-hàng" className="w-full bg-white dark:bg-surface-elevated rounded px-3 py-2 text-gray-900 dark:text-ink text-sm mt-1 dark:shadow-spotify-inset focus:outline-none focus:outline-1 focus:outline-white" />
                    </div>

                    {/* Due Date — bắt buộc */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-[1.5px] text-gray-600 dark:text-body">Hạn chót <span className="text-m-red">*</span></label>
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="size-5 text-gray-500 dark:text-muted" />
                            <input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} min={new Date().toISOString().split('T')[0]} className="w-full bg-white dark:bg-surface-elevated rounded px-3 py-2 text-gray-900 dark:text-ink text-sm mt-1 dark:shadow-spotify-inset focus:outline-none focus:outline-1 focus:outline-white" />
                        </div>
                        {formData.due_date && (
                            <p className="text-xs text-gray-500 dark:text-muted">
                                {format(new Date(formData.due_date), "PPP")}
                            </p>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setShowCreateTask(false)} className="rounded-full border border-hairline-strong text-ink px-5 h-11 text-sm font-bold uppercase tracking-[1.4px] hover:bg-white/10 transition" >
                            Hủy
                        </button>
                        <button type="submit" disabled={isSubmitting} className="rounded-full px-5 h-11 text-sm font-bold uppercase tracking-[1.4px] bg-m-blue-light text-black hover:scale-105 transition disabled:opacity-50 disabled:hover:scale-100" >
                            {isSubmitting ? "Đang tạo..." : "Tạo công việc"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    ) : null;
}
