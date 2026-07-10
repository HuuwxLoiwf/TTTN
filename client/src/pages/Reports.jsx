import { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { useAuth } from "../context/AuthContext";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { apiFetch } from "../lib/api";
import {
    BarChart3, Users, Clock, AlertTriangle, FolderOpen, Wallet,
    Download, Sparkles, TrendingDown, Send,
} from "lucide-react";
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from "recharts";

const fmtMinutes = (mins) => {
    const h = Math.floor((mins || 0) / 60);
    const m = (mins || 0) % 60;
    return h ? `${h}h${m ? ` ${m}p` : ""}` : `${m}p`;
};
const fmtMoney = (v) => (v || 0).toLocaleString("vi-VN") + " đ";

const STATUS_VI = { PLANNING: "Kế hoạch", ACTIVE: "Đang chạy", ON_HOLD: "Tạm dừng", COMPLETED: "Hoàn thành", CANCELLED: "Đã hủy" };

export default function Reports() {
    const { getToken } = useAuth();
    const { currentWorkspace } = useSelector((state) => state.workspace);
    const wsId = currentWorkspace?.id;

    const [tab, setTab] = useState("overview");
    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);

    // Chấm công
    const now = new Date();
    const [month, setMonth] = useState(format(now, "yyyy-MM"));
    const [timesheet, setTimesheet] = useState(null);
    const [tsLoading, setTsLoading] = useState(false);

    // Burndown
    const [burnProject, setBurnProject] = useState("");
    const [burndown, setBurndown] = useState(null);

    // AI trợ lý
    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState("");
    const [asking, setAsking] = useState(false);

    useEffect(() => {
        if (!wsId) return;
        (async () => {
            setLoading(true);
            try {
                const token = await getToken();
                const data = await apiFetch(token, `/reports/workspace/${wsId}/overview`);
                setOverview(data);
            } catch (err) {
                toast.error(err.message);
            } finally {
                setLoading(false);
            }
        })();
    }, [wsId]);

    // Tải chấm công theo tháng
    useEffect(() => {
        if (!wsId || tab !== "timesheet") return;
        (async () => {
            setTsLoading(true);
            try {
                const token = await getToken();
                const [y, m] = month.split("-").map(Number);
                const from = new Date(y, m - 1, 1).toISOString();
                const to = new Date(y, m, 0, 23, 59, 59).toISOString();
                const data = await apiFetch(token, `/reports/workspace/${wsId}/timesheet?from=${from}&to=${to}`);
                setTimesheet(data);
            } catch (err) {
                toast.error(err.message);
            } finally {
                setTsLoading(false);
            }
        })();
    }, [wsId, tab, month]);

    // Tải burndown khi chọn dự án
    useEffect(() => {
        if (!burnProject || tab !== "burndown") return;
        (async () => {
            try {
                const token = await getToken();
                const data = await apiFetch(token, `/reports/project/${burnProject}/burndown`);
                setBurndown(data);
            } catch (err) {
                toast.error(err.message);
            }
        })();
    }, [burnProject, tab]);

    const projects = useMemo(() => currentWorkspace?.projects || [], [currentWorkspace]);

    // Xuất chấm công ra CSV (mở bằng Excel)
    const exportTimesheet = () => {
        if (!timesheet?.entries?.length) return toast.error("Không có dữ liệu để xuất");
        const rows = [
            ["Ngày", "Thành viên", "Dự án", "Công việc", "Số phút", "Chi phí (đ)", "Ghi chú"],
            ...timesheet.entries.map((e) => [
                format(new Date(e.workDate), "dd/MM/yyyy"),
                e.user?.name || e.user?.email,
                e.projectName,
                e.taskTitle,
                e.minutes,
                e.cost,
                e.note || "",
            ]),
        ];
        const csv = "﻿" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `cham-cong-${month}.csv`;
        a.click();
        toast.success("Đã xuất bảng chấm công");
    };

    const ask = async (e) => {
        e.preventDefault();
        if (!question.trim()) return;
        setAsking(true);
        setAnswer("");
        try {
            const token = await getToken();
            const data = await apiFetch(token, `/ai/ask/${wsId}`, { method: "POST", body: { question } });
            setAnswer(data.answer);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setAsking(false);
        }
    };

    if (!wsId) return <p className="text-sm text-gray-500 dark:text-muted p-6">Chưa chọn không gian làm việc.</p>;

    const t = overview?.totals;
    const kpis = t ? [
        { label: "Dự án", value: t.projects, sub: `${t.activeProjects} đang chạy`, icon: FolderOpen, color: "text-blue-500" },
        { label: "Công việc", value: t.tasks, sub: `${t.doneTasks} hoàn thành`, icon: BarChart3, color: "text-emerald-500" },
        { label: "Quá hạn", value: t.overdueTasks, sub: "cần xử lý", icon: AlertTriangle, color: "text-red-500" },
        { label: "Tổng giờ công", value: fmtMinutes(t.totalMinutes), sub: "đã ghi nhận", icon: Clock, color: "text-amber-500" },
        { label: "Chi phí nhân công", value: fmtMoney(t.totalCost), sub: t.totalBudget ? `/ ngân sách ${fmtMoney(t.totalBudget)}` : "đơn giá × giờ", icon: Wallet, color: "text-purple-500" },
    ] : [];

    return (
        <div className="max-w-6xl mx-auto space-y-5">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-ink mb-1 flex items-center gap-2">
                    <BarChart3 className="size-6 text-bmw-blue" /> Báo cáo & Phân tích
                </h1>
                <p className="text-gray-500 dark:text-body text-sm font-light">Bức tranh điều hành toàn bộ {currentWorkspace?.name}</p>
            </div>

            {/* Tabs */}
            <div className="inline-flex flex-wrap gap-2">
                {[
                    { key: "overview", label: "Tổng quan" },
                    { key: "timesheet", label: "Chấm công" },
                    { key: "burndown", label: "Burndown" },
                    { key: "ai", label: "Hỏi AI" },
                ].map((x) => (
                    <button key={x.key} onClick={() => setTab(x.key)} className={`px-4 py-2 rounded-full text-sm uppercase font-bold tracking-[1.4px] transition hover:scale-105 ${tab === x.key ? "bg-m-blue-light text-black" : "bg-gray-100 dark:bg-surface-elevated text-gray-600 dark:text-body hover:bg-gray-200 dark:hover:bg-surface-soft"}`}>
                        {x.label}
                    </button>
                ))}
            </div>

            {/* ===== TỔNG QUAN ===== */}
            {tab === "overview" && (
                loading ? <p className="text-sm text-gray-400 dark:text-muted font-light py-8 text-center">Đang tải báo cáo...</p> : overview && (
                    <div className="space-y-5">
                        {/* KPI cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                            {kpis.map((k) => (
                                <div key={k.label} className="bg-white dark:bg-surface-card rounded-lg p-4 shadow-spotify-md">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs uppercase tracking-[0.5px] text-gray-500 dark:text-muted">{k.label}</span>
                                        <k.icon className={`size-4 ${k.color}`} />
                                    </div>
                                    <div className="text-xl font-bold text-gray-900 dark:text-ink truncate">{k.value}</div>
                                    <div className="text-[11px] text-gray-400 dark:text-muted font-light">{k.sub}</div>
                                </div>
                            ))}
                        </div>

                        {/* Sức khỏe dự án */}
                        <div className="bg-white dark:bg-surface-card rounded-lg p-4 overflow-x-auto shadow-spotify-md">
                            <h3 className="text-sm font-bold text-gray-700 dark:text-body-strong mb-3">Sức khỏe dự án</h3>
                            <table className="min-w-full text-sm">
                                <thead className="text-xs uppercase tracking-[0.5px] text-gray-500 dark:text-muted">
                                    <tr>
                                        <th className="text-left py-2 pr-4">Dự án</th>
                                        <th className="text-left py-2 pr-4">Trạng thái</th>
                                        <th className="text-left py-2 pr-4 w-44">Tiến độ</th>
                                        <th className="text-right py-2 pr-4">Việc xong</th>
                                        <th className="text-right py-2 pr-4">Quá hạn</th>
                                        <th className="text-right py-2 pr-4">Giờ công</th>
                                        <th className="text-right py-2">Chi phí / Ngân sách</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {overview.projects.map((p) => {
                                        const overBudget = p.budget && p.cost > p.budget;
                                        return (
                                            <tr key={p.id} className="border-t border-gray-200 dark:border-hairline">
                                                <td className="py-2 pr-4 text-gray-800 dark:text-body-strong max-w-48 truncate">{p.name}</td>
                                                <td className="py-2 pr-4 text-gray-500 dark:text-muted">{STATUS_VI[p.status] || p.status}</td>
                                                <td className="py-2 pr-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-surface-elevated rounded-full overflow-hidden">
                                                            <div className="h-full bg-m-blue-light rounded-full" style={{ width: `${p.progress}%` }} />
                                                        </div>
                                                        <span className="text-xs w-8 text-right">{p.progress}%</span>
                                                    </div>
                                                </td>
                                                <td className="py-2 pr-4 text-right">{p.doneTasks}/{p.totalTasks}</td>
                                                <td className={`py-2 pr-4 text-right ${p.overdueTasks ? "text-m-red font-semibold" : "text-gray-400 dark:text-muted"}`}>{p.overdueTasks}</td>
                                                <td className="py-2 pr-4 text-right">{fmtMinutes(p.minutes)}</td>
                                                <td className={`py-2 text-right text-xs ${overBudget ? "text-m-red font-semibold" : "text-gray-500 dark:text-muted"}`}>
                                                    {fmtMoney(p.cost)}{p.budget ? ` / ${fmtMoney(p.budget)}` : ""}
                                                    {overBudget ? " ⚠" : ""}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Tải công việc từng thành viên */}
                        <div className="bg-white dark:bg-surface-card rounded-lg p-4 overflow-x-auto shadow-spotify-md">
                            <h3 className="text-sm font-bold text-gray-700 dark:text-body-strong mb-3 flex items-center gap-2">
                                <Users className="size-4" /> Tải công việc theo thành viên
                            </h3>
                            <table className="min-w-full text-sm">
                                <thead className="text-xs uppercase tracking-[0.5px] text-gray-500 dark:text-muted">
                                    <tr>
                                        <th className="text-left py-2 pr-4">Thành viên</th>
                                        <th className="text-left py-2 pr-4">Vai trò</th>
                                        <th className="text-right py-2 pr-4">Việc đang mở</th>
                                        <th className="text-right py-2 pr-4">Quá hạn</th>
                                        <th className="text-right py-2 pr-4">Giờ công</th>
                                        <th className="text-right py-2">Chi phí</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {overview.workload.map((w) => (
                                        <tr key={w.user.id} className="border-t border-gray-200 dark:border-hairline">
                                            <td className="py-2 pr-4">
                                                <div className="flex items-center gap-2">
                                                    {w.user.image && <img src={w.user.image} className="size-5 rounded-full" alt="" />}
                                                    <span className="text-gray-800 dark:text-body-strong">{w.user.name || w.user.email}</span>
                                                </div>
                                            </td>
                                            <td className="py-2 pr-4 text-gray-500 dark:text-muted">{w.role}</td>
                                            <td className="py-2 pr-4 text-right">
                                                <span className={w.openTasks >= 8 ? "text-m-warning font-semibold" : ""}>{w.openTasks}</span>
                                                {w.openTasks >= 8 && <span className="text-[10px] text-m-warning ml-1">(quá tải?)</span>}
                                            </td>
                                            <td className={`py-2 pr-4 text-right ${w.overdueTasks ? "text-m-red font-semibold" : "text-gray-400 dark:text-muted"}`}>{w.overdueTasks}</td>
                                            <td className="py-2 pr-4 text-right">{fmtMinutes(w.minutes)}</td>
                                            <td className="py-2 text-right text-xs text-gray-500 dark:text-muted">{w.hourlyRate ? fmtMoney(w.cost) : "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            )}

            {/* ===== CHẤM CÔNG ===== */}
            {tab === "timesheet" && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3 flex-wrap">
                        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="px-3 py-2 rounded bg-white dark:bg-surface-elevated text-gray-900 dark:text-ink text-sm shadow-spotify-inset" />
                        <button onClick={exportTimesheet} className="flex items-center gap-2 px-4 py-2 rounded-full text-sm uppercase font-bold tracking-[1.4px] border border-m-success text-m-success hover:bg-m-success hover:text-white hover:scale-105 transition">
                            <Download className="size-4" /> Xuất CSV (Excel)
                        </button>
                        {timesheet && (
                            <span className="text-sm text-gray-500 dark:text-muted font-light">
                                Tổng: <b className="text-gray-800 dark:text-body-strong font-semibold">{fmtMinutes(timesheet.totalMinutes)}</b>
                                {" · "}Chi phí: <b className="text-gray-800 dark:text-body-strong font-semibold">{fmtMoney(timesheet.totalCost)}</b>
                            </span>
                        )}
                    </div>

                    {tsLoading ? <p className="text-sm text-gray-400 dark:text-muted font-light py-8 text-center">Đang tải...</p> : timesheet && (
                        <>
                            {/* Tổng theo người */}
                            <div className="bg-white dark:bg-surface-card rounded-lg p-4 shadow-spotify-md">
                                <h3 className="text-sm font-bold text-gray-700 dark:text-body-strong mb-2">Tổng theo thành viên</h3>
                                {timesheet.byUser.length === 0 ? (
                                    <p className="text-xs text-gray-400 dark:text-muted font-light">Chưa có giờ công nào trong tháng này.</p>
                                ) : (
                                    <div className="space-y-1.5">
                                        {timesheet.byUser.map((u) => (
                                            <div key={u.user.id} className="flex items-center justify-between text-sm px-3 py-1.5 rounded-full bg-gray-50 dark:bg-surface-soft">
                                                <span className="text-gray-800 dark:text-body-strong">{u.user.name || u.user.email}</span>
                                                <span className="text-gray-500 dark:text-muted">{fmtMinutes(u.minutes)} · {fmtMoney(u.cost)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Chi tiết từng dòng */}
                            {timesheet.entries.length > 0 && (
                                <div className="bg-white dark:bg-surface-card rounded-lg p-4 overflow-x-auto shadow-spotify-md">
                                    <h3 className="text-sm font-bold text-gray-700 dark:text-body-strong mb-2">Chi tiết ({timesheet.entries.length} dòng)</h3>
                                    <table className="min-w-full text-xs">
                                        <thead className="uppercase tracking-[0.5px] text-gray-500 dark:text-muted">
                                            <tr>
                                                <th className="text-left py-1.5 pr-3">Ngày</th>
                                                <th className="text-left py-1.5 pr-3">Thành viên</th>
                                                <th className="text-left py-1.5 pr-3">Dự án</th>
                                                <th className="text-left py-1.5 pr-3">Công việc</th>
                                                <th className="text-right py-1.5 pr-3">Thời gian</th>
                                                <th className="text-right py-1.5">Chi phí</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {timesheet.entries.map((e) => (
                                                <tr key={e.id} className="border-t border-gray-200 dark:border-hairline">
                                                    <td className="py-1.5 pr-3">{format(new Date(e.workDate), "dd/MM")}</td>
                                                    <td className="py-1.5 pr-3">{e.user?.name || e.user?.email}</td>
                                                    <td className="py-1.5 pr-3 max-w-32 truncate">{e.projectName}</td>
                                                    <td className="py-1.5 pr-3 max-w-48 truncate">{e.taskTitle}</td>
                                                    <td className="py-1.5 pr-3 text-right">{fmtMinutes(e.minutes)}</td>
                                                    <td className="py-1.5 text-right">{e.cost ? fmtMoney(e.cost) : "—"}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ===== BURNDOWN ===== */}
            {tab === "burndown" && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <TrendingDown className="size-4 text-bmw-blue" />
                        <select value={burnProject} onChange={(e) => setBurnProject(e.target.value)} className="px-3 py-2 rounded bg-white dark:bg-surface-elevated text-gray-900 dark:text-ink text-sm shadow-spotify-inset">
                            <option value="">— Chọn dự án —</option>
                            {projects.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    {burnProject && burndown && (
                        burndown.series.length === 0 ? (
                            <p className="text-sm text-gray-400 dark:text-muted font-light py-8 text-center">Dự án chưa có công việc để vẽ biểu đồ.</p>
                        ) : (
                            <div className="bg-white dark:bg-surface-card rounded-lg p-4 shadow-spotify-md">
                                <h3 className="text-sm font-bold text-gray-700 dark:text-body-strong mb-3">
                                    Biểu đồ Burndown — còn lại vs lý tưởng (tổng {burndown.total} việc)
                                </h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={burndown.series}>
                                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="remaining" name="Còn lại (thực tế)" stroke="#1c69d4" strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="ideal" name="Lý tưởng" stroke="#bbbbbb" strokeDasharray="5 5" dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )
                    )}
                </div>
            )}

            {/* ===== HỎI AI ===== */}
            {tab === "ai" && (
                <div className="bg-white dark:bg-surface-card rounded-lg p-5 space-y-4 max-w-2xl shadow-spotify-md">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-body-strong flex items-center gap-2">
                        <Sparkles className="size-4 text-m-blue-dark" /> Trợ lý AI — hỏi đáp trên dữ liệu dự án
                    </h3>
                    <form onSubmit={ask} className="flex gap-2">
                        <input
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder='VD: "Dự án nào đang trễ nhất?", "Ai đang quá tải việc?"'
                            className="flex-1 px-4 py-2 rounded-full bg-gray-50 dark:bg-surface-elevated text-gray-900 dark:text-ink text-sm shadow-spotify-inset"
                        />
                        <button type="submit" disabled={asking || !question.trim()} className="px-4 py-2 rounded-full text-sm uppercase font-bold tracking-[1.4px] bg-m-blue-light text-black hover:scale-105 flex items-center gap-1 disabled:opacity-50 transition">
                            <Send className="size-4" /> {asking ? "Đang hỏi..." : "Hỏi"}
                        </button>
                    </form>
                    {answer && (
                        <div className="px-4 py-3 rounded-lg bg-gray-50 dark:bg-surface-soft text-sm text-gray-700 dark:text-body whitespace-pre-wrap font-light">
                            {answer}
                        </div>
                    )}
                    <p className="text-[11px] text-gray-400 dark:text-muted font-light">AI trả lời dựa trên dữ liệu dự án/công việc hiện tại của workspace. Cần cấu hình GEMINI_API_KEY phía server.</p>
                </div>
            )}
        </div>
    );
}
