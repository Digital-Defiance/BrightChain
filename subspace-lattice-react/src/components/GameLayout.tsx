import React, { useState } from 'react';
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
  
  const {
    activeRoom,
    engine,
    createAndJoinRoom,
    joinRoom,
    sendMove,
    sendChatMessage,
    sendPlacement
  } = useGameSync(localPlayerId);

  const localPlayerColor =
    activeRoom?.whitePlayerId === localPlayerId
      ? PlayerColor.White
      : activeRoom?.blackPlayerId === localPlayerId
      ? PlayerColor.Black
      : 'OBSERVER';

  if (!activeRoom || !engine) {
    return <Lobby onCreateRoom={createAndJoinRoom} onJoinRoom={joinRoom} />;
  }

  return (
    <div className="game-layout">
      {showRules && <RulesDialog onClose={() => setShowRules(false)} />}
      <div className="game-info">
        <div className="game-header">
            <h2>{activeRoom.name}</h2>
            <button className="rules-btn" onClick={() => setShowRules(true)}>View Rules</button>
        </div>
        <p>Room Code: <strong>{activeRoom.roomCode}</strong></p>
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
