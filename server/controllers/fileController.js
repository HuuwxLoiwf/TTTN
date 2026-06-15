import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import prisma from '../configs/prisma.js';
import { notifyUser, logActivity } from '../utils/notify.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Vercel's /var/task is read-only; use /tmp on serverless, local uploads/ otherwise
const uploadsDir = process.env.VERCEL
    ? '/tmp/uploads'
    : path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
        cb(null, `${unique}${path.extname(file.originalname)}`);
    },
});

export const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

export const getFiles = async (req, res) => {
    try {
        const { projectId, taskId } = req.query;
        const where = {};
        if (projectId) where.projectId = projectId;
        if (taskId) where.taskId = taskId;

        const files = await prisma.file.findMany({
            where,
            include: { uploader: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
        });
        res.json(files);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const uploadFile = async (req, res) => {
    try {
        const userId = req.auth?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!req.file) return res.status(400).json({ error: 'Không có file được tải lên' });

        const { projectId, taskId } = req.body;
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;

        const file = await prisma.file.create({
            data: {
                fileName: req.file.originalname,
                fileUrl,
                uploadedBy: userId,
                ...(projectId ? { projectId } : {}),
                ...(taskId ? { taskId } : {}),
            },
            include: { uploader: { select: { id: true, name: true, email: true } } },
        });
        res.status(201).json(file);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Admin/trưởng dự án đánh giá tài liệu: APPROVED hoặc REJECTED + ghi chú
export const reviewFile = async (req, res) => {
    try {
        const userId = req.auth?.userId;
        const { id } = req.params;
        const { reviewStatus, reviewNote } = req.body;

        if (!["APPROVED", "REJECTED"].includes(reviewStatus)) {
            return res.status(400).json({ error: "Trạng thái đánh giá không hợp lệ" });
        }

        const file = await prisma.file.findUnique({
            where: { id },
            select: { id: true, fileName: true, uploadedBy: true, projectId: true },
        });
        if (!file) return res.status(404).json({ error: 'File không tồn tại' });

        // Chỉ ADMIN workspace hoặc trưởng dự án mới được đánh giá
        if (file.projectId) {
            const project = await prisma.project.findUnique({
                where: { id: file.projectId },
                select: { workspaceId: true, team_lead: true },
            });
            const membership = project && await prisma.workspaceMember.findUnique({
                where: { userId_workspaceId: { userId, workspaceId: project.workspaceId } },
                select: { role: true },
            });
            const allowed = membership?.role === "ADMIN" || project?.team_lead === userId;
            if (!allowed) return res.status(403).json({ error: "Chỉ quản trị viên hoặc trưởng dự án mới được đánh giá tài liệu" });
        }

        const updated = await prisma.file.update({
            where: { id },
            data: {
                reviewStatus,
                reviewNote: reviewNote || null,
                reviewedBy: userId,
                reviewedAt: new Date(),
            },
            include: { uploader: { select: { id: true, name: true, email: true } } },
        });

        // Thông báo cho người upload
        const statusText = reviewStatus === "APPROVED" ? "Đạt yêu cầu" : "Chưa đạt — cần làm lại";
        notifyUser({
            userId: file.uploadedBy,
            actorId: userId,
            title: `Tài liệu được đánh giá: ${statusText}`,
            message: `"${file.fileName}" — ${statusText}${reviewNote ? `: ${reviewNote}` : ""}`,
        });
        if (file.projectId) {
            logActivity({
                projectId: file.projectId,
                userId,
                action: `đã đánh giá tài liệu "${file.fileName}" → ${statusText}`,
                entityType: "FILE",
                entityId: file.id,
            });
        }

        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteFile = async (req, res) => {
    try {
        const { id } = req.params;
        const file = await prisma.file.findUnique({ where: { id } });
        if (!file) return res.status(404).json({ error: 'File không tồn tại' });

        // Remove from disk
        const filename = file.fileUrl.split('/uploads/')[1];
        const filePath = path.join(uploadsDir, filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        await prisma.file.delete({ where: { id } });
        res.json({ message: 'Đã xóa file' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
