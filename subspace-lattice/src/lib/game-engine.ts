import {
  Cell,
  CellType,
  Coordinate,
  GameState,
  Piece,
  PieceType,
  PlayerColor,
} from './interfaces';

export class SubspaceLatticeEngine {
  private state: GameState;
  private readonly BOARD_SIZE: number;

  constructor(boardSize: number = 11) {
    this.BOARD_SIZE = boardSize;
    this.state = this.initializeGame(boardSize);
  }

  private initializeGame(boardSize: number): GameState {
    const cells: Cell[] = [];
    for (let x = 0; x < boardSize; x++) {
      for (let y = 0; y < boardSize; y++) {
        cells.push({
          coordinate: { x, y },
          type: CellType.Empty,
        });
      }
    }

    const pieces: Record<string, Piece> = {};

    const addPiece = (
      id: string,
      type: PieceType,
      owner: PlayerColor,
      x: number,
      y: number,
    ) => {
      pieces[id] = { id, type, owner, position: { x, y } };
      const cell = cells.find(
        (c) => c.coordinate.x === x && c.coordinate.y === y,
      );
      if (cell) cell.pieceId = id;
    };

    // White starting pieces
    addPiece('w-ch', PieceType.CommandHub, PlayerColor.White, 5, 0);
    addPiece('w-e1', PieceType.Escort, PlayerColor.White, 4, 0);
    addPiece('w-e2', PieceType.Escort, PlayerColor.White, 6, 0);
    addPiece('w-e3', PieceType.Escort, PlayerColor.White, 5, 1);
    addPiece('w-i1', PieceType.Infiltrator, PlayerColor.White, 3, 0);
    addPiece('w-i2', PieceType.Infiltrator, PlayerColor.White, 7, 0);
    addPiece('w-b1', PieceType.Beam, PlayerColor.White, 2, 0);
    addPiece('w-b2', PieceType.Beam, PlayerColor.White, 8, 0);

    // Black starting pieces
    addPiece('b-ch', PieceType.CommandHub, PlayerColor.Black, 5, 10);
    addPiece('b-e1', PieceType.Escort, PlayerColor.Black, 4, 10);
    addPiece('b-e2', PieceType.Escort, PlayerColor.Black, 6, 10);
    addPiece('b-e3', PieceType.Escort, PlayerColor.Black, 5, 9);
    addPiece('b-i1', PieceType.Infiltrator, PlayerColor.Black, 3, 10);
    addPiece('b-i2', PieceType.Infiltrator, PlayerColor.Black, 7, 10);
    addPiece('b-b1', PieceType.Beam, PlayerColor.Black, 2, 10);
    addPiece('b-b2', PieceType.Beam, PlayerColor.Black, 8, 10);

    // Add central gravity well
    const center = Math.floor(boardSize / 2);
    const centerCell = cells.find(
      (c) => c.coordinate.x === center && c.coordinate.y === center,
    );
    if (centerCell) centerCell.type = CellType.GravityWell;

    return {
      boardSize,
      cells,
      pieces,
      currentPlayer: PlayerColor.White,
    };
  }

  public getState(): GameState {
    return this.state;
  }

  public getCell(coord: Coordinate): Cell | undefined {
    return this.state.cells.find(
      (c) => c.coordinate.x === coord.x && c.coordinate.y === coord.y,
    );
  }

  public getPiece(id: string): Piece | undefined {
    return this.state.pieces[id];
  }

  public getPieceAt(coord: Coordinate): Piece | undefined {
    const cell = this.getCell(coord);
    if (cell?.pieceId) {
      return this.state.pieces[cell.pieceId];
    }
    return undefined;
  }

  public isValidCoordinate(coord: Coordinate): boolean {
    return (
      coord.x >= 0 &&
      coord.x < this.BOARD_SIZE &&
      coord.y >= 0 &&
      coord.y < this.BOARD_SIZE
    );
  }

  public placePiece(piece: Piece): boolean {
    if (this.state.winner) return false;
    if (!this.isValidCoordinate(piece.position)) return false;

    const cell = this.getCell(piece.position);
    if (!cell || cell.type === CellType.GravityWell || cell.pieceId)
      return false;

    this.state.pieces[piece.id] = piece;
    cell.pieceId = piece.id;
    return true;
  }

  public hasAvailableMoves(color: PlayerColor): boolean {
    const pieces = Object.values(this.state.pieces).filter(p => p.owner === color);
    
    for (const piece of pieces) {
        for (let x = 0; x < this.BOARD_SIZE; x++) {
            for (let y = 0; y < this.BOARD_SIZE; y++) {
                const targetCoord = { x, y };
                const targetCell = this.getCell(targetCoord);
                
                // Basic checks
                if (!targetCell || targetCell.type === CellType.GravityWell) continue;
                
                // Can't capture own piece
                if (targetCell.pieceId) {
                    const targetPiece = this.getPiece(targetCell.pieceId);
                    if (targetPiece?.owner === color) continue;
                }

                // If at least one valid move exists, the player has moves
                if (this.isValidMove(piece, targetCoord)) {
                    return true;
                }
            }
        }
    }
    return false;
  }

