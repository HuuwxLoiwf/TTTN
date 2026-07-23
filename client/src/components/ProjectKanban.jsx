import { useState, useRef } from "react";
import { format } from "date-fns";
import { useDispatch } from "react-redux";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { CalendarIcon, Bug, Zap, Square, GitCommit, MessageSquare, Paperclip } from "lucide-react";
import { apiFetch, API_BASE_URL } from "../lib/api";
import { updateTask } from "../features/workspaceSlice";

const COLUMNS = [
    { key: "TODO", label: "Chờ làm", color: "bg-gray-400 dark:bg-muted", headerBg: "bg-gray-100/40 dark:bg-surface-soft/40" },
    { key: "IN_PROGRESS", label: "Đang làm", color: "bg-[#ffa42b]", headerBg: "bg-amber-500/10 dark:bg-m-warning/10" },
    { key: "REVIEW", label: "Đang review", color: "bg-[#539df5]", headerBg: "bg-blue-500/10 dark:bg-m-info/10" },
    { key: "DONE", label: "Hoàn thành", color: "bg-[#1ed760]", headerBg: "bg-emerald-500/10 dark:bg-m-success/10" },
];

const TYPE_ICONS = {
    BUG: { icon: Bug, color: "text-m-red" },
    FEATURE: { icon: Zap, color: "text-bmw-blue" },
    TASK: { icon: Square, color: "text-m-success" },
    IMPROVEMENT: { icon: GitCommit, color: "text-bmw-blue" },
    OTHER: { icon: MessageSquare, color: "text-m-warning" },
};

const PRIORITY_BADGE = {
    LOW: "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-body",
    MEDIUM: "bg-blue-50 text-bmw-blue dark:bg-bmw-blue/15 dark:text-bmw-blue",
    HIGH: "bg-red-50 text-m-red dark:bg-m-red/15 dark:text-m-red",
};

const PRIORITY_LABEL = { LOW: "Thấp", MEDIUM: "TB", HIGH: "Cao" };

const TaskCard = ({ task, onDragStart }) => {
    const { icon: Icon, color } = TYPE_ICONS[task.type] || {};
    const { getToken } = useAuth();
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);

    const handleAttach = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        setUploading(true);
        try {
            const token = await getToken();
            const formData = new FormData();
            formData.append("file", file);
            formData.append("taskId", task.id);
            const res = await fetch(`${API_BASE_URL}/files/upload`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            if (!res.ok) throw new Error(await res.text());
            toast.success(`Đã đính kèm "${file.name}"`);
        } catch (err) {
            toast.error("Đính kèm thất bại: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, task)}
            className="group bg-white dark:bg-surface-elevated rounded-xl p-4 border border-gray-100 dark:border-hairline/15 cursor-grab active:cursor-grabbing hover:shadow-spotify-md hover:border-gray-200 dark:hover:border-hairline-strong/30 hover:-translate-y-0.5 transition-all duration-200 select-none"
        >
            <div className="flex items-start justify-between gap-3 mb-2.5">
                <p className="text-sm font-semibold text-zinc-900 dark:text-ink leading-snug group-hover:text-m-blue-light transition-colors duration-200">{task.title}</p>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        title="Đính kèm tài liệu"
                        className="p-1 rounded-full bg-zinc-50 dark:bg-white/5 opacity-0 group-hover:opacity-100 hover:bg-zinc-100 dark:hover:bg-surface-soft text-zinc-400 hover:text-m-blue-light transition-all duration-200 disabled:opacity-50"
                    >
                        <Paperclip className="size-3.5" />
                    </button>
                    {Icon && (
                        <div className="p-1 rounded bg-zinc-50 dark:bg-white/5">
                            <Icon className={`size-3.5 ${color}`} />
                        </div>
                    )}
                </div>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleAttach} />
            </div>

            {task.description && (
                <p className="text-xs text-zinc-500 dark:text-muted mb-3 line-clamp-2 leading-relaxed">{task.description}</p>
            )}

            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-50 dark:border-hairline/10">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-[0.5px] ${PRIORITY_BADGE[task.priority]}`}>
                    {PRIORITY_LABEL[task.priority]}
                </span>
                {task.due_date && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 dark:text-muted bg-zinc-50 dark:bg-white/5 px-2 py-0.5 rounded-full">
                        <CalendarIcon className="size-3 text-zinc-400" />
                        {format(new Date(task.due_date), "dd/MM")}
                    </span>
                )}
            </div>

            {task.assignee && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-50 dark:border-hairline/10">
                    <div className="size-5 rounded-full bg-m-blue-light flex items-center justify-center text-black text-[10px] font-black flex-shrink-0 shadow-sm">
                        {(task.assignee.name || task.assignee.email || "?")[0].toUpperCase()}
                    </div>
                    <span className="text-[11px] font-medium text-zinc-500 dark:text-muted truncate">
                        {task.assignee.name || task.assignee.email}
                    </span>
                </div>
            )}
        </div>
    );
};

