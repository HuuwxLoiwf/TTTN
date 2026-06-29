import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../context/AuthContext";
import { XIcon } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { apiFetch } from "../lib/api";
import { updateTask } from "../features/workspaceSlice";

const EditTaskDialog = ({ task, projectId, onClose }) => {
    const dispatch = useDispatch();
    const { getToken } = useAuth();
    const { currentWorkspace } = useSelector((state) => state.workspace);
    const project = currentWorkspace?.projects?.find((p) => p.id === projectId);
    const members = project?.members || [];
    const [phases, setPhases] = useState([]);

    const [form, setForm] = useState({
        title: task.title || "",
        description: task.description || "",
        type: task.type || "TASK",
        priority: task.priority || "MEDIUM",
        status: task.status || "TODO",
        assigneeId: task.assigneeId || "",
        due_date: task.due_date ? format(new Date(task.due_date), "yyyy-MM-dd") : "",
        phaseId: task.phaseId || "",
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const token = await getToken();
                const data = await apiFetch(token, `/phases/project/${projectId}`);
                setPhases(data);
            } catch { /* silent */ }
        })();
    }, [projectId]);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) {
            toast.error("Tiêu đề không được để trống");
            return;
        }
        setSaving(true);
        try {
            const token = await getToken();
            const body = {
                title: form.title,
                description: form.description,
                type: form.type,
                priority: form.priority,
                assigneeId: form.assigneeId || null,
                phaseId: form.phaseId || null,
            };
            if (form.due_date) body.due_date = new Date(form.due_date).toISOString();
            const updated = await apiFetch(token, `/tasks/${task.id}`, { method: "PUT", body });
            dispatch(updateTask({ ...updated, projectId }));
            toast.success("Đã cập nhật công việc");
            onClose();
        } catch (err) {
            toast.error("Cập nhật thất bại: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const inputCls = "w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-200 mt-1";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 dark:bg-black/60 backdrop-blur p-4">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-md text-zinc-900 dark:text-zinc-200 relative max-h-[90vh] overflow-y-auto">
                <button className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200" onClick={onClose}>
                    <XIcon className="size-5" />
                </button>
                <h2 className="text-xl font-medium mb-4">Chỉnh sửa công việc</h2>

                <form onSubmit={handleSave} className="space-y-3">
                    <div>
                        <label className="text-sm">Tiêu đề</label>
                        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} required />
                    </div>
                    <div>
                        <label className="text-sm">Mô tả</label>
                        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls + " h-20"} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm">Loại</label>
                            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>
                                <option value="TASK">Nhiệm vụ</option>
                                <option value="BUG">Lỗi</option>
                                <option value="FEATURE">Tính năng</option>
                                <option value="IMPROVEMENT">Cải tiến</option>
                                <option value="OTHER">Khác</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm">Ưu tiên</label>
                            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={inputCls}>
                                <option value="LOW">Thấp</option>
                                <option value="MEDIUM">Trung bình</option>
                                <option value="HIGH">Cao</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm">Người thực hiện</label>
                        <select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })} className={inputCls}>
                            <option value="">Chưa giao</option>
                            {members.map((m) => (
                                <option key={m.user.id} value={m.user.id}>{m.user.name || m.user.email}</option>
                            ))}
                        </select>
                    </div>
                    {phases.length > 0 && (
                        <div>
                            <label className="text-sm">Giai đoạn</label>
                            <select value={form.phaseId} onChange={(e) => setForm({ ...form, phaseId: e.target.value })} className={inputCls}>
                                <option value="">Chưa phân giai đoạn</option>
                                {phases.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="text-sm">Hạn chót</label>
                        <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className={inputCls} />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">Hủy</button>
                        <button type="submit" disabled={saving} className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-50">
                            {saving ? "Đang lưu..." : "Lưu"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditTaskDialog;
