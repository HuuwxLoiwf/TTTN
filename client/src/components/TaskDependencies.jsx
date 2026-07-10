import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Link2, Plus, Trash2, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { apiFetch } from "../lib/api";

const STATUS_LABEL = { TODO: "Chờ làm", IN_PROGRESS: "Đang làm", REVIEW: "Review", DONE: "Hoàn thành" };

const TaskDependencies = ({ taskId, projectTasks = [], canEdit = false }) => {
    const { getToken } = useAuth();
    const [dependsOn, setDependsOn] = useState([]);
    const [blocking, setBlocking] = useState([]);
    const [selected, setSelected] = useState("");

    const fetchDeps = async () => {
        try {
            const token = await getToken();
            const data = await apiFetch(token, `/dependencies/task/${taskId}`);
            setDependsOn(data.dependsOn || []);
            setBlocking(data.blocking || []);
        } catch { /* silent */ }
    };

    useEffect(() => {
        if (taskId) fetchDeps();
    }, [taskId]);

    // Task có thể chọn làm tiên quyết: cùng dự án, khác task hiện tại, chưa được thêm
    const existingIds = new Set([taskId, ...dependsOn.map((d) => d.id)]);
    const options = projectTasks.filter((t) => !existingIds.has(t.id));

    const add = async (e) => {
        e.preventDefault();
        if (!selected) return;
        try {
            const token = await getToken();
            const dep = await apiFetch(token, `/dependencies/task/${taskId}`, {
                method: "POST",
                body: { dependsOnId: selected },
            });
            setDependsOn((prev) => [...prev, dep]);
            setSelected("");
        } catch (err) {
            toast.error(err.message);
        }
    };

    const remove = async (depId) => {
        setDependsOn((prev) => prev.filter((d) => d.depId !== depId));
        try {
            const token = await getToken();
            await apiFetch(token, `/dependencies/${depId}`, { method: "DELETE" });
        } catch {
            fetchDeps();
        }
    };

    const hasUnfinished = dependsOn.some((d) => d.status !== "DONE");

    return (
        <div className="p-4 rounded-lg bg-white dark:bg-surface-card">
            <h3 className="text-sm font-bold flex items-center gap-2 text-gray-900 dark:text-ink mb-3">
                <Link2 className="size-4" /> Phụ thuộc công việc
            </h3>

            {/* Task này phụ thuộc vào (tiên quyết) */}
            <div className="mb-3">
                <p className="text-xs text-gray-500 dark:text-muted mb-1">Cần hoàn thành trước:</p>
                {dependsOn.length === 0 ? (
                    <p className="text-xs text-gray-400 dark:text-muted italic">Không có</p>
                ) : (
                    <div className="space-y-1">
                        {dependsOn.map((d) => (
                            <div key={d.depId} className="flex items-center gap-2 group text-sm bg-zinc-100 dark:bg-surface-elevated rounded-full pl-3 pr-2 py-1">
                                <span className={`size-2 rounded-full flex-shrink-0 ${d.status === "DONE" ? "bg-m-success" : "bg-m-warning"}`} />
                                <span className="flex-1 text-gray-800 dark:text-body-strong truncate">{d.title}</span>
                                <span className="text-xs text-gray-400 dark:text-muted">{STATUS_LABEL[d.status] || d.status}</span>
                                {canEdit && (
                                    <button onClick={() => remove(d.depId)} className="opacity-0 group-hover:opacity-100 rounded-full p-1 text-gray-400 dark:text-muted hover:bg-white/10 hover:text-m-red flex-shrink-0">
                                        <Trash2 className="size-3.5" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                {hasUnfinished && (
                    <p className="text-xs text-m-warning flex items-center gap-1 mt-1">
                        <Lock className="size-3" /> Chưa thể hoàn thành — còn việc tiên quyết.
                    </p>
                )}
            </div>

            {/* Các task đang chờ task này */}
            {blocking.length > 0 && (
                <div className="mb-3">
                    <p className="text-xs text-gray-500 dark:text-muted mb-1">Đang chặn các việc:</p>
                    <div className="space-y-1">
                        {blocking.map((b) => (
                            <div key={b.depId} className="text-sm text-m-red truncate bg-m-red/10 rounded-full px-3 py-1">• {b.title}</div>
                        ))}
                    </div>
                </div>
            )}

            {canEdit && (
                <form onSubmit={add} className="flex gap-2">
                    <select value={selected} onChange={(e) => setSelected(e.target.value)} className="flex-1 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-surface-elevated text-sm focus:outline-none focus:ring-2 focus:ring-m-blue-light">
                        <option value="">+ Thêm việc tiên quyết...</option>
                        {options.map((t) => (
                            <option key={t.id} value={t.id}>{t.title}</option>
                        ))}
                    </select>
                    <button type="submit" disabled={!selected} className="px-4 py-1.5 rounded-full bg-m-blue-light/10 text-m-blue-light hover:bg-m-blue-light hover:text-black disabled:opacity-50 text-sm font-bold flex items-center gap-1">
                        <Plus className="size-4" />
                    </button>
                </form>
            )}
        </div>
    );
};

export default TaskDependencies;
