import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useAuth, useUser } from "../context/AuthContext";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { Trash2, RotateCcw, X, FolderOpen, ListTodo } from "lucide-react";
import { apiFetch } from "../lib/api";

export default function Trash() {
    const { getToken } = useAuth();
    const { user } = useUser();
    const { currentWorkspace } = useSelector((state) => state.workspace);
    const [data, setData] = useState({ projects: [], tasks: [] });
    const [loading, setLoading] = useState(true);

    const role = currentWorkspace?.members?.find((m) => m.userId === user?.id)?.role;
    const canManage = role === "ADMIN" || role === "MANAGER";

    const fetchTrash = async () => {
        if (!currentWorkspace?.id || !canManage) { setLoading(false); return; }
        try {
            const token = await getToken();
            const res = await apiFetch(token, `/trash/workspace/${currentWorkspace.id}`);
            setData(res);
        } catch {
            /* silent */
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTrash(); }, [currentWorkspace?.id, canManage]);

    const restore = async (type, id) => {
        try {
            const token = await getToken();
            await apiFetch(token, `/trash/${type}/${id}/restore`, { method: "PUT" });
            toast.success("Đã khôi phục");
            // Tải lại để dữ liệu workspace (project/task) hiện lại
            setTimeout(() => window.location.reload(), 500);
        } catch (err) {
            toast.error(err.message);
        }
    };

    const purge = async (type, id) => {
        if (!confirm("Xóa vĩnh viễn? Không thể hoàn tác.")) return;
        try {
            const token = await getToken();
            await apiFetch(token, `/trash/${type}/${id}`, { method: "DELETE" });
            toast.success("Đã xóa vĩnh viễn");
            if (type === "project") setData((d) => ({ ...d, projects: d.projects.filter((p) => p.id !== id) }));
            else setData((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) }));
        } catch (err) {
            toast.error(err.message);
        }
    };

    if (!canManage) {
        return <div className="max-w-3xl mx-auto py-16 text-center text-gray-500 dark:text-muted">Chỉ quản trị viên / quản lý mới truy cập thùng rác.</div>;
    }

    const Row = ({ icon: Icon, title, subtitle, deletedAt, onRestore, onPurge }) => (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-surface-card hover:bg-gray-50 dark:hover:bg-surface-elevated transition-colors">
            <Icon className="size-5 text-gray-400 dark:text-muted flex-shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-ink truncate">{title}</p>
                <p className="text-xs text-gray-500 dark:text-muted truncate">
                    {subtitle}{deletedAt ? ` • Xóa lúc ${format(new Date(deletedAt), "dd/MM/yyyy HH:mm")}` : ""}
                </p>
            </div>
            <button onClick={onRestore} title="Khôi phục" className="p-1.5 rounded-full bg-m-blue-light text-black hover:brightness-110 transition flex-shrink-0">
                <RotateCcw className="size-4" />
            </button>
            <button onClick={onPurge} title="Xóa vĩnh viễn" className="p-1.5 rounded-full border border-m-red text-m-red hover:bg-m-red hover:text-white transition flex-shrink-0">
                <X className="size-4" />
            </button>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-5">
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-ink mb-1 flex items-center gap-2">
                    <Trash2 className="size-6 text-m-red" /> Thùng rác
                </h1>
                <p className="text-gray-500 dark:text-body text-sm">Khôi phục hoặc xóa vĩnh viễn dự án / công việc đã xóa. Mục quá 30 ngày sẽ tự động bị xóa vĩnh viễn.</p>
            </div>

            {loading ? (
                <p className="text-center text-sm text-gray-400 dark:text-muted py-10">Đang tải...</p>
            ) : data.projects.length === 0 && data.tasks.length === 0 ? (
                <p className="text-center text-sm text-gray-400 dark:text-muted py-10">Thùng rác trống</p>
            ) : (
                <>
                    {data.projects.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-gray-400 dark:text-muted">Dự án ({data.projects.length})</p>
                            {data.projects.map((p) => (
                                <Row key={p.id} icon={FolderOpen} title={p.name}
                                    subtitle={p.department?.name || "Không phòng ban"} deletedAt={p.deletedAt}
                                    onRestore={() => restore("project", p.id)} onPurge={() => purge("project", p.id)} />
                            ))}
                        </div>
                    )}
                    {data.tasks.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-gray-400 dark:text-muted">Công việc ({data.tasks.length})</p>
                            {data.tasks.map((t) => (
                                <Row key={t.id} icon={ListTodo} title={t.title}
                                    subtitle={`Dự án: ${t.project?.name || "—"}`} deletedAt={t.deletedAt}
                                    onRestore={() => restore("task", t.id)} onPurge={() => purge("task", t.id)} />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
