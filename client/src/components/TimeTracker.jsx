import { useState, useEffect } from "react";
import { useAuth, useUser } from "../context/AuthContext";
import { Clock, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { apiFetch } from "../lib/api";

const fmtDuration = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h && m) return `${h}h ${m}p`;
    if (h) return `${h}h`;
    return `${m}p`;
};

const TimeTracker = ({ taskId, canEdit = false }) => {
    const { getToken } = useAuth();
    const { user } = useUser();
    const [logs, setLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [hours, setHours] = useState("");
    const [minutes, setMinutes] = useState("");
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    const fetchLogs = async () => {
        try {
            const token = await getToken();
            const data = await apiFetch(token, `/time-logs/task/${taskId}`);
            setLogs(data.logs || []);
            setTotal(data.totalMinutes || 0);
        } catch {
            /* silent */
        }
    };

    useEffect(() => {
        if (taskId) fetchLogs();
    }, [taskId]);

    const handleAdd = async (e) => {
        e.preventDefault();
        const totalMins = (Number(hours) || 0) * 60 + (Number(minutes) || 0);
        if (totalMins <= 0) {
            toast.error("Nhập số giờ hoặc phút");
            return;
        }
        setBusy(true);
        try {
            const token = await getToken();
            const log = await apiFetch(token, `/time-logs/task/${taskId}`, {
                method: "POST",
                body: { minutes: totalMins, note },
            });
            setLogs((prev) => [log, ...prev]);
            setTotal((t) => t + totalMins);
            setHours(""); setMinutes(""); setNote("");
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async (id, mins) => {
        try {
            const token = await getToken();
            await apiFetch(token, `/time-logs/${id}`, { method: "DELETE" });
            setLogs((prev) => prev.filter((l) => l.id !== id));
            setTotal((t) => t - mins);
        } catch (err) {
            toast.error(err.message);
        }
    };

    return (
        <div className="p-4 rounded-lg bg-white dark:bg-surface-card shadow-spotify-md">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold flex items-center gap-2 text-gray-900 dark:text-ink">
                    <Clock className="size-4" /> Thời gian làm việc
                </h3>
                <span className="text-2xl font-bold text-m-blue-light">{fmtDuration(total)}</span>
            </div>

            {canEdit && (
                <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2 mb-3">
                    <input type="number" min="0" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Giờ" className="w-16 rounded px-2 py-1.5 bg-white dark:bg-surface-elevated dark:shadow-spotify-inset text-gray-900 dark:text-ink text-sm focus:outline-none" />
                    <input type="number" min="0" max="59" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="Phút" className="w-16 rounded px-2 py-1.5 bg-white dark:bg-surface-elevated dark:shadow-spotify-inset text-gray-900 dark:text-ink text-sm focus:outline-none" />
                    <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú (tùy chọn)" className="flex-1 min-w-32 rounded px-2 py-1.5 bg-white dark:bg-surface-elevated dark:shadow-spotify-inset text-gray-900 dark:text-ink text-sm focus:outline-none" />
                    <button type="submit" disabled={busy} className="px-4 h-9 rounded-full bg-m-blue-light text-black hover:bg-m-blue-dark text-xs font-bold flex items-center gap-1 disabled:opacity-50 transition">
                        <Plus className="size-4" /> Ghi
                    </button>
                </form>
            )}

            {logs.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-muted text-center py-2">Chưa có giờ làm nào được ghi</p>
            ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {logs.map((l) => (
                        <div key={l.id} className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-surface-soft">
                            <div className="min-w-0">
                                <span className="font-bold text-gray-800 dark:text-body-strong">{fmtDuration(l.minutes)}</span>
                                <span className="text-gray-500 dark:text-body ml-2">{l.user?.name || l.user?.email}</span>
                                {l.note && <span className="text-gray-400 dark:text-muted ml-2 italic">— {l.note}</span>}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-gray-400 dark:text-muted">{format(new Date(l.workDate), "dd/MM")}</span>
                                {canEdit && (
                                    <button onClick={() => handleDelete(l.id, l.minutes)} className="rounded-full p-1 text-gray-400 dark:text-muted hover:text-m-red hover:bg-surface-elevated">
                                        <Trash2 className="size-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TimeTracker;
