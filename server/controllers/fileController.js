import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import prisma from '../configs/prisma.js';
import { notifyUser, logActivity } from '../utils/notify.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Bật Cloudinary nếu có đủ biến môi trường (lưu file bền vững, dùng cho production).
// Không có → lưu vào ổ đĩa local như cũ (đủ cho chạy local/demo).
export const useCloudinary = !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

if (useCloudinary) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
}

const uploadsDir = process.env.VERCEL
    ? '/tmp/uploads'
    : path.join(__dirname, '..', 'uploads');
if (!useCloudinary && !fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Cloudinary cần buffer trong RAM; local thì ghi thẳng ra đĩa.
const storage = useCloudinary
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadsDir),
        filename: (req, file, cb) => {
            const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
            cb(null, `${unique}${path.extname(file.originalname)}`);
        },
    });

// Chỉ cho phép các loại file an toàn (ảnh, tài liệu, nén). Chặn .exe/.bat/.sh...
const ALLOWED_EXT = /\.(jpg|jpeg|png|gif|webp|svg|pdf|docx?|xlsx?|pptx?|txt|csv|zip|rar|7z)$/i;
const fileFilter = (req, file, cb) => {
    if (ALLOWED_EXT.test(file.originalname)) return cb(null, true);
    cb(new Error('Loại file không được hỗ trợ'));
};

export const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// Upload buffer lên Cloudinary, trả về URL bảo mật.
const uploadBufferToCloudinary = (buffer, originalname) =>
    new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { resource_type: 'auto', folder: 'umc-project-files', public_id: `${Date.now()}-${originalname}` },
            (err, result) => (err ? reject(err) : resolve(result)),
        );
        stream.end(buffer);
    });

export const getFiles = async (req, res) => {
    try {
        const userId = req.auth?.userId;
        const { projectId, taskId, phaseId } = req.query;
        if (!projectId && !taskId && !phaseId) {
            return res.status(400).json({ error: 'Thiếu projectId, taskId hoặc phaseId' });
        }

        // Suy ra dự án để kiểm tra quyền: chỉ thành viên workspace mới xem được tài liệu
        let resolvedProjectId = projectId || null;
        if (!resolvedProjectId && taskId) {
            const t = await prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true } });
            resolvedProjectId = t?.projectId || null;
        }
        if (!resolvedProjectId && phaseId) {
            const p = await prisma.phase.findUnique({ where: { id: phaseId }, select: { projectId: true } });
            resolvedProjectId = p?.projectId || null;
        }
        if (!resolvedProjectId) return res.status(404).json({ error: 'Không tìm thấy dự án' });

        const project = await prisma.project.findUnique({
            where: { id: resolvedProjectId },
            select: { workspaceId: true },
        });
        if (!project) return res.status(404).json({ error: 'Dự án không tồn tại' });

        const membership = await prisma.workspaceMember.findUnique({
            where: { userId_workspaceId: { userId, workspaceId: project.workspaceId } },
            select: { id: true },
        });
        if (!membership) return res.status(403).json({ error: 'Bạn không phải thành viên của không gian làm việc này' });

        const where = {};
        if (projectId) where.projectId = projectId;
        if (taskId) where.taskId = taskId;
        if (phaseId) where.phaseId = phaseId;

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

// Multer decode originalname bằng latin1 → tên tiếng Việt bị lỗi font ("BÃ¡o cÃ¡o").
// Chuyển lại về UTF-8 để lưu đúng tên hiển thị.
const fixFileName = (name) => {
    try {
        return Buffer.from(name, 'latin1').toString('utf8');
    } catch {
        return name;
    }
};

