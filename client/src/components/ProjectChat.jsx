import { useState, useEffect, useRef } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { Send, MessagesSquare } from "lucide-react";
import { format } from "date-fns";
import { apiFetch } from "../lib/api";
import { joinProject, leaveProject, getSocket } from "../lib/socket";

const ProjectChat = ({ projectId }) => {
    const { getToken } = useAuth();
    const { user } = useUser();
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(true);
    const bottomRef = useRef(null);

    const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: "smooth" });

    const fetchMessages = async () => {
        try {
            const token = await getToken();
            const data = await apiFetch(token, `/project-messages/project/${projectId}`);
            setMessages(data);
        } catch {
            /* silent */
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!projectId) return;
        fetchMessages();

        // Realtime
        joinProject(projectId);
        const socket = getSocket();
        const onNew = (msg) => {
            setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        };
        socket.on("projectMessage:new", onNew);
        return () => {
            leaveProject(projectId);
            socket.off("projectMessage:new", onNew);
        };
    }, [projectId]);

    useEffect(scrollToBottom, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        const content = text.trim();
        if (!content) return;
        setText("");
        try {
            const token = await getToken();
            await apiFetch(token, `/project-messages/project/${projectId}`, {
                method: "POST",
                body: { content },
            });
            // tin nhắn sẽ về qua socket (projectMessage:new)
        } catch {
            setText(content); // khôi phục nếu lỗi
        }
    };

    return (
        <div className="flex flex-col h-[70vh] border border-zinc-200 dark:border-zinc-800 rounded-lg">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
                <MessagesSquare className="size-5 text-blue-500" />
                <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Thảo luận nhóm dự án</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                    <p className="text-center text-sm text-zinc-400">Đang tải...</p>
                ) : messages.length === 0 ? (
                    <p className="text-center text-sm text-zinc-400 py-10">Chưa có tin nhắn. Bắt đầu trò chuyện với nhóm!</p>
                ) : (
                    messages.map((m) => {
                        const mine = m.user?.id === user?.id;
                        return (
                            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[75%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        {!mine && m.user?.image && <img src={m.user.image} alt="" className="size-4 rounded-full" />}
                                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                            {mine ? "Bạn" : m.user?.name || m.user?.email}
                                        </span>
                                        <span className="text-[10px] text-zinc-400 dark:text-zinc-600">
                                            {format(new Date(m.createdAt), "HH:mm")}
                                        </span>
                                    </div>
                                    <div className={`px-3 py-2 rounded-lg text-sm ${mine ? "bg-blue-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"}`}>
                                        {m.content}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSend} className="p-3 border-t border-zinc-200 dark:border-zinc-800 flex gap-2">
                <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Nhập tin nhắn..."
                    className="flex-1 px-3 py-2 rounded-lg dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 disabled:opacity-50" disabled={!text.trim()}>
                    <Send className="size-4" />
                </button>
            </form>
        </div>
    );
};

export default ProjectChat;
