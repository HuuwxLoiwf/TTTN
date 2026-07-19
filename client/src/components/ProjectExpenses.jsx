import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useAuth, useUser } from "../context/AuthContext";
import { Wallet, Plus, Trash2, AlertTriangle, Download } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { apiFetch } from "../lib/api";
import { exportToExcel } from "../lib/exportExcel";

const fmtMoney = (n) => (n == null ? "—" : `${Number(n).toLocaleString("vi-VN")}đ`);

const CATEGORIES = ["Linh kiện", "Nhân công", "Thiết bị", "Vận chuyển", "Thuê ngoài", "Khác"];

const emptyForm = { title: "", amount: "", category: "", note: "", spentAt: format(new Date(), "yyyy-MM-dd") };

const ProjectExpenses = ({ projectId }) => {
    const { getToken } = useAuth();
    const { user } = useUser();
    const { currentWorkspace } = useSelector((state) => state.workspace);
    const project = currentWorkspace?.projects?.find((p) => p.id === projectId);
    const isManager =
        currentWorkspace?.members?.some((m) => m.userId === user?.id && (m.role === "ADMIN" || m.role === "MANAGER")) ||
        project?.team_lead === user?.id;

    const [data, setData] = useState({ expenses: [], total: 0, budget: null, remaining: null, overBudget: false });
    const [form, setForm] = useState(emptyForm);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        try {
            const token = await getToken();
            const res = await apiFetch(token, `/expenses/project/${projectId}`);
            setData({
                expenses: Array.isArray(res.expenses) ? res.expenses : [],
                total: res.total || 0,
                budget: res.budget ?? null,
                remaining: res.remaining ?? null,
                overBudget: !!res.overBudget,
            });
        } catch {
            setData({ expenses: [], total: 0, budget: null, remaining: null, overBudget: false });
        }
    };

    useEffect(() => {
        if (projectId) load();
    }, [projectId]);

    const addExpense = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) {
            toast.error("Vui lòng nhập nội dung khoản chi");
            return;
        }
        const amount = Number(form.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            toast.error("Số tiền phải là số dương");
            return;
        }
        setSaving(true);
        try {
            const token = await getToken();
            await apiFetch(token, `/expenses/project/${projectId}`, {
                method: "POST",
                body: {
                    title: form.title,
                    amount,
                    category: form.category || null,
                    note: form.note || null,
                    spentAt: form.spentAt || null,
                },
            });
            setForm(emptyForm);
            setShowForm(false);
            load();
            toast.success("Đã ghi nhận khoản chi");
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const removeExpense = async (id) => {
        if (!window.confirm("Xóa khoản chi này?")) return;
        try {
            const token = await getToken();
            await apiFetch(token, `/expenses/${id}`, { method: "DELETE" });
            load();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const inputCls = "px-3 py-2 bg-surface-elevated text-sm rounded-lg shadow-spotify-inset focus:outline-none";
    // Tỉ lệ dùng ngân sách (giới hạn 100% cho thanh)
    const pct = data.budget ? Math.min(100, Math.round((data.total / data.budget) * 100)) : 0;

    const exportExcel = () => {
        const rows = data.expenses.map((ex) => ({
            "Nội dung": ex.title,
            "Hạng mục": ex.category || "",
            "Số tiền (đ)": ex.amount,
            "Ngày chi": ex.spentAt ? format(new Date(ex.spentAt), "dd/MM/yyyy") : "",
            "Ghi chú": ex.note || "",
            "Người ghi": ex.creator?.name || ex.creator?.email || "",
        }));
        rows.push({ "Nội dung": "TỔNG CỘNG", "Hạng mục": "", "Số tiền (đ)": data.total, "Ngày chi": "", "Ghi chú": "", "Người ghi": "" });
        exportToExcel(rows, "chi-phi-du-an", "Chi phí");
    };

    return (
        <div className="space-y-5">
            {/* Tổng quan ngân sách */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-surface-card rounded-lg p-4">
                    <div className="text-xs text-gray-600 dark:text-muted">Ngân sách</div>
                    <div className="text-2xl font-bold text-bmw-blue">{fmtMoney(data.budget)}</div>
                </div>
                <div className="bg-surface-card rounded-lg p-4">
                    <div className="text-xs text-gray-600 dark:text-muted">Đã chi</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-ink">{fmtMoney(data.total)}</div>
                </div>
                <div className="bg-surface-card rounded-lg p-4">
                    <div className="text-xs text-gray-600 dark:text-muted">Còn lại</div>
                    <div className={`text-2xl font-bold ${data.overBudget ? "text-m-red" : "text-m-success"}`}>
                        {data.remaining == null ? "—" : fmtMoney(data.remaining)}
                    </div>
                </div>
            </div>

            {/* Thanh tiến độ ngân sách */}
            {data.budget != null && (
                <div>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-surface-elevated overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${data.overBudget ? "bg-m-red" : pct >= 80 ? "bg-m-warning" : "bg-m-success"}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-gray-600 dark:text-body w-12 text-right">{pct}%</span>
                    </div>
                    {data.overBudget && (
                        <p className="text-xs text-m-red font-medium mt-2 flex items-center gap-1">
                            <AlertTriangle className="size-3.5" />
                            Đã vượt ngân sách {fmtMoney(data.total - data.budget)}!
                        </p>
                    )}
                </div>
            )}

            {/* Xuất Excel + Ghi nhận khoản chi */}
            <div className="flex justify-end gap-2">
                {data.expenses.length > 0 && (
                    <button
                        onClick={exportExcel}
                        className="px-4 py-2 rounded-full bg-surface-elevated text-gray-700 dark:text-body font-bold text-sm flex items-center gap-1 hover:bg-white/10 transition-colors"
                    >
                        <Download className="size-4" /> Xuất Excel
                    </button>
                )}
                {isManager && (
                    <button
                        onClick={() => setShowForm((s) => !s)}
                        className="px-5 py-2 rounded-full bg-m-blue-light text-black font-bold text-sm flex items-center gap-1 hover:scale-105 transition-transform"
                    >
                        <Plus className="size-4" /> Ghi nhận chi phí
                    </button>
                )}
            </div>

            {isManager && showForm && (
                <form onSubmit={addExpense} className="bg-surface-card rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Nội dung (VD: Mua tụ điện SMD)" className={inputCls} />
                        <input type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Số tiền (đ)" className={inputCls} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs text-gray-500 dark:text-muted">Hạng mục</label>
                            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls + " w-full mt-0.5"}>
                                <option value="">— Chọn hạng mục —</option>
                                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 dark:text-muted">Ngày chi</label>
                            <input type="date" value={form.spentAt} onChange={(e) => setForm({ ...form, spentAt: e.target.value })} className={inputCls + " w-full mt-0.5"} />
                        </div>
                    </div>
                    <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Ghi chú (không bắt buộc)" className={inputCls + " w-full"} />
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => { setShowForm(false); setForm(emptyForm); }} className="px-4 py-2 rounded-full text-sm text-gray-600 dark:text-body hover:bg-white/10">Hủy</button>
                        <button type="submit" disabled={saving} className="px-5 py-2 rounded-full bg-m-blue-light text-black font-bold text-sm disabled:opacity-50">
                            {saving ? "Đang lưu..." : "Lưu khoản chi"}
                        </button>
                    </div>
                </form>
            )}

            {data.expenses.length === 0 ? (
                <div className="text-center py-10 text-gray-400 dark:text-muted">
                    <Wallet className="size-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Chưa có khoản chi nào được ghi nhận.</p>
                </div>
            ) : (
                <div className="bg-surface-card rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-xs text-gray-500 dark:text-muted border-b border-hairline">
                                <th className="text-left font-medium px-4 py-2.5">Nội dung</th>
                                <th className="text-left font-medium px-4 py-2.5 hidden sm:table-cell">Hạng mục</th>
                                <th className="text-left font-medium px-4 py-2.5 hidden md:table-cell">Ngày</th>
                                <th className="text-right font-medium px-4 py-2.5">Số tiền</th>
                                <th className="px-2 py-2.5"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.expenses.map((ex) => {
                                const canDelete = isManager || ex.createdBy === user?.id;
                                return (
                                    <tr key={ex.id} className="border-b border-hairline/50 last:border-0 group">
                                        <td className="px-4 py-2.5">
                                            <div className="text-gray-800 dark:text-body-strong font-medium">{ex.title}</div>
                                            {ex.note && <div className="text-xs text-gray-400 dark:text-muted">{ex.note}</div>}
                                        </td>
                                        <td className="px-4 py-2.5 hidden sm:table-cell text-gray-600 dark:text-body">
                                            {ex.category ? <span className="px-2 py-0.5 rounded-full bg-surface-elevated text-xs">{ex.category}</span> : "—"}
                                        </td>
                                        <td className="px-4 py-2.5 hidden md:table-cell text-gray-500 dark:text-muted text-xs">
                                            {ex.spentAt ? format(new Date(ex.spentAt), "dd/MM/yyyy") : "—"}
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-semibold text-gray-900 dark:text-ink whitespace-nowrap">{fmtMoney(ex.amount)}</td>
                                        <td className="px-2 py-2.5 text-right">
                                            {canDelete && (
                                                <button onClick={() => removeExpense(ex.id)} className="p-1.5 rounded-full text-gray-400 hover:text-m-red hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-colors">
                                                    <Trash2 className="size-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="border-t border-hairline font-bold">
                                <td className="px-4 py-2.5 text-gray-900 dark:text-ink" colSpan={3}>Tổng cộng</td>
                                <td className="px-4 py-2.5 text-right text-gray-900 dark:text-ink whitespace-nowrap" colSpan={2}>{fmtMoney(data.total)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ProjectExpenses;
