import { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
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

const TimeTracker = ({ taskId }) => {
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
        <div className="p-4 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                    <Clock className="size-4" /> Thời gian làm việc
                </h3>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{fmtDuration(total)}</span>
            </div>

            <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2 mb-3">
                <input type="number" min="0" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Giờ" className="w-16 px-2 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 text-sm" />
                <input type="number" min="0" max="59" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="Phút" className="w-16 px-2 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 text-sm" />
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú (tùy chọn)" className="flex-1 min-w-32 px-2 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 text-sm" />
                <button type="submit" disabled={busy} className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center gap-1 disabled:opacity-50">
                    <Plus className="size-4" /> Ghi
                </button>
            </form>

            {logs.length === 0 ? (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-2">Chưa có giờ làm nào được ghi</p>
            ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {logs.map((l) => (
                        <div key={l.id} className="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-zinc-50 dark:bg-zinc-800/60">
                            <div className="min-w-0">
                                <span className="font-medium text-zinc-800 dark:text-zinc-200">{fmtDuration(l.minutes)}</span>
                                <span className="text-zinc-500 dark:text-zinc-400 ml-2">{l.user?.name || l.user?.email}</span>
                                {l.note && <span className="text-zinc-400 dark:text-zinc-500 ml-2 italic">— {l.note}</span>}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-zinc-400 dark:text-zinc-600">{format(new Date(l.workDate), "dd/MM")}</span>
                                {l.user?.id === user?.id && (
                                    <button onClick={() => handleDelete(l.id, l.minutes)} className="text-zinc-400 hover:text-red-500">
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
