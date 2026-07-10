import { useEffect, useState } from "react";
import { ArrowRight, Clock, AlertTriangle, User } from "lucide-react";
import { useSelector } from "react-redux";

export default function TasksSummary() {

    const { currentWorkspace } = useSelector((state) => state.workspace);
    const user = { id: 'user_1' }
    const [tasks, setTasks] = useState([]);

    // Get all tasks for all projects in current workspace
    useEffect(() => {
        if (currentWorkspace) {
            setTasks(currentWorkspace.projects.flatMap((project) => project.tasks));
        }
    }, [currentWorkspace]);

    const myTasks = tasks.filter(i => i.assigneeId === user.id);
    const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'DONE');
    const inProgressIssues = tasks.filter(i => i.status === 'IN_PROGRESS');

    const summaryCards = [
        {
            title: "Công việc của tôi",
            count: myTasks.length,
            icon: User,
            color: "bg-m-success/15 text-m-success",
            items: myTasks.slice(0, 3)
        },
        {
            title: "Quá hạn",
            count: overdueTasks.length,
            icon: AlertTriangle,
            color: "bg-m-red/15 text-m-red",
            items: overdueTasks.slice(0, 3)
        },
        {
            title: "Đang thực hiện",
            count: inProgressIssues.length,
            icon: Clock,
            color: "bg-m-blue-light/15 text-m-blue-light",
            items: inProgressIssues.slice(0, 3)
        }
    ];

    return (
        <div className="space-y-6">
            {summaryCards.map((card) => (
                <div key={card.title} className="bg-white dark:bg-surface-card rounded-lg overflow-hidden dark:shadow-spotify-md">
                    <div className="p-4 pb-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-gray-100 dark:bg-surface-elevated">
                                <card.icon className="w-4 h-4 text-gray-500 dark:text-muted" />
                            </div>
                            <div className="flex items-center justify-between flex-1">
                                <h3 className="text-sm font-medium text-gray-800 dark:text-body-strong">{card.title}</h3>
                                <span className={`inline-block mt-1 px-2.5 py-1 rounded-full text-xs font-bold ${card.color}`}>
                                    {card.count}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="p-4">
                        {card.items.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-muted text-center py-4">
                                Không có mục nào
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {card.items.map((issue) => (
                                    <div key={issue.id} className="p-3 rounded-lg bg-gray-50 dark:bg-surface-soft hover:bg-gray-100 dark:hover:bg-surface-elevated transition-colors cursor-pointer">
                                        <h4 className="text-sm font-medium text-gray-800 dark:text-body-strong truncate">
                                            {issue.title}
                                        </h4>
                                        <p className="text-xs text-gray-600 dark:text-muted capitalize mt-1">
                                            {issue.type} • {issue.priority}
                                        </p>
                                    </div>
                                ))}
                                {card.count > 3 && (
                                    <button className="flex items-center justify-center w-full text-sm text-gray-500 dark:text-muted hover:text-gray-800 dark:hover:text-ink mt-2 rounded-full py-1 hover:bg-gray-50 dark:hover:bg-surface-elevated">
                                        Xem thêm {card.count - 3} <ArrowRight className="w-3 h-3 ml-2" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
