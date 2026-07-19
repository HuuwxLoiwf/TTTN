import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useAuth, useUser } from "../context/AuthContext";
import { ShieldAlert, Plus, Trash2, User as UserIcon, Download } from "lucide-react";
import toast from "react-hot-toast";
import { apiFetch } from "../lib/api";
import { exportToExcel } from "../lib/exportExcel";

const LEVEL_VI = { LOW: "Thấp", MEDIUM: "Trung bình", HIGH: "Cao" };
const STATUS_VI = { OPEN: "Đang mở", MITIGATING: "Đang xử lý", CLOSED: "Đã đóng" };
const STATUS_CLS = {
    OPEN: "bg-m-red/15 text-m-red",
    MITIGATING: "bg-m-warning/15 text-m-warning",
    CLOSED: "bg-m-success/15 text-m-success",
};

// Màu ô ma trận theo điểm rủi ro (khả năng × tác động, 1..9)
const scoreCls = (score) => {
    if (score >= 6) return "bg-m-red/15 text-m-red";
    if (score >= 3) return "bg-m-warning/15 text-m-warning";
    return "bg-m-success/15 text-m-success";
};
const scoreLabel = (score) => (score >= 6 ? "Cao" : score >= 3 ? "Trung bình" : "Thấp");

const emptyForm = { title: "", description: "", likelihood: "MEDIUM", impact: "MEDIUM", mitigation: "", ownerId: "" };

