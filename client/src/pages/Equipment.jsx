import { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { useAuth, useUser } from "../context/AuthContext";
import { Cpu, Plus, Trash2, Search, Download } from "lucide-react";
import toast from "react-hot-toast";
import { apiFetch } from "../lib/api";
import { exportToExcel } from "../lib/exportExcel";

const STATUS_VI = { AVAILABLE: "Sẵn sàng", IN_USE: "Đang dùng", MAINTENANCE: "Bảo trì", BROKEN: "Hỏng" };
const STATUS_CLS = {
    AVAILABLE: "bg-m-success/15 text-m-success",
    IN_USE: "bg-bmw-blue/15 text-bmw-blue",
    MAINTENANCE: "bg-m-warning/15 text-m-warning",
    BROKEN: "bg-m-red/15 text-m-red",
};

const emptyForm = { name: "", code: "", status: "AVAILABLE", note: "", imageUrl: "" };

export default function Equipment() {
    const { getToken } = useAuth();
    const { user } = useUser();
    const { currentWorkspace } = useSelector((state) => state.workspace);
    const wsId = currentWorkspace?.id;
    const projects = useMemo(() => currentWorkspace?.projects || [], [currentWorkspace]);
    // Thêm/sửa: ADMIN/MANAGER. Xóa: chỉ ADMIN.
    const myRole = currentWorkspace?.members?.find((m) => m.userId === user?.id)?.role;
    const isManager = myRole === "ADMIN" || myRole === "MANAGER";
    const isAdmin = myRole === "ADMIN";

    const [equipments, setEquipments] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [q, setQ] = useState("");
    const [filterStatus, setFilterStatus] = useState("");

    const load = async () => {
        if (!wsId) return;
        try {
            const token = await getToken();
            const data = await apiFetch(token, `/equipment/workspace/${wsId}`);
            setEquipments(Array.isArray(data) ? data : []);
        } catch {
            setEquipments([]);
        }
    };

    useEffect(() => {
        load();
    }, [wsId]);

    const addEquipment = async (e) => {
        e.preventDefault();
        if (!form.name.trim() || !form.code.trim()) {
            toast.error("Vui lòng nhập tên và mã thiết bị");
            return;
        }
        setSaving(true);
        try {
            const token = await getToken();
            await apiFetch(token, `/equipment/workspace/${wsId}`, {
                method: "POST",
                body: { name: form.name, code: form.code, status: form.status, note: form.note || null, imageUrl: form.imageUrl || "" },
            });
            setForm(emptyForm);
            setShowForm(false);
            load();
            toast.success("Đã thêm thiết bị");
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    // Đổi trạng thái nhanh
    const changeStatus = async (id, status) => {
        try {
            const token = await getToken();
            await apiFetch(token, `/equipment/${id}`, { method: "PUT", body: { status } });
            load();
        } catch (err) {
            toast.error(err.message);
        }
    };

    // Gán / trả về kho
    const assignProject = async (id, projectId) => {
        try {
            const token = await getToken();
            await apiFetch(token, `/equipment/${id}`, { method: "PUT", body: { projectId: projectId || null } });
            load();
            toast.success(projectId ? "Đã gán cho dự án" : "Đã trả về kho");
        } catch (err) {
            toast.error(err.message);
        }
    };

    const removeEquipment = async (id) => {
        if (!window.confirm("Xóa thiết bị này?")) return;
        try {
            const token = await getToken();
            await apiFetch(token, `/equipment/${id}`, { method: "DELETE" });
            load();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const inputCls = "px-3 py-2 bg-surface-elevated text-sm rounded-lg shadow-spotify-inset focus:outline-none";

    const filtered = equipments.filter((e) => {
        const matchQ = !q || e.name.toLowerCase().includes(q.toLowerCase()) || e.code.toLowerCase().includes(q.toLowerCase());
        const matchS = !filterStatus || e.status === filterStatus;
        return matchQ && matchS;
    });

    const counts = useMemo(() => {
        const c = { AVAILABLE: 0, IN_USE: 0, MAINTENANCE: 0, BROKEN: 0 };
        equipments.forEach((e) => { c[e.status] = (c[e.status] || 0) + 1; });
        return c;
    }, [equipments]);

    const exportExcel = () => {
        const rows = equipments.map((e) => ({
            "Mã": e.code,
            "Tên thiết bị": e.name,
            "Trạng thái": STATUS_VI[e.status],
            "Dự án đang dùng": e.project?.name || "Trong kho",
            "Ghi chú": e.note || "",
        }));
        exportToExcel(rows, "danh-sach-thiet-bi", "Thiết bị");
    };

    return (
        <div className="space-y-5 max-w-6xl mx-auto text-gray-900 dark:text-ink">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <Cpu className="size-6 text-bmw-blue" />
                    <div>
                        <h1 className="text-xl font-bold">Thiết bị & Máy móc</h1>
                        <p className="text-xs text-gray-500 dark:text-muted">Quản lý máy SMT, hàn, jig kiểm tra và thiết bị sản xuất</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {equipments.length > 0 && (
                        <button onClick={exportExcel} className="px-4 py-2.5 rounded-full bg-surface-elevated text-gray-700 dark:text-body font-bold text-sm flex items-center gap-1 hover:bg-white/10 transition-colors">
                            <Download className="size-4" /> Xuất Excel
                        </button>
                    )}
                    {isManager && (
                        <button onClick={() => setShowForm((s) => !s)} className="px-5 py-2.5 rounded-full bg-m-blue-light text-black font-bold text-sm flex items-center gap-1 hover:scale-105 transition-transform">
                            <Plus className="size-4" /> Thêm thiết bị
                        </button>
                    )}
                </div>
            </div>

            {/* Thống kê trạng thái */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(STATUS_VI).map(([k, v]) => (
                    <button
                        key={k}
                        onClick={() => setFilterStatus(filterStatus === k ? "" : k)}
                        className={`text-left bg-surface-card rounded-lg p-4 transition-shadow hover:shadow-spotify-md ${filterStatus === k ? "ring-2 ring-bmw-blue" : ""}`}
                    >
                        <div className="text-xs text-gray-600 dark:text-muted">{v}</div>
                        <div className="text-2xl font-bold">{counts[k] || 0}</div>
                    </button>
                ))}
            </div>

            {isManager && showForm && (
                <form onSubmit={addEquipment} className="bg-surface-card rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tên thiết bị (VD: Máy dán linh kiện SMT)" className={inputCls} />
                        <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Mã thiết bị (VD: SMT-01)" className={inputCls} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs text-gray-500 dark:text-muted">Trạng thái</label>
                            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls + " w-full mt-0.5"}>
                                {Object.entries(STATUS_VI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                        </div>
                        <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Ghi chú" className={inputCls + " mt-[18px]"} />
                    </div>
                    <div className="flex items-center gap-3">
                        {form.imageUrl
                            ? <img src={form.imageUrl} alt="" className="size-12 rounded-lg object-cover bg-surface-elevated" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                            : <span className="size-12 rounded-lg bg-surface-elevated flex items-center justify-center"><Cpu className="size-5 text-gray-400" /></span>}
                        <input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="URL ảnh thiết bị (dán link ảnh)" className={inputCls + " flex-1"} />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => { setShowForm(false); setForm(emptyForm); }} className="px-4 py-2 rounded-full text-sm text-gray-600 dark:text-body hover:bg-white/10">Hủy</button>
                        <button type="submit" disabled={saving} className="px-5 py-2 rounded-full bg-m-blue-light text-black font-bold text-sm disabled:opacity-50">
                            {saving ? "Đang lưu..." : "Lưu thiết bị"}
                        </button>
                    </div>
                </form>
            )}

            {/* Tìm kiếm */}
            <div className="flex items-center gap-2 bg-surface-card rounded-full px-4 py-2 max-w-md">
                <Search className="size-4 text-gray-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo tên hoặc mã thiết bị..." className="bg-transparent text-sm flex-1 focus:outline-none" />
            </div>

            {filtered.length === 0 ? (
                <div className="text-center py-10 text-gray-400 dark:text-muted">
                    <Cpu className="size-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Chưa có thiết bị nào.</p>
                </div>
            ) : (
                <div className="bg-surface-card rounded-lg overflow-x-auto">
                    <table className="w-full text-sm min-w-[640px]">
                        <thead>
                            <tr className="text-xs text-gray-500 dark:text-muted border-b border-hairline">
                                <th className="text-left font-medium px-4 py-2.5">Mã</th>
                                <th className="text-left font-medium px-4 py-2.5">Tên thiết bị</th>
                                <th className="text-left font-medium px-4 py-2.5">Trạng thái</th>
                                <th className="text-left font-medium px-4 py-2.5">Dự án đang dùng</th>
                                {isAdmin && <th className="px-2 py-2.5"></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((eq) => (
                                <tr key={eq.id} className="border-b border-hairline/50 last:border-0 group">
                                    <td className="px-4 py-2.5 font-mono text-xs text-gray-700 dark:text-body">{eq.code}</td>
                                    <td className="px-4 py-2.5">
                                        <div className="flex items-center gap-3">
                                            {eq.imageUrl
                                                ? <img src={eq.imageUrl} alt="" className="size-10 rounded-lg object-cover bg-surface-elevated flex-shrink-0" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                                                : <span className="size-10 rounded-lg bg-surface-elevated flex items-center justify-center flex-shrink-0"><Cpu className="size-4 text-gray-400" /></span>}
                                            <div className="min-w-0">
                                                <div className="text-gray-800 dark:text-body-strong font-medium truncate">{eq.name}</div>
                                                {eq.note && <div className="text-xs text-gray-400 dark:text-muted truncate">{eq.note}</div>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        {isManager ? (
                                            <select
                                                value={eq.status}
                                                onChange={(e) => changeStatus(eq.id, e.target.value)}
                                                className={`text-xs px-2.5 py-1 rounded-full font-semibold focus:outline-none ${STATUS_CLS[eq.status]}`}
                                            >
                                                {Object.entries(STATUS_VI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                            </select>
                                        ) : (
                                            <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full ${STATUS_CLS[eq.status]}`}>{STATUS_VI[eq.status]}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2.5">
                                        {isManager ? (
                                            <select
                                                value={eq.projectId || ""}
                                                onChange={(e) => assignProject(eq.id, e.target.value)}
                                                className="text-xs bg-surface-elevated px-2.5 py-1 rounded-full shadow-spotify-inset focus:outline-none max-w-[180px]"
                                            >
                                                <option value="">— Trong kho —</option>
                                                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                        ) : (
                                            <span className="text-gray-600 dark:text-body">{eq.project?.name || "Trong kho"}</span>
                                        )}
                                    </td>
                                    {isAdmin && (
                                        <td className="px-2 py-2.5 text-right">
                                            <button onClick={() => removeEquipment(eq.id)} className="p-1.5 rounded-full text-gray-400 hover:text-m-red hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-colors">
                                                <Trash2 className="size-4" />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
