import { useMemo } from "react";
import { format, differenceInDays, startOfDay, eachWeekOfInterval } from "date-fns";

const STATUS_COLOR = {
    TODO: "bg-zinc-400 dark:bg-muted",
    IN_PROGRESS: "bg-m-warning",
    REVIEW: "bg-m-blue-light",
    DONE: "bg-m-success",
};

const STATUS_LABEL = { TODO: "Chờ làm", IN_PROGRESS: "Đang làm", REVIEW: "Review", DONE: "Hoàn thành" };
const PLAN_ORDER = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];

// Kế hoạch mặc định: chia đều 4 phần, dư dồn cho IN_PROGRESS → REVIEW → TODO
const defaultPlan = (totalDays) => {
    const d = Number.isFinite(totalDays) && totalDays > 0 ? Math.round(totalDays) : 4;
    const base = Math.floor(d / 4);
    const plan = { TODO: base, IN_PROGRESS: base, REVIEW: base, DONE: base };
    const bonus = ["IN_PROGRESS", "REVIEW", "TODO"];
    for (let i = 0; i < d - base * 4; i++) plan[bonus[i % bonus.length]] += 1;
    return plan;
};

// Chia 1 thanh task thành các đoạn màu theo kế hoạch trạng thái (tỷ lệ theo số ngày).
const buildSegments = (task, spanDays) => {
    const raw = task.statusPlan && typeof task.statusPlan === "object" ? task.statusPlan : null;
    const plan = raw && PLAN_ORDER.every((k) => Number.isFinite(Number(raw[k])))
        ? raw
        : defaultPlan(spanDays);
    const sum = PLAN_ORDER.reduce((s, k) => s + (Number(plan[k]) || 0), 0);
    if (sum <= 0) return null;
    return PLAN_ORDER
        .map((k) => ({ status: k, pct: ((Number(plan[k]) || 0) / sum) * 100 }))
        .filter((seg) => seg.pct > 0);
};

/**
 * Gantt chart: mỗi task là 1 thanh từ ngày tạo → hạn chót, chia tỉ lệ theo timeline chung.
 * Task bật "tự động theo thời gian" (autoStatus) được chia thanh thành 4 khoảng màu
 * theo kế hoạch trạng thái (Chờ làm → Đang làm → Review → Hoàn thành).
 * Có lưới mốc tuần, đường "hôm nay", và đánh dấu task quá hạn.
 */
