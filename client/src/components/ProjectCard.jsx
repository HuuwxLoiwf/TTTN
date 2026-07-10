import { Link } from "react-router-dom";

const statusColors = {
    PLANNING: "bg-gray-100 text-gray-700 dark:bg-surface-elevated dark:text-body",
    ACTIVE: "bg-m-blue-light/15 text-m-blue-light",
    ON_HOLD: "bg-m-warning/15 text-m-warning",
    COMPLETED: "bg-m-success/15 text-m-success",
    CANCELLED: "bg-m-red/15 text-m-red",
};

const ProjectCard = ({ project }) => {
    return (
        <Link to={`/projectsDetail?id=${project.id}&tab=tasks`} className="bg-white dark:bg-surface-soft rounded-lg border border-gray-200 dark:border-transparent hover:bg-gray-50 dark:hover:bg-surface-elevated dark:shadow-spotify-md transition-all p-5 group block">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-body-strong mb-1 truncate group-hover:text-bmw-blue transition-colors">
                        {project.name}
                    </h3>
                    <p className="text-gray-500 dark:text-body text-sm font-light line-clamp-2 mb-3">
                        {project.description || "Chưa có mô tả"}
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-between mb-4">
                <span className={`px-2 py-0.5 rounded-full text-xs uppercase tracking-[0.5px] ${statusColors[project.status]}`} >
                    {project.status.replace("_", " ")}
                </span>
                <span className="text-xs text-gray-500 dark:text-muted capitalize">
                    Ưu tiên: {project.priority}
                </span>
            </div>

            {/* Progress */}
            <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-muted">Tiến độ</span>
                    <span className="text-gray-400 dark:text-body">{project.progress || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-surface-elevated h-1.5 rounded-full">
                    <div className="h-1.5 rounded-full bg-m-blue-light" style={{ width: `${project.progress || 0}%` }} />
                </div>
            </div>

            </Link>
    );
};

export default ProjectCard;
