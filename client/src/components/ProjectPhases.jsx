import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useAuth, useUser } from "../context/AuthContext";
import { Layers, Plus, Trash2, User as UserIcon, CalendarIcon, Paperclip, FileText, Eye, X } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import toast from "react-hot-toast";
import { apiFetch, API_BASE_URL } from "../lib/api";
import { updateTask } from "../features/workspaceSlice";
import FilePreview, { canPreview } from "./FilePreview";

const STATUS_VI = { TODO: "Chờ làm", IN_PROGRESS: "Đang làm", REVIEW: "Review", DONE: "Hoàn thành" };
const STATUS_CLS = {
    TODO: "bg-surface-elevated text-gray-700 dark:text-body",
    IN_PROGRESS: "bg-bmw-blue/15 text-bmw-blue",
    REVIEW: "bg-m-warning/15 text-m-warning",
    DONE: "bg-m-success/15 text-m-success",
};

const ProjectPhases = ({ projectId, tasks }) => {
    const { getToken } = useAuth();
    const { user } = useUser();
    const dispatch = useDispatch();
    const { currentWorkspace } = useSelector((state) => state.workspace);
    const project = currentWorkspace?.projects?.find((p) => p.id === projectId);
    const members = project?.members || [];
    const isManager = currentWorkspace?.members?.some((m) => m.userId === user?.id && (m.role === "ADMIN" || m.role === "MANAGER")) ||
        project?.team_lead === user?.id;

    const [phases, setPhases] = useState([]);
    const [form, setForm] = useState({ name: "", startDate: "", endDate: "", assigneeId: "" });
    const [adding, setAdding] = useState(false);
    const [uploadingPhase, setUploadingPhase] = useState(null); // phaseId đang upload
    const [previewFile, setPreviewFile] = useState(null);
    const fileInputRef = useRef(null);
    const uploadTargetRef = useRef(null); // phaseId đích khi chọn file

    const load = async () => {
        try {
            const token = await getToken();
            const data = await apiFetch(token, `/phases/project/${projectId}`);
            // Phòng vệ: chỉ nhận mảng (nếu API lỗi trả object → không crash .map)
            setPhases(Array.isArray(data) ? data : []);
        } catch {
            setPhases([]);
        }
    };

    useEffect(() => {
        if (projectId) load();
    }, [projectId, tasks]);

    const addPhase = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) {
            toast.error("Vui lòng nhập tên giai đoạn");
            return;
        }
        if (!form.startDate || !form.endDate) {
            toast.error("Vui lòng nhập ngày bắt đầu và ngày kết thúc");
            return;
        }
        if (form.endDate < form.startDate) {
            toast.error("Ngày kết thúc phải sau ngày bắt đầu");
            return;
        }
        if (!form.assigneeId) {
            toast.error("Vui lòng chọn người phụ trách giai đoạn");
            return;
        }
        setAdding(true);
        try {
            const token = await getToken();
            await apiFetch(token, `/phases/project/${projectId}`, {
                method: "POST",
                body: {
                    name: form.name,
                    startDate: form.startDate || null,
                    endDate: form.endDate || null,
                    assigneeId: form.assigneeId || null,
                },
            });
            setForm({ name: "", startDate: "", endDate: "", assigneeId: "" });
            load();
            toast.success("Đã thêm giai đoạn");
        } catch (err) {
            toast.error(err.message);
        } finally {
            setAdding(false);
        }
    };

    const removePhase = async (id) => {
        if (!window.confirm("Xóa giai đoạn này? Công việc trong giai đoạn sẽ không bị xóa.")) return;
        try {
            const token = await getToken();
            await apiFetch(token, `/phases/${id}`, { method: "DELETE" });
            load();
        } catch (err) {
            toast.error(err.message);
        }
    };

    // Nộp file cho giai đoạn (mọi thành viên dự án)
    const pickFile = (phaseId) => {
        uploadTargetRef.current = phaseId;
        fileInputRef.current?.click();
    };

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        const phaseId = uploadTargetRef.current;
        if (!file || !phaseId) return;
        setUploadingPhase(phaseId);
        try {
            const token = await getToken();
            const formData = new FormData();
            formData.append("file", file);
            formData.append("phaseId", phaseId);
            const res = await fetch(`${API_BASE_URL}/files/upload`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Tải lên thất bại");
            }
            toast.success("Đã nộp tài liệu cho giai đoạn");
            load();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setUploadingPhase(null);
        }
    };

    const removeFile = async (fileId) => {
        if (!window.confirm("Xóa tài liệu này?")) return;
        try {
            const token = await getToken();
            await apiFetch(token, `/files/${fileId}`, { method: "DELETE" });
            load();
        } catch (err) {
            toast.error(err.message);
        }
    };

    // Task của từng giai đoạn (lọc từ tasks truyền vào)
    const tasksOfPhase = (phaseId) => tasks.filter((t) => t.phaseId === phaseId);
    const unassignedTasks = tasks.filter((t) => !t.phaseId);

    // Gán 1 công việc vào giai đoạn (hoặc gỡ nếu phaseId rỗng). Cập nhật Redux để UI đổi ngay.
    const assignTaskToPhase = async (taskId, phaseId) => {
        try {
            const token = await getToken();
            const updated = await apiFetch(token, `/tasks/${taskId}`, {
                method: "PUT",
                body: { phaseId: phaseId || null },
            });
            dispatch(updateTask({ ...updated, projectId }));
            toast.success(phaseId ? "Đã gán vào giai đoạn" : "Đã gỡ khỏi giai đoạn");
        } catch (err) {
            toast.error(err.message);
        }
    };

    const inputCls = "px-3 py-2 bg-surface-elevated text-sm rounded-lg shadow-spotify-inset focus:outline-none";

    return (
        <div className="space-y-5">
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />

            {/* Thêm giai đoạn (admin/quản lý/trưởng dự án) — có thời gian + người phụ trách */}
            {isManager && (
                <form onSubmit={addPhase} className="bg-surface-card rounded-lg p-4 space-y-3">
                    <div className="flex gap-2 flex-wrap">
                        <input
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="Tên giai đoạn (VD: Giai đoạn 1 - Thiết kế)"
                            className={inputCls + " flex-1 min-w-52"}
                        />
                        <button type="submit" disabled={adding} className="px-5 py-2 rounded-full bg-m-blue-light text-black font-bold text-sm flex items-center gap-1 disabled:opacity-50 hover:scale-105 transition-transform">
                            <Plus className="size-4" /> Thêm giai đoạn
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                            <label className="text-xs text-gray-500 dark:text-muted">Bắt đầu <span className="text-m-red">*</span></label>
                            <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={inputCls + " w-full mt-0.5"} required />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 dark:text-muted">Kết thúc <span className="text-m-red">*</span></label>
                            <input type="date" value={form.endDate} min={form.startDate || undefined} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className={inputCls + " w-full mt-0.5"} required />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 dark:text-muted">Người phụ trách <span className="text-m-red">*</span></label>
                            <select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })} className={inputCls + " w-full mt-0.5"} required>
                                <option value="">— Chọn người —</option>
                                {members.map((m) => (
                                    <option key={m.user.id} value={m.user.id}>{m.user.name || m.user.email}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </form>
            )}

            {phases.length === 0 && (
                <div className="text-center py-10 text-gray-400 dark:text-muted">
                    <Layers className="size-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Chưa có giai đoạn nào. {isManager ? "Tạo giai đoạn để chia công việc theo mốc." : ""}</p>
                </div>
            )}

            {/* Mỗi giai đoạn */}
            {phases.map((phase) => {
                const phaseTasks = tasksOfPhase(phase.id);
                const durationDays =
                    phase.startDate && phase.endDate
                        ? differenceInCalendarDays(new Date(phase.endDate), new Date(phase.startDate)) + 1
                        : null;
                const overdue = phase.endDate && new Date(phase.endDate) < new Date() && phase.progress < 100;
                return (
                    <div key={phase.id} className="bg-surface-card rounded-lg p-4 transition-shadow hover:shadow-spotify-md">
                        <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <Layers className="size-5 text-bmw-blue" />
                                <h3 className="font-bold text-gray-900 dark:text-ink">{phase.name}</h3>
                                <span className="text-xs text-gray-500 dark:text-muted">
                                    {phase.doneTasks}/{phase.totalTasks} xong
                                </span>
                            </div>
                            {isManager && (
                                <button onClick={() => removePhase(phase.id)} className="p-1.5 rounded-full text-gray-400 hover:text-m-red hover:bg-white/10 transition-colors">
                                    <Trash2 className="size-4" />
                                </button>
                            )}
                        </div>

                        {/* Thời gian + người phụ trách */}
                        <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500 dark:text-muted mb-2">
                            <span className={`flex items-center gap-1 ${overdue ? "text-m-red font-medium" : ""}`}>
                                <CalendarIcon className="size-3.5" />
                                {phase.startDate ? format(new Date(phase.startDate), "dd/MM/yyyy") : "?"}
                                {" → "}
                                {phase.endDate ? format(new Date(phase.endDate), "dd/MM/yyyy") : "?"}
                                {durationDays ? ` (${durationDays} ngày)` : ""}
                                {overdue ? " — trễ hạn" : ""}
                            </span>
                            <span className="flex items-center gap-1">
                                <UserIcon className="size-3.5" />
                                Phụ trách: {phase.assignee?.name || phase.assignee?.email || "Chưa chọn"}
                            </span>
                        </div>

                        {/* Thanh tiến độ */}
                        <div className="flex items-center gap-2 mb-3">
                            <div className="flex-1 h-1.5 rounded-full bg-surface-elevated overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${phase.progress >= 100 ? "bg-m-success" : "bg-m-blue-light"}`} style={{ width: `${phase.progress}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-gray-600 dark:text-body w-10 text-right">{phase.progress}%</span>
                        </div>

                        {/* Danh sách task trong giai đoạn — rõ ai làm gì */}
                        {phaseTasks.length === 0 ? (
                            <p className="text-xs text-gray-400 dark:text-muted mb-2">Chưa có công việc nào trong giai đoạn này</p>
                        ) : (
                            <div className="space-y-1.5 mb-3">
                                {phaseTasks.map((t) => (
                                    <div key={t.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-elevated text-sm group">
                                        <span className="flex-1 truncate text-gray-800 dark:text-body-strong">{t.title}</span>
                                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-muted">
                                            <UserIcon className="size-3" />
                                            {t.assignee?.name || "Chưa giao"}
                                        </span>
                                        <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full ${STATUS_CLS[t.status]}`}>{STATUS_VI[t.status]}</span>
                                        {isManager && (
                                            <button onClick={() => assignTaskToPhase(t.id, "")} title="Gỡ khỏi giai đoạn" className="p-1 rounded-full text-gray-400 hover:text-m-red hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-colors">
                                                <X className="size-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Tài liệu nộp cho giai đoạn */}
                        <div className="border-t border-hairline pt-2">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-medium text-gray-600 dark:text-body flex items-center gap-1">
                                    <Paperclip className="size-3.5" /> Tài liệu giai đoạn ({phase.files?.length || 0})
                                </span>
                                <button
                                    onClick={() => pickFile(phase.id)}
                                    disabled={uploadingPhase === phase.id}
                                    className="text-xs px-3 py-1 rounded-full bg-surface-elevated hover:bg-white/10 text-gray-700 dark:text-body disabled:opacity-50 font-bold transition-colors"
                                >
                                    {uploadingPhase === phase.id ? "Đang tải..." : "+ Nộp file"}
                                </button>
                            </div>
                            {(phase.files || []).length === 0 ? (
                                <p className="text-[11px] text-gray-400 dark:text-muted">Chưa có tài liệu nào được nộp</p>
                            ) : (
                                <div className="space-y-1">
                                    {phase.files.map((f) => (
                                        <div key={f.id} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-surface-elevated group">
                                            <span className="size-6 rounded-full bg-surface-card flex items-center justify-center flex-shrink-0">
                                                <FileText className="size-3.5 text-bmw-blue" />
                                            </span>
                                            <span className="flex-1 truncate text-gray-700 dark:text-body">{f.fileName}</span>
                                            <span className="text-gray-400 dark:text-muted hidden sm:inline">{f.uploader?.name || f.uploader?.email}</span>
                                            {canPreview(f.fileName) && (
                                                <button onClick={() => setPreviewFile(f)} className="p-1 rounded-full text-gray-400 hover:text-bmw-blue hover:bg-white/10 transition-colors" title="Xem trước">
                                                    <Eye className="size-3.5" />
                                                </button>
                                            )}
                                            <a href={f.fileUrl} target="_blank" rel="noreferrer" className="px-2 py-1 rounded-full text-bmw-blue hover:bg-white/10 transition-colors" title="Tải">Tải</a>
                                            <button onClick={() => removeFile(f.id)} className="p-1 rounded-full text-gray-400 hover:text-m-red hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-colors" title="Xóa">
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            {/* Task chưa thuộc giai đoạn nào — cho phép GÁN trực tiếp vào giai đoạn */}
            {unassignedTasks.length > 0 && (
                <div className="bg-surface-card rounded-lg p-4">
                    <h3 className="font-bold text-gray-600 dark:text-muted mb-2 text-sm">Chưa phân giai đoạn ({unassignedTasks.length})</h3>
                    {isManager && phases.length === 0 && (
                        <p className="text-xs text-m-warning mb-2">Hãy tạo giai đoạn ở trên trước, rồi gán công việc vào.</p>
                    )}
                    <div className="space-y-1.5">
                        {unassignedTasks.map((t) => (
                            <div key={t.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-elevated text-sm">
                                <span className="flex-1 truncate text-gray-800 dark:text-body-strong">{t.title}</span>
                                <span className="text-xs text-gray-500 dark:text-muted">{t.assignee?.name || "Chưa giao"}</span>
                                {isManager && phases.length > 0 && (
                                    <select
                                        defaultValue=""
                                        onChange={(e) => e.target.value && assignTaskToPhase(t.id, e.target.value)}
                                        className="text-xs bg-surface-card px-2 py-1 rounded-full shadow-spotify-inset focus:outline-none"
                                        title="Gán vào giai đoạn"
                                    >
                                        <option value="">+ Gán giai đoạn</option>
                                        {phases.map((p) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {previewFile && <FilePreview file={previewFile} onClose={() => setPreviewFile(null)} />}
        </div>
    );
};

export default ProjectPhases;
