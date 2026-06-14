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

initSocket(httpServer);

app.use(express.json());
app.use(cors());
app.use(clerkMiddleware());

// Serve uploaded files as static assets
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => res.send('Server is live '));

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

httpServer.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
