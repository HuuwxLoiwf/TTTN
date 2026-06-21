import { format } from "date-fns";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import { deleteTask, updateTask } from "../features/workspaceSlice";
import { apiFetch } from "../lib/api";
import { Bug, CalendarIcon, GitCommit, MessageSquare, Square, Trash, XIcon, Zap } from "lucide-react";

const typeIcons = {
    BUG: { icon: Bug, color: "text-red-600 dark:text-red-400" },
    FEATURE: { icon: Zap, color: "text-blue-600 dark:text-blue-400" },
    TASK: { icon: Square, color: "text-green-600 dark:text-green-400" },
    IMPROVEMENT: { icon: GitCommit, color: "text-purple-600 dark:text-purple-400" },
    OTHER: { icon: MessageSquare, color: "text-amber-600 dark:text-amber-400" },
};

const priorityTexts = {
    LOW: { background: "bg-red-100 dark:bg-red-950", prioritycolor: "text-red-600 dark:text-red-400" },
    MEDIUM: { background: "bg-blue-100 dark:bg-blue-950", prioritycolor: "text-blue-600 dark:text-blue-400" },
    HIGH: { background: "bg-emerald-100 dark:bg-emerald-950", prioritycolor: "text-emerald-600 dark:text-emerald-400" },
};

