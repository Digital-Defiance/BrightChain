/**
 * Unit tests for FriendsController (createFriendsRouter).
 *
 * Tests:
 * - Each endpoint returns correct response shape
 * - Error code to HTTP status mapping (mock FriendsService throws FriendsServiceError)
 * - Unauthenticated requests return 401
 *
 * Uses lightweight mock Request/Response objects — no supertest.
 *
 * Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.5
 */

import {
  FriendRequestStatus,
  FriendshipStatus,
  FriendsErrorCode,
  FriendsServiceError,
  type IFriendsService,
} from '@brightchain/brightchain-lib';
import { createFriendsRouter } from '../controllers/friends-controller';
import express, { Express } from 'express';
import request from 'supertest';

// ── Mock FriendsService ────────────────────────────────────────────────

function createMockFriendsService(): jest.Mocked<IFriendsService> {
  return {
    sendFriendRequest: jest.fn(),
    acceptFriendRequest: jest.fn(),
    rejectFriendRequest: jest.fn(),
    cancelFriendRequest: jest.fn(),
    removeFriend: jest.fn(),
    getFriends: jest.fn(),
    getReceivedFriendRequests: jest.fn(),
    getSentFriendRequests: jest.fn(),
    getFriendshipStatus: jest.fn(),
    areFriends: jest.fn(),
    getMutualFriends: jest.fn(),
    onUserBlocked: jest.fn(),
  };
}

// ── Test app factory ───────────────────────────────────────────────────

function createTestApp(
  mockService: jest.Mocked<IFriendsService>,
  authenticated = true,
  userId = 'user-001',
): Express {
  const app = express();
  app.use(express.json());

  // Simulate JWT middleware
  if (authenticated) {
    app.use((req, _res, next) => {
      (req as any).user = { id: userId };
      next();
    });
  }

  app.use('/friends', createFriendsRouter(mockService));
  return app;
}

// ── Constants ──────────────────────────────────────────────────────────

const USER_ID = 'user-001';
const OTHER_USER_ID = 'user-002';
const REQUEST_ID = 'req-001';

const MOCK_FRIENDSHIP = {
  _id: 'friendship-001',
  memberIdA: USER_ID,
  memberIdB: OTHER_USER_ID,
  createdAt: '2024-01-01T00:00:00.000Z',
};

const MOCK_FRIEND_REQUEST = {
  _id: REQUEST_ID,
  requesterId: USER_ID,
  recipientId: OTHER_USER_ID,
  status: FriendRequestStatus.Pending,
  createdAt: '2024-01-01T00:00:00.000Z',
};

// ── Tests ──────────────────────────────────────────────────────────────

