import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '../utils/logger';

interface WebSocketOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessage?: (message: any) => void;
}

export const useWebSocket = (options: WebSocketOptions = {}) => {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const socketRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000';
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setConnected(true);
      options.onConnect?.();
      logger.info('WebSocket connected');
    };

    socket.onclose = () => {
      setConnected(false);
      options.onDisconnect?.();
      logger.info('WebSocket disconnected');
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setMessages((prev) => [...prev, message]);
        options.onMessage?.(message);
      } catch (error) {
        logger.error('Error parsing WebSocket message', { error });
      }
    };

    socket.onerror = (error) => {
      logger.error('WebSocket error', { error });
    };

    socketRef.current = socket;
  }, [options]);

  useEffect(() => {
    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  const send = useCallback((message: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      logger.error('WebSocket is not connected');
    }
  }, []);

  return {
    socket: socketRef.current,
    connected,
    messages,
    send,
  };
}; 