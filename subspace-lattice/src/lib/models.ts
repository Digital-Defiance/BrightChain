export enum PlayerColor {
  White = 'WHITE',
  Black = 'BLACK',
}

export enum PieceType {
  CommandHub = 'COMMAND_HUB',
  Escort = 'ESCORT',
  Infiltrator = 'INFILTRATOR',
  Beam = 'BEAM',
}

export interface Coordinate {
  x: number;
  y: number;
}

export interface Piece {
  id: string;
  type: PieceType;
  owner: PlayerColor;
  position: Coordinate;
}

export enum CellType {
  Empty = 'EMPTY',
  GravityWell = 'GRAVITY_WELL',
}

export interface Cell {
  coordinate: Coordinate;
  type: CellType;
  pieceId?: string;
}

export interface SensorNetInfo {
  sovereignSpaces: Coordinate[];
  detectedEnemyPieces: string[];
}

export interface GameState {
  boardSize: number;
  cells: Cell[];
  pieces: Record<string, Piece>;
  currentPlayer: PlayerColor;
  winner?: PlayerColor;
}

export interface IChatMessage<TId = string> {
  id: TId;
  senderId: TId | 'SYSTEM';
  text: string;
  timestamp: Date;
  isSystemMessage?: boolean;
}

export interface IGameRoom<TId = string> {
  id: TId;
  roomCode: string;
  name: string;
  password?: string;
  creatorId: TId;
  whitePlayerId?: TId;
  blackPlayerId?: TId;
  observerIds: TId[];
  allowObservers: boolean;
  gameState: GameState;
  chatMessages: IChatMessage<TId>[];
  createdAt: Date;
  updatedAt: Date;
}
