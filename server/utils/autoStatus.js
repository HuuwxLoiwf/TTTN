import prisma from "../configs/prisma.js";
import { emitToProject } from "../socket.js";

/**
 * TỰ ĐỘNG CHUYỂN TRẠNG THÁI CÔNG VIỆC THEO THỜI GIAN
 *
 * Ý tưởng: thời gian từ lúc tạo task → hạn chót được chia thành 4 khoảng
 * tương ứng 4 trạng thái: TODO → IN_PROGRESS → REVIEW → DONE.
 *  - Chia hết cho 4 (VD 20 ngày): mỗi khoảng bằng nhau (5/5/5/5).
 *  - Số lẻ (VD 30 ngày): phần dư dồn cho khoảng cần nhiều thời gian hơn,
 *    ưu tiên IN_PROGRESS (làm chính) rồi REVIEW (30 → 7/9/7/7... xem defaultPlan).
 *  - Kế hoạch có thể chỉnh tay (statusPlan trên Task) nếu cần.
 *
 * Cron chỉ TIẾN trạng thái (TODO→IN_PROGRESS→REVIEW), KHÔNG tự đánh DONE —
 * hoàn thành phải do quản trị viên xác nhận. Khoảng DONE dùng làm "mốc hợp lệ":
 * trước mốc đó admin không thể đánh Hoàn thành (chặn hoàn thành phi lý quá sớm).
 */

const ORDER = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];
export const STATUS_RANK = { TODO: 0, IN_PROGRESS: 1, REVIEW: 2, DONE: 3 };

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Kế hoạch mặc định theo tổng số ngày: chia 4, phần dư dồn theo thứ tự
 * ưu tiên IN_PROGRESS → REVIEW → TODO (DONE là khoảng chốt, giữ ngắn).
 * VD: 20 → {5,5,5,5}; 30 → {7,9,8,6}? Không — 30: base 7 dư 2 → IN_PROGRESS +1, REVIEW +1 = {7,8,8,7}.
 */
export const defaultPlan = (totalDays) => {
    const d = Math.max(1, Math.round(totalDays));
    const base = Math.floor(d / 4);
    const remainder = d - base * 4;
    const plan = { TODO: base, IN_PROGRESS: base, REVIEW: base, DONE: base };
    const bonusOrder = ["IN_PROGRESS", "REVIEW", "TODO"]; // phần ưu tiên được nhiều thời gian hơn
    for (let i = 0; i < remainder; i++) {
        plan[bonusOrder[i % bonusOrder.length]] += 1;
    }
    return plan;
};

/** Chuẩn hóa plan từ DB (Json) — thiếu/sai thì trả null để dùng mặc định. */
const normalizePlan = (raw) => {
    if (!raw || typeof raw !== "object") return null;
    const plan = {};
    for (const key of ORDER) {
        const v = Number(raw[key]);
        if (!Number.isFinite(v) || v < 0) return null;
        plan[key] = v;
    }
    const sum = ORDER.reduce((s, k) => s + plan[k], 0);
    return sum > 0 ? plan : null;
};

/**
 * Tính các mốc thời gian của task theo kế hoạch (tỷ lệ trên khoảng createdAt → due_date).
 * Trả về null nếu task không có hạn chót.
 */
export const getStatusWindows = (task) => {
    if (!task.due_date) return null;
    const start = new Date(task.createdAt).getTime();
    const end = new Date(task.due_date).getTime();
    if (!(end > start)) return null;

    const span = end - start;
    const totalDays = Math.max(1, Math.round(span / DAY_MS));
    const plan = normalizePlan(task.statusPlan) || defaultPlan(totalDays);
    const sum = ORDER.reduce((s, k) => s + plan[k], 0);

    // Mốc bắt đầu từng trạng thái (tỷ lệ theo plan để vẫn đúng khi đổi hạn chót)
    let acc = 0;
    const windows = {};
    for (const key of ORDER) {
        windows[key] = { startAt: new Date(start + (acc / sum) * span), days: plan[key] };
        acc += plan[key];
    }
    return { windows, plan, totalDays, start: new Date(start), end: new Date(end) };
};

/** Trạng thái "đáng lẽ phải ở" tại thời điểm now (tự động tối đa tới REVIEW). */
export const expectedStatus = (task, now = new Date()) => {
    const info = getStatusWindows(task);
    if (!info) return null;
    const t = now.getTime();
    if (t >= info.windows.REVIEW.startAt.getTime()) return "REVIEW";
    if (t >= info.windows.IN_PROGRESS.startAt.getTime()) return "IN_PROGRESS";
    return "TODO";
};

/** Mốc sớm nhất được phép đánh DONE (đầu khoảng DONE trong kế hoạch). */
export const doneAllowedFrom = (task) => {
    const info = getStatusWindows(task);
    return info ? info.windows.DONE.startAt : null;
};

/**
 * Cron: quét các task bật autoStatus, còn hạn, chưa DONE — tiến trạng thái nếu tới mốc.
 * Chỉ tiến, không lùi (admin đã đẩy nhanh thì giữ nguyên).
 */
export const autoStatusTick = async () => {
    const tasks = await prisma.task.findMany({
        where: {
            autoStatus: true,
            deletedAt: null,
            due_date: { not: null },
            status: { not: "DONE" },
            project: { deletedAt: null },
        },
        select: { id: true, projectId: true, title: true, status: true, createdAt: true, due_date: true, statusPlan: true },
    });

    let moved = 0;
    for (const t of tasks) {
        const expect = expectedStatus(t);
        if (!expect || STATUS_RANK[expect] <= STATUS_RANK[t.status]) continue;

        const updated = await prisma.task.update({
            where: { id: t.id },
            data: { status: expect },
            include: { assignee: { select: { id: true, name: true, email: true, image: true } } },
        });
        emitToProject(t.projectId, "task:updated", updated);
        moved++;
    }
    if (moved) console.log(`[autoStatus] Đã tự chuyển trạng thái ${moved} công việc theo kế hoạch thời gian`);
    return moved;
};

// Chạy 1 lần lúc khởi động rồi lặp lại mỗi 60 phút.
export const startAutoStatusTick = () => {
    autoStatusTick().catch((e) => console.error("[autoStatus] tick failed:", e.message));
    setInterval(
        () => autoStatusTick().catch((e) => console.error("[autoStatus] tick failed:", e.message)),
        60 * 60 * 1000,
    );
};
