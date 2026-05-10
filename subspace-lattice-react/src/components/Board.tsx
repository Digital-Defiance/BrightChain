import React, { useState } from 'react';
import { GameState, PieceType, PlayerColor, Coordinate, CellType, Cell } from 'subspace-lattice';
import './Board.css';

interface BoardProps {
  gameState: GameState;
  onMovePiece: (pieceId: string, to: Coordinate) => void;
  onPlacePiece: (type: PieceType, to: Coordinate) => void;
  localPlayer: PlayerColor | 'OBSERVER';
}

export const Board: React.FC<BoardProps> = ({ gameState, onMovePiece, localPlayer }) => {
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);

  const handleCellClick = (x: number, y: number) => {
    if (localPlayer === 'OBSERVER') return;

    const cell = gameState.cells.find((c: Cell) => c.coordinate.x === x && c.coordinate.y === y);
    
    // Select own piece
    if (cell?.pieceId) {
      const piece = gameState.pieces[cell.pieceId];
      if (piece?.owner === localPlayer) {
        setSelectedPieceId(piece.id);
        return;
      }
    }

    // Move selected piece
    if (selectedPieceId && cell) {
      onMovePiece(selectedPieceId, { x, y });
      setSelectedPieceId(null);
    }
  };

  const getPieceSymbol = (type: PieceType, color: PlayerColor) => {
    const isWhite = color === PlayerColor.White;
    switch (type) {
      case PieceType.CommandHub: return isWhite ? '♔' : '♚';
      case PieceType.Escort: return isWhite ? '♙' : '♟';
      case PieceType.Infiltrator: return isWhite ? '♘' : '♞';
      case PieceType.Beam: return isWhite ? '♖' : '♜';
      default: return '?';
    }
  };

  return (
    <div 
      className="subspace-board" 
      style={{ gridTemplateColumns: `repeat(${gameState.boardSize}, 40px)` }}
    >
      {gameState.cells.map((cell: Cell) => {
        const piece = cell.pieceId ? gameState.pieces[cell.pieceId] : null;
        const isSelected = piece?.id === selectedPieceId;
        const isGravityWell = cell.type === CellType.GravityWell;

        return (
          <div
            key={`${cell.coordinate.x}-${cell.coordinate.y}`}
            className={`subspace-cell ${isGravityWell ? 'gravity-well' : ''} ${isSelected ? 'selected' : ''}`}
            onClick={() => handleCellClick(cell.coordinate.x, cell.coordinate.y)}
          >
            {piece && (
              <span className={`piece ${piece.owner.toLowerCase()}`}>
                {getPieceSymbol(piece.type, piece.owner)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
