import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { soundEffects } from '../utils/audio';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUserIds: Set<number>;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  onlineUserIds: new Set(),
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketInstance = io('/', {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      console.log('Socket.IO connected:', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket.IO disconnected');
      setIsConnected(false);
    });

    socketInstance.on('user:presence', ({ userId, is_online }: { userId: number; is_online: number }) => {
      setOnlineUserIds(prev => {
        const next = new Set(prev);
        if (is_online) {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });
    });

    socketInstance.on('notification:new', (notification) => {
      soundEffects.playMessageSound();
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [token, user?.id]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, onlineUserIds }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