const ProjectKanban = ({ tasks: initialTasks }) => {
    const dispatch = useDispatch();
    const { getToken } = useAuth();
    const [tasks, setTasks] = useState(initialTasks);
    const [draggedTask, setDraggedTask] = useState(null);
    const [dragOverColumn, setDragOverColumn] = useState(null);

    const handleDragStart = (e, task) => {
        setDraggedTask(task);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e, columnKey) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverColumn(columnKey);
    };

    const handleDragLeave = () => setDragOverColumn(null);

    const handleDrop = async (e, newStatus) => {
        e.preventDefault();
        setDragOverColumn(null);
        if (!draggedTask || draggedTask.status === newStatus) {
            setDraggedTask(null);
            return;
        }

        // Optimistic update
        setTasks((prev) => prev.map((t) => t.id === draggedTask.id ? { ...t, status: newStatus } : t));

        try {
            const token = await getToken();
            const updated = await apiFetch(token, `/tasks/${draggedTask.id}`, {
                method: "PUT",
                body: { status: newStatus },
            });
            dispatch(updateTask(updated));
        } catch (err) {
            // Revert on error
            setTasks((prev) => prev.map((t) => t.id === draggedTask.id ? { ...t, status: draggedTask.status } : t));
            toast.error("Cập nhật thất bại: " + err.message);
        }
        setDraggedTask(null);
    };

    // Sync with external changes (realtime updates)
    if (tasks !== initialTasks && JSON.stringify(tasks) !== JSON.stringify(initialTasks)) {
        setTasks(initialTasks);
    }

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 h-full">
            {COLUMNS.map((col) => {
                const colTasks = tasks.filter((t) => t.status === col.key);
                const isOver = dragOverColumn === col.key;
                return (
                    <div
                        key={col.key}
                        onDragOver={(e) => handleDragOver(e, col.key)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, col.key)}
                        className={`flex flex-col rounded-xl overflow-hidden border border-gray-100 dark:border-hairline/10 transition-all duration-300 ${isOver ? "bg-m-blue-light/5 shadow-spotify-md border-m-blue-light/30 scale-[1.01] ring-2 ring-m-blue-light/35" : "bg-gray-50/50 dark:bg-surface-soft/60 hover:bg-gray-50 dark:hover:bg-surface-soft"}`}
                    >
                        {/* Top Line Indicator */}
                        <div className={`h-1 w-full ${col.color}`} />

                        {/* Column header */}
                        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-hairline/10">
                            <span className="text-xs font-extrabold uppercase tracking-[0.5px] text-zinc-700 dark:text-ink">{col.label}</span>
                            <span className="size-5 rounded-full bg-white dark:bg-surface-elevated text-[11px] font-black text-zinc-600 dark:text-ink flex items-center justify-center shadow-sm">
                                {colTasks.length}
                            </span>
                        </div>

                        {/* Task cards */}
                        <div className="flex-1 p-2.5 space-y-2.5 min-h-32 rounded-b-xl overflow-y-auto">
                            {colTasks.map((task) => (
                                <TaskCard key={task.id} task={task} onDragStart={handleDragStart} />
                            ))}
                            {colTasks.length === 0 && (
                                <div className="flex items-center justify-center h-24 text-xs text-zinc-400 dark:text-muted rounded-lg border-2 border-dashed border-gray-200 dark:border-hairline/25">
                                    Kéo thả công việc vào đây
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ProjectKanban;
