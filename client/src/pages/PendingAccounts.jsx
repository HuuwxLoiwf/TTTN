import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useAuth, useUser } from "../context/AuthContext";
import { format } from "date-fns";
import { UserCheck, Check, X } from "lucide-react";
import toast from "react-hot-toast";
import { apiFetch } from "../lib/api";

export default function PendingAccounts() {
    const { getToken } = useAuth();
    const { user } = useUser();
    const { currentWorkspace } = useSelector((state) => state.workspace);
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);

    // Là admin nếu là admin@umc.com hoặc ADMIN của workspace
    const isAdmin = user?.email === "admin@umc.com" ||
        currentWorkspace?.members?.some((m) => m.userId === user?.id && m.role === "ADMIN");

    const load = async () => {
        try {
            const token = await getToken();
            const data = await apiFetch(token, "/auth/pending-users");
            setList(data);
        } catch {
            /* silent */
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) load();
        else setLoading(false);
    }, [isAdmin]);

    const approve = async (id) => {
        try {
            const token = await getToken();
            await apiFetch(token, `/auth/pending-users/${id}/approve`, { method: "PUT" });
            setList((prev) => prev.filter((u) => u.id !== id));
            toast.success("Đã duyệt tài khoản");
        } catch (err) {
            toast.error(err.message);
        }
    };

    const reject = async (id) => {
        if (!window.confirm("Từ chối và xóa tài khoản này?")) return;
        try {
            const token = await getToken();
            await apiFetch(token, `/auth/pending-users/${id}`, { method: "DELETE" });
            setList((prev) => prev.filter((u) => u.id !== id));
            toast.success("Đã từ chối tài khoản");
        } catch (err) {
            toast.error(err.message);
        }
    };

    if (!isAdmin) {
        return <div className="max-w-3xl mx-auto py-16 text-center text-zinc-500">Chỉ quản trị viên mới truy cập được trang này.</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-5">
            <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent mb-1 flex items-center gap-2">
                    <UserCheck className="size-6 text-blue-500" /> Duyệt tài khoản
                </h1>
                <p className="text-gray-500 dark:text-zinc-400 text-sm">Tài khoản mới chờ bạn duyệt để được đăng nhập ({list.length})</p>
            </div>

            {loading ? (
                <p className="text-center text-sm text-zinc-400 py-10">Đang tải...</p>
            ) : list.length === 0 ? (
                <p className="text-center text-sm text-zinc-400 py-10">Không có tài khoản nào chờ duyệt</p>
            ) : (
                <div className="space-y-2">
                    {list.map((u) => (
                        <div key={u.id} className="glass-card flex items-center justify-between gap-3 p-4">
                            <div className="min-w-0">
                                <p className="font-medium text-zinc-900 dark:text-white truncate">{u.name}</p>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">{u.email}</p>
                                <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-0.5">Đăng ký: {format(new Date(u.createdAt), "dd/MM/yyyy HH:mm")}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button onClick={() => approve(u.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm">
                                    <Check className="size-4" /> Duyệt
                                </button>
                                <button onClick={() => reject(u.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 text-sm">
                                    <X className="size-4" /> Từ chối
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
