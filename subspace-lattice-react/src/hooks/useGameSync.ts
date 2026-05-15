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
      return room;
    } catch (error) {
      console.error('Failed to create room:', error);
      alert('Failed to create room.');
      return null;
    }
  };

  const joinRoom = async (
    roomCode: string,
    password?: string,
    asObserver?: boolean,
  ) => {
    try {
      const room = await apiClient.joinRoomByCode(roomCode, {
        password,
        asObserver,
      });
      setEngine(new SubspaceLatticeEngine());
      setActiveRoom({ ...room, chatMessages: room.chatMessages ?? [] });
      return room;
    } catch (error) {
      console.error('Failed to join room:', error);
      alert('Failed to join room.');
      return null;
    }
  };

  /**
   * Hydrate state from a roomCode (e.g. on initial mount when the URL contains
   * /game/subspace-lattice/{roomCode}). Does NOT mutate participant lists;
   * use `joinRoom` for that.
   */
  const hydrateFromRoomCode = useCallback(
    async (roomCode: string) => {
      try {
        const room = await apiClient.getRoomByCode(roomCode);
        setEngine(new SubspaceLatticeEngine());
        setActiveRoom({ ...room, chatMessages: room.chatMessages ?? [] });
        return room;
      } catch (error) {
        console.error('Failed to hydrate room:', error);
        return null;
      }
    },
    // apiClient is recreated each render but stable in behavior; intentionally
    // omitting from deps to avoid re-running on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

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
    hydrateFromRoomCode,
    sendMove,
    sendChatMessage,
    sendPlacement,
  };
};
