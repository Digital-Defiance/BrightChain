import { Cell } from './cell';
import { Piece } from './piece';
import { PlayerColor } from './playerColor';

export interface GameState {
  boardSize: number;
  cells: Cell[];
  pieces: Record<string, Piece>;
  currentPlayer: PlayerColor;
  winner?: PlayerColor;
}
