import { RoomManager } from './room-manager';

describe('RoomManager', () => {
  let roomManager: RoomManager<string>;
  let idCounter = 0;

  beforeEach(() => {
    idCounter = 0;
    roomManager = new RoomManager<string>(() => `id-${idCounter++}`);
  });

  it('should create a room', () => {
    const room = roomManager.createRoom('Test Room', 'user-1', true, 'pass123');
    expect(room.id).toBe('id-0');
    expect(room.name).toBe('Test Room');
    expect(room.creatorId).toBe('user-1');
    expect(room.password).toBe('pass123');
    expect(room.allowObservers).toBe(true);
    expect(room.roomCode).toMatch(/^[A-Z0-9]{5}$/);
    
    // Check for system message on creation
    expect(room.chatMessages).toHaveLength(1);
    expect(room.chatMessages[0].isSystemMessage).toBe(true);
  });

  it('should retrieve a room by code', () => {
    const room = roomManager.createRoom('Test Room', 'user-1');
    const retrieved = roomManager.getRoomByCode(room.roomCode);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(room.id);
  });

  it('should handle joining and leaving', () => {
    const room = roomManager.createRoom('Test Room', 'user-1');

    // Creator should be white player
    expect(room.whitePlayerId).toBe('user-1');

    // Join black
    let success = roomManager.joinRoom(room.id, 'player-black');
    expect(success).toBe(true);
    expect(room.blackPlayerId).toBe('player-black');

    // Try joining as white (should fail, already assigned)
    success = roomManager.joinRoom(room.id, 'player-white');
    expect(success).toBe(false);

    // Try joining as third player
    success = roomManager.joinRoom(room.id, 'player-third');
    expect(success).toBe(false);

    // Join observer
    success = roomManager.joinRoom(room.id, 'observer-1', true);
    expect(success).toBe(true);
    expect(room.observerIds).toContain('observer-1');

    // Leave (white)
    roomManager.leaveRoom(room.id, 'user-1');
    expect(room.whitePlayerId).toBeUndefined();
  });

  it('should handle chat messages', () => {
    const room = roomManager.createRoom('Chat Room', 'user-1');
    roomManager.joinRoom(room.id, 'player-1');

    const msg = roomManager.sendChatMessage(room.id, 'player-1', 'Hello there');
    expect(msg).toBeDefined();
    expect(msg?.text).toBe('Hello there');
    expect(room.chatMessages).toContain(msg);

    // Outsider cannot send message
    const outsiderMsg = roomManager.sendChatMessage(room.id, 'stranger', 'Intruder');
    expect(outsiderMsg).toBeUndefined();
  });
});
