import prisma from "../configs/prisma.js";

/**
 * TÍCH HỢP WEBHOOK (Slack / Discord / hệ thống khác)
 * Admin dán "Incoming Webhook URL" vào Cài đặt workspace
 * (Workspace.settings.automations.webhookUrl). Hệ thống bắn thông điệp JSON
 * khi có sự kiện quan trọng: tạo công việc, hoàn thành công việc, dự án hoàn thành...
 * Gửi cả `text` (Slack) lẫn `content` (Discord) để tương thích cả hai.
 */

// Đọc settings của workspace (Json) — trả về {} nếu thiếu
export const getWorkspaceSettings = async (workspaceId) => {
    if (!workspaceId) return {};
    try {
        const ws = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { settings: true },
        });
        return ws?.settings && typeof ws.settings === "object" ? ws.settings : {};
    } catch {
        return {};
    }
};

// Bắn webhook — fire and forget, không bao giờ làm hỏng request chính
export const sendWorkspaceWebhook = async (workspaceId, text) => {
    try {
        const settings = await getWorkspaceSettings(workspaceId);
        const url = settings?.automations?.webhookUrl;
        if (!url || !/^https?:\/\//.test(url)) return;
        await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, content: text }),
        }).catch(() => {});
    } catch {
        /* im lặng — webhook là phụ trợ */
    }
};
