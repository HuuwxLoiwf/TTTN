import { useSelector } from "react-redux";
import { FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

const STATUS_VI = { TODO: "Chờ làm", IN_PROGRESS: "Đang làm", REVIEW: "Đang review", DONE: "Hoàn thành" };
const PRIORITY_VI = { LOW: "Thấp", MEDIUM: "Trung bình", HIGH: "Cao" };

/**
 * Xuất báo cáo tổng hợp toàn workspace ra CSV (mở bằng Excel):
 * mỗi dòng = 1 công việc, kèm phòng ban + dự án để lọc/pivot trong Excel.
 */
const WorkspaceReportButton = () => {
    const { currentWorkspace } = useSelector((state) => state.workspace);

    const exportReport = () => {
        if (!currentWorkspace?.projects?.length) {
            toast.error("Chưa có dữ liệu để xuất");
            return;
        }

        const headers = [
            "Phòng ban", "Dự án", "Trạng thái dự án", "Tiến độ (%)",
            "Công việc", "Loại", "Trạng thái", "Ưu tiên",
            "Người thực hiện", "Hạn chót",
        ];

        const rows = [];
        for (const p of currentWorkspace.projects) {
            const dept = p.department?.name || "Chưa phân";
            if (!p.tasks?.length) {
                rows.push([`"${dept}"`, `"${p.name}"`, p.status, p.progress ?? 0, "", "", "", "", "", ""]);
                continue;
            }
            for (const t of p.tasks) {
                rows.push([
                    `"${dept}"`,
                    `"${p.name}"`,
                    p.status,
                    p.progress ?? 0,
                    `"${t.title}"`,
                    t.type,
                    STATUS_VI[t.status] || t.status,
                    PRIORITY_VI[t.priority] || t.priority,
                    `"${t.assignee?.name || t.assignee?.email || ""}"`,
                    t.due_date ? format(new Date(t.due_date), "dd/MM/yyyy") : "",
                ]);
            }
        }

        const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
        const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bao-cao-${currentWorkspace.name}-${format(new Date(), "yyyy-MM-dd")}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Đã xuất báo cáo");
    };

    return (
        <button
            onClick={exportReport}
            className="flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold bg-surface-card text-gray-700 dark:text-body hover:bg-gray-50 dark:hover:bg-surface-elevated transition"
        >
            <FileSpreadsheet size={16} /> Xuất báo cáo
        </button>
    );
};

export default WorkspaceReportButton;
