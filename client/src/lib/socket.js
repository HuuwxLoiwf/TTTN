import { io } from 'socket.io-client';

let socket = null;

// Production: kết nối thẳng tới backend (Railway) qua VITE_API_URL.
// Dev: dùng origin để Vite proxy /socket.io → localhost:5000.
const SOCKET_URL = import.meta.env.VITE_API_URL || window.location.origin;

export const getSocket = () => {
    if (!socket) {
        socket = io(SOCKET_URL, {
            path: '/socket.io/',
            transports: ['websocket', 'polling'],
        });
    }
    return socket;
};

export const joinProject = (projectId) => getSocket().emit('join:project', projectId);
export const leaveProject = (projectId) => getSocket().emit('leave:project', projectId);
export const joinUser = (userId) => getSocket().emit('join:user', userId);
export const joinWorkspace = (workspaceId) => getSocket().emit('join:workspace', workspaceId);
export const leaveWorkspace = (workspaceId) => getSocket().emit('leave:workspace', workspaceId);
