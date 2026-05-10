import { PieceType } from './pieceType';
import { PlayerColor } from './playerColor';
import { Coordinate } from './coordinate';

export interface Piece {
  id: string;
  type: PieceType;
  owner: PlayerColor;
  position: Coordinate;
}
