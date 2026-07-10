import { useState, useEffect, useRef } from "react";
import { useAuth, useUser } from "../context/AuthContext";
import { Send, MessagesSquare, Paperclip, FileText, Sparkles } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import { apiFetch, API_BASE_URL } from "../lib/api";
import { joinProject, leaveProject, getSocket } from "../lib/socket";
import FilePreview, { canPreview } from "./FilePreview";
import MentionPicker from "./MentionPicker";

const ProjectChat = ({ projectId }) => {
    const { getToken } = useAuth();
    const { user } = useUser();
    const { currentWorkspace } = useSelector((state) => state.workspace);
    const projectMembers = currentWorkspace?.projects?.find((p) => p.id === projectId)?.members || [];
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const bottomRef = useRef(null);
    const fileInputRef = useRef(null);
    const [summary, setSummary] = useState("");
    const [summarizing, setSummarizing] = useState(false);
    const [previewFile, setPreviewFile] = useState(null); // xem ảnh/PDF trong modal (có nút đóng)

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
        <div className="flex flex-col h-[70vh] bg-surface-card rounded-lg shadow-spotify-md overflow-hidden">
            <div className="px-4 py-3 border-b border-hairline flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <MessagesSquare className="size-5 text-bmw-blue" />
                    <h3 className="text-sm font-bold text-gray-900 dark:text-body-strong">Thảo luận nhóm dự án</h3>
                </div>
                <button onClick={handleSummarize} disabled={summarizing} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-surface-elevated text-gray-700 dark:text-body font-bold hover:bg-white/10 disabled:opacity-50 transition-colors">
                    <Sparkles className="size-3.5" /> {summarizing ? "Đang tóm tắt..." : "Tóm tắt AI"}
                </button>
            </div>

            {summary && (
                <div className="px-4 py-3 bg-surface-soft border-b border-hairline text-sm text-gray-700 dark:text-body whitespace-pre-wrap max-h-48 overflow-y-auto">
                    <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-gray-700 dark:text-body-strong flex items-center gap-1"><Sparkles className="size-3.5" /> Tóm tắt AI</span>
                        <button onClick={() => setSummary("")} className="text-xs text-gray-400 dark:text-muted hover:text-gray-600 dark:hover:text-body">Đóng</button>
                    </div>
                    {summary}
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {hasMore && !loading && (
                    <div className="text-center">
                        <button onClick={loadOlder} disabled={loadingMore} className="text-xs text-bmw-blue hover:underline disabled:opacity-50">
                            {loadingMore ? "Đang tải..." : "Tải tin nhắn cũ hơn"}
                        </button>
                    </div>
                )}
                {loading ? (
                    <p className="text-center text-sm text-gray-400 dark:text-muted">Đang tải...</p>
                ) : messages.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 dark:text-muted py-10">Chưa có tin nhắn. Bắt đầu trò chuyện với nhóm!</p>
                ) : (
                    messages.map((m) => {
                        const mine = m.user?.id === user?.id;
                        return (
                            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[75%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        {!mine && m.user?.image && <img src={m.user.image} alt="" className="size-4 rounded-full" />}
                                        <span className="text-xs text-gray-500 dark:text-muted">
                                            {mine ? "Bạn" : m.user?.name || m.user?.email}
                                        </span>
                                        <span className="text-[10px] text-gray-400 dark:text-muted">
                                            {format(new Date(m.createdAt), "HH:mm")}
                                        </span>
                                    </div>
                                    <div className={`px-3.5 py-2 text-sm rounded-2xl ${mine ? "bg-m-blue-light text-black" : "bg-surface-card text-gray-900 dark:text-ink"}`}>
                                        {m.content && <p>{m.content}</p>}
                                        {m.fileUrl && (
                                            canPreview(m.fileName || m.fileUrl) ? (
                                                // Ảnh/PDF: mở modal xem trước ngay trong app (có nút đóng để quay về)
                                                <button
                                                    type="button"
                                                    onClick={() => setPreviewFile({ fileName: m.fileName || "Tệp đính kèm", fileUrl: m.fileUrl })}
                                                    className={`flex items-center gap-1.5 mt-1 underline ${mine ? "text-black" : "text-bmw-blue dark:text-bmw-blue"}`}
                                                >
                                                    <FileText className="size-3.5 flex-shrink-0" />
                                                    <span className="truncate">{m.fileName || "Tệp đính kèm"}</span>
                                                </button>
                                            ) : (
                                                <a href={m.fileUrl} target="_blank" rel="noreferrer" className={`flex items-center gap-1.5 mt-1 underline ${mine ? "text-black" : "text-bmw-blue dark:text-bmw-blue"}`}>
                                                    <FileText className="size-3.5 flex-shrink-0" />
                                                    <span className="truncate">{m.fileName || "Tệp đính kèm"}</span>
                                                </a>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSend} className="p-3 border-t border-hairline flex gap-2 items-center">
                <button type="button" onClick={() => fileInputRef.current?.click()} title="Đính kèm tệp" className="p-2 rounded-full text-gray-500 dark:text-muted hover:text-bmw-blue hover:bg-white/10 transition-colors">
                    <Paperclip className="size-4" />
                </button>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleAttach} />
                <div className="flex-1 relative">
                    <MentionPicker text={text} members={projectMembers} onPick={setText} />
                    <input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Nhập tin nhắn... (gõ @ để nhắc thành viên)"
                        className="w-full px-4 py-2 bg-surface-card text-sm rounded-full shadow-spotify-inset focus:outline-none"
                    />
                </div>
                <button type="submit" className="size-10 rounded-full bg-m-blue-light text-black flex items-center justify-center disabled:opacity-50 hover:scale-105 transition-transform flex-shrink-0" disabled={!text.trim()}>
                    <Send className="size-4" />
                </button>
            </form>

            {previewFile && <FilePreview file={previewFile} onClose={() => setPreviewFile(null)} />}
        </div>
    );
};

export default ProjectChat;
