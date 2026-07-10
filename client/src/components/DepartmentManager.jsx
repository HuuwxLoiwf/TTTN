import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useAuth, useUser } from "../context/AuthContext";
import { XIcon, Plus, Trash2, Building2 } from "lucide-react";
import toast from "react-hot-toast";
import { apiFetch } from "../lib/api";

/**
 * Dialog quản lý phòng ban của workspace. Tạo/xóa — chỉ ADMIN.
 * onChange: callback khi danh sách thay đổi (để cha refetch nếu cần).
 */
const DepartmentManager = ({ isOpen, setIsOpen, onChange }) => {
    const { getToken } = useAuth();
    const { user } = useUser();
    const { currentWorkspace } = useSelector((state) => state.workspace);

    const [departments, setDepartments] = useState([]);
    const [name, setName] = useState("");
    const [busy, setBusy] = useState(false);

    const isAdmin = currentWorkspace?.members?.some(
        (m) => m.userId === user?.id && m.role === "ADMIN"
    );

    const fetchDepartments = async () => {
        if (!currentWorkspace?.id) return;
        try {
            const token = await getToken();
            const data = await apiFetch(token, `/departments/workspace/${currentWorkspace.id}`);
            setDepartments(data);
        } catch {
            /* silent */
        }
    };

    useEffect(() => {
        if (isOpen) fetchDepartments();
    }, [isOpen, currentWorkspace?.id]);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setBusy(true);
        try {
            const token = await getToken();
            const dept = await apiFetch(token, `/departments/workspace/${currentWorkspace.id}`, {
                method: "POST",
                body: { name },
            });
            setDepartments((prev) => [...prev, { ...dept, _count: { projects: 0 } }]);
            setName("");
            onChange?.();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Xóa phòng ban này? Dự án thuộc phòng ban sẽ không bị xóa.")) return;
        try {
            const token = await getToken();
            await apiFetch(token, `/departments/${id}`, { method: "DELETE" });
            setDepartments((prev) => prev.filter((d) => d.id !== id));
            onChange?.();
        } catch (err) {
            toast.error(err.message);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="rounded-lg bg-white dark:bg-surface-card shadow-spotify-lg p-6 w-full max-w-md text-zinc-900 dark:text-body relative">
                <button className="absolute top-3 right-3 rounded-full p-1 text-zinc-500 hover:text-zinc-700 dark:text-muted dark:hover:text-ink hover:bg-surface-elevated transition" onClick={() => setIsOpen(false)}>
                    <XIcon className="size-5" />
                </button>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 dark:text-ink">
                    <Building2 className="size-5" /> Quản lý phòng ban
                </h2>

                {isAdmin && (
                    <form onSubmit={handleCreate} className="flex gap-2 mb-4">
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Tên phòng ban (VD: Phòng IT)"
                            className="flex-1 rounded px-3 py-2 dark:bg-surface-elevated dark:shadow-spotify-inset text-sm dark:text-ink focus:outline-none"
                        />
                        <button type="submit" disabled={busy} className="rounded-full px-4 py-2 bg-m-blue-light text-black hover:bg-m-blue-dark text-sm font-bold flex items-center gap-1 disabled:opacity-50 transition">
                            <Plus className="size-4" /> Thêm
                        </button>
                    </form>
                )}

                <div className="space-y-2 max-h-72 overflow-y-auto">
                    {departments.length === 0 ? (
                        <p className="text-sm text-zinc-400 dark:text-muted text-center py-6">Chưa có phòng ban nào</p>
                    ) : (
                        departments.map((d) => (
                            <div key={d.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-50 dark:bg-surface-soft text-sm">
                                <div>
                                    <span className="font-medium dark:text-ink">{d.name}</span>
                                    <span className="text-xs text-zinc-500 dark:text-muted ml-2">{d._count?.projects ?? 0} dự án</span>
                                </div>
                                {isAdmin && (
                                    <button onClick={() => handleDelete(d.id)} className="rounded-full p-1 hover:bg-red-50 dark:hover:bg-m-red/10 text-zinc-400 dark:text-muted hover:text-m-red">
                                        <Trash2 className="size-4" />
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default DepartmentManager;
