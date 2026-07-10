import { format } from "date-fns";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth, useUser } from "../context/AuthContext";
import { CalendarIcon, MessageCircle, PenIcon, Edit2, ArrowLeftIcon, Trash2 } from "lucide-react";
import { useDispatch } from "react-redux";
import { deleteTask } from "../features/workspaceSlice";
import { apiFetch } from "../lib/api";
import { joinProject, leaveProject, getSocket } from "../lib/socket";
import TimeTracker from "../components/TimeTracker";
import SubtaskChecklist from "../components/SubtaskChecklist";
import TaskDependencies from "../components/TaskDependencies";
import TaskFiles from "../components/TaskFiles";
import EditTaskDialog from "../components/EditTaskDialog";
import MentionPicker from "../components/MentionPicker";

const TaskDetails = () => {

    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const projectId = searchParams.get("projectId");
    const taskId = searchParams.get("taskId");

    // Quay lại trang chi tiết dự án (tab Công việc) nếu biết dự án, ngược lại lùi lịch sử.
    const goBack = () => {
        if (projectId) navigate(`/projectsDetail?id=${projectId}&tab=tasks`);
        else navigate(-1);
    };

    const { user } = useUser();
    const { getToken } = useAuth();
    const dispatch = useDispatch();

    const [task, setTask] = useState(null);
    const [project, setProject] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(true);
    const [showEdit, setShowEdit] = useState(false);

    const { currentWorkspace } = useSelector((state) => state.workspace);

    // Xóa công việc: chỉ Quản trị viên (ADMIN) của không gian làm việc
    const myRole = currentWorkspace?.members?.find((m) => m.userId === user?.id)?.role;
    const isAdmin = myRole === "ADMIN";

    const handleDeleteTask = async () => {
        if (!window.confirm(`Xóa công việc "${task.title}"? Công việc sẽ được chuyển vào thùng rác.`)) return;
        const loadingToast = toast.loading("Đang xóa...");
        try {
            const token = await getToken();
            await apiFetch(token, `/tasks/${taskId}`, { method: "DELETE" });
            dispatch(deleteTask([taskId]));
            toast.dismiss(loadingToast);
            toast.success("Đã chuyển công việc vào thùng rác");
            goBack();
        } catch (error) {
            toast.dismiss(loadingToast);
            toast.error(error.message);
        }
    };

    const fetchComments = async () => {
        if (!taskId) return;
        try {
            const token = await getToken();
            const data = await apiFetch(token, `/comments/task/${taskId}`);
            setComments(data);
        } catch (e) {
            console.error("Không thể tải bình luận:", e);
        }
    };

    const fetchTaskDetails = async () => {
        setLoading(true);
        if (!projectId || !taskId) return;

        const proj = currentWorkspace?.projects.find((p) => p.id === projectId);
        if (!proj) return;

        const tsk = proj.tasks.find((t) => t.id === taskId);
        if (!tsk) return;

        setTask(tsk);
        setProject(proj);
        setLoading(false);
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;
        const loadingToast = toast.loading("Đang thêm bình luận...");
        try {
            const token = await getToken();
            const comment = await apiFetch(token, `/comments/task/${taskId}`, {
                method: 'POST',
                body: { content: newComment },
            });
            setComments((prev) => [...prev, comment]);
            setNewComment("");
            toast.dismiss(loadingToast);
            toast.success("Đã thêm bình luận.");
        } catch (error) {
            toast.dismiss(loadingToast);
            toast.error(error.message);
        }
    };

    useEffect(() => { fetchTaskDetails(); }, [taskId, currentWorkspace]);

    useEffect(() => {
        if (!taskId || !task || !projectId) return;
        fetchComments();

        // Realtime: nghe bình luận mới trong room dự án
        joinProject(projectId);
        const socket = getSocket();
        const onCommentAdded = ({ taskId: incomingTaskId, comment }) => {
            if (incomingTaskId !== taskId) return;
            setComments((prev) =>
                prev.some((c) => c.id === comment.id) ? prev : [...prev, comment]
            );
        };
        socket.on("comment:added", onCommentAdded);

        return () => {
            leaveProject(projectId);
            socket.off("comment:added", onCommentAdded);
        };
    }, [taskId, task, projectId]);

    if (loading) return <div className="text-gray-500 dark:text-body px-4 py-6">Đang tải chi tiết công việc...</div>;
    if (!task) return (
        <div className="px-4 py-6 max-w-6xl mx-auto">
            <button onClick={goBack} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-body hover:text-zinc-900 dark:hover:text-ink mb-4">
                <ArrowLeftIcon className="size-4" /> Quay lại
            </button>
            <p className="text-m-red">Không tìm thấy công việc.</p>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto">
            {/* Thanh quay về */}
            <button onClick={goBack} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-body hover:text-zinc-900 dark:hover:text-ink mb-4 sm:ml-4">
                <ArrowLeftIcon className="size-4" /> Quay lại dự án
            </button>
            <div className="flex flex-col-reverse lg:flex-row gap-6 sm:p-4 text-gray-900 dark:text-ink">
            {/* Left: Comments / Chatbox */}
            <div className="w-full lg:w-2/3">
                <div className="p-5 rounded-lg bg-white dark:bg-surface-card flex flex-col lg:h-[80vh]">
                    <h2 className="text-base font-bold flex items-center gap-2 mb-4 text-gray-900 dark:text-ink">
                        <MessageCircle className="size-5" /> Thảo luận công việc ({comments.length})
                    </h2>

                    <div className="flex-1 md:overflow-y-scroll no-scrollbar">
                        {comments.length > 0 ? (
                            <div className="flex flex-col gap-4 mb-6 mr-2">
                                {comments.map((comment) => (
                                    <div key={comment.id} className={`sm:max-w-4/5 dark:bg-surface-elevated rounded-lg p-3 ${comment.user?.id === user?.id ? "ml-auto" : "mr-auto"}`} >
                                        <div className="flex items-center gap-2 mb-1 text-sm text-gray-500 dark:text-body">
                                            {comment.user?.image && (
                                                <img src={comment.user.image} alt="avatar" className="size-5 rounded-full" />
                                            )}
                                            <span className="font-medium text-gray-900 dark:text-ink">{comment.user?.name || comment.user?.email || "Người dùng"}</span>
                                            <span className="text-xs text-gray-400 dark:text-muted">
                                                • {format(new Date(comment.createdAt), "dd MMM yyyy, HH:mm")}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-900 dark:text-body-strong">{comment.content}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-600 dark:text-muted mb-4 text-sm">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
                        )}
                    </div>

                    {/* Add Comment */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
                        <div className="w-full relative">
                            <MentionPicker text={newComment} members={project?.members || []} onPick={setNewComment} />
                            <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Viết bình luận... (gõ @ để nhắc thành viên)"
                                className="w-full dark:bg-surface-elevated rounded-lg p-2 text-sm text-gray-900 dark:text-ink resize-none focus:outline-none focus:ring-2 focus:ring-m-blue-light"
                                rows={3}
                            />
                        </div>
                        <button onClick={handleAddComment} className="rounded-full bg-m-blue-light text-black hover:bg-m-blue-dark transition-colors text-sm font-bold px-6 py-2.5" >
                            Đăng
                        </button>
                    </div>
                </div>
            </div>

            {/* Right: Task + Project Info */}
            <div className="w-full lg:w-1/2 flex flex-col gap-6">
                {/* Task Info */}
                <div className="p-5 rounded-lg bg-white dark:bg-surface-card">
                    <div className="mb-3">
                        <div className="flex items-start justify-between gap-2">
                            <h1 className="text-lg font-bold text-gray-900 dark:text-ink">{task.title}</h1>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button onClick={() => setShowEdit(true)} className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-surface-elevated hover:bg-zinc-200 dark:hover:bg-white/10">
                                    <Edit2 className="size-3.5" /> Sửa
                                </button>
                                {isAdmin && (
                                    <button onClick={handleDeleteTask} title="Xóa công việc (chỉ quản trị viên)" className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-m-red/10 text-m-red hover:bg-m-red hover:text-white transition">
                                        <Trash2 className="size-3.5" /> Xóa
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                            <span className="px-3 py-1 rounded-full bg-zinc-200 dark:bg-surface-elevated text-zinc-900 dark:text-body-strong text-[11px] font-bold">
                                {task.status}
                            </span>
                            <span className="px-3 py-1 rounded-full bg-blue-200 dark:bg-m-info/10 text-blue-900 dark:text-m-info text-[11px] font-bold">
                                {task.type}
                            </span>
                            <span className="px-3 py-1 rounded-full bg-green-200 dark:bg-m-success/10 text-green-900 dark:text-m-success text-[11px] font-bold">
                                {task.priority}
                            </span>
                        </div>
                    </div>

                    {task.description && (
                        <p className="text-sm text-gray-600 dark:text-body leading-relaxed mb-4">{task.description}</p>
                    )}

                    <hr className="border-zinc-200 dark:border-hairline my-3" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700 dark:text-body">
                        <div className="flex items-center gap-2">
                            {task.assignee?.image && (
                                <img src={task.assignee.image} className="size-5 rounded-full" alt="avatar" />
                            )}
                            {task.assignee?.name || task.assignee?.email || "Chưa giao"}
                        </div>
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="size-4 text-gray-500 dark:text-muted" />
                            Hạn chót: {task.due_date ? format(new Date(task.due_date), "dd MMM yyyy") : "—"}
                        </div>
                    </div>
                </div>

                {/* Tệp đính kèm */}
                <TaskFiles taskId={taskId} />

                {/* Subtask / checklist — chỉ quản trị viên chỉnh, thành viên chỉ xem */}
                <SubtaskChecklist taskId={taskId} canEdit={isAdmin} />

                {/* Phụ thuộc công việc — chỉ quản trị viên chỉnh */}
                <TaskDependencies taskId={taskId} projectTasks={project?.tasks || []} canEdit={isAdmin} />

                {/* Thời gian làm việc — chỉ quản trị viên ghi/xóa */}
                <TimeTracker taskId={taskId} canEdit={isAdmin} />

                {/* Project Info */}
                {project && (
                    <div className="p-4 rounded-lg bg-white dark:bg-surface-card text-zinc-700 dark:text-ink">
                        <p className="text-sm font-bold mb-4">Thông tin dự án</p>
                        <h2 className="text-gray-900 dark:text-ink flex items-center gap-2"> <PenIcon className="size-4" /> {project.name}</h2>
                        {project.start_date && (
                            <p className="text-xs mt-3 text-zinc-500 dark:text-muted">Ngày bắt đầu: {format(new Date(project.start_date), "dd MMM yyyy")}</p>
                        )}
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-body mt-3">
                            <span>Trạng thái: {project.status}</span>
                            <span>Ưu tiên: {project.priority}</span>
                            <span>Tiến độ: {project.progress}%</span>
                        </div>
                    </div>
                )}
                </div>
            </div>

            {showEdit && (
                <EditTaskDialog task={task} projectId={projectId} onClose={() => setShowEdit(false)} />
            )}
        </div>
    );
};

export default TaskDetails;
