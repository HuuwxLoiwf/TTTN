import { useMemo, useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Tooltip } from "recharts";
import { CheckCircle, Clock, AlertTriangle, Users, Download, ArrowRightIcon, Timer, FileDown, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { apiFetch } from "../lib/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const fmtDuration = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h && m) return `${h}h ${m}p`;
    if (h) return `${h}h`;
    return `${m}p`;
};

// Colors for charts and priorities
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
const PRIORITY_COLORS = {
    LOW: "text-red-600 bg-red-200 dark:text-red-500 dark:bg-red-600",
    MEDIUM: "text-blue-600 bg-blue-200 dark:text-blue-500 dark:bg-blue-600",
    HIGH: "text-emerald-600 bg-emerald-200 dark:text-emerald-500 dark:bg-emerald-600",
};

const ProjectAnalytics = ({ project, tasks }) => {
    const { getToken } = useAuth();
    const [timeReport, setTimeReport] = useState(null);
    const [aiAnalysis, setAiAnalysis] = useState("");
    const [analyzing, setAnalyzing] = useState(false);

    const handleAnalyze = async () => {
        setAnalyzing(true);
        try {
            const token = await getToken();
            const data = await apiFetch(token, `/ai/analyze/${project.id}`);
            setAiAnalysis(data.analysis);
        } catch (err) {
            toast.error(err.message || "Không tạo được phân tích");
        } finally {
            setAnalyzing(false);
        }
    };

    useEffect(() => {
        if (!project?.id) return;
        (async () => {
            try {
                const token = await getToken();
                const data = await apiFetch(token, `/time-logs/project/${project.id}/report`);
                setTimeReport(data);
            } catch {
                /* silent */
            }
        })();
    }, [project?.id]);

    const { stats, statusData, typeData, priorityData } = useMemo(() => {
        const now = new Date();
        const total = tasks.length;

        const stats = {
            total,
            completed: 0,
            inProgress: 0,
            todo: 0,
            overdue: 0,
        };

        const statusMap = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
        const typeMap = { TASK: 0, BUG: 0, FEATURE: 0, IMPROVEMENT: 0, OTHER: 0 };
        const priorityMap = { LOW: 0, MEDIUM: 0, HIGH: 0 };

        tasks.forEach((t) => {
            if (t.status === "DONE") stats.completed++;
            if (t.status === "IN_PROGRESS") stats.inProgress++;
            if (t.status === "TODO") stats.todo++;
            if (new Date(t.due_date) < now && t.status !== "DONE") stats.overdue++;

            if (statusMap[t.status] !== undefined) statusMap[t.status]++;
            if (typeMap[t.type] !== undefined) typeMap[t.type]++;
            if (priorityMap[t.priority] !== undefined) priorityMap[t.priority]++;
        });

        return {
            stats,
            statusData: Object.entries(statusMap).map(([k, v]) => ({ name: k.replace("_", " "), value: v })),
            typeData: Object.entries(typeMap).filter(([_, v]) => v > 0).map(([k, v]) => ({ name: k, value: v })),
            priorityData: Object.entries(priorityMap).map(([k, v]) => ({
                name: k,
                value: v,
                percentage: total > 0 ? Math.round((v / total) * 100) : 0,
            })),
        };
    }, [tasks]);

    const completionRate = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;

    const metrics = [
        {
            label: "Tỷ lệ hoàn thành",
            value: `${completionRate}%`,
            color: "text-emerald-600 dark:text-emerald-400",
            icon: <CheckCircle className="size-5 text-emerald-600 dark:text-emerald-400" />,
            bg: "bg-emerald-200 dark:bg-emerald-500/10",
        },
        {
            label: "Đang thực hiện",
            value: stats.inProgress,
            color: "text-blue-600 dark:text-blue-400",
            icon: <Clock className="size-5 text-blue-600 dark:text-blue-400" />,
            bg: "bg-blue-200 dark:bg-blue-500/10",
        },
        {
            label: "Công việc quá hạn",
            value: stats.overdue,
            color: "text-red-600 dark:text-red-400",
            icon: <AlertTriangle className="size-5 text-red-600 dark:text-red-400" />,
            bg: "bg-red-200 dark:bg-red-500/10",
        },
        {
            label: "Quy mô nhóm",
            value: project?.members?.length || 0,
            color: "text-purple-600 dark:text-purple-400",
            icon: <Users className="size-5 text-purple-600 dark:text-purple-400" />,
            bg: "bg-purple-200 dark:bg-purple-500/10",
        },
    ];

    const exportCSV = () => {
        const headers = ["Tiêu đề", "Loại", "Trạng thái", "Ưu tiên", "Người thực hiện", "Hạn chót", "Ngày tạo"];
        const rows = tasks.map((t) => [
            `"${t.title}"`,
            t.type,
            t.status,
            t.priority,
            `"${t.assignee?.name || t.assignee?.email || ""}"`,
            t.due_date ? format(new Date(t.due_date), "dd/MM/yyyy") : "",
            t.createdAt ? format(new Date(t.createdAt), "dd/MM/yyyy") : "",
        ]);
        const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
        const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${project?.name || "bao-cao"}-${format(new Date(), "yyyy-MM-dd")}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const exportPDF = () => {
        const doc = new jsPDF();
        const today = format(new Date(), "dd/MM/yyyy");

        // Tiêu đề
        doc.setFontSize(16);
        doc.text("BAO CAO DU AN", 14, 18);
        doc.setFontSize(11);
        doc.text(`Du an: ${project?.name || ""}`, 14, 27);
        doc.text(`Ngay xuat: ${today}`, 14, 33);

        // Chỉ số tổng quan
        doc.setFontSize(10);
        doc.text(
            `Tong CV: ${stats.total}   Hoan thanh: ${stats.completed} (${completionRate}%)   Dang lam: ${stats.inProgress}   Qua han: ${stats.overdue}`,
            14, 41,
        );

        // Bảng công việc (dùng nhãn không dấu để PDF hiển thị ổn định)
        autoTable(doc, {
            startY: 47,
            head: [["Cong viec", "Loai", "Trang thai", "Uu tien", "Nguoi thuc hien", "Han chot"]],
            body: tasks.map((t) => [
                t.title,
                t.type,
                t.status,
                t.priority,
                t.assignee?.name || t.assignee?.email || "-",
                t.due_date ? format(new Date(t.due_date), "dd/MM/yyyy") : "-",
            ]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [37, 99, 235] },
        });

        doc.save(`${project?.name || "bao-cao"}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    };

    // Dữ liệu burndown: số task còn lại (chưa DONE) theo ngày tạo tích lũy
    const burndownData = useMemo(() => {
        const sorted = [...tasks].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const total = sorted.length;
        let remaining = total;
        const byDay = {};
        sorted.forEach((t) => {
            const day = t.createdAt ? format(new Date(t.createdAt), "dd/MM") : "?";
            byDay[day] = (byDay[day] || 0);
        });
        // Đường lý tưởng vs thực tế đơn giản: còn lại = tổng - số đã DONE tính tới mốc
        const doneSorted = sorted.filter((t) => t.status === "DONE");
        const points = [{ name: "Bắt đầu", remaining: total }];
        doneSorted.forEach((t, i) => {
            points.push({ name: format(new Date(t.updatedAt || t.createdAt), "dd/MM"), remaining: total - (i + 1) });
        });
        return points;
    }, [tasks]);

    return (
        <div className="space-y-6">
            {/* Export Buttons */}
            <div className="flex justify-end gap-2">
                <button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors disabled:opacity-50"
                >
                    <Sparkles className="size-4" /> {analyzing ? "Đang phân tích..." : "Phân tích AI"}
                </button>
                <button
                    onClick={exportPDF}
                    className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                >
                    <FileDown className="size-4" /> Xuất PDF
                </button>
                <button
                    onClick={exportCSV}
                    className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                    <Download className="size-4" />
                    Xuất báo cáo CSV
                </button>
            </div>

            {aiAnalysis && (
                <div className="rounded-lg border border-purple-200 dark:border-purple-900/30 bg-purple-50 dark:bg-purple-900/10 p-5">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-2"><Sparkles className="size-4" /> Phân tích từ AI</h3>
                        <button onClick={() => setAiAnalysis("")} className="text-xs text-zinc-400 hover:text-zinc-600">Đóng</button>
                    </div>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{aiAnalysis}</p>
                </div>
            )}

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.map((m, i) => (
                    <div
                        key={i}
                        className="not-dark:bg-white dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-300 dark:border-zinc-800 rounded-lg p-6"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-zinc-600 dark:text-zinc-400 text-sm">{m.label}</p>
                                <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                            </div>
                            <div className={`p-2 rounded-md ${m.bg}`}>{m.icon}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Tasks by Status */}
                <div className="not-dark:bg-white dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-300 dark:border-zinc-800 rounded-lg p-6">
                    <h2 className="text-zinc-900 dark:text-white mb-4 font-medium">Công việc theo trạng thái</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={statusData}>
                            <XAxis
                                dataKey="name"
                                tick={{ fill: "#52525b", fontSize: 12 }}
                                axisLine={{ stroke: "#d4d4d8" }}
                                dark={{ stroke: "#27272a" }}
                            />
                            <YAxis tick={{ fill: "#52525b", fontSize: 12 }} axisLine={{ stroke: "#d4d4d8" }} />
                            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Tasks by Type */}
                <div className="not-dark:bg-white dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-300 dark:border-zinc-800 rounded-lg p-6">
                    <h2 className="text-zinc-900 dark:text-white mb-4 font-medium">Công việc theo loại</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={typeData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label={({ name, value }) => `${name}: ${value}`}
                            >
                                {typeData.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Báo cáo giờ làm theo thành viên */}
            {timeReport && timeReport.byUser.length > 0 && (
                <div className="not-dark:bg-white dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-300 dark:border-zinc-800 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-zinc-900 dark:text-white font-medium flex items-center gap-2">
                            <Timer className="size-5 text-blue-500" /> Giờ làm theo thành viên
                        </h2>
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                            Tổng: {fmtDuration(timeReport.totalMinutes)}
                        </span>
                    </div>
                    <div className="space-y-3">
                        {timeReport.byUser.map((u) => {
                            const pct = timeReport.totalMinutes ? Math.round((u.minutes / timeReport.totalMinutes) * 100) : 0;
                            return (
                                <div key={u.user?.id} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-zinc-900 dark:text-zinc-200">{u.user?.name || u.user?.email}</span>
                                        <span className="text-zinc-600 dark:text-zinc-400">{fmtDuration(u.minutes)} · {pct}%</span>
                                    </div>
                                    <div className="w-full bg-zinc-300 dark:bg-zinc-800 rounded-full h-1.5">
                                        <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Burndown chart */}
            {burndownData.length > 1 && (
                <div className="not-dark:bg-white dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-300 dark:border-zinc-800 rounded-lg p-6">
                    <h2 className="text-zinc-900 dark:text-white mb-4 font-medium">Biểu đồ Burndown (công việc còn lại)</h2>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={burndownData}>
                            <XAxis dataKey="name" tick={{ fill: "#52525b", fontSize: 11 }} />
                            <YAxis tick={{ fill: "#52525b", fontSize: 11 }} allowDecimals={false} />
                            <Tooltip />
                            <Line type="monotone" dataKey="remaining" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Còn lại" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Priority Breakdown */}
            <div className="not-dark:bg-white dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-300 dark:border-zinc-800 rounded-lg p-6">
                <h2 className="text-zinc-900 dark:text-white mb-4 font-medium">Công việc theo độ ưu tiên</h2>
                <div className="space-y-4">
                    {priorityData.map((p) => (
                        <div key={p.name} className="space-y-2">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <ArrowRightIcon className={`size-3.5 ${PRIORITY_COLORS[p.name]} bg-transparent dark:bg-transparent`} />
                                    <span className="text-zinc-900 dark:text-zinc-200 capitalize">{p.name.toLowerCase()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-zinc-600 dark:text-zinc-400 text-sm">{p.value} công việc</span>
                                    <span className="px-2 py-0.5 border border-zinc-400 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-xs rounded">
                                        {p.percentage}%
                                    </span>
                                </div>
                            </div>
                            <div className="w-full bg-zinc-300 dark:bg-zinc-800 rounded-full h-1.5">
                                <div
                                    className={`h-1.5 rounded-full ${PRIORITY_COLORS[p.name]}`}
                                    style={{ width: `${p.percentage}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ProjectAnalytics;
