import { useEffect, useState } from "react";
import { Clock, Activity as ActivityIcon, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { useSelector } from "react-redux";
import { useAuth, useUser } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import { apiFetch } from "../lib/api";
import { getSocket, joinWorkspace, leaveWorkspace } from "../lib/socket";

const RecentActivity = () => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const { currentWorkspace } = useSelector((state) => state.workspace);
    const { getToken } = useAuth();
    const { user } = useUser();

    // Người dùng hiện tại có phải ADMIN của workspace không
    const isAdmin = currentWorkspace?.members?.some(
        (m) => m.userId === user?.id && m.role === "ADMIN"
    );

    const fetchActivities = async () => {
        if (!currentWorkspace?.id) return;
        setLoading(true);
        try {
            const token = await getToken();
            const data = await apiFetch(token, `/activities/workspace/${currentWorkspace.id}`);
            setActivities(data);
        } catch {
            /* silent */
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActivities();
    }, [currentWorkspace?.id]);

    // Realtime: nghe hoạt động mới trong workspace
    useEffect(() => {
        if (!currentWorkspace?.id) return;
        joinWorkspace(currentWorkspace.id);
        const socket = getSocket();
        const onNew = (activity) => {
            setActivities((prev) =>
                prev.some((a) => a.id === activity.id) ? prev : [activity, ...prev]
            );
        };
        socket.on("activity:new", onNew);
        return () => {
            leaveWorkspace(currentWorkspace.id);
            socket.off("activity:new", onNew);
        };
    }, [currentWorkspace?.id]);

    const handleDelete = async (id) => {
        const prev = activities;
        setActivities((a) => a.filter((x) => x.id !== id)); // optimistic
        try {
            const token = await getToken();
            await apiFetch(token, `/activities/${id}`, { method: "DELETE" });
        } catch (err) {
            setActivities(prev); // revert
            toast.error(err.message || "Xóa hoạt động thất bại");
        }
    };

    return (
        <div className="bg-white dark:bg-zinc-950 dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-lg transition-all overflow-hidden">
            <div className="border-b border-zinc-200 dark:border-zinc-800 p-4">
                <h2 className="text-lg text-zinc-800 dark:text-zinc-200">Hoạt động gần đây</h2>
            </div>

            <div className="p-0">
                {loading ? (
                    <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">Đang tải...</div>
                ) : activities.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-zinc-200 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                            <Clock className="w-8 h-8 text-zinc-600 dark:text-zinc-500" />
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-400">Chưa có hoạt động gần đây</p>
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {activities.map((act) => (
                            <div key={act.id} className="group p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg flex-shrink-0">
                                        {act.user?.image ? (
                                            <img src={act.user.image} alt="" className="w-4 h-4 rounded-full" />
                                        ) : (
                                            <ActivityIcon className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-zinc-800 dark:text-zinc-200">
                                            <span className="font-medium">{act.user?.name || act.user?.email || "Người dùng"}</span>{" "}
                                            <span className="text-zinc-600 dark:text-zinc-400">{act.action}</span>
                                        </p>
                                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                                            {formatDistanceToNow(new Date(act.createdAt), { addSuffix: true, locale: vi })}
                                        </p>
                                    </div>
                                    {isAdmin && (
                                        <button
                                            onClick={() => handleDelete(act.id)}
                                            className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/30 text-zinc-400 hover:text-red-500 transition-all flex-shrink-0"
                                            title="Xóa hoạt động (quản trị viên)"
                                        >
                                            <Trash2 className="size-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecentActivity;
