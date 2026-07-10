import { useEffect, useState } from "react";
import { Clock, Activity as ActivityIcon, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { useSelector } from "react-redux";
import { useAuth, useUser } from "../context/AuthContext";
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
        <div className="bg-white dark:bg-surface-card rounded-lg border border-gray-200 dark:border-transparent overflow-hidden">
            <div className="border-b border-gray-200 dark:border-hairline p-4">
                <h2 className="text-sm font-bold text-gray-900 dark:text-ink">Hoạt động gần đây</h2>
            </div>

            <div className="p-0">
                {loading ? (
                    <div className="p-12 text-center text-gray-500 dark:text-muted text-sm font-light">Đang tải...</div>
                ) : activities.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full border border-gray-200 dark:border-hairline flex items-center justify-center">
                            <Clock className="w-8 h-8 text-gray-400 dark:text-muted" />
                        </div>
                        <p className="text-gray-500 dark:text-body font-light">Chưa có hoạt động gần đây</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200 dark:divide-hairline">
                        {activities.map((act) => (
                            <div key={act.id} className="group mx-2 my-1 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-surface-elevated transition-colors">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-full bg-gray-100 dark:bg-surface-elevated flex-shrink-0">
                                        {act.user?.image ? (
                                            <img src={act.user.image} alt="" className="w-4 h-4 rounded-full" />
                                        ) : (
                                            <ActivityIcon className="w-4 h-4 text-bmw-blue" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-800 dark:text-body">
                                            <span className="font-bold text-gray-900 dark:text-ink">{act.user?.name || act.user?.email || "Người dùng"}</span>{" "}
                                            <span className="text-gray-600 dark:text-body font-light">{act.action}</span>
                                        </p>
                                        <p className="text-xs text-gray-400 dark:text-muted font-light mt-0.5">
                                            {formatDistanceToNow(new Date(act.createdAt), { addSuffix: true, locale: vi })}
                                        </p>
                                    </div>
                                    {isAdmin && (
                                        <button
                                            onClick={() => handleDelete(act.id)}
                                            className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-m-red/10 text-gray-400 dark:text-muted hover:text-m-red transition-all flex-shrink-0"
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
