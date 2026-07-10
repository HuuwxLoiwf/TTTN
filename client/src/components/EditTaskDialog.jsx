import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useAuth, useUser } from "../context/AuthContext";
import { XIcon, TimerIcon } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import toast from "react-hot-toast";
import { apiFetch } from "../lib/api";
import { updateTask } from "../features/workspaceSlice";

// Kế hoạch mặc định: chia tổng số ngày thành 4 phần, phần dư dồn cho
// IN_PROGRESS → REVIEW → TODO (giống defaultPlan phía server).
const defaultPlan = (totalDays) => {
    const n = Number(totalDays);
    const d = Number.isFinite(n) && n > 0 ? Math.round(n) : 4; // an toàn với NaN/0
    const base = Math.floor(d / 4);
    const plan = { TODO: base, IN_PROGRESS: base, REVIEW: base, DONE: base };
    const bonus = ["IN_PROGRESS", "REVIEW", "TODO"];
    for (let i = 0; i < d - base * 4; i++) plan[bonus[i % bonus.length]] += 1;
    return plan;
};

const PLAN_LABELS = { TODO: "Chờ làm", IN_PROGRESS: "Đang làm", REVIEW: "Review", DONE: "Hoàn thành" };

const EditTaskDialog = ({ task, projectId, onClose }) => {
    const dispatch = useDispatch();
    const { getToken } = useAuth();
    const { user } = useUser();
    const { currentWorkspace } = useSelector((state) => state.workspace);
    const project = currentWorkspace?.projects?.find((p) => p.id === projectId);
    const members = project?.members || [];
    const [phases, setPhases] = useState([]);

    // Quyền chỉnh chế độ tự động: ADMIN / MANAGER / trưởng dự án
    const myRole = currentWorkspace?.members?.find((m) => m.userId === user?.id)?.role;
    const canManageAuto = myRole === "ADMIN" || myRole === "MANAGER" || project?.team_lead === user?.id;

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
    const [labelsText, setLabelsText] = useState((task.labels || []).join(", "));

    // Tự động chuyển trạng thái theo thời gian
    const totalDays = form.due_date
        ? Math.max(1, differenceInCalendarDays(new Date(form.due_date), new Date(task.createdAt)))
        : 0;
    const [autoOn, setAutoOn] = useState(!!task.autoStatus);
    const [plan, setPlan] = useState(task.statusPlan || defaultPlan(totalDays || 4));
    const planSum = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"].reduce((s, k) => s + (Number(plan[k]) || 0), 0);

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
                labels: labelsText.split(",").map((s) => s.trim()).filter(Boolean),
            };
            if (form.due_date) body.due_date = new Date(form.due_date).toISOString();
            // Chế độ tự động chuyển trạng thái (chỉ người có quyền mới gửi)
            if (canManageAuto) {
                body.autoStatus = autoOn;
                if (autoOn) {
                    if (planSum <= 0) {
                        toast.error("Tổng số ngày kế hoạch phải lớn hơn 0");
                        setSaving(false);
                        return;
                    }
                    body.statusPlan = {
                        TODO: Number(plan.TODO) || 0,
                        IN_PROGRESS: Number(plan.IN_PROGRESS) || 0,
                        REVIEW: Number(plan.REVIEW) || 0,
                        DONE: Number(plan.DONE) || 0,
                    };
                }
            }
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

    const inputCls = "w-full px-3 py-2 bg-white dark:bg-surface-elevated rounded text-sm text-gray-900 dark:text-ink mt-1 dark:shadow-spotify-inset focus:outline-none focus:outline-1 focus:outline-white";
    const labelCls = "text-xs font-bold uppercase tracking-[1.5px] text-gray-600 dark:text-body";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white dark:bg-surface-card rounded-lg p-6 w-full max-w-md text-gray-900 dark:text-ink relative max-h-[90vh] overflow-y-auto shadow-spotify-lg">
                <button className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:text-muted dark:hover:text-ink" onClick={onClose}>
                    <XIcon className="size-5" />
                </button>
                <h2 className="text-xl font-bold mb-4">Chỉnh sửa công việc</h2>

                <form onSubmit={handleSave} className="space-y-3">
                    <div>
                        <label className={labelCls}>Tiêu đề</label>
                        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} required />
                    </div>
                    <div>
                        <label className={labelCls}>Mô tả</label>
                        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls + " h-20"} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelCls}>Loại</label>
                            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>
                                <option value="TASK">Nhiệm vụ</option>
                                <option value="BUG">Lỗi</option>
                                <option value="FEATURE">Tính năng</option>
                                <option value="IMPROVEMENT">Cải tiến</option>
                                <option value="OTHER">Khác</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Ưu tiên</label>
                            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={inputCls}>
                                <option value="LOW">Thấp</option>
                                <option value="MEDIUM">Trung bình</option>
                                <option value="HIGH">Cao</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className={labelCls}>Người thực hiện</label>
                        <select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })} className={inputCls}>
                            <option value="">Chưa giao</option>
                            {members.map((m) => (
                                <option key={m.user.id} value={m.user.id}>{m.user.name || m.user.email}</option>
                            ))}
                        </select>
                    </div>
                    {phases.length > 0 && (
                        <div>
                            <label className={labelCls}>Giai đoạn</label>
                            <select value={form.phaseId} onChange={(e) => setForm({ ...form, phaseId: e.target.value })} className={inputCls}>
                                <option value="">Chưa phân giai đoạn</option>
                                {phases.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className={labelCls}>Nhãn <span className="text-xs text-gray-500 dark:text-muted normal-case font-normal tracking-normal">(cách nhau dấu phẩy)</span></label>
                        <input value={labelsText} onChange={(e) => setLabelsText(e.target.value)} placeholder="khẩn, frontend" className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>Hạn chót</label>
                        <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className={inputCls} />
                    </div>

                    {/* Tự động chuyển trạng thái theo thời gian — ADMIN/MANAGER/trưởng dự án */}
                    {canManageAuto && form.due_date && (
                        <div className="rounded dark:shadow-spotify-inset p-3 space-y-2">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={autoOn}
                                    onChange={(e) => {
                                        setAutoOn(e.target.checked);
                                        if (e.target.checked && !task.statusPlan) setPlan(defaultPlan(totalDays));
                                    }}
                                    className="accent-bmw-blue"
                                />
                                <TimerIcon className="size-4 text-bmw-blue" />
                                <span className="font-medium">Tự động chuyển trạng thái theo thời gian</span>
                            </label>
                            <p className="text-xs text-gray-500 dark:text-muted">
                                Tổng {totalDays} ngày (từ lúc tạo đến hạn chót) chia cho 4 trạng thái. Hệ thống tự
                                tiến trạng thái tới Review; Hoàn thành phải xác nhận tay và chỉ được phép từ khi vào
                                khoảng &quot;Hoàn thành&quot;.
                            </p>
                            {autoOn && (
                                <div className="grid grid-cols-4 gap-2">
                                    {["TODO", "IN_PROGRESS", "REVIEW", "DONE"].map((k) => (
                                        <div key={k}>
                                            <label className="text-[11px] text-gray-500 dark:text-muted">{PLAN_LABELS[k]}</label>
                                            <input
                                                type="number" min="0"
                                                value={plan[k]}
                                                onChange={(e) => setPlan({ ...plan, [k]: e.target.value })}
                                                className="w-full px-2 py-1 bg-white dark:bg-surface-elevated rounded text-sm text-center dark:shadow-spotify-inset focus:outline-none focus:outline-1 focus:outline-white"
                                            />
                                        </div>
                                    ))}
                                    <p className={`col-span-4 text-[11px] ${planSum === totalDays ? "text-m-success" : "text-m-warning"}`}>
                                        Tổng kế hoạch: {planSum} ngày {planSum !== totalDays ? `(khác ${totalDays} ngày thực tế — sẽ chia theo tỷ lệ)` : "— khớp thời hạn"}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="h-11 px-4 rounded-full border border-hairline-strong text-ink text-sm font-bold uppercase tracking-[1.4px] hover:bg-white/10 transition">Hủy</button>
                        <button type="submit" disabled={saving} className="h-11 px-4 rounded-full bg-m-blue-light text-black text-sm font-bold uppercase tracking-[1.4px] hover:scale-105 transition disabled:opacity-50 disabled:hover:scale-100">
                            {saving ? "Đang lưu..." : "Lưu"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditTaskDialog;
