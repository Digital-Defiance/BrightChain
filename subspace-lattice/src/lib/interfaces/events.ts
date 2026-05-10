import { Coordinate, PieceType } from '.';

export enum GameEventType {
  PieceMoved = 'PIECE_MOVED',
  PiecePlaced = 'PIECE_PLACED',
  ChatMessageSent = 'CHAT_MESSAGE_SENT',
  PlayerJoined = 'PLAYER_JOINED',
  PlayerLeft = 'PLAYER_LEFT',
  GameStateSync = 'GAME_STATE_SYNC', // For full state sync
}

export interface IGameEvent<TId = string> {
  roomId: TId;
  type: GameEventType;
  payload: unknown;
}

export interface IMovePieceEventPayload<TId = string> {
  pieceId: TId;
  from: Coordinate;
  to: Coordinate;
}

export interface IPlacePieceEventPayload<TId = string> {
  pieceId: TId;
  pieceType: PieceType;
  ownerId: TId;
  to: Coordinate;
}

export interface IChatMessageSentEventPayload<TId = string> {
  senderId: TId;
  text: string;
}