const ProjectRisks = ({ projectId }) => {
    const { getToken } = useAuth();
    const { user } = useUser();
    const { currentWorkspace } = useSelector((state) => state.workspace);
    const project = currentWorkspace?.projects?.find((p) => p.id === projectId);
    const members = project?.members || [];
    const isManager =
        currentWorkspace?.members?.some((m) => m.userId === user?.id && (m.role === "ADMIN" || m.role === "MANAGER")) ||
        project?.team_lead === user?.id;

    const [risks, setRisks] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        try {
            const token = await getToken();
            const data = await apiFetch(token, `/risks/project/${projectId}`);
            setRisks(Array.isArray(data) ? data : []);
        } catch {
            setRisks([]);
        }
    };

    useEffect(() => {
        if (projectId) load();
    }, [projectId]);

    const addRisk = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) {
            toast.error("Vui lòng nhập tên rủi ro");
            return;
        }
        setSaving(true);
        try {
            const token = await getToken();
            await apiFetch(token, `/risks/project/${projectId}`, {
                method: "POST",
                body: {
                    title: form.title,
                    description: form.description || null,
                    likelihood: form.likelihood,
                    impact: form.impact,
                    mitigation: form.mitigation || null,
                    ownerId: form.ownerId || null,
                },
            });
            setForm(emptyForm);
            setShowForm(false);
            load();
            toast.success("Đã ghi nhận rủi ro");
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    // Đổi trạng thái nhanh (Đang mở → Đang xử lý → Đã đóng)
    const changeStatus = async (id, status) => {
        try {
            const token = await getToken();
            await apiFetch(token, `/risks/${id}`, { method: "PUT", body: { status } });
            load();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const removeRisk = async (id) => {
        if (!window.confirm("Xóa rủi ro này?")) return;
        try {
            const token = await getToken();
            await apiFetch(token, `/risks/${id}`, { method: "DELETE" });
            load();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const inputCls = "px-3 py-2 bg-surface-elevated text-sm rounded-lg shadow-spotify-inset focus:outline-none";

    const openCount = risks.filter((r) => r.status !== "CLOSED").length;
    const highCount = risks.filter((r) => r.score >= 6 && r.status !== "CLOSED").length;

    const exportExcel = () => {
        const rows = risks.map((r) => ({
            "Rủi ro": r.title,
            "Mô tả": r.description || "",
            "Khả năng": LEVEL_VI[r.likelihood],
            "Tác động": LEVEL_VI[r.impact],
            "Điểm": r.score,
            "Mức": scoreLabel(r.score),
            "Trạng thái": STATUS_VI[r.status],
            "Ứng phó": r.mitigation || "",
            "Phụ trách": r.owner?.name || r.owner?.email || "",
        }));
        exportToExcel(rows, "so-rui-ro-du-an", "Rủi ro");
    };

    return (
        <div className="space-y-5">
            {/* Tổng quan */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: "Tổng rủi ro", value: risks.length, color: "text-gray-900 dark:text-ink" },
                    { label: "Chưa đóng", value: openCount, color: "text-m-warning" },
                    { label: "Mức cao", value: highCount, color: "text-m-red" },
                ].map((c, i) => (
                    <div key={i} className="bg-surface-card rounded-lg p-4">
                        <div className="text-xs text-gray-600 dark:text-muted">{c.label}</div>
                        <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
                    </div>
                ))}
            </div>

            {/* Xuất Excel + Ghi nhận rủi ro (thành viên dự án) */}
            <div className="flex justify-end gap-2">
                {risks.length > 0 && (
                    <button
                        onClick={exportExcel}
                        className="px-4 py-2 rounded-full bg-surface-elevated text-gray-700 dark:text-body font-bold text-sm flex items-center gap-1 hover:bg-white/10 transition-colors"
                    >
                        <Download className="size-4" /> Xuất Excel
                    </button>
                )}
                <button
                    onClick={() => setShowForm((s) => !s)}
                    className="px-5 py-2 rounded-full bg-m-blue-light text-black font-bold text-sm flex items-center gap-1 hover:scale-105 transition-transform"
                >
                    <Plus className="size-4" /> Ghi nhận rủi ro
                </button>
            </div>

            {showForm && (
                <form onSubmit={addRisk} className="bg-surface-card rounded-lg p-4 space-y-3">
                    <input
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="Tên rủi ro (VD: Thiếu linh kiện SMT theo tiến độ)"
                        className={inputCls + " w-full"}
                    />
                    <textarea
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="Mô tả chi tiết rủi ro"
                        rows={2}
                        className={inputCls + " w-full resize-none"}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                            <label className="text-xs text-gray-500 dark:text-muted">Khả năng xảy ra</label>
                            <select value={form.likelihood} onChange={(e) => setForm({ ...form, likelihood: e.target.value })} className={inputCls + " w-full mt-0.5"}>
                                {Object.entries(LEVEL_VI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 dark:text-muted">Mức tác động</label>
                            <select value={form.impact} onChange={(e) => setForm({ ...form, impact: e.target.value })} className={inputCls + " w-full mt-0.5"}>
                                {Object.entries(LEVEL_VI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 dark:text-muted">Người phụ trách</label>
                            <select value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })} className={inputCls + " w-full mt-0.5"}>
                                <option value="">— Chưa phân công —</option>
                                {members.map((m) => <option key={m.user.id} value={m.user.id}>{m.user.name || m.user.email}</option>)}
                            </select>
                        </div>
                    </div>
                    <textarea
                        value={form.mitigation}
                        onChange={(e) => setForm({ ...form, mitigation: e.target.value })}
                        placeholder="Kế hoạch ứng phó / giảm thiểu"
                        rows={2}
                        className={inputCls + " w-full resize-none"}
                    />
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => { setShowForm(false); setForm(emptyForm); }} className="px-4 py-2 rounded-full text-sm text-gray-600 dark:text-body hover:bg-white/10">Hủy</button>
                        <button type="submit" disabled={saving} className="px-5 py-2 rounded-full bg-m-blue-light text-black font-bold text-sm disabled:opacity-50">
                            {saving ? "Đang lưu..." : "Lưu rủi ro"}
                        </button>
                    </div>
                </form>
            )}

            {risks.length === 0 && (
                <div className="text-center py-10 text-gray-400 dark:text-muted">
                    <ShieldAlert className="size-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Chưa có rủi ro nào được ghi nhận cho dự án.</p>
                </div>
            )}

            {/* Danh sách rủi ro (đã sắp theo điểm rủi ro giảm dần) */}
            <div className="space-y-3">
                {risks.map((r) => {
                    const canDelete = isManager || r.createdBy === user?.id;
                    return (
                        <div key={r.id} className="bg-surface-card rounded-lg p-4 hover:shadow-spotify-md transition-shadow">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <ShieldAlert className={`size-5 ${r.score >= 6 ? "text-m-red" : r.score >= 3 ? "text-m-warning" : "text-m-success"}`} />
                                    <h3 className="font-bold text-gray-900 dark:text-ink">{r.title}</h3>
                                    <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full ${scoreCls(r.score)}`}>
                                        Rủi ro {scoreLabel(r.score)} ({r.score})
                                    </span>
                                    <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full ${STATUS_CLS[r.status]}`}>{STATUS_VI[r.status]}</span>
                                </div>
                                {canDelete && (
                                    <button onClick={() => removeRisk(r.id)} className="p-1.5 rounded-full text-gray-400 hover:text-m-red hover:bg-white/10 transition-colors">
                                        <Trash2 className="size-4" />
                                    </button>
                                )}
                            </div>

                            {r.description && <p className="text-sm text-gray-600 dark:text-body mt-1.5">{r.description}</p>}

                            <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500 dark:text-muted mt-2">
                                <span>Khả năng: <b className="text-gray-700 dark:text-body">{LEVEL_VI[r.likelihood]}</b></span>
                                <span>Tác động: <b className="text-gray-700 dark:text-body">{LEVEL_VI[r.impact]}</b></span>
                                <span className="flex items-center gap-1">
                                    <UserIcon className="size-3.5" />
                                    {r.owner?.name || r.owner?.email || "Chưa phân công"}
                                </span>
                            </div>

                            {r.mitigation && (
                                <p className="text-xs text-gray-600 dark:text-body mt-2 border-t border-hairline pt-2">
                                    <b>Ứng phó:</b> {r.mitigation}
                                </p>
                            )}

                            {/* Đổi trạng thái nhanh */}
                            <div className="flex items-center gap-2 mt-3">
                                <span className="text-xs text-gray-500 dark:text-muted">Trạng thái:</span>
                                <select
                                    value={r.status}
                                    onChange={(e) => changeStatus(r.id, e.target.value)}
                                    className="text-xs bg-surface-elevated px-2.5 py-1 rounded-full shadow-spotify-inset focus:outline-none"
                                >
                                    {Object.entries(STATUS_VI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ProjectRisks;
