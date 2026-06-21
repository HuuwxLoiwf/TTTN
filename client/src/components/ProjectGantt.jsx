import { useMemo } from "react";
import { format, differenceInDays, startOfDay } from "date-fns";

const STATUS_COLOR = {
    TODO: "bg-zinc-400",
    IN_PROGRESS: "bg-amber-500",
    REVIEW: "bg-purple-500",
    DONE: "bg-emerald-500",
};

/**
 * Gantt chart đơn giản: mỗi task là 1 thanh từ ngày tạo → hạn chót.
 * Tự tính khoảng thời gian chung của tất cả task để chia tỉ lệ.
 */
const ProjectGantt = ({ tasks }) => {
    const { rows, totalDays, minDate, hasData } = useMemo(() => {
        const withDates = tasks.filter((t) => t.due_date);
        if (withDates.length === 0) return { rows: [], totalDays: 0, minDate: null, hasData: false };

        const starts = withDates.map((t) => startOfDay(new Date(t.createdAt)));
        const ends = withDates.map((t) => startOfDay(new Date(t.due_date)));
        const minDate = new Date(Math.min(...starts.map((d) => d.getTime())));
        const maxDate = new Date(Math.max(...ends.map((d) => d.getTime())));
        const totalDays = Math.max(differenceInDays(maxDate, minDate), 1);

        const rows = withDates.map((t) => {
            const start = startOfDay(new Date(t.createdAt));
            const end = startOfDay(new Date(t.due_date));
            const offset = Math.max(differenceInDays(start, minDate), 0);
            const span = Math.max(differenceInDays(end, start), 1);
            return {
                id: t.id,
                title: t.title,
                status: t.status,
                left: (offset / totalDays) * 100,
                width: (span / totalDays) * 100,
                due: t.due_date,
            };
        });
        return { rows, totalDays, minDate, maxDate, hasData: true };
    }, [tasks]);

    if (!hasData) {
        return (
            <div className="text-center py-12 text-zinc-400 dark:text-zinc-500 text-sm">
                Chưa có công việc nào có hạn chót để hiển thị timeline.
            </div>
        );
    }

    return (
        <div className="space-y-2 overflow-x-auto">
            <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-2 min-w-[500px]">
                <span>{format(minDate, "dd/MM/yyyy")}</span>
                <span>{totalDays} ngày</span>
            </div>
            <div className="space-y-2 min-w-[500px]">
                {rows.map((r) => (
                    <div key={r.id} className="flex items-center gap-3">
                        <div className="w-40 flex-shrink-0 text-sm text-zinc-700 dark:text-zinc-300 truncate" title={r.title}>
                            {r.title}
                        </div>
                        <div className="flex-1 relative h-6 bg-zinc-100 dark:bg-zinc-800 rounded">
                            <div
                                className={`absolute h-6 rounded ${STATUS_COLOR[r.status] || "bg-blue-500"} flex items-center justify-end pr-2`}
                                style={{ left: `${r.left}%`, width: `${r.width}%`, minWidth: "24px" }}
                                title={`Đến hạn: ${format(new Date(r.due), "dd/MM/yyyy")}`}
                            >
                                <span className="text-[10px] text-white whitespace-nowrap">{format(new Date(r.due), "dd/MM")}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProjectGantt;
