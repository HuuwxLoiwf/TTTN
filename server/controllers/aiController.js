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
                tasks: { include: { assignee: { select: { name: true, email: true } } } },
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
