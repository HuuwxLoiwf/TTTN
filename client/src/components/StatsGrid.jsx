import { FolderOpen, CheckCircle, Users, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useUser } from "../context/AuthContext";

export default function StatsGrid() {
    const { user } = useUser();
    const currentWorkspace = useSelector(
        (state) => state?.workspace?.currentWorkspace || null
    );

    const [stats, setStats] = useState({
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        myTasks: 0,
        overdueIssues: 0,
    });

    const statCards = [
        {
            icon: FolderOpen,
            title: "Tổng dự án",
            value: stats.totalProjects,
            subtitle: currentWorkspace?.name ? `dự án trong ${currentWorkspace.name}` : "chưa có không gian làm việc",
            textColor: "text-m-blue-dark",
        },
        {
            icon: CheckCircle,
            title: "Dự án hoàn thành",
            value: stats.completedProjects,
            subtitle: `trên ${stats.totalProjects} tổng`,
            textColor: "text-m-success",
        },
        {
            icon: Users,
            title: "Công việc của tôi",
            value: stats.myTasks,
            subtitle: "được giao cho tôi",
            textColor: "text-bmw-blue",
        },
        {
            icon: AlertTriangle,
            title: "Quá hạn",
            value: stats.overdueIssues,
            subtitle: "cần chú ý",
            textColor: "text-m-warning",
        },
    ];

    useEffect(() => {
        if (currentWorkspace) {
            setStats({
                totalProjects: currentWorkspace.projects.length,
                activeProjects: currentWorkspace.projects.filter(
                    (p) => p.status !== "CANCELLED" && p.status !== "COMPLETED"
                ).length,
                completedProjects: currentWorkspace.projects
                    .filter((p) => p.status === "COMPLETED")
                    .reduce((acc, project) => acc + project.tasks.length, 0),
                myTasks: currentWorkspace.projects.reduce(
                    (acc, project) =>
                        acc +
                        project.tasks.filter((t) => t.assigneeId === user?.id).length,
                    0
                ),
                overdueIssues: currentWorkspace.projects.reduce(
                    (acc, project) =>
                        acc +
                        project.tasks.filter(
                            (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "DONE"
                        ).length,
                    0
                ),
            });
        }
    }, [currentWorkspace, user?.id]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-9">
            {statCards.map(
                ({ icon: Icon, title, value, subtitle, textColor }, i) => (
                    <div key={i} className="rounded-lg shadow-spotify-md bg-white dark:bg-surface-card p-6 py-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold text-gray-500 dark:text-muted mb-1">
                                    {title}
                                </p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-ink">
                                    {value}
                                </p>
                                {subtitle && (
                                    <p className="text-xs text-gray-400 dark:text-muted font-light mt-1">
                                        {subtitle}
                                    </p>
                                )}
                            </div>
                            <div className="p-3 rounded-full bg-black/5 dark:bg-white/10">
                                <Icon size={20} className={textColor} />
                            </div>
                        </div>
                    </div>
                )
            )}
        </div>
    );
}
