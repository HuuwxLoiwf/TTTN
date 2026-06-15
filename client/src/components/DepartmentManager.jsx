import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useAuth, useUser } from "@clerk/clerk-react";
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
        <div className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur flex items-center justify-center z-50">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-md text-zinc-900 dark:text-zinc-200 relative">
                <button className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200" onClick={() => setIsOpen(false)}>
                    <XIcon className="size-5" />
                </button>
                <h2 className="text-xl font-medium mb-4 flex items-center gap-2">
                    <Building2 className="size-5" /> Quản lý phòng ban
                </h2>

                {isAdmin && (
                    <form onSubmit={handleCreate} className="flex gap-2 mb-4">
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Tên phòng ban (VD: Phòng IT)"
                            className="flex-1 px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-sm"
                        />
                        <button type="submit" disabled={busy} className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center gap-1 disabled:opacity-50">
                            <Plus className="size-4" /> Thêm
                        </button>
                    </form>
                )}

                <div className="space-y-2 max-h-72 overflow-y-auto">
                    {departments.length === 0 ? (
                        <p className="text-sm text-zinc-400 text-center py-6">Chưa có phòng ban nào</p>
                    ) : (
                        departments.map((d) => (
                            <div key={d.id} className="flex items-center justify-between px-3 py-2 rounded bg-zinc-100 dark:bg-zinc-800 text-sm">
                                <div>
                                    <span className="font-medium">{d.name}</span>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-2">{d._count?.projects ?? 0} dự án</span>
                                </div>
                                {isAdmin && (
                                    <button onClick={() => handleDelete(d.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-zinc-400 hover:text-red-500">
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
