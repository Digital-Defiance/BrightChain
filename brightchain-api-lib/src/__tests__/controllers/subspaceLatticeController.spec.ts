/**
 * Unit tests for SubspaceLatticeController.createRoom
 *
 * Validates:
 * - Room name is present in the returned room object (fixes missing header bug)
 * - Creator is automatically assigned as white player (fixes "OBSERVER" role bug)
 * - 400 is returned when name is absent or blank
 * - Creator ID is resolved from req.user.memberId, req.user.id, or falls back to 'anonymous'
 */

import { IBrightChainApplication } from '../../lib/interfaces/application';
import { SubspaceLatticeController } from '../../lib/controllers/api/subspaceLatticeController';
import { IGameRoom } from 'subspace-lattice';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createMockApp(): IBrightChainApplication {
  return {
    environment: { mongo: { useTransactions: false }, debug: false },
    constants: {},
    ready: true,
    services: { get: () => undefined },
    plugins: {},
    db: { connection: { readyState: 1 } },
    getModel: () => {
      throw new Error('not implemented');
    },
    getController: () => {
      throw new Error('not implemented');
    },
    setController: () => { /* noop */ },
    start: async () => { /* noop */ },
    getNodeId: () => 'test-node-id',
  } as unknown as IBrightChainApplication;
}

/**
 * Creates a mock Express response that captures the status code and JSON body
 * sent by the handler.
 */
function createMockRes() {
  let capturedStatus: number | undefined;
  let capturedBody: unknown;

  const res: Record<string, unknown> = {};
  res['status'] = jest.fn().mockImplementation((code: number) => {
    capturedStatus = code;
    return res;
  });
  res['json'] = jest.fn().mockImplementation((body: unknown) => {
    capturedBody = body;
    return res;
  });
  res['send'] = jest.fn().mockImplementation(() => res);

  return {
    mockRes: res as unknown as import('express').Response,
    getStatus: () => capturedStatus,
    getBody: <T = unknown>() => capturedBody as T,
  };
}

function createMockReq(body: Record<string, unknown>, user?: { memberId?: string; id?: string }) {
  return { body, user } as unknown as import('express').Request;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SubspaceLatticeController createRoom', () => {
  let controller: SubspaceLatticeController<string>;

  beforeEach(() => {
    controller = new SubspaceLatticeController(createMockApp() as never);
  });

  describe('successful room creation', () => {
    it('returns 201 status', async () => {
      const { mockRes, getStatus } = createMockRes();
      const req = createMockReq({ name: 'Ten-Forward' }, { memberId: 'user-abc' });

      await controller.createRoom(req, mockRes);

      expect(getStatus()).toBe(201);
    });

    it('returns a room with the requested name (fixes missing header bug)', async () => {
      const { mockRes, getBody } = createMockRes();
      const req = createMockReq({ name: 'Ten-Forward' }, { memberId: 'user-abc' });

      await controller.createRoom(req, mockRes);

      const room = getBody<IGameRoom<string>>();
      expect(room.name).toBe('Ten-Forward');
    });

    it('trims whitespace from the room name', async () => {
      const { mockRes, getBody } = createMockRes();
      const req = createMockReq({ name: '  Promenade  ' }, { memberId: 'user-abc' });

      await controller.createRoom(req, mockRes);

      const room = getBody<IGameRoom<string>>();
      expect(room.name).toBe('Promenade');
    });

    it('assigns creator as white player (fixes OBSERVER role bug)', async () => {
      const { mockRes, getBody } = createMockRes();
      const req = createMockReq({ name: 'Bridge' }, { memberId: 'user-kirk' });

      await controller.createRoom(req, mockRes);

      const room = getBody<IGameRoom<string>>();
      expect(room.whitePlayerId).toBe('user-kirk');
    });

    it('sets creatorId on the room', async () => {
      const { mockRes, getBody } = createMockRes();
      const req = createMockReq({ name: 'Bridge' }, { memberId: 'user-kirk' });

      await controller.createRoom(req, mockRes);

      const room = getBody<IGameRoom<string>>();
      expect(room.creatorId).toBe('user-kirk');
    });

    it('room has a 5-character room code', async () => {
      const { mockRes, getBody } = createMockRes();
      const req = createMockReq({ name: 'Holodeck' }, { memberId: 'user-1' });

      await controller.createRoom(req, mockRes);

      const room = getBody<IGameRoom<string>>();
      expect(room.roomCode).toMatch(/^[A-Z0-9]{5}$/);
    });

    it('includes system chat messages', async () => {
      const { mockRes, getBody } = createMockRes();
      const req = createMockReq({ name: 'Ops' }, { memberId: 'user-1' });

      await controller.createRoom(req, mockRes);

      const room = getBody<IGameRoom<string>>();
      expect(Array.isArray(room.chatMessages)).toBe(true);
      expect(room.chatMessages.length).toBeGreaterThan(0);
    });

    it('creates room with optional password', async () => {
      const { mockRes, getBody } = createMockRes();
      const req = createMockReq({ name: 'Secret Room', password: 'warpcore' }, { memberId: 'user-1' });

      await controller.createRoom(req, mockRes);

      const room = getBody<IGameRoom<string>>();
      expect(room.password).toBe('warpcore');
    });
  });

  describe('creator ID resolution', () => {
    it('uses req.user.memberId when present', async () => {
      const { mockRes, getBody } = createMockRes();
      const req = createMockReq({ name: 'Room A' }, { memberId: 'member-123', id: 'fallback-id' });

      await controller.createRoom(req, mockRes);

      const room = getBody<IGameRoom<string>>();
      expect(room.whitePlayerId).toBe('member-123');
    });

    it('falls back to req.user.id when memberId is absent', async () => {
      const { mockRes, getBody } = createMockRes();
      const req = createMockReq({ name: 'Room B' }, { id: 'id-456' });

      await controller.createRoom(req, mockRes);

      const room = getBody<IGameRoom<string>>();
      expect(room.whitePlayerId).toBe('id-456');
    });

    it('falls back to "anonymous" when req.user is absent', async () => {
      const { mockRes, getBody } = createMockRes();
      const req = createMockReq({ name: 'Room C' });

      await controller.createRoom(req, mockRes);

      const room = getBody<IGameRoom<string>>();
      expect(room.whitePlayerId).toBe('anonymous');
    });
  });

  describe('validation', () => {
    it('returns 400 when name is missing', async () => {
      const { mockRes, getStatus } = createMockRes();
      const req = createMockReq({}, { memberId: 'user-1' });

      await controller.createRoom(req, mockRes);

      expect(getStatus()).toBe(400);
    });

    it('returns 400 when name is empty string', async () => {
      const { mockRes, getStatus } = createMockRes();
      const req = createMockReq({ name: '' }, { memberId: 'user-1' });

      await controller.createRoom(req, mockRes);

      expect(getStatus()).toBe(400);
    });

    it('returns 400 when name is whitespace only', async () => {
      const { mockRes, getStatus } = createMockRes();
      const req = createMockReq({ name: '   ' }, { memberId: 'user-1' });

      await controller.createRoom(req, mockRes);

      expect(getStatus()).toBe(400);
    });

    it('returns an error message body on 400', async () => {
      const { mockRes, getBody } = createMockRes();
      const req = createMockReq({}, { memberId: 'user-1' });

      await controller.createRoom(req, mockRes);

      const body = getBody<{ error: string }>();
      expect(body.error).toBeTruthy();
    });
  });
});
