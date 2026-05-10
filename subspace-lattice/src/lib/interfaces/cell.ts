import { Coordinate } from './coordinate';
import { CellType } from './cellType';

export interface Cell {
  coordinate: Coordinate;
  type: CellType;
  pieceId?: string;
}
