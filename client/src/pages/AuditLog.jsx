import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useAuth, useUser } from "../context/AuthContext";
import { format } from "date-fns";
import { ShieldCheck, Plus, Pencil, Trash2 } from "lucide-react";
import { apiFetch } from "../lib/api";

const ACTION = {
    CREATE: { label: "Tạo", cls: "text-m-success", Icon: Plus },
    UPDATE: { label: "Sửa", cls: "text-bmw-blue", Icon: Pencil },
    DELETE: { label: "Xóa", cls: "text-m-red", Icon: Trash2 },
};

export default function AuditLog() {
    const { getToken } = useAuth();
    const { user } = useUser();
    const { currentWorkspace } = useSelector((state) => state.workspace);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    const isAdmin = currentWorkspace?.members?.some((m) => m.userId === user?.id && m.role === "ADMIN");

    useEffect(() => {
        if (!currentWorkspace?.id || !isAdmin) { setLoading(false); return; }
        (async () => {
            try {
                const token = await getToken();
                const data = await apiFetch(token, `/activities/audit/${currentWorkspace.id}`);
                setLogs(data);
            } catch {
                /* silent */
            } finally {
                setLoading(false);
            }
        })();
    }, [currentWorkspace?.id, isAdmin]);

    if (!isAdmin) {
        return <div className="max-w-3xl mx-auto py-16 text-center text-gray-500 dark:text-muted">Chỉ quản trị viên mới xem được nhật ký kiểm toán.</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-5">
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-ink mb-1 flex items-center gap-2">
                    <ShieldCheck className="size-6 text-bmw-blue" /> Nhật ký kiểm toán
                </h1>
                <p className="text-gray-500 dark:text-body text-sm">Lịch sử thay đổi chi tiết trong không gian làm việc</p>
            </div>

            {loading ? (
                <p className="text-center text-sm text-gray-400 dark:text-muted py-10">Đang tải...</p>
            ) : logs.length === 0 ? (
                <p className="text-center text-sm text-gray-400 dark:text-muted py-10">Chưa có bản ghi nào</p>
            ) : (
                <div className="space-y-1.5">
                    {logs.map((l) => {
                        const a = ACTION[l.action] || ACTION.UPDATE;
                        const Icon = a.Icon;
                        return (
                            <div key={l.id} className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-surface-card hover:bg-gray-50 dark:hover:bg-surface-elevated transition-colors">
                                <div className={`p-1.5 rounded-full bg-black/5 dark:bg-white/10 ${a.cls} flex-shrink-0`}>
                                    <Icon className="size-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-800 dark:text-body-strong">
                                        <span className="font-medium">{l.user?.name || l.user?.email}</span>{" "}
                                        <span className={`${a.cls} font-bold text-xs`}>{a.label}</span>{" "}
                                        {l.entityType === "PROJECT" ? "dự án" : l.entityType.toLowerCase()}{" "}
                                        <span className="font-medium">{l.entityName || ""}</span>
                                    </p>
                                    {l.changes && Object.keys(l.changes).length > 0 && (
                                        <div className="mt-1 text-xs text-gray-500 dark:text-body space-y-0.5">
                                            {Object.entries(l.changes).map(([field, v]) => (
                                                <p key={field}>
                                                    <span className="font-medium">{field}:</span> {String(v.old ?? "")} → {String(v.new ?? "")}
                                                </p>
                                            ))}
                                        </div>
                                    )}
                                    <p className="text-[11px] text-gray-400 dark:text-muted mt-1">
                                        {format(new Date(l.createdAt), "dd/MM/yyyy HH:mm")}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
