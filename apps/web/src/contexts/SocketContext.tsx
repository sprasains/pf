import React, { createContext, useContext, ReactNode } from 'react';
import { useSocket } from '@/hooks/useSocket';

interface SocketContextType {
  socket: ReturnType<typeof useSocket>;
}

const SocketContext = createContext<SocketContextType | null>(null);

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const socket = useSocket({
    onConnect: () => {
      console.log('Socket connected');
    },
    onDisconnect: () => {
      console.log('Socket disconnected');
    },
    onError: (error) => {
      console.error('Socket error:', error);
    },
  });

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
} 