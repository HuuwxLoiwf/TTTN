import { useState, useRef } from "react";
import { format } from "date-fns";
import { useDispatch } from "react-redux";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { CalendarIcon, Bug, Zap, Square, GitCommit, MessageSquare, Paperclip } from "lucide-react";
import { apiFetch, API_BASE_URL } from "../lib/api";
import { updateTask } from "../features/workspaceSlice";

const COLUMNS = [
    { key: "TODO", label: "Chờ làm", color: "border-zinc-400 dark:border-zinc-600", headerBg: "bg-zinc-100 dark:bg-zinc-800" },
    { key: "IN_PROGRESS", label: "Đang làm", color: "border-amber-400 dark:border-amber-500", headerBg: "bg-amber-50 dark:bg-amber-900/20" },
    { key: "REVIEW", label: "Đang review", color: "border-purple-400 dark:border-purple-500", headerBg: "bg-purple-50 dark:bg-purple-900/20" },
    { key: "DONE", label: "Hoàn thành", color: "border-emerald-400 dark:border-emerald-500", headerBg: "bg-emerald-50 dark:bg-emerald-900/20" },
];

const TYPE_ICONS = {
    BUG: { icon: Bug, color: "text-red-500" },
    FEATURE: { icon: Zap, color: "text-blue-500" },
    TASK: { icon: Square, color: "text-green-500" },
    IMPROVEMENT: { icon: GitCommit, color: "text-purple-500" },
    OTHER: { icon: MessageSquare, color: "text-amber-500" },
};

const PRIORITY_BADGE = {
    LOW: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
    MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    HIGH: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
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
            className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all select-none"
        >
            <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-snug">{task.title}</p>
                <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        title="Đính kèm tài liệu"
                        className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 hover:text-blue-500 disabled:opacity-50"
                    >
                        <Paperclip className="size-3.5" />
                    </button>
                    {Icon && <Icon className={`size-4 mt-0.5 ${color}`} />}
                </div>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleAttach} />
            </div>

            {task.description && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2 line-clamp-2">{task.description}</p>
            )}

            <div className="flex items-center justify-between mt-2">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PRIORITY_BADGE[task.priority]}`}>
                    {PRIORITY_LABEL[task.priority]}
                </span>
                {task.due_date && (
                    <span className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
                        <CalendarIcon className="size-3" />
                        {format(new Date(task.due_date), "dd/MM")}
                    </span>
                )}
            </div>

            {task.assignee && (
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-700">
                    <div className="size-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {(task.assignee.name || task.assignee.email || "?")[0].toUpperCase()}
                    </div>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
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
                        className={`flex flex-col rounded-xl border-2 transition-colors ${col.color} ${isOver ? "bg-blue-50 dark:bg-blue-900/10" : ""}`}
                    >
                        {/* Column header */}
                        <div className={`px-3 py-2 rounded-t-lg ${col.headerBg} flex items-center justify-between`}>
                            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{col.label}</span>
                            <span className="size-5 rounded-full bg-white dark:bg-zinc-700 text-xs font-bold text-zinc-600 dark:text-zinc-300 flex items-center justify-center shadow-sm">
                                {colTasks.length}
                            </span>
                        </div>

                        {/* Task cards */}
                        <div className={`flex-1 p-2 space-y-2 min-h-32 rounded-b-lg ${isOver ? "ring-2 ring-blue-400 ring-inset rounded-b-xl" : ""}`}>
                            {colTasks.map((task) => (
                                <TaskCard key={task.id} task={task} onDragStart={handleDragStart} />
                            ))}
                            {colTasks.length === 0 && (
                                <div className="flex items-center justify-center h-20 text-xs text-zinc-400 dark:text-zinc-600 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg">
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
