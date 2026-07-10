import { useMemo, useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Tooltip } from "recharts";
import { CheckCircle, Clock, AlertTriangle, Users, Download, ArrowRightIcon, Timer, FileDown, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { apiFetch } from "../lib/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const fmtDuration = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h && m) return `${h}h ${m}p`;
    if (h) return `${h}h`;
    return `${m}p`;
};

// Colors for charts and priorities (Spotify palette)
const COLORS = ["#1ed760", "#539df5", "#ffa42b", "#f3727f", "#b3b3b3"];
const PRIORITY_COLORS = {
    LOW: "bg-m-red",
    MEDIUM: "bg-bmw-blue",
    HIGH: "bg-m-success",
};
const PRIORITY_TEXT_COLORS = {
    LOW: "text-m-red",
    MEDIUM: "text-bmw-blue",
    HIGH: "text-m-success",
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
            color: "text-m-success",
            icon: <CheckCircle className="size-5 text-m-success" />,
            bg: "bg-emerald-100 dark:bg-m-success/10",
        },
        {
            label: "Đang thực hiện",
            value: stats.inProgress,
            color: "text-bmw-blue",
            icon: <Clock className="size-5 text-bmw-blue" />,
            bg: "bg-blue-100 dark:bg-bmw-blue/10",
        },
        {
            label: "Công việc quá hạn",
            value: stats.overdue,
            color: "text-m-red",
            icon: <AlertTriangle className="size-5 text-m-red" />,
            bg: "bg-red-100 dark:bg-m-red/10",
        },
        {
            label: "Quy mô nhóm",
            value: project?.members?.length || 0,
            color: "text-m-warning",
            icon: <Users className="size-5 text-m-warning" />,
            bg: "bg-amber-100 dark:bg-m-warning/10",
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

    const exportExcel = () => {
        const wb = XLSX.utils.book_new();

        // Sheet 1: Tổng quan
        const overview = [
            ["Dự án", project?.name || ""],
            ["Ngày xuất", format(new Date(), "dd/MM/yyyy HH:mm")],
            ["Tổng công việc", stats.total],
            ["Hoàn thành", stats.completed],
            ["Tỷ lệ hoàn thành", `${completionRate}%`],
            ["Đang thực hiện", stats.inProgress],
            ["Chờ làm", stats.todo],
            ["Quá hạn", stats.overdue],
            ["Tiến độ dự án", `${project?.progress || 0}%`],
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(overview), "Tổng quan");

        // Sheet 2: Danh sách công việc
        const taskRows = tasks.map((t) => ({
            "Tiêu đề": t.title,
            "Loại": t.type,
            "Trạng thái": t.status,
            "Ưu tiên": t.priority,
            "Người thực hiện": t.assignee?.name || t.assignee?.email || "",
            "Hạn chót": t.due_date ? format(new Date(t.due_date), "dd/MM/yyyy") : "",
            "Ngày tạo": t.createdAt ? format(new Date(t.createdAt), "dd/MM/yyyy") : "",
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(taskRows), "Công việc");

        // Sheet 3: Giờ làm theo thành viên (nếu có)
        if (timeReport?.byUser?.length) {
            const timeRows = timeReport.byUser.map((u) => ({
                "Thành viên": u.user?.name || u.user?.email || "",
                "Tổng phút": u.minutes,
                "Quy đổi giờ": (u.minutes / 60).toFixed(1),
                "Số lần ghi": u.entries,
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(timeRows), "Giờ làm");
        }

        XLSX.writeFile(wb, `${project?.name || "bao-cao"}-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
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
            <div className="flex flex-wrap justify-end gap-2">
                <button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-surface-elevated text-gray-700 dark:text-body hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                    <Sparkles className="size-4" /> {analyzing ? "Đang phân tích..." : "Phân tích AI"}
                </button>
                <button
                    onClick={exportPDF}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-surface-elevated text-gray-700 dark:text-body hover:bg-white/10 transition-colors"
                >
                    <FileDown className="size-4" /> Xuất PDF
                </button>
                <button
                    onClick={exportExcel}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-surface-elevated text-gray-700 dark:text-body hover:bg-white/10 transition-colors"
                >
                    <FileDown className="size-4" /> Xuất Excel
                </button>
                <button
                    onClick={exportCSV}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-m-blue-light text-black hover:scale-105 transition-transform"
                >
                    <Download className="size-4" />
                    Xuất báo cáo CSV
                </button>
            </div>

            {aiAnalysis && (
                <div className="bg-surface-soft rounded-lg p-5">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-gray-700 dark:text-body-strong flex items-center gap-2"><Sparkles className="size-4" /> Phân tích từ AI</h3>
                        <button onClick={() => setAiAnalysis("")} className="text-xs text-gray-400 dark:text-muted hover:text-gray-600 dark:hover:text-body">Đóng</button>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-body whitespace-pre-wrap">{aiAnalysis}</p>
                </div>
            )}

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {metrics.map((m, i) => (
                    <div
                        key={i}
                        className="bg-surface-card rounded-lg p-6"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 dark:text-muted text-xs font-bold">{m.label}</p>
                                <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                            </div>
                            <div className={`p-2 rounded-full ${m.bg}`}>{m.icon}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-4">
                {/* Tasks by Status */}
                <div className="bg-surface-card rounded-lg p-6">
                    <h2 className="text-gray-900 dark:text-ink mb-4 text-sm font-bold">Công việc theo trạng thái</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={statusData}>
                            <XAxis
                                dataKey="name"
                                tick={{ fill: "#7e7e7e", fontSize: 12 }}
                                axisLine={{ stroke: "#3c3c3c" }}
                                dark={{ stroke: "#3c3c3c" }}
                            />
                            <YAxis tick={{ fill: "#7e7e7e", fontSize: 12 }} axisLine={{ stroke: "#3c3c3c" }} />
                            <Bar dataKey="value" fill="#1ed760" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Tasks by Type */}
                <div className="bg-surface-card rounded-lg p-6">
                    <h2 className="text-gray-900 dark:text-ink mb-4 text-sm font-bold">Công việc theo loại</h2>
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
                <div className="bg-surface-card rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-gray-900 dark:text-ink text-sm font-bold flex items-center gap-2">
                            <Timer className="size-5 text-bmw-blue" /> Giờ làm theo thành viên
                        </h2>
                        <span className="text-sm font-bold text-bmw-blue">
                            Tổng: {fmtDuration(timeReport.totalMinutes)}
                        </span>
                    </div>
                    <div className="space-y-3">
                        {timeReport.byUser.map((u) => {
                            const pct = timeReport.totalMinutes ? Math.round((u.minutes / timeReport.totalMinutes) * 100) : 0;
                            return (
                                <div key={u.user?.id} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-900 dark:text-body-strong">{u.user?.name || u.user?.email}</span>
                                        <span className="text-gray-600 dark:text-muted">{fmtDuration(u.minutes)} · {pct}%</span>
                                    </div>
                                    <div className="w-full rounded-full bg-surface-elevated h-1.5">
                                        <div className="h-1.5 rounded-full bg-m-blue-light" style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Burndown chart */}
            {burndownData.length > 1 && (
                <div className="bg-surface-card rounded-lg p-6">
                    <h2 className="text-gray-900 dark:text-ink mb-4 text-sm font-bold">Biểu đồ Burndown (công việc còn lại)</h2>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={burndownData}>
                            <XAxis dataKey="name" tick={{ fill: "#7e7e7e", fontSize: 11 }} />
                            <YAxis tick={{ fill: "#7e7e7e", fontSize: 11 }} allowDecimals={false} />
                            <Tooltip />
                            <Line type="monotone" dataKey="remaining" stroke="#1ed760" strokeWidth={2} dot={{ r: 3 }} name="Còn lại" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Priority Breakdown */}
            <div className="bg-surface-card rounded-lg p-6">
                <h2 className="text-gray-900 dark:text-ink mb-4 text-sm font-bold">Công việc theo độ ưu tiên</h2>
                <div className="space-y-4">
                    {priorityData.map((p) => (
                        <div key={p.name} className="space-y-2">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <ArrowRightIcon className={`size-3.5 ${PRIORITY_TEXT_COLORS[p.name]}`} />
                                    <span className="text-gray-900 dark:text-body-strong capitalize">{p.name.toLowerCase()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-600 dark:text-muted text-sm">{p.value} công việc</span>
                                    <span className="px-2.5 py-0.5 rounded-full bg-surface-elevated text-gray-600 dark:text-muted text-xs">
                                        {p.percentage}%
                                    </span>
                                </div>
                            </div>
                            <div className="w-full rounded-full bg-surface-elevated h-1.5">
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