describe('Feature: brightchain-friends-system, FriendsController', () => {
  let mockService: jest.Mocked<IFriendsService>;

  beforeEach(() => {
    mockService = createMockFriendsService();
  });

  // ── Unauthenticated requests → 401 ──────────────────────────────

  describe('Unauthenticated requests', () => {
    it('POST /friends/requests returns 401 without auth', async () => {
      const app = createTestApp(mockService, false);
      const res = await request(app)
        .post('/friends/requests')
        .send({ recipientId: OTHER_USER_ID });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /friends returns 401 without auth', async () => {
      const app = createTestApp(mockService, false);
      const res = await request(app).get('/friends');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('DELETE /friends/:friendId returns 401 without auth', async () => {
      const app = createTestApp(mockService, false);
      const res = await request(app).delete(`/friends/${OTHER_USER_ID}`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /friends/status/:userId returns 401 without auth', async () => {
      const app = createTestApp(mockService, false);
      const res = await request(app).get(`/friends/status/${OTHER_USER_ID}`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ── POST /friends/requests — send friend request ─────────────────

  describe('POST /friends/requests', () => {
    it('returns 201 with friendRequest on success', async () => {
      mockService.sendFriendRequest.mockResolvedValue({
        success: true,
        friendRequest: MOCK_FRIEND_REQUEST,
      });
      const app = createTestApp(mockService);
      const res = await request(app)
        .post('/friends/requests')
        .send({ recipientId: OTHER_USER_ID });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.friendRequest).toBeDefined();
      expect(res.body.friendRequest._id).toBe(REQUEST_ID);
    });

    it('returns 201 with friendship on auto-accept', async () => {
      mockService.sendFriendRequest.mockResolvedValue({
        success: true,
        autoAccepted: true,
        friendship: MOCK_FRIENDSHIP,
        friendRequest: {
          ...MOCK_FRIEND_REQUEST,
          status: FriendRequestStatus.Accepted,
        },
      });
      const app = createTestApp(mockService);
      const res = await request(app)
        .post('/friends/requests')
        .send({ recipientId: OTHER_USER_ID });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.friendship).toBeDefined();
    });

    it('returns 400 when missing recipientId', async () => {
      const app = createTestApp(mockService);
      const res = await request(app).post('/friends/requests').send({});
      expect(res.status).toBe(400);
    });
  });

  // ── POST /friends/requests/:requestId/accept ─────────────────────

  describe('POST /friends/requests/:requestId/accept', () => {
    it('returns 200 on success', async () => {
      mockService.acceptFriendRequest.mockResolvedValue(undefined);
      const app = createTestApp(mockService);
      const res = await request(app).post(
        `/friends/requests/${REQUEST_ID}/accept`,
      );
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockService.acceptFriendRequest).toHaveBeenCalledWith(
        USER_ID,
        REQUEST_ID,
      );
    });
  });

  // ── POST /friends/requests/:requestId/reject ─────────────────────

  describe('POST /friends/requests/:requestId/reject', () => {
    it('returns 200 on success', async () => {
      mockService.rejectFriendRequest.mockResolvedValue(undefined);
      const app = createTestApp(mockService);
      const res = await request(app).post(
        `/friends/requests/${REQUEST_ID}/reject`,
      );
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockService.rejectFriendRequest).toHaveBeenCalledWith(
        USER_ID,
        REQUEST_ID,
      );
    });
  });

  // ── POST /friends/requests/:requestId/cancel ─────────────────────

  describe('POST /friends/requests/:requestId/cancel', () => {
    it('returns 200 on success', async () => {
      mockService.cancelFriendRequest.mockResolvedValue(undefined);
      const app = createTestApp(mockService);
      const res = await request(app).post(
        `/friends/requests/${REQUEST_ID}/cancel`,
      );
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockService.cancelFriendRequest).toHaveBeenCalledWith(
        USER_ID,
        REQUEST_ID,
      );
    });
  });

  // ── DELETE /friends/:friendId ────────────────────────────────────

  describe('DELETE /friends/:friendId', () => {
    it('returns 200 on success', async () => {
      mockService.removeFriend.mockResolvedValue(undefined);
      const app = createTestApp(mockService);
      const res = await request(app).delete(`/friends/${OTHER_USER_ID}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockService.removeFriend).toHaveBeenCalledWith(
        USER_ID,
        OTHER_USER_ID,
      );
    });
  });

  // ── GET /friends — list friends ──────────────────────────────────

  describe('GET /friends', () => {
    it('returns 200 with friends list', async () => {
      mockService.getFriends.mockResolvedValue({
        items: [MOCK_FRIENDSHIP],
        hasMore: false,
        totalCount: 1,
      });
      const app = createTestApp(mockService);
      const res = await request(app).get('/friends');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.hasMore).toBe(false);
      expect(res.body.totalCount).toBe(1);
    });
  });

  // ── GET /friends/requests/received ───────────────────────────────

  describe('GET /friends/requests/received', () => {
    it('returns 200 with received requests', async () => {
      mockService.getReceivedFriendRequests.mockResolvedValue({
        items: [MOCK_FRIEND_REQUEST],
        hasMore: false,
      });
      const app = createTestApp(mockService);
      const res = await request(app).get('/friends/requests/received');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.hasMore).toBe(false);
    });
  });

  // ── GET /friends/requests/sent ───────────────────────────────────

  describe('GET /friends/requests/sent', () => {
    it('returns 200 with sent requests', async () => {
      mockService.getSentFriendRequests.mockResolvedValue({
        items: [MOCK_FRIEND_REQUEST],
        hasMore: false,
      });
      const app = createTestApp(mockService);
      const res = await request(app).get('/friends/requests/sent');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.items).toHaveLength(1);
    });
  });

  // ── GET /friends/status/:userId ──────────────────────────────────

  describe('GET /friends/status/:userId', () => {
    it('returns 200 with friendship status', async () => {
      mockService.getFriendshipStatus.mockResolvedValue(
        FriendshipStatus.Friends,
      );
      const app = createTestApp(mockService);
      const res = await request(app).get(`/friends/status/${OTHER_USER_ID}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe(FriendshipStatus.Friends);
    });
  });

  // ── GET /friends/mutual/:userId ──────────────────────────────────

  describe('GET /friends/mutual/:userId', () => {
    it('returns 200 with mutual friends', async () => {
      mockService.getMutualFriends.mockResolvedValue({
        items: [MOCK_FRIENDSHIP],
        hasMore: false,
        totalCount: 1,
      });
      const app = createTestApp(mockService);
      const res = await request(app).get(`/friends/mutual/${OTHER_USER_ID}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.totalCount).toBe(1);
    });
  });

  // ── Error code → HTTP status mapping ─────────────────────────────

  describe('Error code to HTTP status mapping', () => {
    const errorMappings: Array<{
      code: FriendsErrorCode;
      expectedStatus: number;
    }> = [
      { code: FriendsErrorCode.SelfRequestNotAllowed, expectedStatus: 400 },
      { code: FriendsErrorCode.AlreadyFriends, expectedStatus: 409 },
      { code: FriendsErrorCode.RequestAlreadyExists, expectedStatus: 409 },
      { code: FriendsErrorCode.RequestNotFound, expectedStatus: 404 },
      { code: FriendsErrorCode.NotFriends, expectedStatus: 404 },
      { code: FriendsErrorCode.UserBlocked, expectedStatus: 403 },
      { code: FriendsErrorCode.Unauthorized, expectedStatus: 403 },
    ];

    it.each(errorMappings)(
      'maps $code to HTTP $expectedStatus',
      async ({ code, expectedStatus }) => {
        mockService.sendFriendRequest.mockRejectedValue(
          new FriendsServiceError(code),
        );
        const app = createTestApp(mockService);
        const res = await request(app)
          .post('/friends/requests')
          .send({ recipientId: OTHER_USER_ID });
        expect(res.status).toBe(expectedStatus);
        expect(res.body.success).toBe(false);
      },
    );

    it('maps NOT_FRIENDS error on DELETE to 404', async () => {
      mockService.removeFriend.mockRejectedValue(
        new FriendsServiceError(FriendsErrorCode.NotFriends),
      );
      const app = createTestApp(mockService);
      const res = await request(app).delete(`/friends/${OTHER_USER_ID}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('maps REQUEST_NOT_FOUND error on accept to 404', async () => {
      mockService.acceptFriendRequest.mockRejectedValue(
        new FriendsServiceError(FriendsErrorCode.RequestNotFound),
      );
      const app = createTestApp(mockService);
      const res = await request(app).post(
        `/friends/requests/${REQUEST_ID}/accept`,
      );
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('maps UNAUTHORIZED error on reject to 403', async () => {
      mockService.rejectFriendRequest.mockRejectedValue(
        new FriendsServiceError(FriendsErrorCode.Unauthorized),
      );
      const app = createTestApp(mockService);
      const res = await request(app).post(
        `/friends/requests/${REQUEST_ID}/reject`,
      );
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
