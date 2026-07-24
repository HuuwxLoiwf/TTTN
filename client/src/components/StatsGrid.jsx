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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 my-8">
            {statCards.map(
                ({ icon: Icon, title, value, subtitle, textColor }, i) => (
                    <div key={i} className="group rounded-xl border border-gray-100 dark:border-hairline/10 hover:border-m-blue-light/20 shadow-spotify-md bg-white dark:bg-surface-card p-6 py-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),_0_8px_10px_-6px_rgba(30,215,96,0.1)] cursor-pointer">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <p className="text-[11px] uppercase tracking-[1px] font-extrabold text-gray-400 dark:text-muted">
                                    {title}
                                </p>
                                <p className="text-3.5xl font-black text-gray-900 dark:text-ink tracking-tight transition-all group-hover:text-m-blue-light">
                                    {value}
                                </p>
                                {subtitle && (
                                    <p className="text-xs text-gray-500 dark:text-muted font-normal">
                                        {subtitle}
                                    </p>
                                )}
                            </div>
                            <div className="p-3 rounded-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-hairline/10 group-hover:bg-m-blue-light/10 group-hover:border-m-blue-light/30 transition-all duration-300">
                                <Icon size={20} className={`${textColor} transition-transform duration-300 group-hover:scale-110`} />
                            </div>
                        </div>
                    </div>
                )
            )}
        </div>
    );
}
