import http from 'http';
import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import { initSocket } from './socket.js';
import { JWT_SECRET } from './controllers/authController.js';
import { startTrashCleanup } from './utils/trashCleanup.js';
import { startAutoStatusTick } from './utils/autoStatus.js';
import { startOverdueDigest } from './utils/overdueDigest.js';

// Chạy trong Vitest/test: không listen port, không rate-limit, không cron dọn rác
const IS_TEST = !!process.env.VITEST || process.env.NODE_ENV === 'test';

import authRoutes from './routes/auth.js';
import workspaceRoutes from './routes/workspaces.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import commentRoutes from './routes/comments.js';
import activityRoutes from './routes/activities.js';
import notificationRoutes from './routes/notifications.js';
import fileRoutes from './routes/files.js';
import memberRequestRoutes from './routes/memberRequests.js';
import departmentRoutes from './routes/departments.js';
import projectMessageRoutes from './routes/projectMessages.js';
import timeLogRoutes from './routes/timeLogs.js';
import subtaskRoutes from './routes/subtasks.js';
import aiRoutes from './routes/ai.js';
import phaseRoutes from './routes/phases.js';
import dependencyRoutes from './routes/dependencies.js';
import trashRoutes from './routes/trash.js';
import reportRoutes from './routes/reports.js';
import equipmentRoutes from './routes/equipment.js';
import riskRoutes from './routes/risks.js';
import expenseRoutes from './routes/expenses.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = http.createServer(app);

// CLIENT_URL = domain frontend (Vercel). Nhiều domain ngăn cách bằng dấu phẩy.
// Chưa set → phản chiếu mọi origin (tiện khi mới deploy).
const allowedOrigins = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(',').map((o) => o.trim())
    : true;

// Socket.io requires persistent connections — not supported on Vercel serverless
if (!process.env.VERCEL) {
    initSocket(httpServer, allowedOrigins);
}

app.use(express.json());
app.use(cors({ origin: allowedOrigins, credentials: true }));

// Rate limiting: chống spam/lạm dụng API (600 request / 15 phút / IP — app realtime polling nhiều)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => IS_TEST,
    message: { error: 'Quá nhiều yêu cầu, vui lòng thử lại sau' },
});

// Limiter chặt riêng cho auth (chống brute-force đăng nhập/OTP): 20 request / 15 phút / IP
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => IS_TEST,
    message: { error: 'Quá nhiều lần thử, vui lòng thử lại sau' },
});

// Xác thực JWT tự ký (thay cho Clerk)
app.use((req, res, next) => {
    req.auth = { userId: null };
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return next();
    try {
        const token = authHeader.slice(7);
        const payload = jwt.verify(token, JWT_SECRET);
        req.auth = { userId: payload.sub };
    } catch {
        // token sai/hết hạn → coi như chưa đăng nhập
    }
    next();
});

// Static file serving only works locally (Vercel has no persistent filesystem)
if (!process.env.VERCEL) {
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}

app.get('/', (req, res) => res.send('Server is live'));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/workspaces', apiLimiter, workspaceRoutes);
app.use('/api/projects', apiLimiter, projectRoutes);
app.use('/api/tasks', apiLimiter, taskRoutes);
app.use('/api/comments', apiLimiter, commentRoutes);
app.use('/api/activities', apiLimiter, activityRoutes);
app.use('/api/notifications', apiLimiter, notificationRoutes);
app.use('/api/files', apiLimiter, fileRoutes);
app.use('/api/member-requests', apiLimiter, memberRequestRoutes);
app.use('/api/departments', apiLimiter, departmentRoutes);
app.use('/api/project-messages', apiLimiter, projectMessageRoutes);
app.use('/api/time-logs', apiLimiter, timeLogRoutes);
app.use('/api/subtasks', apiLimiter, subtaskRoutes);
app.use('/api/ai', apiLimiter, aiRoutes);
app.use('/api/phases', apiLimiter, phaseRoutes);
app.use('/api/dependencies', apiLimiter, dependencyRoutes);
app.use('/api/trash', apiLimiter, trashRoutes);
app.use('/api/reports', apiLimiter, reportRoutes);
app.use('/api/equipment', apiLimiter, equipmentRoutes);
app.use('/api/risks', apiLimiter, riskRoutes);
app.use('/api/expenses', apiLimiter, expenseRoutes);

const PORT = process.env.PORT || 5000;

// On Vercel, the platform handles listening — do not call listen()
if (!process.env.VERCEL && !IS_TEST) {
    httpServer.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
    startTrashCleanup(); // tự dọn thùng rác quá 30 ngày (chạy ngay + mỗi 24h)
    startAutoStatusTick(); // tự chuyển trạng thái task theo kế hoạch thời gian (mỗi 60 phút)
    startOverdueDigest(); // automation: nhắc việc quá hạn hằng ngày (workspace bật mới chạy)
}

export default app;
