import http from 'http';
import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { clerkMiddleware } from '@clerk/express';
import { serve } from 'inngest/express';
import { inngest, functions } from './inngest/index.js';
import { initSocket } from './socket.js';

import userRoutes from './routes/users.js';
import workspaceRoutes from './routes/workspaces.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import commentRoutes from './routes/comments.js';
import activityRoutes from './routes/activities.js';
import notificationRoutes from './routes/notifications.js';
import fileRoutes from './routes/files.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = http.createServer(app);

// Socket.io requires persistent connections — not supported on Vercel serverless
if (!process.env.VERCEL) {
    initSocket(httpServer);
}

app.use(express.json());
app.use(cors({ origin: '*', credentials: true }));
app.use(clerkMiddleware({
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
}));

// Static file serving only works locally (Vercel has no persistent filesystem)
if (!process.env.VERCEL) {
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}

app.get('/', (req, res) => res.send('Server is live'));

// Debug route — kiểm tra env vars có được load không
app.get('/api/debug', (req, res) => {
    res.json({
        hasSecretKey: !!process.env.CLERK_SECRET_KEY,
        hasPublishableKey: !!process.env.CLERK_PUBLISHABLE_KEY,
        hasDatabase: !!process.env.DATABASE_URL,
        userId: req.auth?.userId || null,
        env: process.env.NODE_ENV,
    });
});

app.use('/api/inngest', serve({ client: inngest, functions }));
app.use('/api/users', userRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/files', fileRoutes);

const PORT = process.env.PORT || 5000;

// On Vercel, the platform handles listening — do not call listen()
if (!process.env.VERCEL) {
    httpServer.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
}

export default app;
