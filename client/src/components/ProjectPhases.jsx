import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useAuth, useUser } from "../context/AuthContext";
import { Layers, Plus, Trash2, User as UserIcon } from "lucide-react";
import toast from "react-hot-toast";
import { apiFetch } from "../lib/api";

const STATUS_VI = { TODO: "Chờ làm", IN_PROGRESS: "Đang làm", REVIEW: "Review", DONE: "Hoàn thành" };
const STATUS_CLS = {
    TODO: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300",
    IN_PROGRESS: "bg-amber-200 text-amber-800 dark:bg-amber-500/30 dark:text-amber-300",
    REVIEW: "bg-purple-200 text-purple-800 dark:bg-purple-500/30 dark:text-purple-300",
    DONE: "bg-emerald-200 text-emerald-800 dark:bg-emerald-500/30 dark:text-emerald-300",
};

const ProjectPhases = ({ projectId, tasks }) => {
    const { getToken } = useAuth();
    const { user } = useUser();
    const { currentWorkspace } = useSelector((state) => state.workspace);
    const project = currentWorkspace?.projects?.find((p) => p.id === projectId);
    const isManager = currentWorkspace?.members?.some((m) => m.userId === user?.id && m.role === "ADMIN") ||
        project?.team_lead === user?.id;

    const [phases, setPhases] = useState([]);
    const [name, setName] = useState("");
    const [adding, setAdding] = useState(false);

    const load = async () => {
        try {
            const token = await getToken();
            const data = await apiFetch(token, `/phases/project/${projectId}`);
            setPhases(data);
        } catch {
            /* silent */
        }
    };

    useEffect(() => {
        if (projectId) load();
    }, [projectId, tasks]);

    const addPhase = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setAdding(true);
        try {
            const token = await getToken();
            await apiFetch(token, `/phases/project/${projectId}`, { method: "POST", body: { name } });
            setName("");
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

    // Task của từng giai đoạn (lọc từ tasks truyền vào)
    const tasksOfPhase = (phaseId) => tasks.filter((t) => t.phaseId === phaseId);
    const unassignedTasks = tasks.filter((t) => !t.phaseId);

    return (
        <div className="space-y-5">
            {/* Thêm giai đoạn (chỉ admin/trưởng dự án) */}
            {isManager && (
                <form onSubmit={addPhase} className="flex gap-2">
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Tên giai đoạn (VD: Giai đoạn 1 - Thiết kế)"
                        className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                    />
                    <button type="submit" disabled={adding} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center gap-1 disabled:opacity-50">
                        <Plus className="size-4" /> Thêm giai đoạn
                    </button>
                </form>
            )}

            {phases.length === 0 && (
                <div className="text-center py-10 text-zinc-400 dark:text-zinc-500">
                    <Layers className="size-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Chưa có giai đoạn nào. {isManager ? "Tạo giai đoạn để chia công việc theo mốc." : ""}</p>
                </div>
            )}

            {/* Mỗi giai đoạn */}
            {phases.map((phase) => {
                const phaseTasks = tasksOfPhase(phase.id);
                return (
                    <div key={phase.id} className="glass-card p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Layers className="size-5 text-blue-500" />
                                <h3 className="font-semibold text-zinc-900 dark:text-white">{phase.name}</h3>
                                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                    {phase.doneTasks}/{phase.totalTasks} xong
                                </span>
                            </div>
                            {isManager && (
                                <button onClick={() => removePhase(phase.id)} className="p-1 text-zinc-400 hover:text-red-500">
                                    <Trash2 className="size-4" />
                                </button>
                            )}
                        </div>
                        {/* Thanh tiến độ */}
                        <div className="flex items-center gap-2 mb-3">
                            <div className="flex-1 h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all" style={{ width: `${phase.progress}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 w-10 text-right">{phase.progress}%</span>
                        </div>
                        {/* Danh sách task trong giai đoạn — rõ ai làm gì */}
                        {phaseTasks.length === 0 ? (
                            <p className="text-xs text-zinc-400 dark:text-zinc-500">Chưa có công việc nào trong giai đoạn này</p>
                        ) : (
                            <div className="space-y-1.5">
                                {phaseTasks.map((t) => (
                                    <div key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-zinc-50 dark:bg-zinc-800/60 text-sm">
                                        <span className="flex-1 truncate text-zinc-800 dark:text-zinc-200">{t.title}</span>
                                        <span className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                                            <UserIcon className="size-3" />
                                            {t.assignee?.name || "Chưa giao"}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] ${STATUS_CLS[t.status]}`}>{STATUS_VI[t.status]}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Task chưa thuộc giai đoạn nào */}
            {unassignedTasks.length > 0 && (
                <div className="glass-card p-4">
                    <h3 className="font-semibold text-zinc-600 dark:text-zinc-400 mb-2 text-sm">Chưa phân giai đoạn ({unassignedTasks.length})</h3>
                    <div className="space-y-1.5">
                        {unassignedTasks.map((t) => (
                            <div key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-zinc-50 dark:bg-zinc-800/60 text-sm">
                                <span className="flex-1 truncate text-zinc-800 dark:text-zinc-200">{t.title}</span>
                                <span className="text-xs text-zinc-500 dark:text-zinc-400">{t.assignee?.name || "Chưa giao"}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectPhases;
