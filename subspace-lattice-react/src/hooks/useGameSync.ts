import { useAuthenticatedApi } from '@digitaldefiance/express-suite-react-components';
import { useCallback, useEffect, useState } from 'react';
import {
  Coordinate,
  IChatMessageSentEventPayload,
  IGameRoom,
  IMovePieceEventPayload,
  PieceType,
  SubspaceLatticeEngine,
} from 'subspace-lattice';
import { createSubspaceLatticeApiClient } from '../services/api';
import { useSubspaceLatticeSocket } from './useSubspaceLatticeSocket';

export const useGameSync = (localPlayerId: string) => {
  const api = useAuthenticatedApi();
  const apiClient = createSubspaceLatticeApiClient(api);

  const [engine, setEngine] = useState<SubspaceLatticeEngine | null>(null);
  const [activeRoom, setActiveRoom] = useState<IGameRoom<string> | null>(null);

  const { lastMessage } = useSubspaceLatticeSocket(activeRoom?.id || null);

  const handleIncomingMove = useCallback(
    (payload: IMovePieceEventPayload<string>) => {
      if (engine) {
        engine.movePiece(payload.pieceId, payload.to);
        setActiveRoom((prev: IGameRoom<string> | null) =>
          prev ? { ...prev, gameState: engine.getState() } : null,
        );
      }
    },
    [engine],
  );

  const handleIncomingChat = useCallback(
    (payload: IChatMessageSentEventPayload<string>) => {
      setActiveRoom((prev: IGameRoom<string> | null) => {
        if (!prev) return null;
        const newMessage = {
          id: `msg-${Date.now()}`, // Fallback if backend doesn't provide
          senderId: payload.senderId,
          text: payload.text,
          timestamp: new Date(),
        };
        return {
          ...prev,
          chatMessages: [...prev.chatMessages, newMessage],
        };
      });
    },
    [],
  );

  // Process incoming WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    // Check if the event is a BrightChain EventNotificationSystem broadcast
    // This structure depends on how EventNotificationSystem formats its payloads
    // We assume a format like { event: 'game:piece-moved', data: { ... } }

    if (lastMessage.event === 'game:piece-moved') {
      handleIncomingMove(lastMessage.data);
    } else if (lastMessage.event === 'game:chat-message') {
      handleIncomingChat(lastMessage.data);
    }
  }, [lastMessage, handleIncomingMove, handleIncomingChat]);

  const createAndJoinRoom = async (name: string, password?: string) => {
    try {
      const room = await apiClient.createRoom(name, password);
      // Note: Joining logic might need to be added to the backend createRoom
      // or handled by a separate API call depending on backend implementation.
      // For now, we assume creator is automatically joined.
      setEngine(new SubspaceLatticeEngine());
      setActiveRoom({ ...room, chatMessages: room.chatMessages ?? [] });
    } catch (error) {
      console.error('Failed to create room:', error);
      alert('Failed to create room.');
    }
  };

  const joinRoom = async (
    roomCode: string,
    password?: string,
    asObserver?: boolean,
  ) => {
    // Backend needs a joinRoom endpoint to validate code and return room details.
    // Since we don't have it yet, this will fail in a real scenario without backend updates.
    alert(
      'Joining via code requires backend implementation. Please create a room for testing.',
    );
  };

  const sendMove = async (roomId: string, pieceId: string, to: Coordinate) => {
    if (!engine) return;
    const from = engine.getPiece(pieceId)?.position;
    if (!from) return;

    try {
      await apiClient.movePiece(roomId, { pieceId, from, to });
      // Optimistically apply local move
      engine.movePiece(pieceId, to);
      setActiveRoom((prev: IGameRoom<string> | null) =>
        prev ? { ...prev, gameState: engine.getState() } : null,
      );
    } catch (error) {
      console.error('Failed to send move:', error);
      // Revert logic would go here
    }
  };

  const sendChatMessage = async (roomId: string, text: string) => {
    try {
      await apiClient.sendChat(roomId, { senderId: localPlayerId, text });
    } catch (error) {
      console.error('Failed to send chat:', error);
    }
  };

  const sendPlacement = async (
    roomId: string,
    pieceType: PieceType,
    to: Coordinate,
  ) => {
    // Placeholder
  };

  return {
    activeRoom,
    engine,
    createAndJoinRoom,
    joinRoom,
    sendMove,
    sendChatMessage,
    sendPlacement,
  };
};