const ProjectTasks = ({ tasks }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { getToken } = useAuth();
    const { user } = useUser();
    const { currentWorkspace } = useSelector((state) => state.workspace);
    const [selectedTasks, setSelectedTasks] = useState([]);

    // Quyền đổi trạng thái: chỉ quản trị viên (ADMIN)
    const myRole = currentWorkspace?.members?.find((m) => m.userId === user?.id)?.role;
    const isAdmin = myRole === "ADMIN";
    const canChangeStatus = () => isAdmin;

    const [filters, setFilters] = useState({
        status: "",
        type: "",
        priority: "",
        assignee: "",
    });
    const [sortBy, setSortBy] = useState("created_desc");

    const assigneeList = useMemo(
        () => Array.from(new Set(tasks.map((t) => t.assignee?.name).filter(Boolean))),
        [tasks]
    );

    const filteredTasks = useMemo(() => {
        const priorityRank = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        const filtered = tasks.filter((task) => {
            const { status, type, priority, assignee } = filters;
            return (
                (!status || task.status === status) &&
                (!type || task.type === type) &&
                (!priority || task.priority === priority) &&
                (!assignee || task.assignee?.name === assignee)
            );
        });

        const sorted = [...filtered];
        switch (sortBy) {
            case "created_asc":
                sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                break;
            case "due_asc": // hạn gần nhất trước, task không có hạn xuống cuối
                sorted.sort((a, b) => {
                    if (!a.due_date) return 1;
                    if (!b.due_date) return -1;
                    return new Date(a.due_date) - new Date(b.due_date);
                });
                break;
            case "priority_desc":
                sorted.sort((a, b) => (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0));
                break;
            case "created_desc":
            default:
                sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        return sorted;
    }, [filters, tasks, sortBy]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    const handleStatusChange = async (taskId, newStatus) => {
        const loadingToast = toast.loading("Đang cập nhật trạng thái...");
        try {
            const token = await getToken();
            const updatedTask = await apiFetch(token, `/tasks/${taskId}`, {
                method: 'PUT',
                body: { status: newStatus },
            });
            dispatch(updateTask(updatedTask));
            toast.dismiss(loadingToast);
            toast.success("Đã cập nhật trạng thái");
        } catch (error) {
            toast.dismiss(loadingToast);
            toast.error(error.message);
        }
    };

    const handleDelete = async () => {
        if (!selectedTasks.length) return;
        const confirmed = window.confirm("Bạn có chắc chắn muốn xóa các công việc đã chọn?");
        if (!confirmed) return;
        const loadingToast = toast.loading("Đang xóa công việc...");
        try {
            const token = await getToken();
            await apiFetch(token, `/tasks/bulk-delete`, {
                method: 'POST',
                body: { ids: selectedTasks },
            });
            dispatch(deleteTask(selectedTasks));
            setSelectedTasks([]);
            toast.dismiss(loadingToast);
            toast.success("Xóa công việc thành công");
        } catch (error) {
            toast.dismiss(loadingToast);
            toast.error(error.message);
        }
    };

    return (
        <div>
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-4">
                {["status", "type", "priority", "assignee"].map((name) => {
                    const options = {
                        status: [
                            { label: "Tất cả trạng thái", value: "" },
                            { label: "Chờ làm", value: "TODO" },
                            { label: "Đang làm", value: "IN_PROGRESS" },
                            { label: "Đang review", value: "REVIEW" },
                            { label: "Hoàn thành", value: "DONE" },
                        ],
                        type: [
                            { label: "Tất cả loại", value: "" },
                            { label: "Nhiệm vụ", value: "TASK" },
                            { label: "Lỗi", value: "BUG" },
                            { label: "Tính năng", value: "FEATURE" },
                            { label: "Cải tiến", value: "IMPROVEMENT" },
                            { label: "Khác", value: "OTHER" },
                        ],
                        priority: [
                            { label: "Tất cả ưu tiên", value: "" },
                            { label: "Thấp", value: "LOW" },
                            { label: "Trung bình", value: "MEDIUM" },
                            { label: "Cao", value: "HIGH" },
                        ],
                        assignee: [
                            { label: "Tất cả người thực hiện", value: "" },
                            ...assigneeList.map((n) => ({ label: n, value: n })),
                        ],
                    };
                    return (
                        <select key={name} name={name} onChange={handleFilterChange} className=" border not-dark:bg-white border-zinc-300 dark:border-zinc-800 outline-none px-3 py-1 rounded text-sm text-zinc-900 dark:text-zinc-200" >
                            {options[name].map((opt, idx) => (
                                <option key={idx} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    );
                })}

                {/* Sắp xếp */}
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border not-dark:bg-white border-zinc-300 dark:border-zinc-800 outline-none px-3 py-1 rounded text-sm text-zinc-900 dark:text-zinc-200">
                    <option value="created_desc">Mới nhất</option>
                    <option value="created_asc">Cũ nhất</option>
                    <option value="due_asc">Hạn chót gần nhất</option>
                    <option value="priority_desc">Ưu tiên cao → thấp</option>
                </select>

                {/* Reset filters */}
                {(filters.status || filters.type || filters.priority || filters.assignee) && (
                    <button type="button" onClick={() => setFilters({ status: "", type: "", priority: "", assignee: "" })} className="px-3 py-1 flex items-center gap-2 rounded bg-gradient-to-br from-purple-400 to-purple-500 text-zinc-100 dark:text-zinc-200 text-sm transition-colors" >
                        <XIcon className="size-3" /> Đặt lại
                    </button>
                )}

                {selectedTasks.length > 0 && (
                    <button type="button" onClick={handleDelete} className="px-3 py-1 flex items-center gap-2 rounded bg-gradient-to-br from-indigo-400 to-indigo-500 text-zinc-100 dark:text-zinc-200 text-sm transition-colors" >
                        <Trash className="size-3" /> Xóa
                    </button>
                )}
            </div>

            {/* Tasks Table */}
            <div className="overflow-auto rounded-lg lg:border border-zinc-300 dark:border-zinc-800">
                <div className="w-full">
                    {/* Desktop/Table View */}
                    <div className="hidden lg:block overflow-x-auto">
                        <table className="min-w-full text-sm text-left not-dark:bg-white text-zinc-900 dark:text-zinc-300">
                            <thead className="text-xs uppercase dark:bg-zinc-800/70 text-zinc-500 dark:text-zinc-400 ">
                                <tr>
                                    <th className="pl-2 pr-1">
                                        <input onChange={() => selectedTasks.length > 1 ? setSelectedTasks([]) : setSelectedTasks(tasks.map((t) => t.id))} checked={selectedTasks.length === tasks.length} type="checkbox" className="size-3 accent-zinc-600 dark:accent-zinc-500" />
                                    </th>
                                    <th className="px-4 pl-0 py-3">Tiêu đề</th>
                                    <th className="px-4 py-3">Loại</th>
                                    <th className="px-4 py-3">Ưu tiên</th>
                                    <th className="px-4 py-3">Trạng thái</th>
                                    <th className="px-4 py-3">Người thực hiện</th>
                                    <th className="px-4 py-3">Hạn chót</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTasks.length > 0 ? (
                                    filteredTasks.map((task) => {
                                        const { icon: Icon, color } = typeIcons[task.type] || {};
                                        const { background, prioritycolor } = priorityTexts[task.priority] || {};

                                        return (
                                            <tr key={task.id} onClick={() => navigate(`/taskDetails?projectId=${task.projectId}&taskId=${task.id}`)} className=" border-t border-zinc-300 dark:border-zinc-800 group hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all cursor-pointer" >
                                                <td onClick={e => e.stopPropagation()} className="pl-2 pr-1">
                                                    <input type="checkbox" className="size-3 accent-zinc-600 dark:accent-zinc-500" onChange={() => selectedTasks.includes(task.id) ? setSelectedTasks(selectedTasks.filter((i) => i !== task.id)) : setSelectedTasks((prev) => [...prev, task.id])} checked={selectedTasks.includes(task.id)} />
                                                </td>
                                                <td className="px-4 pl-0 py-2">{task.title}</td>
                                                <td className="px-4 py-2">
                                                    <div className="flex items-center gap-2">
                                                        {Icon && <Icon className={`size-4 ${color}`} />}
                                                        <span className={`uppercase text-xs ${color}`}>{task.type}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <span className={`text-xs px-2 py-1 rounded ${background} ${prioritycolor}`}>
                                                        {task.priority}
                                                    </span>
                                                </td>
                                                <td onClick={e => e.stopPropagation()} className="px-4 py-2">
                                                    <select name="status" disabled={!canChangeStatus(task)} onChange={(e) => handleStatusChange(task.id, e.target.value)} value={task.status} className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 outline-none px-2 pr-4 py-1 rounded text-sm text-zinc-900 dark:text-zinc-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" >
                                                        <option value="TODO">Chờ làm</option>
                                                        <option value="IN_PROGRESS">Đang làm</option>
                                                        <option value="REVIEW">Đang review</option>
                                                        <option value="DONE">Hoàn thành</option>
                                                    </select>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <div className="flex items-center gap-2">
                                                        <img src={task.assignee?.image} className="size-5 rounded-full" alt="avatar" />
                                                        {task.assignee?.name || "-"}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                                                        <CalendarIcon className="size-4" />
                                                        {task.due_date ? format(new Date(task.due_date), "dd MMMM") : "-"}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="text-center text-zinc-500 dark:text-zinc-400 py-6">
                                            Không tìm thấy công việc với bộ lọc đã chọn.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile/Card View */}
                    <div className="lg:hidden flex flex-col gap-4">
                        {filteredTasks.length > 0 ? (
                            filteredTasks.map((task) => {
                                const { icon: Icon, color } = typeIcons[task.type] || {};
                                const { background, prioritycolor } = priorityTexts[task.priority] || {};

                                return (
                                    <div key={task.id} className=" dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-300 dark:border-zinc-800 rounded-lg p-4 flex flex-col gap-2">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-zinc-900 dark:text-zinc-200 text-sm font-semibold">{task.title}</h3>
                                            <input type="checkbox" className="size-4 accent-zinc-600 dark:accent-zinc-500" onChange={() => selectedTasks.includes(task.id) ? setSelectedTasks(selectedTasks.filter((i) => i !== task.id)) : setSelectedTasks((prev) => [...prev, task.id])} checked={selectedTasks.includes(task.id)} />
                                        </div>

                                        <div className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                                            {Icon && <Icon className={`size-4 ${color}`} />}
                                            <span className={`${color} uppercase`}>{task.type}</span>
                                        </div>

                                        <div>
                                            <span className={`text-xs px-2 py-1 rounded ${background} ${prioritycolor}`}>
                                                {task.priority}
                                            </span>
                                        </div>

                                        <div>
                                            <label className="text-zinc-600 dark:text-zinc-400 text-xs">Trạng thái</label>
                                            <select name="status" disabled={!canChangeStatus(task)} onChange={(e) => handleStatusChange(task.id, e.target.value)} value={task.status} className="w-full mt-1 bg-zinc-100 dark:bg-zinc-800 ring-1 ring-zinc-300 dark:ring-zinc-700 outline-none px-2 py-1 rounded text-sm text-zinc-900 dark:text-zinc-200 disabled:opacity-50" >
                                                <option value="TODO">Chờ làm</option>
                                                <option value="IN_PROGRESS">Đang làm</option>
                                                <option value="REVIEW">Đang review</option>
                                                <option value="DONE">Hoàn thành</option>
                                            </select>
                                        </div>

                                        <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                                            <img src={task.assignee?.image} className="size-5 rounded-full" alt="avatar" />
                                            {task.assignee?.name || "-"}
                                        </div>

                                        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                                            <CalendarIcon className="size-4" />
                                            {task.due_date ? format(new Date(task.due_date), "dd MMMM") : "-"}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-center text-zinc-500 dark:text-zinc-400 py-4">
                                Không tìm thấy công việc với bộ lọc đã chọn.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectTasks;
