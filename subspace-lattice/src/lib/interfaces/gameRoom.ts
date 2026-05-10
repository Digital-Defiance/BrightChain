import { GameState } from './gameState';
import { IChatMessage } from './chatMessage';

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
