import { useState, useRef } from "react";
import { format } from "date-fns";
import { useDispatch } from "react-redux";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { CalendarIcon, Bug, Zap, Square, GitCommit, MessageSquare, Paperclip } from "lucide-react";
import { apiFetch, API_BASE_URL } from "../lib/api";
import { updateTask } from "../features/workspaceSlice";

const COLUMNS = [
    { key: "TODO", label: "Chờ làm", color: "border-hairline", headerBg: "bg-zinc-100 dark:bg-surface-soft" },
    { key: "IN_PROGRESS", label: "Đang làm", color: "border-m-warning/60", headerBg: "bg-amber-50 dark:bg-m-warning/10" },
    { key: "REVIEW", label: "Đang review", color: "border-bmw-blue/60", headerBg: "bg-blue-50 dark:bg-bmw-blue/10" },
    { key: "DONE", label: "Hoàn thành", color: "border-m-success/60", headerBg: "bg-emerald-50 dark:bg-m-success/10" },
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
            className="bg-white dark:bg-surface-card rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-spotify-md transition-all select-none"
        >
            <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm font-medium text-zinc-900 dark:text-ink leading-snug">{task.title}</p>
                <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        title="Đính kèm tài liệu"
                        className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-surface-elevated text-zinc-400 hover:text-bmw-blue disabled:opacity-50"
                    >
                        <Paperclip className="size-3.5" />
                    </button>
                    {Icon && <Icon className={`size-4 mt-0.5 ${color}`} />}
                </div>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleAttach} />
            </div>

            {task.description && (
                <p className="text-xs text-zinc-500 dark:text-muted mb-2 line-clamp-2">{task.description}</p>
            )}

            <div className="flex items-center justify-between mt-2">
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${PRIORITY_BADGE[task.priority]}`}>
                    {PRIORITY_LABEL[task.priority]}
                </span>
                {task.due_date && (
                    <span className="flex items-center gap-1 text-xs text-zinc-400 dark:text-muted">
                        <CalendarIcon className="size-3" />
                        {format(new Date(task.due_date), "dd/MM")}
                    </span>
                )}
            </div>

            {task.assignee && (
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-hairline/30 dark:border-hairline/30">
                    <div className="size-5 rounded-full bg-bmw-blue flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {(task.assignee.name || task.assignee.email || "?")[0].toUpperCase()}
                    </div>
                    <span className="text-xs text-zinc-500 dark:text-muted truncate">
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
                        className={`flex flex-col rounded-lg transition-colors ${isOver ? "bg-blue-50 dark:bg-bmw-blue/10" : "bg-surface-soft dark:bg-surface-soft"}`}
                    >
                        {/* Column header */}
                        <div className="px-3 py-2.5 flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-700 dark:text-body-strong">{col.label}</span>
                            <span className="size-5 rounded-full bg-white dark:bg-surface-elevated text-xs font-bold text-zinc-600 dark:text-body flex items-center justify-center">
                                {colTasks.length}
                            </span>
                        </div>

                        {/* Task cards */}
                        <div className={`flex-1 p-2 space-y-2 min-h-32 rounded-lg ${isOver ? "ring-2 ring-bmw-blue ring-inset" : ""}`}>
                            {colTasks.map((task) => (
                                <TaskCard key={task.id} task={task} onDragStart={handleDragStart} />
                            ))}
                            {colTasks.length === 0 && (
                                <div className="flex items-center justify-center h-20 text-xs text-zinc-400 dark:text-muted rounded-lg border-2 border-dashed border-hairline/40 dark:border-hairline/40">
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
