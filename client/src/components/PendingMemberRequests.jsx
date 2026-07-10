import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
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
        <div className="rounded-lg p-6 bg-white dark:bg-m-warning/5">
            <h2 className="text-sm font-bold text-amber-700 dark:text-m-warning mb-3 flex items-center gap-2">
                <Clock className="size-5" /> Yêu cầu chờ duyệt ({requests.length})
            </h2>
            <div className="space-y-2">
                {requests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white dark:bg-surface-card hover:bg-gray-50 dark:hover:bg-surface-elevated transition-colors text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                            {req.user?.image && <img src={req.user.image} alt="" className="size-6 rounded-full" />}
                            <div className="min-w-0">
                                <p className="font-medium text-gray-900 dark:text-ink truncate">{req.user?.name || req.user?.email}</p>
                                <p className="text-xs text-gray-500 dark:text-muted truncate">{req.user?.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                onClick={() => handleApprove(req.id)}
                                disabled={busyId === req.id}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-m-blue-light text-black hover:brightness-110 text-xs font-bold disabled:opacity-50 transition"
                            >
                                <Check className="size-3.5" /> Duyệt
                            </button>
                            <button
                                onClick={() => handleReject(req.id)}
                                disabled={busyId === req.id}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-m-red text-m-red hover:bg-m-red hover:text-white text-xs font-bold disabled:opacity-50 transition"
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
