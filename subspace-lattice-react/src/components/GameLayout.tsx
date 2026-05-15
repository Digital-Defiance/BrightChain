import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameSync } from '../hooks/useGameSync';
import { Board } from './Board';
import { Chat } from './Chat';
import { Lobby } from './Lobby';
import { RulesDialog } from './RulesDialog';
import './GameLayout.css';
import { PlayerColor } from 'subspace-lattice';
import { useAuth } from '@digitaldefiance/express-suite-react-components';

export const GameLayout: React.FC = () => {
  const { userData } = useAuth();
  const localPlayerId = userData?.id || 'local-user';
  const [showRules, setShowRules] = useState(false);
  const { roomCode: routeRoomCode } = useParams<{ roomCode?: string }>();
  const navigate = useNavigate();

  const {
    activeRoom,
    engine,
    createAndJoinRoom,
    joinRoom,
    hydrateFromRoomCode,
    sendMove,
    sendChatMessage,
    sendPlacement
  } = useGameSync(localPlayerId);

  // Hydrate from URL: if the route includes a roomCode and we don't already
  // have it loaded, fetch the room so refresh-recovery works.
  useEffect(() => {
    if (routeRoomCode && activeRoom?.roomCode !== routeRoomCode) {
      void hydrateFromRoomCode(routeRoomCode);
    }
  }, [routeRoomCode, activeRoom?.roomCode, hydrateFromRoomCode]);

  // Push URL when a room becomes active so refresh keeps us in the game.
  useEffect(() => {
    if (activeRoom?.roomCode && activeRoom.roomCode !== routeRoomCode) {
      navigate(`/game/subspace-lattice/${activeRoom.roomCode}`, {
        replace: false,
      });
    }
  }, [activeRoom?.roomCode, routeRoomCode, navigate]);

  // Wrap createAndJoinRoom/joinRoom so the lobby callbacks remain (name, password)
  // / (code, password, asObserver) without leaking navigation concerns.
  const handleCreateRoom = async (name: string, password?: string) => {
    await createAndJoinRoom(name, password);
  };
  const handleJoinRoom = async (
    code: string,
    password?: string,
    asObserver?: boolean,
  ) => {
    await joinRoom(code, password, asObserver);
  };

  // Determine the local user's role in the active room.
  // The server is the source of truth: if the room has whitePlayerId/blackPlayerId
  // matching us, use that. As a safety net for any auth id formatting mismatch
  // between the verify endpoint and the JWT-derived memberId used server-side,
  // also treat the local user as White when they are the room's creator (the
  // server assigns the creator to the white slot on room creation).
  const isCreator =
    !!activeRoom?.creatorId && activeRoom?.creatorId === localPlayerId;
  const localPlayerColor =
    activeRoom?.whitePlayerId === localPlayerId || isCreator
      ? PlayerColor.White
      : activeRoom?.blackPlayerId === localPlayerId
      ? PlayerColor.Black
      : 'OBSERVER';

  if (!activeRoom || !engine) {
    // If we've hydrated an activeRoom from the URL but the user isn't seated
    // yet (engine is null), pre-fill the Lobby join form with the room code
    // so they just hit "Engage" to take the open seat.
    const pendingRoomCode = activeRoom?.roomCode ?? routeRoomCode;
    return (
      <Lobby
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        initialRoomCode={pendingRoomCode}
      />
    );
  }

  return (
    <div className="game-layout">
      {showRules && <RulesDialog onClose={() => setShowRules(false)} />}
      <div className="game-info">
        <div className="game-header">
            <h2>{activeRoom.name}</h2>
            <button className="rules-btn" onClick={() => setShowRules(true)}>View Rules</button>
        </div>
        <div className="room-code-share">
          <span>Room Code: <strong>{activeRoom.roomCode}</strong></span>
          <button
            className="copy-code-btn"
            title="Copy join link"
            onClick={() =>
              void navigator.clipboard.writeText(
                `${window.location.origin}/game/subspace-lattice/${activeRoom.roomCode}`,
              )
            }
          >
            Copy Link
          </button>
        </div>
        <p>Your Role: <strong>{localPlayerColor}</strong></p>
        <p>Current Turn: <strong>{engine.getState().currentPlayer}</strong></p>
        {engine.getState().winner && (
            <p className="winner-announcement">
                <strong>WINNER: {engine.getState().winner}!</strong>
            </p>
        )}
      </div>
      <div className="game-main-panel">
        <Board
          gameState={engine.getState()}
          onMovePiece={(pieceId, to) => sendMove(activeRoom.id, pieceId, to)}
          onPlacePiece={(type, to) => sendPlacement(activeRoom.id, type, to)}
          localPlayer={localPlayerColor}
        />
      </div>
      <div className="game-side-panel">
        <Chat
          messages={activeRoom.chatMessages}
          onSendMessage={(text) => sendChatMessage(activeRoom.id, text)}
        />
      </div>
    </div>
  );
};
