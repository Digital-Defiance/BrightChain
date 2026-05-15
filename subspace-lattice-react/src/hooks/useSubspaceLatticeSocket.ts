import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@digitaldefiance/express-suite-react-components';

export const useSubspaceLatticeSocket = (roomId: string | null) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [lastMessage, setLastMessage] = useState<any | null>(null);
  const { token } = useAuth();

  const connect = useCallback(() => {
    if (!roomId || !token) return;

    // Determine WebSocket protocol
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/client?token=${encodeURIComponent(token)}`;

    const newSocket = new WebSocket(wsUrl);

    newSocket.onopen = () => {
      console.log('Subspace Lattice WebSocket connected');
    };

    newSocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setLastMessage(message);
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    newSocket.onclose = () => {
      console.log('Subspace Lattice WebSocket disconnected');
      setSocket(null);
    };

    newSocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [roomId, token]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  return { socket, lastMessage };
};
