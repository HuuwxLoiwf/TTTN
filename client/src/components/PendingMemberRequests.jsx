import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Check, X, Clock } from "lucide-react";
import toast from "react-hot-toast";
import { apiFetch } from "../lib/api";

/**
 * Danh sách yêu cầu thêm thành viên đang chờ duyệt — chỉ hiện cho admin/trưởng dự án.
 * onApproved: callback để cha refetch dự án (cập nhật danh sách thành viên).
 */
const PendingMemberRequests = ({ projectId, onApproved }) => {
    const { getToken } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);

    const fetchRequests = async () => {
        if (!projectId) return;
        try {
            const token = await getToken();
            const data = await apiFetch(token, `/member-requests/project/${projectId}?status=PENDING`);
            setRequests(data);
        } catch {
            /* silent */
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [projectId]);

    const handleApprove = async (id) => {
        setBusyId(id);
        try {
            const token = await getToken();
            await apiFetch(token, `/member-requests/${id}/approve`, { method: "PUT" });
            setRequests((prev) => prev.filter((r) => r.id !== id));
            toast.success("Đã duyệt yêu cầu");
            onApproved?.();
        } catch (err) {
            toast.error("Duyệt thất bại: " + err.message);
        } finally {
            setBusyId(null);
        }
    };

    const handleReject = async (id) => {
        const note = window.prompt("Lý do từ chối (tùy chọn):") ?? "";
        setBusyId(id);
        try {
            const token = await getToken();
            await apiFetch(token, `/member-requests/${id}/reject`, { method: "PUT", body: { note } });
            setRequests((prev) => prev.filter((r) => r.id !== id));
            toast.success("Đã từ chối yêu cầu");
        } catch (err) {
            toast.error("Từ chối thất bại: " + err.message);
        } finally {
            setBusyId(null);
        }
    };

    if (loading || requests.length === 0) return null; // ẩn khi không có yêu cầu

    return (
        <div className="rounded-lg border border-amber-300 dark:border-amber-900/50 p-6 bg-amber-50/50 dark:bg-amber-900/10">
            <h2 className="text-lg font-medium text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
                <Clock className="size-5" /> Yêu cầu chờ duyệt ({requests.length})
            </h2>
            <div className="space-y-2">
                {requests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded bg-white dark:bg-zinc-800 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                            {req.user?.image && <img src={req.user.image} alt="" className="size-6 rounded-full" />}
                            <div className="min-w-0">
                                <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{req.user?.name || req.user?.email}</p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{req.user?.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                onClick={() => handleApprove(req.id)}
                                disabled={busyId === req.id}
                                className="flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs disabled:opacity-50"
                            >
                                <Check className="size-3.5" /> Duyệt
                            </button>
                            <button
                                onClick={() => handleReject(req.id)}
                                disabled={busyId === req.id}
                                className="flex items-center gap-1 px-3 py-1.5 rounded border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 text-xs disabled:opacity-50"
                            >
                                <X className="size-3.5" /> Từ chối
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PendingMemberRequests;
