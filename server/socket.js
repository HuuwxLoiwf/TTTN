import { Server } from 'socket.io';

let io;

export const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: { origin: '*' },
        path: '/socket.io/',
    });

    io.on('connection', (socket) => {
        socket.on('join:project', (projectId) => {
            socket.join(`project:${projectId}`);
        });
        socket.on('leave:project', (projectId) => {
            socket.leave(`project:${projectId}`);
        });
    });

    return io;
};

export const emitToProject = (projectId, event, data) => {
    if (io) io.to(`project:${projectId}`).emit(event, data);
};

export const getIO = () => io;
