import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { CheckSquare, Square, Plus, Trash2, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { apiFetch } from "../lib/api";

const SubtaskChecklist = ({ taskId, canEdit = false }) => {
    const { getToken } = useAuth();
    const [items, setItems] = useState([]);
    const [title, setTitle] = useState("");
    const [suggesting, setSuggesting] = useState(false);

    // AI gợi ý việc nhỏ từ tiêu đề/mô tả công việc → tự thêm vào checklist
    const suggestAI = async () => {
        setSuggesting(true);
        try {
            const token = await getToken();
            const data = await apiFetch(token, `/ai/subtasks/${taskId}`);
            let added = 0;
            for (const s of data.suggestions || []) {
                // bỏ qua nếu đã có việc trùng tên
                if (items.some((i) => i.title.toLowerCase() === s.toLowerCase())) continue;
                const sub = await apiFetch(token, `/subtasks/task/${taskId}`, { method: "POST", body: { title: s } });
                setItems((prev) => [...prev, sub]);
                added++;
            }
            toast.success(added ? `AI đã thêm ${added} việc nhỏ` : "Không có gợi ý mới");
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSuggesting(false);
        }
    };

    const done = items.filter((i) => i.done).length;

    const fetchItems = async () => {
        try {
            const token = await getToken();
            const data = await apiFetch(token, `/subtasks/task/${taskId}`);
            setItems(data);
        } catch {
            /* silent */
        }
    };

    useEffect(() => {
        if (taskId) fetchItems();
    }, [taskId]);

    const add = async (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        try {
            const token = await getToken();
            const sub = await apiFetch(token, `/subtasks/task/${taskId}`, {
                method: "POST",
                body: { title },
            });
            setItems((prev) => [...prev, sub]);
            setTitle("");
        } catch { /* silent */ }
    };

    const toggle = async (item) => {
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)));
        try {
            const token = await getToken();
            await apiFetch(token, `/subtasks/${item.id}`, { method: "PUT", body: { done: !item.done } });
        } catch {
            fetchItems();
        }
    };

    const remove = async (id) => {
        setItems((prev) => prev.filter((i) => i.id !== id));
        try {
            const token = await getToken();
            await apiFetch(token, `/subtasks/${id}`, { method: "DELETE" });
        } catch {
            fetchItems();
        }
    };

    return (
        <div className="p-4 rounded-lg bg-white dark:bg-surface-card">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold flex items-center gap-2 text-gray-900 dark:text-ink">
                    <CheckSquare className="size-4" /> Danh sách việc nhỏ
                </h3>
                <div className="flex items-center gap-2">
                    {canEdit && (
                        <button onClick={suggestAI} disabled={suggesting} title="AI chia nhỏ công việc thành các bước"
                            className="flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-1 dark:bg-m-blue-light/10 text-m-blue-light hover:bg-m-blue-light hover:text-black disabled:opacity-50 transition">
                            <Sparkles className="size-3" /> {suggesting ? "Đang gợi ý..." : "Gợi ý AI"}
                        </button>
                    )}
                    {items.length > 0 && (
                        <span className="text-xs font-bold text-m-blue-light">{done}/{items.length} <span className={done === items.length ? "text-m-success" : ""}>xong</span></span>
                    )}
                </div>
            </div>

            {items.length > 0 && (
                <div className="mb-3 space-y-1">
                    {items.map((i) => (
                        <div key={i.id} className="flex items-center gap-2 group py-1.5 px-2 rounded-lg hover:bg-surface-soft dark:hover:bg-surface-soft transition">
                            <button onClick={() => canEdit && toggle(i)} disabled={!canEdit} className={`text-gray-400 dark:text-muted flex-shrink-0 rounded-full ${canEdit ? "hover:text-m-blue-light" : "cursor-default"}`}>
                                {i.done ? <CheckSquare className="size-4 text-m-success" /> : <Square className="size-4" />}
                            </button>
                            <span className={`flex-1 text-sm ${i.done ? "line-through text-gray-400 dark:text-muted" : "text-gray-800 dark:text-body-strong"}`}>
                                {i.title}
                            </span>
                            {canEdit && (
                                <button onClick={() => remove(i.id)} className="opacity-0 group-hover:opacity-100 rounded-full text-gray-400 dark:text-muted hover:text-m-red flex-shrink-0">
                                    <Trash2 className="size-3.5" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {canEdit ? (
                <form onSubmit={add} className="flex gap-2">
                    <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Thêm việc nhỏ..." className="flex-1 rounded px-3 py-1.5 dark:bg-surface-elevated dark:shadow-spotify-inset text-sm text-gray-900 dark:text-ink focus:outline-none" />
                    <button type="submit" className="rounded-full px-3 py-1.5 bg-m-blue-light text-black hover:bg-m-blue-dark text-sm font-bold flex items-center gap-1 transition">
                        <Plus className="size-4" />
                    </button>
                </form>
            ) : items.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-muted">Chưa có việc nhỏ nào.</p>
            ) : null}
        </div>
    );
};

export default SubtaskChecklist;
