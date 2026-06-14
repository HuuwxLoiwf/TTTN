import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => {
    if (!socket) {
        socket = io(window.location.origin, {
            path: '/socket.io/',
            transports: ['websocket', 'polling'],
        });
    }
    return socket;
};

export const joinProject = (projectId) => getSocket().emit('join:project', projectId);
export const leaveProject = (projectId) => getSocket().emit('leave:project', projectId);
