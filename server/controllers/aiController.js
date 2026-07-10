import { GoogleGenAI } from "@google/genai";
import prisma from "../configs/prisma.js";

// Khởi tạo client nếu có API key. Không có key → trả lỗi rõ ràng.
const apiKey = process.env.GEMINI_API_KEY;
const genai = apiKey ? new GoogleGenAI({ apiKey }) : null;
const MODEL = "gemini-2.0-flash";

const ensureAI = (res) => {
    if (!genai) {
        res.status(503).json({ error: "Tính năng AI chưa được cấu hình (thiếu GEMINI_API_KEY)" });
        return false;
    }
    return true;
};

// Gọi Gemini, trả về text
const generate = async (prompt) => {
    const result = await genai.models.generateContent({
        model: MODEL,
        contents: prompt,
    });
    return result.text || "";
};

// Tóm tắt thảo luận nhóm của dự án
export const summarizeDiscussion = async (req, res) => {
    if (!ensureAI(res)) return;
    try {
        const { projectId } = req.params;
        const messages = await prisma.projectMessage.findMany({
            where: { projectId },
            include: { user: { select: { name: true, email: true } } },
            orderBy: { createdAt: "asc" },
            take: 200,
        });
        if (messages.length === 0) {
            return res.json({ summary: "Chưa có tin nhắn nào để tóm tắt." });
        }

        const transcript = messages
            .map((m) => `${m.user?.name || m.user?.email || "Ẩn danh"}: ${m.content}`)
            .join("\n");

        const summary = await generate(
            `Đây là nội dung thảo luận nhóm của một dự án. Hãy tóm tắt ngắn gọn bằng tiếng Việt: các điểm chính đã bàn, quyết định đã chốt, và việc cần làm tiếp (nếu có). Trình bày gạch đầu dòng.\n\n---\n${transcript}`,
        );
        res.json({ summary: summary || "Không tạo được tóm tắt." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Phân tích rủi ro & gợi ý cho dự án (dựa trên task + hạn chót)
export const analyzeProject = async (req, res) => {
    if (!ensureAI(res)) return;
    try {
        const { projectId } = req.params;
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: {
                tasks: {
                    where: { deletedAt: null },
                    include: { assignee: { select: { name: true, email: true } } },
                },
            },
        });
        if (!project) return res.status(404).json({ error: "Dự án không tồn tại" });

        const now = new Date();
        const taskLines = project.tasks.map((t) => {
            const overdue = t.due_date && new Date(t.due_date) < now && t.status !== "DONE";
            return `- [${t.status}] ${t.title} | ưu tiên ${t.priority} | người làm: ${t.assignee?.name || "chưa giao"} | hạn: ${t.due_date ? new Date(t.due_date).toLocaleDateString("vi-VN") : "không"} ${overdue ? "(QUÁ HẠN)" : ""}`;
        }).join("\n");

        const analysis = await generate(
            `Bạn là trợ lý quản lý dự án. Dựa trên danh sách công việc dưới đây của dự án "${project.name}" (tiến độ ${project.progress}%), hãy phân tích bằng tiếng Việt: (1) rủi ro trễ hạn, (2) công việc cần ưu tiên, (3) gợi ý phân công/hành động. Ngắn gọn, gạch đầu dòng.\n\n${taskLines}`,
        );
        res.json({ analysis: analysis || "Không tạo được phân tích." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// AI GỢI Ý VIỆC NHỎ (subtask) — dựa trên tiêu đề + mô tả công việc
export const suggestSubtasks = async (req, res) => {
    if (!ensureAI(res)) return;
    try {
        const { taskId } = req.params;
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            select: { title: true, description: true, type: true },
        });
        if (!task) return res.status(404).json({ error: "Công việc không tồn tại" });

        const raw = await generate(
            `Bạn là trợ lý quản lý dự án. Hãy chia công việc sau thành 3-6 việc nhỏ (subtask) cụ thể, ngắn gọn bằng tiếng Việt.\n` +
            `Công việc: "${task.title}"\n${task.description ? `Mô tả: ${task.description}\n` : ""}` +
            `CHỈ trả về JSON array các chuỗi, không giải thích. Ví dụ: ["Việc 1","Việc 2"]`,
        );

        // Parse an toàn: bóc JSON array khỏi text (kể cả khi bọc trong ```)
        let suggestions = [];
        try {
            const match = raw.match(/\[[\s\S]*\]/);
            if (match) suggestions = JSON.parse(match[0]);
        } catch { /* fall through */ }
        suggestions = (Array.isArray(suggestions) ? suggestions : [])
            .map((s) => String(s).trim())
            .filter((s) => s.length > 0 && s.length <= 120)
            .slice(0, 6);

        if (suggestions.length === 0) {
            return res.status(500).json({ error: "AI không tạo được gợi ý — thử lại" });
        }
        res.json({ suggestions });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// AI TRỢ LÝ HỎI-ĐÁP — trả lời câu hỏi dựa trên dữ liệu dự án của workspace
export const askAssistant = async (req, res) => {
    if (!ensureAI(res)) return;
    try {
        const { workspaceId } = req.params;
        const { question } = req.body;
        if (!question?.trim()) return res.status(400).json({ error: "Vui lòng nhập câu hỏi" });
        if (question.length > 500) return res.status(400).json({ error: "Câu hỏi quá dài (tối đa 500 ký tự)" });

        const now = new Date();
        const projects = await prisma.project.findMany({
            where: { workspaceId, deletedAt: null },
            select: {
                name: true, status: true, progress: true, end_date: true, budget: true,
                department: { select: { name: true } },
                tasks: {
                    where: { deletedAt: null },
                    select: {
                        title: true, status: true, priority: true, due_date: true,
                        assignee: { select: { name: true } },
                    },
                },
            },
        });

        // Ngữ cảnh gọn: mỗi dự án 1 dòng + liệt kê task quá hạn (tối đa 30)
        const lines = projects.map((p) => {
            const total = p.tasks.length;
            const done = p.tasks.filter((t) => t.status === "DONE").length;
            const overdue = p.tasks.filter((t) => t.due_date && new Date(t.due_date) < now && t.status !== "DONE");
            return `- Dự án "${p.name}" [${p.status}] phòng ban ${p.department?.name || "?"}: tiến độ ${p.progress}%, ${done}/${total} việc xong, ${overdue.length} việc quá hạn` +
                (overdue.length ? `. Quá hạn: ${overdue.slice(0, 5).map((t) => `"${t.title}" (${t.assignee?.name || "chưa giao"})`).join(", ")}` : "");
        });

        const answer = await generate(
            `Bạn là trợ lý quản lý dự án của một công ty. Dưới đây là dữ liệu hiện tại (ngày ${now.toLocaleDateString("vi-VN")}):\n` +
            `${lines.join("\n") || "(chưa có dự án)"}\n\n` +
            `Câu hỏi của người dùng: "${question.trim()}"\n` +
            `Trả lời NGẮN GỌN bằng tiếng Việt, dựa đúng dữ liệu trên. Nếu dữ liệu không đủ để trả lời, nói rõ là không có thông tin.`,
        );
        res.json({ answer: answer || "Không tạo được câu trả lời." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