const ProjectGantt = ({ tasks }) => {
    const { rows, totalDays, minDate, maxDate, weekMarks, todayPct, hasData } = useMemo(() => {
        const withDates = tasks.filter((t) => t.due_date);
        if (withDates.length === 0) return { rows: [], totalDays: 0, hasData: false };

        const starts = withDates.map((t) => startOfDay(new Date(t.createdAt)));
        const ends = withDates.map((t) => startOfDay(new Date(t.due_date)));
        const minDate = new Date(Math.min(...starts.map((d) => d.getTime())));
        const maxDate = new Date(Math.max(...ends.map((d) => d.getTime())));
        const totalDays = Math.max(differenceInDays(maxDate, minDate), 1);
        const now = startOfDay(new Date());

        const rows = withDates
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
            .map((t) => {
                const start = startOfDay(new Date(t.createdAt));
                const end = startOfDay(new Date(t.due_date));
                const offset = Math.max(differenceInDays(start, minDate), 0);
                const span = Math.max(differenceInDays(end, start), 1);
                const overdue = end < now && t.status !== "DONE";
                return {
                    id: t.id,
                    title: t.title,
                    status: t.status,
                    assignee: t.assignee?.name || t.assignee?.email || "",
                    left: (offset / totalDays) * 100,
                    width: (span / totalDays) * 100,
                    due: t.due_date,
                    overdue,
                    // Task tự động → chia thanh thành các khoảng trạng thái theo kế hoạch
                    segments: t.autoStatus ? buildSegments(t, span) : null,
                };
            });

        // Mốc tuần để vẽ lưới dọc
        const weeks = eachWeekOfInterval({ start: minDate, end: maxDate });
        const weekMarks = weeks.map((w) => ({
            label: format(w, "dd/MM"),
            pct: (Math.max(differenceInDays(w, minDate), 0) / totalDays) * 100,
        }));

        // Vị trí đường "hôm nay" (chỉ hiện nếu nằm trong timeline)
        const todayOffset = differenceInDays(now, minDate);
        const todayPct = todayOffset >= 0 && todayOffset <= totalDays ? (todayOffset / totalDays) * 100 : null;

        return { rows, totalDays, minDate, maxDate, weekMarks, todayPct, hasData: true };
    }, [tasks]);

    if (!hasData) {
        return (
            <div className="text-center py-12 text-zinc-400 dark:text-muted text-sm">
                Chưa có công việc nào có hạn chót để hiển thị timeline.
            </div>
        );
    }

    return (
        <div className="space-y-3 overflow-x-auto">
            {/* Header timeline */}
            <div className="flex justify-between text-xs text-zinc-500 dark:text-muted min-w-[600px]">
                <span>{format(minDate, "dd/MM/yyyy")}</span>
                <span className="font-bold text-zinc-700 dark:text-body-strong">{totalDays} ngày</span>
                <span>{format(maxDate, "dd/MM/yyyy")}</span>
            </div>

            {/* Chú thích */}
            <div className="flex flex-wrap gap-3 text-xs min-w-[600px]">
                {Object.entries(STATUS_LABEL).map(([k, label]) => (
                    <span key={k} className="flex items-center gap-1.5 text-zinc-600 dark:text-body">
                        <span className={`size-3 rounded-full ${STATUS_COLOR[k]}`} /> {label}
                    </span>
                ))}
            </div>

            <div className="space-y-2 min-w-[600px] relative">
                {rows.map((r) => (
                    <div key={r.id} className="flex items-center gap-3">
                        <div className="w-44 flex-shrink-0 text-sm text-zinc-700 dark:text-body truncate" title={r.title}>
                            {r.title}
                            {r.assignee && <span className="block text-[10px] text-zinc-400 dark:text-muted truncate">{r.assignee}</span>}
                        </div>
                        <div className="flex-1 relative h-7 bg-zinc-100 dark:bg-surface-soft rounded-full overflow-hidden">
                            {/* Lưới mốc tuần */}
                            {weekMarks.map((w, i) => (
                                <div key={i} className="absolute top-0 bottom-0 w-px bg-zinc-200 dark:bg-hairline" style={{ left: `${w.pct}%` }} />
                            ))}
                            {/* Đường hôm nay */}
                            {todayPct !== null && (
                                <div className="absolute top-0 bottom-0 w-0.5 bg-m-red z-10" style={{ left: `${todayPct}%` }} title="Hôm nay" />
                            )}
                            {/* Thanh task */}
                            <div
                                className={`absolute h-7 rounded-full flex items-center justify-end pr-2 overflow-hidden ${r.segments ? "" : (STATUS_COLOR[r.status] || "bg-m-blue-light")} ${r.overdue ? "ring-2 ring-m-red" : ""}`}
                                style={{ left: `${r.left}%`, width: `${r.width}%`, minWidth: "28px" }}
                                title={`${r.title} • Đến hạn: ${format(new Date(r.due), "dd/MM/yyyy")}${r.overdue ? " (QUÁ HẠN)" : ""}${r.segments ? " • Chia khoảng theo kế hoạch trạng thái" : ""}`}
                            >
                                {/* Nếu là task tự động: vẽ 4 khoảng màu theo kế hoạch trạng thái */}
                                {r.segments && (
                                    <div className="absolute inset-0 flex rounded-full overflow-hidden">
                                        {r.segments.map((seg, i) => (
                                            <div
                                                key={i}
                                                className={`h-full ${STATUS_COLOR[seg.status]}`}
                                                style={{ width: `${seg.pct}%` }}
                                                title={STATUS_LABEL[seg.status]}
                                            />
                                        ))}
                                    </div>
                                )}
                                <span className="relative z-10 text-[10px] text-white whitespace-nowrap">{format(new Date(r.due), "dd/MM")}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProjectGantt;
