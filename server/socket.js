import { Server } from 'socket.io';

let io;

export const initSocket = (httpServer, corsOrigin = '*') => {
    io = new Server(httpServer, {
        cors: { origin: corsOrigin, credentials: true },
        path: '/socket.io/',
    });

    io.on('connection', (socket) => {
        socket.on('join:project', (projectId) => {
            socket.join(`project:${projectId}`);
        });
        socket.on('leave:project', (projectId) => {
            socket.leave(`project:${projectId}`);
        });
        // Personal room for per-user notifications
        socket.on('join:user', (userId) => {
            if (userId) socket.join(`user:${userId}`);
        });
        // Workspace room for activity feed
        socket.on('join:workspace', (workspaceId) => {
            if (workspaceId) socket.join(`workspace:${workspaceId}`);
        });
        socket.on('leave:workspace', (workspaceId) => {
            if (workspaceId) socket.leave(`workspace:${workspaceId}`);
        });
    });

    return io;
};

export const emitToProject = (projectId, event, data) => {
    if (io) io.to(`project:${projectId}`).emit(event, data);
};

export const emitToUser = (userId, event, data) => {
    if (io) io.to(`user:${userId}`).emit(event, data);
};

export const emitToWorkspace = (workspaceId, event, data) => {
    if (io) io.to(`workspace:${workspaceId}`).emit(event, data);
};

export const getIO = () => io;
