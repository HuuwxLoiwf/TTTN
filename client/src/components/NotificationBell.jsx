import { useState, useEffect, useRef } from "react";
import { useAuth, useUser } from "../context/AuthContext";
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

    // Khi mở dropdown: đánh dấu đã đọc theo nhóm các thông báo đang hiển thị (UX "đã xem")
    const handleToggle = () => {
        const willOpen = !open;
        setOpen(willOpen);
        if (willOpen) {
            const unreadIds = items.filter((n) => !n.isRead).map((n) => n.id);
            if (unreadIds.length === 0) return;
            setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
            (async () => {
                try {
                    const token = await getToken();
                    await apiFetch(token, "/notifications/read-many", { method: "PUT", body: { ids: unreadIds } });
                } catch {
                    fetchNotifications();
                }
            })();
        }
    };

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={handleToggle}
                className="relative size-8 flex items-center justify-center bg-white dark:bg-surface-card rounded-full transition hover:scale-105 active:scale-95"
            >
                <Bell className="size-4 text-gray-800 dark:text-ink" />
                {unread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 flex items-center justify-center text-[10px] font-bold text-white bg-m-red rounded-full">
                        {unread > 9 ? "9+" : unread}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-lg shadow-spotify-lg bg-white dark:bg-surface-elevated z-50">
                    <div className="flex items-center justify-between px-4 py-3 sticky top-0 bg-white dark:bg-surface-elevated rounded-t-lg">
                        <h3 className="text-xs font-bold text-gray-900 dark:text-ink">Thông báo</h3>
                        {unread > 0 && (
                            <button
                                onClick={markAllRead}
                                className="flex items-center gap-1 text-xs text-bmw-blue hover:underline"
                            >
                                <CheckCheck className="size-3.5" /> Đọc tất cả
                            </button>
                        )}
                    </div>

                    {items.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-gray-400 dark:text-muted">
                            Chưa có thông báo
                        </div>
                    ) : (
                        <div className="p-1.5 space-y-1">
                            {items.map((n) => (
                                <button
                                    key={n.id}
                                    onClick={() => markOneRead(n.id)}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${
                                        n.isRead ? "" : "bg-blue-50/40 dark:bg-surface-soft"
                                    }`}
                                >
                                    <div className="flex items-start gap-2">
                                        {!n.isRead && <span className="mt-1.5 size-1.5 rounded-full bg-m-blue-light flex-shrink-0" />}
                                        <div className={`flex-1 min-w-0 ${n.isRead ? "pl-3.5" : ""}`}>
                                            <p className="text-sm font-medium text-gray-900 dark:text-ink">{n.title}</p>
                                            <p className="text-xs text-gray-500 dark:text-body mt-0.5">{n.message}</p>
                                            <p className="text-[11px] text-gray-400 dark:text-muted mt-1">
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