export const uploadFile = async (req, res) => {
    try {
        const userId = req.auth?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!req.file) return res.status(400).json({ error: 'Không có file được tải lên' });

        const { projectId, taskId, phaseId } = req.body;
        const originalName = fixFileName(req.file.originalname);

        let fileUrl;
        if (useCloudinary) {
            const result = await uploadBufferToCloudinary(req.file.buffer, originalName);
            fileUrl = result.secure_url;
        } else {
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            fileUrl = `${baseUrl}/uploads/${req.file.filename}`;
        }

        // Xác định dự án (kể cả khi đính kèm vào task/giai đoạn) để kiểm tra quyền người upload
        let resolvedProjectId = projectId || null;
        if (!resolvedProjectId && taskId) {
            const t = await prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true } });
            resolvedProjectId = t?.projectId || null;
        }
        if (!resolvedProjectId && phaseId) {
            const p = await prisma.phase.findUnique({ where: { id: phaseId }, select: { projectId: true } });
            resolvedProjectId = p?.projectId || null;
        }

        // Nếu người upload là ADMIN workspace hoặc trưởng dự án → file tự ĐẠT, không cần duyệt
        let autoApproved = false;
        let isManager = false;
        let projectInfo = null;
        if (resolvedProjectId) {
            projectInfo = await prisma.project.findUnique({
                where: { id: resolvedProjectId },
                select: { workspaceId: true, team_lead: true, name: true },
            });
            if (projectInfo) {
                const membership = await prisma.workspaceMember.findUnique({
                    where: { userId_workspaceId: { userId, workspaceId: projectInfo.workspaceId } },
                    select: { role: true },
                });
                isManager = membership?.role === "ADMIN" || projectInfo.team_lead === userId;
                autoApproved = isManager;
            }
        }

        // Tài liệu CHUNG của dự án (có projectId, không gắn task): chỉ admin/trưởng dự án được up.
        // User thường chỉ up tài liệu công việc (gắn taskId).
        if (projectId && !taskId && !isManager) {
            return res.status(403).json({ error: "Chỉ quản trị viên/trưởng dự án mới đăng tài liệu chung của dự án. Hãy đính kèm vào công việc của bạn." });
        }

        const file = await prisma.file.create({
            data: {
                fileName: originalName,
                fileUrl,
                uploadedBy: userId,
                reviewStatus: autoApproved ? "APPROVED" : "PENDING",
                ...(autoApproved ? { reviewedBy: userId, reviewedAt: new Date() } : {}),
                ...(projectId ? { projectId } : {}),
                ...(taskId ? { taskId } : {}),
                ...(phaseId ? { phaseId } : {}),
            },
            include: { uploader: { select: { id: true, name: true, email: true } } },
        });

        // File CẦN DUYỆT (không phải admin/trưởng dự án up) → báo trưởng dự án + các ADMIN để xem xét.
        if (!autoApproved && projectInfo) {
            const admins = await prisma.workspaceMember.findMany({
                where: { workspaceId: projectInfo.workspaceId, role: "ADMIN" },
                select: { userId: true },
            });
            const recipients = new Set([projectInfo.team_lead, ...admins.map((a) => a.userId)]);
            recipients.delete(userId); // không tự báo mình
            for (const rid of recipients) {
                notifyUser({
                    userId: rid,
                    actorId: userId,
                    title: "Tài liệu mới chờ duyệt",
                    message: `${file.uploader?.name || file.uploader?.email || "Thành viên"} vừa nộp tài liệu "${originalName}" trong dự án ${projectInfo.name} — cần bạn xem xét/duyệt.`,
                });
            }
            logActivity({
                projectId: resolvedProjectId,
                userId,
                action: `đã nộp tài liệu "${originalName}" (chờ duyệt)`,
                entityType: "FILE",
                entityId: file.id,
            });
        }

        res.status(201).json(file);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Upload ảnh đơn giản (logo workspace / avatar): CHỈ trả URL, không tạo bản ghi File.
// Chỉ nhận file ảnh. Dùng cho hình đại diện, logo — không gắn với dự án/công việc.
export const uploadImage = async (req, res) => {
    try {
        const userId = req.auth?.userId;
        if (!userId) return res.status(401).json({ error: 'Chưa đăng nhập' });
        if (!req.file) return res.status(400).json({ error: 'Không có ảnh được tải lên' });
        if (!/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(req.file.originalname)) {
            return res.status(400).json({ error: 'Chỉ chấp nhận file ảnh (jpg, png, gif, webp, svg)' });
        }

        let url;
        if (useCloudinary) {
            const result = await uploadBufferToCloudinary(req.file.buffer, fixFileName(req.file.originalname));
            url = result.secure_url;
        } else {
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            url = `${baseUrl}/uploads/${req.file.filename}`;
        }
        res.status(201).json({ url });
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
        const userId = req.auth?.userId;
        const { id } = req.params;
        const file = await prisma.file.findUnique({ where: { id } });
        if (!file) return res.status(404).json({ error: 'File không tồn tại' });

        // Quyền xóa: người upload, ADMIN workspace, hoặc trưởng dự án.
        // (requireMember đã gắn req.fileOwnerId / req.fileTeamLead / req.memberRole)
        const isOwner = req.fileOwnerId === userId;
        const isManager = req.memberRole === "ADMIN" || req.fileTeamLead === userId;
        if (!isOwner && !isManager) {
            return res.status(403).json({ error: 'Chỉ người tải lên, quản trị viên hoặc trưởng dự án mới được xóa file' });
        }

        // Xóa file vật lý: chỉ khi lưu ở đĩa local (Cloudinary giữ lại, không bắt buộc xóa)
        if (!useCloudinary && file.fileUrl.includes('/uploads/')) {
            const filename = file.fileUrl.split('/uploads/')[1];
            const filePath = path.join(uploadsDir, filename);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        await prisma.file.delete({ where: { id } });
        res.json({ message: 'Đã xóa file' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