  public movePiece(pieceId: string, to: Coordinate): boolean {
    if (this.state.winner) return false;

    const piece = this.getPiece(pieceId);
    if (!piece || piece.owner !== this.state.currentPlayer) return false;

    if (!this.isValidCoordinate(to)) return false;
    const targetCell = this.getCell(to);
    if (!targetCell || targetCell.type === CellType.GravityWell) return false;

    // Movement validation based on piece type
    if (!this.isValidMove(piece, to)) return false;

    // Handle capture
    if (targetCell.pieceId) {
      const targetPiece = this.getPiece(targetCell.pieceId);
      if (targetPiece?.owner === piece.owner) return false; // Cannot capture own piece

      // Capture logic
      delete this.state.pieces[targetCell.pieceId];
      if (targetPiece && targetPiece.type === PieceType.CommandHub) {
        this.state.winner = piece.owner;
      }
    }

    // Update old cell
    const oldCell = this.getCell(piece.position);
    if (oldCell) oldCell.pieceId = undefined;

    // Update new position
    piece.position = to;
    targetCell.pieceId = piece.id;

    // Switch turns if game isn't over
    if (!this.state.winner) {
        const nextPlayer = this.state.currentPlayer === PlayerColor.White ? PlayerColor.Black : PlayerColor.White;
        
        // Check for stalemate (no available moves for the next player)
        if (!this.hasAvailableMoves(nextPlayer)) {
            // In Subspace Lattice, if you have no moves, the other player wins
            this.state.winner = this.state.currentPlayer;
        } else {
            this.state.currentPlayer = nextPlayer;
        }
    }

    return true;
  }

  private isValidMove(piece: Piece, to: Coordinate): boolean {
    const dx = Math.abs(piece.position.x - to.x);
    const dy = Math.abs(piece.position.y - to.y);

    switch (piece.type) {
      case PieceType.CommandHub:
        // King movement: 1 space any direction
        return dx <= 1 && dy <= 1 && (dx > 0 || dy > 0);

      case PieceType.Escort:
        // Sentries: 1 space orthogonal
        return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);

      case PieceType.Infiltrator:
        // Knights: Can warp to any empty coordinate
        return (dx === 2 && dy === 1) || (dx === 1 && dy === 2);

      case PieceType.Beam:
        // Rooks: Straight line
        if ((dx > 0 && dy === 0) || (dx === 0 && dy > 0)) {
          // Check for collision along the path
          const stepX = dx === 0 ? 0 : (to.x - piece.position.x) / dx;
          const stepY = dy === 0 ? 0 : (to.y - piece.position.y) / dy;
          const distance = Math.max(dx, dy);

          for (let i = 1; i < distance; i++) {
            const checkX = piece.position.x + stepX * i;
            const checkY = piece.position.y + stepY * i;
            const cell = this.getCell({ x: checkX, y: checkY });
            if (!cell || cell.type === CellType.GravityWell || cell.pieceId) {
              return false; // Blocked by piece or gravity well
            }
          }
          return true;
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * Calculates the sensor net (sovereign space) for a given player.
   */
  public calculateSensorNet(owner: PlayerColor): Coordinate[] {
    const pieces = Object.values(this.state.pieces).filter(
      (p) => p.owner === owner,
    );
    const sovereignSpaces: Set<string> = new Set();
    const commandHub = pieces.find((p) => p.type === PieceType.CommandHub);

    // Command hub radiates sensor net 2 spaces in every direction
    if (commandHub) {
      for (
        let x = Math.max(0, commandHub.position.x - 2);
        x <= Math.min(this.BOARD_SIZE - 1, commandHub.position.x + 2);
        x++
      ) {
        for (
          let y = Math.max(0, commandHub.position.y - 2);
          y <= Math.min(this.BOARD_SIZE - 1, commandHub.position.y + 2);
          y++
        ) {
          sovereignSpaces.add(`${x},${y}`);
        }
      }
    }

    pieces.forEach((p) => {
      if (p.type === PieceType.Escort) {
        for (
          let x = Math.max(0, p.position.x - 1);
          x <= Math.min(this.BOARD_SIZE - 1, p.position.x + 1);
          x++
        ) {
          for (
            let y = Math.max(0, p.position.y - 1);
            y <= Math.min(this.BOARD_SIZE - 1, p.position.y + 1);
            y++
          ) {
            sovereignSpaces.add(`${x},${y}`);
          }
        }
      }
    });

    return Array.from(sovereignSpaces).map((s) => {
      const [x, y] = s.split(',').map(Number);
      return { x, y };
    });
  }
}
