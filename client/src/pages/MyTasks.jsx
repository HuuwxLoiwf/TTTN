import { useMemo } from "react";
import { useSelector } from "react-redux";
import { useUser } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ListTodo, CalendarIcon, AlertTriangle } from "lucide-react";

const STATUS = {
    TODO: { label: "Chờ làm", cls: "bg-surface-elevated text-gray-700 dark:text-body" },
    IN_PROGRESS: { label: "Đang làm", cls: "bg-m-warning/15 text-m-warning" },
    REVIEW: { label: "Review", cls: "bg-m-info/15 text-m-info" },
    DONE: { label: "Xong", cls: "bg-m-success/15 text-m-success" },
};

export default function MyTasks() {
    const { user } = useUser();
    const navigate = useNavigate();
    const { currentWorkspace } = useSelector((state) => state.workspace);

    const myTasks = useMemo(() => {
        const out = [];
        for (const p of currentWorkspace?.projects || []) {
            for (const t of p.tasks || []) {
                if (t.assigneeId === user?.id) {
                    out.push({ ...t, projectId: p.id, projectName: p.name });
                }
            }
        }
        // Chưa xong lên trước, rồi theo hạn chót
        return out.sort((a, b) => {
            if ((a.status === "DONE") !== (b.status === "DONE")) return a.status === "DONE" ? 1 : -1;
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;
            return new Date(a.due_date) - new Date(b.due_date);
        });
    }, [currentWorkspace, user?.id]);

    const now = new Date();

    return (
        <div className="max-w-4xl mx-auto space-y-5">
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-ink mb-1 flex items-center gap-2">
                    <ListTodo className="size-6 text-m-blue-light" /> Công việc của tôi
                </h1>
                <p className="text-gray-500 dark:text-body text-sm font-light">Tất cả công việc được giao cho bạn ({myTasks.length})</p>
            </div>

            {myTasks.length === 0 ? (
                <div className="text-center py-16 text-gray-400 dark:text-muted">
                    <ListTodo className="size-10 mx-auto mb-3 opacity-50" />
                    <p className="font-light">Bạn chưa được giao công việc nào</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {myTasks.map((t) => {
                        const overdue = t.due_date && new Date(t.due_date) < now && t.status !== "DONE";
                        const st = STATUS[t.status] || STATUS.TODO;
                        return (
                            <button
                                key={t.id}
                                onClick={() => navigate(`/taskDetails?projectId=${t.projectId}&taskId=${t.id}`)}
                                className="w-full text-left flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-surface-card hover:shadow-spotify-md transition"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-body-strong truncate">{t.title}</p>
                                    <p className="text-xs text-gray-500 dark:text-muted truncate font-light">{t.projectName}</p>
                                </div>
                                {t.due_date && (
                                    <span className={`flex items-center gap-1 text-xs flex-shrink-0 ${overdue ? "text-m-red" : "text-gray-400 dark:text-muted"}`}>
                                        {overdue ? <AlertTriangle className="size-3" /> : <CalendarIcon className="size-3" />}
                                        {format(new Date(t.due_date), "dd/MM")}
                                    </span>
                                )}
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0 ${st.cls}`}>{st.label}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
