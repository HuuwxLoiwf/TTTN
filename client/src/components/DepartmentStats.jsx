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
        <div className="bg-white dark:bg-zinc-950 dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
            <div className="border-b border-zinc-200 dark:border-zinc-800 p-4 flex items-center gap-2">
                <Building2 className="size-5 text-blue-500" />
                <h2 className="text-lg text-zinc-800 dark:text-zinc-200">Dự án theo phòng ban</h2>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {groups.map((g) => (
                    <div key={g.name} className="p-4">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{g.name}</span>
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                {g.count} dự án · {g.done}/{g.tasks} công việc xong
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600" style={{ width: `${g.avgProgress}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 w-10 text-right">{g.avgProgress}%</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DepartmentStats;
