import { useState, useEffect, useRef } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { Bell, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { apiFetch } from "../lib/api";
import { getSocket, joinUser } from "../lib/socket";

const NotificationBell = () => {
    const { getToken } = useAuth();
    const { user } = useUser();
    const [items, setItems] = useState([]);
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    const unread = items.filter((n) => !n.isRead).length;

    const fetchNotifications = async () => {
        try {
            const token = await getToken();
            const data = await apiFetch(token, "/notifications");
            setItems(data);
        } catch {
            /* silent — bell just stays empty */
        }
    };

    useEffect(() => {
        // Quét task sắp/quá hạn để tạo nhắc nhở, rồi tải danh sách thông báo
        const init = async () => {
            try {
                const token = await getToken();
                await apiFetch(token, "/notifications/check-due");
            } catch {
                /* bỏ qua nếu lỗi */
            }
            fetchNotifications();
        };
        init();
    }, []);

    // Realtime: join personal room and listen for new notifications
    useEffect(() => {
        if (!user?.id) return;
        joinUser(user.id);
        const socket = getSocket();
        const onNew = (n) => setItems((prev) => [n, ...prev]);
        socket.on("notification:new", onNew);
        return () => socket.off("notification:new", onNew);
    }, [user?.id]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const markAllRead = async () => {
        if (unread === 0) return;
        setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
        try {
            const token = await getToken();
            await apiFetch(token, "/notifications/read-all", { method: "PUT" });
        } catch {
            fetchNotifications(); // revert on failure
        }
    };

    const markOneRead = async (id) => {
        setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
        try {
            const token = await getToken();
            await apiFetch(token, `/notifications/${id}/read`, { method: "PUT" });
        } catch {
            fetchNotifications();
        }
    };

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen((v) => !v)}
                className="relative size-8 flex items-center justify-center bg-white dark:bg-zinc-800 shadow rounded-lg transition hover:scale-105 active:scale-95"
            >
                <Bell className="size-4 text-gray-800 dark:text-gray-200" />
                {unread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 flex items-center justify-center text-[10px] font-semibold text-white bg-red-500 rounded-full">
                        {unread > 9 ? "9+" : unread}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg z-50">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Thông báo</h3>
                        {unread > 0 && (
                            <button
                                onClick={markAllRead}
                                className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                            >
                                <CheckCheck className="size-3.5" /> Đọc tất cả
                            </button>
                        )}
                    </div>

                    {items.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-gray-400 dark:text-zinc-500">
                            Chưa có thông báo
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-zinc-800">
                            {items.map((n) => (
                                <button
                                    key={n.id}
                                    onClick={() => markOneRead(n.id)}
                                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition-colors ${
                                        n.isRead ? "" : "bg-blue-50/60 dark:bg-blue-900/10"
                                    }`}
                                >
                                    <div className="flex items-start gap-2">
                                        {!n.isRead && <span className="mt-1.5 size-2 rounded-full bg-blue-500 flex-shrink-0" />}
                                        <div className={`flex-1 min-w-0 ${n.isRead ? "pl-4" : ""}`}>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{n.title}</p>
                                            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{n.message}</p>
                                            <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-1">
                                                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: vi })}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
