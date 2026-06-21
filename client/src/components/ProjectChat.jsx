import { useState, useEffect, useRef } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { Send, MessagesSquare, Paperclip, FileText, Sparkles } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { apiFetch, API_BASE_URL } from "../lib/api";
import { joinProject, leaveProject, getSocket } from "../lib/socket";

const ProjectChat = ({ projectId }) => {
    const { getToken } = useAuth();
    const { user } = useUser();
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const bottomRef = useRef(null);
    const fileInputRef = useRef(null);
    const [summary, setSummary] = useState("");
    const [summarizing, setSummarizing] = useState(false);

    const handleSummarize = async () => {
        setSummarizing(true);
        try {
            const token = await getToken();
            const data = await apiFetch(token, `/ai/summarize/${projectId}`);
            setSummary(data.summary);
        } catch (err) {
            toast.error(err.message || "Không tạo được tóm tắt");
        } finally {
            setSummarizing(false);
        }
    };

    const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: "smooth" });

    const fetchMessages = async () => {
        try {
            const token = await getToken();
            const data = await apiFetch(token, `/project-messages/project/${projectId}`);
            setMessages(data.messages || []);
            setHasMore(data.hasMore || false);
        } catch {
            /* silent */
        } finally {
            setLoading(false);
        }
    };

    const loadOlder = async () => {
        if (!messages.length || loadingMore) return;
        setLoadingMore(true);
        try {
            const token = await getToken();
            const oldest = messages[0].createdAt;
            const data = await apiFetch(token, `/project-messages/project/${projectId}?before=${encodeURIComponent(oldest)}`);
            setMessages((prev) => [...(data.messages || []), ...prev]);
            setHasMore(data.hasMore || false);
        } catch {
            /* silent */
        } finally {
            setLoadingMore(false);
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

    // Chỉ tự cuộn xuống đáy khi KHÔNG phải đang tải tin cũ (tránh nhảy trang)
    useEffect(() => {
        if (!loadingMore) scrollToBottom();
    }, [messages, loadingMore]);

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

    // Đính kèm file: upload rồi gửi message kèm URL
    const handleAttach = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        const uploadingToast = toast.loading("Đang tải file...");
        try {
            const token = await getToken();
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch(`${API_BASE_URL}/files/upload`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            if (!res.ok) throw new Error(await res.text());
            const uploaded = await res.json();
            await apiFetch(token, `/project-messages/project/${projectId}`, {
                method: "POST",
                body: { content: "", fileUrl: uploaded.fileUrl, fileName: uploaded.fileName },
            });
            toast.dismiss(uploadingToast);
        } catch (err) {
            toast.dismiss(uploadingToast);
            toast.error("Đính kèm thất bại: " + err.message);
        }
    };

    return (
        <div className="flex flex-col h-[70vh] border border-zinc-200 dark:border-zinc-800 rounded-lg">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <MessagesSquare className="size-5 text-blue-500" />
                    <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Thảo luận nhóm dự án</h3>
                </div>
                <button onClick={handleSummarize} disabled={summarizing} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 disabled:opacity-50">
                    <Sparkles className="size-3.5" /> {summarizing ? "Đang tóm tắt..." : "Tóm tắt AI"}
                </button>
            </div>

            {summary && (
                <div className="px-4 py-3 bg-purple-50 dark:bg-purple-900/10 border-b border-purple-200 dark:border-purple-900/30 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                    <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1"><Sparkles className="size-3.5" /> Tóm tắt AI</span>
                        <button onClick={() => setSummary("")} className="text-xs text-zinc-400 hover:text-zinc-600">Đóng</button>
                    </div>
                    {summary}
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {hasMore && !loading && (
                    <div className="text-center">
                        <button onClick={loadOlder} disabled={loadingMore} className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50">
                            {loadingMore ? "Đang tải..." : "Tải tin nhắn cũ hơn"}
                        </button>
                    </div>
                )}
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
                                        {m.content && <p>{m.content}</p>}
                                        {m.fileUrl && (
                                            <a href={m.fileUrl} target="_blank" rel="noreferrer" className={`flex items-center gap-1.5 mt-1 underline ${mine ? "text-blue-100" : "text-blue-600 dark:text-blue-400"}`}>
                                                <FileText className="size-3.5 flex-shrink-0" />
                                                <span className="truncate">{m.fileName || "Tệp đính kèm"}</span>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSend} className="p-3 border-t border-zinc-200 dark:border-zinc-800 flex gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} title="Đính kèm tệp" className="px-2 rounded-lg text-zinc-500 hover:text-blue-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    <Paperclip className="size-4" />
                </button>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleAttach} />
                <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Nhập tin nhắn... (@email để nhắc ai đó)"
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
