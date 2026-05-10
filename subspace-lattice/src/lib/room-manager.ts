import { IGameRoom, GameState, PlayerColor, IChatMessage } from './interfaces';

export class RoomManager<TId = string> {
  private rooms: Map<TId, IGameRoom<TId>> = new Map();
  // Map of 5 character room codes to Room IDs
  private roomCodes: Map<string, TId> = new Map();

  constructor(private idGenerator: () => TId) {}

  public generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private generateUniqueRoomCode(): string {
    let code = this.generateRoomCode();
    while (this.roomCodes.has(code)) {
      code = this.generateRoomCode();
    }
    return code;
  }

  public createRoom(
    name: string,
    creatorId: TId,
    allowObservers: boolean = true,
    password?: string
  ): IGameRoom<TId> {
    const id = this.idGenerator();
    const roomCode = this.generateUniqueRoomCode();

    const newRoom: IGameRoom<TId> = {
      id,
      roomCode,
      name,
      creatorId,
      allowObservers,
      observerIds: [],
      gameState: this.createInitialGameState(),
      chatMessages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (password) {
      newRoom.password = password;
    }

    this.rooms.set(id, newRoom);
    this.roomCodes.set(roomCode, id);
    
    this.addSystemMessage(id, `Room "${name}" created (Code: ${roomCode}).`);

    return newRoom;
  }

  public getRoom(id: TId): IGameRoom<TId> | undefined {
    return this.rooms.get(id);
  }

  public getRoomByCode(code: string): IGameRoom<TId> | undefined {
    const id = this.roomCodes.get(code.toUpperCase());
    if (id) {
      return this.rooms.get(id);
    }
    return undefined;
  }

  public joinRoom(roomId: TId, userId: TId, asObserver: boolean = false, password?: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    if (room.password && room.password !== password) {
      return false; // Invalid password
    }

    if (asObserver) {
      if (!room.allowObservers) return false;
      if (!room.observerIds.includes(userId)) {
        room.observerIds.push(userId);
        room.updatedAt = new Date();
        this.addSystemMessage(roomId, `A new observer has joined.`);
      }
      return true;
    }

    // Join as player
    if (!room.whitePlayerId) {
      room.whitePlayerId = userId;
      room.updatedAt = new Date();
      this.addSystemMessage(roomId, `White player has joined.`);
      return true;
    } else if (!room.blackPlayerId && room.whitePlayerId !== userId) {
      room.blackPlayerId = userId;
      room.updatedAt = new Date();
      this.addSystemMessage(roomId, `Black player has joined.`);
      return true;
    }

    return false; // Room is full
  }
  
  public leaveRoom(roomId: TId, userId: TId): boolean {
      const room = this.rooms.get(roomId);
      if(!room) return false;
      
      let changed = false;
      if(room.whitePlayerId === userId) {
          room.whitePlayerId = undefined;
          this.addSystemMessage(roomId, `White player has left.`);
          changed = true;
      }
      if(room.blackPlayerId === userId) {
          room.blackPlayerId = undefined;
          this.addSystemMessage(roomId, `Black player has left.`);
          changed = true;
      }
      
      const observerIndex = room.observerIds.indexOf(userId);
      if(observerIndex >= 0) {
          room.observerIds.splice(observerIndex, 1);
          this.addSystemMessage(roomId, `An observer has left.`);
          changed = true;
      }
      
      if(changed) {
          room.updatedAt = new Date();
      }
      return changed;
  }
  
  public sendChatMessage(roomId: TId, senderId: TId, text: string): IChatMessage<TId> | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    
    // Ensure sender is actually in the room
    const isPlayer = room.whitePlayerId === senderId || room.blackPlayerId === senderId;
    const isObserver = room.observerIds.includes(senderId);
    
    if (!isPlayer && !isObserver) {
       return undefined;
    }

    const message: IChatMessage<TId> = {
      id: this.idGenerator(),
      senderId,
      text,
      timestamp: new Date()
    };
    
    room.chatMessages.push(message);
    room.updatedAt = new Date();
    
    return message;
  }
  
  private addSystemMessage(roomId: TId, text: string): void {
      const room = this.rooms.get(roomId);
      if (!room) return;
      
      room.chatMessages.push({
          id: this.idGenerator(),
          senderId: 'SYSTEM',
          text,
          timestamp: new Date(),
          isSystemMessage: true
      });
  }

  private createInitialGameState(): GameState {
    return {
      boardSize: 11,
      cells: [],
      pieces: {},
      currentPlayer: PlayerColor.White,
    };
  }
}
