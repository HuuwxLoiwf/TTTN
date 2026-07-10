import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, UsersIcon, FolderOpen } from "lucide-react";
import { format } from "date-fns";
import { useSelector } from "react-redux";
import CreateProjectDialog from "./CreateProjectDialog";

const ProjectOverview = () => {
    const statusColors = {
        PLANNING: "bg-gray-100 text-gray-700 dark:bg-surface-elevated dark:text-body",
        ACTIVE: "bg-m-blue-light/15 text-m-blue-light",
        ON_HOLD: "bg-m-warning/15 text-m-warning",
        COMPLETED: "bg-m-success/15 text-m-success",
        CANCELLED: "bg-m-red/15 text-m-red",
    };

    const priorityColors = {
        LOW: "bg-gray-300 dark:bg-surface-elevated",
        MEDIUM: "bg-m-warning",
        HIGH: "bg-m-red",
    };

    const currentWorkspace = useSelector((state) => state?.workspace?.currentWorkspace || null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [projects, setProjects] = useState([]);

    useEffect(() => {
        setProjects(currentWorkspace?.projects || []);
    }, [currentWorkspace]);

    return currentWorkspace && (
        <div className="bg-white dark:bg-surface-card rounded-lg overflow-hidden dark:shadow-spotify-md">
            <div className="p-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-900 dark:text-ink">Tổng quan dự án</h2>
                <Link to={'/projects'} className="text-sm text-gray-600 hover:text-gray-900 dark:text-muted dark:hover:text-ink flex items-center">
                    Xem tất cả <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
            </div>

            <div className="p-0">
                {projects.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-surface-elevated text-gray-600 dark:text-muted rounded-full flex items-center justify-center">
                            <FolderOpen size={32} />
                        </div>
                        <p className="text-gray-600 dark:text-body">Chưa có dự án nào</p>
                        <button onClick={() => setIsDialogOpen(true)} className="mt-4 px-6 py-2.5 rounded-full text-sm uppercase font-bold tracking-[1.4px] bg-m-blue-light text-black hover:scale-105 transition">
                            Tạo dự án đầu tiên
                        </button>
                        <CreateProjectDialog isDialogOpen={isDialogOpen} setIsDialogOpen={setIsDialogOpen} />
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200 dark:divide-white/5">
                        {projects.slice(0, 5).map((project) => (
                            <Link key={project.id} to={`/projectsDetail?id=${project.id}&tab=tasks`} className="block p-6 hover:bg-gray-50 dark:hover:bg-surface-soft transition-colors">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-800 dark:text-body-strong mb-1">
                                            {project.name}
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-body line-clamp-2">
                                            {project.description || 'Chưa có mô tả'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusColors[project.status]}`}>
                                            {project.status.replace('_', ' ').replaceAll(/\b\w/g, c => c.toUpperCase())}
                                        </span>
                                        <div className={`w-2 h-2 rounded-full ${priorityColors[project.priority]}`} />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-muted mb-3">
                                    <div className="flex items-center gap-4">
                                        {project.members?.length > 0 && (
                                            <div className="flex items-center gap-1">
                                                <UsersIcon className="w-3 h-3" />
                                                {project.members.length} thành viên
                                            </div>
                                        )}
                                        {project.end_date && (
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {format(new Date(project.end_date), "MMM d, yyyy")}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-500 dark:text-muted">Tiến độ</span>
                                        <span className="text-gray-600 dark:text-body">{project.progress || 0}%</span>
                                    </div>
                                    <div className="w-full rounded-full bg-gray-200 dark:bg-surface-elevated h-1.5">
                                        <div className="h-1.5 rounded-full bg-m-blue-light" style={{ width: `${project.progress || 0}%` }} />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ProjectOverview;
