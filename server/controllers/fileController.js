import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import prisma from '../configs/prisma.js';

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
