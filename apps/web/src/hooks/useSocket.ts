import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/useAuth';

interface UseSocketOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export function useSocket(options: UseSocketOptions = {}) {
  const { token } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback(() => {
    if (!token) return;

    const socket = io(process.env.NEXT_PUBLIC_WS_URL || '', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('Socket connected');
      options.onConnect?.();
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      options.onDisconnect?.();
    });

    socket.on('error', (error: Error) => {
      console.error('Socket error:', error);
      options.onError?.(error);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [token, options]);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      cleanup?.();
    };
  }, [connect]);

  const subscribeToWorkflow = useCallback((workflowId: string) => {
    if (!socketRef.current) return;

    socketRef.current.emit('workflow:subscribe', workflowId);
  }, []);

  const unsubscribeFromWorkflow = useCallback((workflowId: string) => {
    if (!socketRef.current) return;

    socketRef.current.emit('workflow:unsubscribe', workflowId);
  }, []);

  const onWorkflowStatus = useCallback((callback: (data: {
    workflowId: string;
    status: 'started' | 'completed' | 'failed';
    result?: any;
    error?: string;
    timestamp: string;
  }) => void) => {
    if (!socketRef.current) return;

    socketRef.current.on('workflow:status', callback);

    return () => {
      socketRef.current?.off('workflow:status', callback);
    };
  }, []);

  const onWorkflowSubscribed = useCallback((callback: (data: { workflowId: string }) => void) => {
    if (!socketRef.current) return;

    socketRef.current.on('workflow:subscribed', callback);

    return () => {
      socketRef.current?.off('workflow:subscribed', callback);
    };
  }, []);

  const onError = useCallback((callback: (data: { message: string }) => void) => {
    if (!socketRef.current) return;

    socketRef.current.on('error', callback);

    return () => {
      socketRef.current?.off('error', callback);
    };
  }, []);

  return {
    socket: socketRef.current,
    subscribeToWorkflow,
    unsubscribeFromWorkflow,
    onWorkflowStatus,
    onWorkflowSubscribed,
    onError,
  };
} 