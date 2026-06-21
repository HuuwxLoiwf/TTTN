import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { CheckSquare, Square, Plus, Trash2 } from "lucide-react";
import { apiFetch } from "../lib/api";

const SubtaskChecklist = ({ taskId }) => {
    const { getToken } = useAuth();
    const [items, setItems] = useState([]);
    const [title, setTitle] = useState("");

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
        <div className="p-4 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                    <CheckSquare className="size-4" /> Danh sách việc nhỏ
                </h3>
                {items.length > 0 && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{done}/{items.length} xong</span>
                )}
            </div>

            {items.length > 0 && (
                <div className="space-y-1 mb-3">
                    {items.map((i) => (
                        <div key={i.id} className="flex items-center gap-2 group">
                            <button onClick={() => toggle(i)} className="text-zinc-500 hover:text-blue-500 flex-shrink-0">
                                {i.done ? <CheckSquare className="size-4 text-blue-500" /> : <Square className="size-4" />}
                            </button>
                            <span className={`flex-1 text-sm ${i.done ? "line-through text-zinc-400 dark:text-zinc-600" : "text-zinc-800 dark:text-zinc-200"}`}>
                                {i.title}
                            </span>
                            <button onClick={() => remove(i.id)} className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 flex-shrink-0">
                                <Trash2 className="size-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <form onSubmit={add} className="flex gap-2">
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Thêm việc nhỏ..." className="flex-1 px-2 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 text-sm" />
                <button type="submit" className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center gap-1">
                    <Plus className="size-4" />
                </button>
            </form>
        </div>
    );
};

export default SubtaskChecklist;
