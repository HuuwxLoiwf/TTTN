import { useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useUser } from "../context/AuthContext";
import { ArrowLeftIcon, PlusIcon, SettingsIcon, BarChart3Icon, CalendarIcon, FileStackIcon, ZapIcon, LayoutDashboard, FolderOpen, MessagesSquare, GanttChartIcon, LayersIcon } from "lucide-react";
import ProjectAnalytics from "../components/ProjectAnalytics";
import ProjectSettings from "../components/ProjectSettings";
import CreateTaskDialog from "../components/CreateTaskDialog";
import ProjectCalendar from "../components/ProjectCalendar";
import ProjectTasks from "../components/ProjectTasks";
import ProjectKanban from "../components/ProjectKanban";
import ProjectFiles from "../components/ProjectFiles";
import ProjectChat from "../components/ProjectChat";
import ProjectGantt from "../components/ProjectGantt";
import ProjectPhases from "../components/ProjectPhases";
import { addTask, updateTask, deleteTask, setProjectProgress } from "../features/workspaceSlice";
import { joinProject, leaveProject, getSocket } from "../lib/socket";

export default function ProjectDetail() {

    const [searchParams, setSearchParams] = useSearchParams();
    const tab = searchParams.get('tab');
    const id = searchParams.get('id');

    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user } = useUser();
    const currentWorkspace = useSelector((state) => state?.workspace?.currentWorkspace);
    const projects = useMemo(() => currentWorkspace?.projects || [], [currentWorkspace]);

    // Chỉ ADMIN hoặc trưởng dự án được vào tab Cài đặt (sửa/xóa dự án)
    const myRole = currentWorkspace?.members?.find((m) => m.userId === user?.id)?.role;

    const [project, setProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [showCreateTask, setShowCreateTask] = useState(false);
    const [activeTab, setActiveTab] = useState(tab || "tasks");

    useEffect(() => {
        if (tab) setActiveTab(tab);
    }, [tab]);

    useEffect(() => {
        if (projects && projects.length > 0) {
            const proj = projects.find((p) => p.id === id);
            setProject(proj);
            setTasks(proj?.tasks || []);
        }
    }, [id, projects]);

    // Realtime: join project room and listen for events
    useEffect(() => {
        if (!id) return;
        joinProject(id);
        const socket = getSocket();

        const onTaskCreated = (task) => {
            dispatch(addTask({ ...task, projectId: id }));
        };
        const onTaskUpdated = (task) => {
            dispatch(updateTask({ ...task, projectId: id }));
        };
        const onTaskDeleted = ({ id: taskId }) => {
            dispatch(deleteTask([taskId]));
        };
        const onBulkDeleted = ({ ids }) => {
            dispatch(deleteTask(ids));
        };
        const onProgress = ({ projectId, progress }) => {
            dispatch(setProjectProgress({ projectId, progress }));
        };

        socket.on("task:created", onTaskCreated);
        socket.on("task:updated", onTaskUpdated);
        socket.on("task:deleted", onTaskDeleted);
        socket.on("tasks:bulkDeleted", onBulkDeleted);
        socket.on("project:progress", onProgress);

        return () => {
            leaveProject(id);
            socket.off("task:created", onTaskCreated);
            socket.off("task:updated", onTaskUpdated);
            socket.off("task:deleted", onTaskDeleted);
            socket.off("tasks:bulkDeleted", onBulkDeleted);
            socket.off("project:progress", onProgress);
        };
    }, [id]);

    const statusColors = {
        PLANNING: "bg-gray-100 text-gray-700 border border-gray-300 dark:bg-transparent dark:text-body dark:border-hairline",
        ACTIVE: "bg-emerald-50 text-m-success border border-m-success/40 dark:bg-transparent dark:text-m-success dark:border-m-success/50",
        ON_HOLD: "bg-amber-50 text-m-warning border border-m-warning/40 dark:bg-transparent dark:text-m-warning dark:border-m-warning/50",
        COMPLETED: "bg-blue-50 text-bmw-blue border border-bmw-blue/40 dark:bg-transparent dark:text-bmw-blue dark:border-bmw-blue/50",
        CANCELLED: "bg-red-50 text-m-red border border-m-red/40 dark:bg-transparent dark:text-m-red dark:border-m-red/50",
    };

    if (!project) {
        return (
            <div className="p-6 text-center text-gray-900 dark:text-ink">
                <p className="text-3xl md:text-5xl mt-40 mb-10 font-bold">Không tìm thấy dự án</p>
                <button onClick={() => navigate('/projects')} className="mt-4 px-6 py-3 bg-surface-elevated text-gray-900 dark:text-ink hover:bg-white/10 text-sm font-bold transition-colors rounded-full" >
                    Quay lại Dự án
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-5 max-w-6xl mx-auto text-gray-900 dark:text-ink">
            {/* Header */}
            <div className="flex max-md:flex-col gap-4 flex-wrap items-start justify-between max-w-6xl">
                <div className="flex items-center gap-4">
                    <button className="p-1 hover:bg-gray-200 dark:hover:bg-surface-card text-gray-600 dark:text-body" onClick={() => navigate('/projects')}>
                        <ArrowLeftIcon className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold">{project.name}</h1>
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${statusColors[project.status]}`} >
                            {project.status.replace("_", " ")}
                        </span>
                    </div>
                </div>
                {/* Chỉ ADMIN hoặc trưởng dự án được tạo công việc */}
                {(myRole === "ADMIN" || project?.team_lead === user?.id) && (
                    <button onClick={() => setShowCreateTask(true)} className="flex items-center gap-2 px-5 py-2.5 text-sm bg-m-blue-light text-black font-bold hover:bg-m-blue-dark transition-colors rounded-full shadow-spotify-md" >
                        <PlusIcon className="size-4" />
                        Công việc mới
                    </button>
                )}
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-2 sm:flex flex-wrap gap-4">
                {[
                    { label: "Tổng công việc", value: tasks.length, color: "text-gray-900 dark:text-ink" },
                    { label: "Hoàn thành", value: tasks.filter((t) => t.status === "DONE").length, color: "text-m-success dark:text-m-success" },
                    { label: "Đang thực hiện", value: tasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "TODO").length, color: "text-m-warning dark:text-m-warning" },
                    { label: "Thành viên", value: project.members?.length || 0, color: "text-bmw-blue dark:text-bmw-blue" },
                ].map((card, idx) => (
                    <div key={idx} className="bg-white dark:bg-surface-card rounded-lg flex justify-between sm:min-w-60 p-4 py-3 hover:shadow-spotify-md transition-shadow">
                        <div>
                            <div className="text-xs text-gray-600 dark:text-muted">{card.label}</div>
                            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                        </div>
                        <ZapIcon className={`size-4 ${card.color}`} />
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div>
                <div className="flex flex-wrap gap-2">
                    {[
                        { key: "tasks", label: "Công việc", icon: FileStackIcon },
                        { key: "phases", label: "Giai đoạn", icon: LayersIcon },
                        { key: "kanban", label: "Kanban", icon: LayoutDashboard },
                        { key: "calendar", label: "Lịch", icon: CalendarIcon },
                        { key: "timeline", label: "Timeline", icon: GanttChartIcon },
                        { key: "analytics", label: "Phân tích", icon: BarChart3Icon },
                        { key: "files", label: "Tài liệu", icon: FolderOpen },
                        { key: "chat", label: "Thảo luận", icon: MessagesSquare },
                        // Tab Cài đặt chỉ hiện với ADMIN hoặc trưởng dự án
                        ...(myRole === "ADMIN" || project?.team_lead === user?.id
                            ? [{ key: "settings", label: "Cài đặt", icon: SettingsIcon }]
                            : []),
                    ].map((tabItem) => (
                        <button key={tabItem.key} onClick={() => { setActiveTab(tabItem.key); setSearchParams({ id: id, tab: tabItem.key }) }} className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-full transition-colors ${activeTab === tabItem.key ? "bg-white text-black dark:bg-surface-elevated dark:text-ink" : "text-gray-500 dark:text-body hover:bg-black/5 dark:hover:bg-white/5"}`} >
                            <tabItem.icon className="size-3.5" />
                            {tabItem.label}
                        </button>
                    ))}
                </div>

                <div className="mt-6">
                    {activeTab === "tasks" && (
                        <div className="dark:bg-canvas max-w-6xl">
                            <ProjectTasks tasks={tasks} />
                        </div>
                    )}
                    {activeTab === "phases" && (
                        <div className="max-w-6xl">
                            <ProjectPhases projectId={id} tasks={tasks} />
                        </div>
                    )}
                    {activeTab === "kanban" && (
                        <div className="dark:bg-canvas max-w-6xl">
                            <ProjectKanban tasks={tasks} />
                        </div>
                    )}
                    {activeTab === "analytics" && (
                        <div className="dark:bg-canvas max-w-6xl">
                            <ProjectAnalytics tasks={tasks} project={project} />
                        </div>
                    )}
                    {activeTab === "calendar" && (
                        <div className="dark:bg-canvas max-w-6xl">
                            <ProjectCalendar tasks={tasks} />
                        </div>
                    )}
                    {activeTab === "timeline" && (
                        <div className="dark:bg-canvas max-w-6xl p-4 bg-white dark:bg-surface-card rounded-lg">
                            <ProjectGantt tasks={tasks} />
                        </div>
                    )}
                    {activeTab === "files" && (
                        <div className="dark:bg-canvas max-w-6xl">
                            <ProjectFiles projectId={id} />
                        </div>
                    )}
                    {activeTab === "chat" && (
                        <div className="dark:bg-canvas max-w-6xl">
                            <ProjectChat projectId={id} />
                        </div>
                    )}
                    {activeTab === "settings" && (
                        (myRole === "ADMIN" || project?.team_lead === user?.id) ? (
                            <div className="dark:bg-canvas max-w-6xl">
                                <ProjectSettings project={project} />
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 dark:text-muted p-4">Chỉ quản trị viên hoặc trưởng dự án mới được vào phần Cài đặt.</p>
                        )
                    )}
                </div>
            </div>

            {/* Create Task Modal */}
            {showCreateTask && <CreateTaskDialog showCreateTask={showCreateTask} setShowCreateTask={setShowCreateTask} projectId={id} />}
        </div>
    );
}
