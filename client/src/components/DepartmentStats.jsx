import { useMemo } from "react";
import { useSelector } from "react-redux";
import { Building2 } from "lucide-react";

/**
 * Thống kê dự án theo phòng ban trong workspace hiện tại.
 * Tính từ dữ liệu Redux có sẵn — không gọi API.
 */
const DepartmentStats = () => {
    const { currentWorkspace } = useSelector((state) => state.workspace);

    const groups = useMemo(() => {
        const projects = currentWorkspace?.projects || [];
        const map = new Map();
        for (const p of projects) {
            const key = p.department?.name || "Chưa phân phòng ban";
            if (!map.has(key)) map.set(key, { name: key, count: 0, progressSum: 0, tasks: 0, done: 0 });
            const g = map.get(key);
            g.count += 1;
            g.progressSum += p.progress || 0;
            for (const t of p.tasks || []) {
                g.tasks += 1;
                if (t.status === "DONE") g.done += 1;
            }
        }
        return Array.from(map.values())
            .map((g) => ({
                ...g,
                avgProgress: g.count ? Math.round(g.progressSum / g.count) : 0,
            }))
            .sort((a, b) => b.count - a.count);
    }, [currentWorkspace]);

    if (groups.length === 0) return null;

    return (
        <div className="bg-white dark:bg-surface-card rounded-lg overflow-hidden dark:shadow-spotify-md">
            <div className="p-4 flex items-center gap-2">
                <Building2 className="size-5 text-m-blue-light" />
                <h2 className="text-sm font-bold text-gray-900 dark:text-ink">Dự án theo phòng ban</h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-white/5">
                {groups.map((g) => (
                    <div key={g.name} className="p-4">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-medium text-gray-900 dark:text-body-strong">{g.name}</span>
                            <span className="text-xs text-gray-500 dark:text-muted">
                                {g.count} dự án · {g.done}/{g.tasks} công việc xong
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-surface-elevated overflow-hidden">
                                <div className="h-full rounded-full bg-m-blue-light" style={{ width: `${g.avgProgress}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-gray-600 dark:text-body w-10 text-right">{g.avgProgress}%</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DepartmentStats;
