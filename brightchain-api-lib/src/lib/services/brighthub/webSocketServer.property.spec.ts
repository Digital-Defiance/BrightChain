/**
 * Property-based tests for BrightHubWebSocketHandler.
 *
 * Tests the following property:
 * - Property 47: Real-Time Message Delivery
 *
 * Validates: Requirements 49.1
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import fc from 'fast-check';
import {
  BrightHubWebSocketHandler,
  conversationRoom,
  notificationRoom,
} from './webSocketServer';

// ═══════════════════════════════════════════════════════
// Mock infrastructure
// ═══════════════════════════════════════════════════════

interface BroadcastCall {
  room: string;
  payload: unknown;
}

interface SendCall {
  memberId: string;
  payload: unknown;
}

function createMockBridge() {
  const rooms = new Map<unknown, Set<string>>();
  const broadcasts: BroadcastCall[] = [];
  const broadcastsExcept: (BroadcastCall & { excludeWs: unknown })[] = [];
  const memberSends: SendCall[] = [];
  const handlers = new Map<
    string,
    (ws: unknown, session: any, message: unknown) => void
  >();
  const onlineMembers = new Set<string>();

  return {
    rooms,
    broadcasts,
    broadcastsExcept,
    memberSends,
    handlers,
    onlineMembers,
    joinRoom(ws: unknown, room: string) {
      if (!rooms.has(ws)) rooms.set(ws, new Set());
      rooms.get(ws)!.add(room);
    },
    leaveRoom(ws: unknown, room: string) {
      rooms.get(ws)?.delete(room);
    },
    broadcastToRoom(room: string, payload: unknown) {
      broadcasts.push({ room, payload });
    },
    broadcastToRoomExcept(room: string, payload: unknown, excludeWs: unknown) {
      broadcastsExcept.push({ room, payload, excludeWs });
    },
    sendToMember(memberId: string, payload: unknown) {
      memberSends.push({ memberId, payload });
    },
    isMemberOnline(memberId: string) {
      return onlineMembers.has(memberId);
    },
    registerMessageHandler(
      messageType: string,
      handler: (ws: unknown, session: any, message: unknown) => void,
    ) {
      handlers.set(messageType, handler);
    },
  };
}

function createMockDeps() {
  const sentMessages: any[] = [];
  const readMarks: { conversationId: string; userId: string }[] = [];
  const participants = new Map<string, Set<string>>();

  return {
    sentMessages,
    readMarks,
    participants,
    async sendMessage(
      conversationId: string,
      senderId: string,
      content: string,
      options?: any,
    ) {
      const msg = {
        _id: `msg-${Date.now()}-${Math.random()}`,
        conversationId,
        senderId,
        content,
        formattedContent: content,
        attachments: [] as any[],
        isEdited: false,
        isDeleted: false,
        options,
        createdAt: new Date().toISOString(),
      };
      sentMessages.push(msg);
      return msg;
    },
    async markAsRead(conversationId: string, userId: string) {
      readMarks.push({ conversationId, userId });
    },
    async isParticipant(conversationId: string, userId: string) {
      return participants.get(conversationId)?.has(userId) ?? false;
    },
  };
}

// ═══════════════════════════════════════════════════════
// Property Tests
// ═══════════════════════════════════════════════════════

describe('Feature: brighthub-social-network, WebSocket Property Tests', () => {
  // --- Smart Generators ---
  const userIdArb = fc.uuid();
  const conversationIdArb = fc.uuid();
  const validContentArb = fc
    .string({ minLength: 1, maxLength: 200 })
    .filter((s) => s.trim().length > 0);

  describe('Property 47: Real-Time Message Delivery', () => {
    /**
     * Property 47: Real-Time Message Delivery
     *
     * WHEN a user sends a message via WebSocket,
     * THE message SHALL be broadcast to the conversation room
     * so all subscribed participants receive it in real time.
     *
     * **Validates: Requirements 49.1**
     */
    it('should broadcast new messages to the conversation room', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          conversationIdArb,
          validContentArb,
          async (senderId, conversationId, content) => {
            const bridge = createMockBridge();
            const deps = createMockDeps();
            deps.participants.set(conversationId, new Set([senderId]));

            const _handler = new BrightHubWebSocketHandler(bridge, deps);

            const ws = { id: 'ws-1' };
            const session = { memberContext: { memberId: senderId } };

            // Invoke the registered handler for message:send
            const sendHandler = bridge.handlers.get('brighthub:message:send');
            expect(sendHandler).toBeDefined();

            await sendHandler!(ws, session, { conversationId, content });

            // Verify message was sent via deps
            expect(deps.sentMessages).toHaveLength(1);
            expect(deps.sentMessages[0].conversationId).toBe(conversationId);
            expect(deps.sentMessages[0].senderId).toBe(senderId);
            expect(deps.sentMessages[0].content).toBe(content);

            // Verify broadcast to conversation room
            expect(bridge.broadcasts).toHaveLength(1);
            expect(bridge.broadcasts[0].room).toBe(
              conversationRoom(conversationId),
            );
            const payload = bridge.broadcasts[0].payload as any;
            expect(payload.type).toBe('message:new');
            expect(payload.message.conversationId).toBe(conversationId);

            return true;
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should broadcast typing indicators to room excluding sender', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          conversationIdArb,
          async (senderId, conversationId) => {
            const bridge = createMockBridge();
            const deps = createMockDeps();
            const _handler = new BrightHubWebSocketHandler(bridge, deps);

            const ws = { id: 'ws-typing' };
            const session = { memberContext: { memberId: senderId } };

            const typingHandler = bridge.handlers.get(
              'brighthub:message:typing',
            );
            expect(typingHandler).toBeDefined();

            typingHandler!(ws, session, { conversationId });

            // Typing should broadcast to room EXCEPT sender
            expect(bridge.broadcastsExcept).toHaveLength(1);
            expect(bridge.broadcastsExcept[0].room).toBe(
              conversationRoom(conversationId),
            );
            expect(bridge.broadcastsExcept[0].excludeWs).toBe(ws);
            const payload = bridge.broadcastsExcept[0].payload as any;
            expect(payload.type).toBe('conversation:typing');
            expect(payload.userId).toBe(senderId);

            return true;
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should broadcast read receipts to conversation room', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          conversationIdArb,
          async (userId, conversationId) => {
            const bridge = createMockBridge();
            const deps = createMockDeps();
            const _handler = new BrightHubWebSocketHandler(bridge, deps);

            const ws = { id: 'ws-read' };
            const session = { memberContext: { memberId: userId } };

            const readHandler = bridge.handlers.get('brighthub:message:read');
            expect(readHandler).toBeDefined();

            await readHandler!(ws, session, { conversationId });

            // Verify markAsRead was called
            expect(deps.readMarks).toHaveLength(1);
            expect(deps.readMarks[0].conversationId).toBe(conversationId);
            expect(deps.readMarks[0].userId).toBe(userId);

            // Verify broadcast
            expect(bridge.broadcasts).toHaveLength(1);
            const payload = bridge.broadcasts[0].payload as any;
            expect(payload.type).toBe('conversation:read');
            expect(payload.userId).toBe(userId);

            return true;
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should only allow participants to subscribe to conversation rooms', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          conversationIdArb,
          async (participantId, nonParticipantId, conversationId) => {
            if (participantId === nonParticipantId) return true;

            const bridge = createMockBridge();
            const deps = createMockDeps();
            deps.participants.set(conversationId, new Set([participantId]));

            const _handler = new BrightHubWebSocketHandler(bridge, deps);
            const subHandler = bridge.handlers.get('brighthub:subscribe');
            expect(subHandler).toBeDefined();

            // Participant should be able to join
            const ws1 = {
              id: 'ws-p',
              sent: [] as string[],
              send(d: string) {
                this.sent.push(d);
              },
            };
            await subHandler!(
              ws1,
              { memberContext: { memberId: participantId } },
              { conversationId },
            );
            expect(
              bridge.rooms.get(ws1)?.has(conversationRoom(conversationId)),
            ).toBe(true);

            // Non-participant should be rejected
            const ws2 = {
              id: 'ws-np',
              sent: [] as string[],
              send(d: string) {
                this.sent.push(d);
              },
            };
            await subHandler!(
              ws2,
              { memberContext: { memberId: nonParticipantId } },
              { conversationId },
            );
            expect(bridge.rooms.has(ws2)).toBeFalsy();

            // Non-participant should receive an error
            expect(ws2.sent.length).toBeGreaterThan(0);
            const errPayload = JSON.parse(ws2.sent[0]);
            expect(errPayload.type).toBe('error');

            return true;
          },
        ),
        { numRuns: 15 },
      );
    });

    it('should deliver notifications to specific users via sendToMember', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.uuid(),
          async (recipientId, notificationId) => {
            const bridge = createMockBridge();
            const deps = createMockDeps();
            const handler = new BrightHubWebSocketHandler(bridge, deps);

            const notification = {
              _id: notificationId,
              recipientId,
              type: 'like' as any,
              category: 'social' as any,
              actorId: 'actor-1',
              content: 'liked your post',
              clickThroughUrl: '/posts/1',
              isRead: false,
              createdAt: new Date().toISOString(),
            };

            handler.broadcastNotification(notification);

            expect(bridge.memberSends).toHaveLength(1);
            expect(bridge.memberSends[0].memberId).toBe(recipientId);
            const payload = bridge.memberSends[0].payload as any;
            expect(payload.type).toBe('notification:new');
            expect(payload.notification._id).toBe(notificationId);

            return true;
          },
        ),
        { numRuns: 15 },
      );
    });

    it('should subscribe to notification room when room is "notifications"', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, async (userId) => {
          const bridge = createMockBridge();
          const deps = createMockDeps();
          const _handler = new BrightHubWebSocketHandler(bridge, deps);

          const ws = { id: 'ws-notif' };
          const session = { memberContext: { memberId: userId } };
          const subHandler = bridge.handlers.get('brighthub:subscribe');

          await subHandler!(ws, session, { room: 'notifications' });

          expect(bridge.rooms.get(ws)?.has(notificationRoom(userId))).toBe(
            true,
          );

          return true;
        }),
        { numRuns: 15 },
      );
    });

    it('should reject send when conversationId or content is missing', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, async (senderId) => {
          const bridge = createMockBridge();
          const deps = createMockDeps();
          const _handler = new BrightHubWebSocketHandler(bridge, deps);

          const ws = {
            id: 'ws-err',
            sent: [] as string[],
            send(d: string) {
              this.sent.push(d);
            },
          };
          const session = { memberContext: { memberId: senderId } };
          const sendHandler = bridge.handlers.get('brighthub:message:send');

          // Missing content
          await sendHandler!(ws, session, { conversationId: 'conv-1' });
          expect(ws.sent.length).toBe(1);
          expect(JSON.parse(ws.sent[0]).type).toBe('error');

          // Missing conversationId
          ws.sent = [];
          await sendHandler!(ws, session, { content: 'hello' });
          expect(ws.sent.length).toBe(1);
          expect(JSON.parse(ws.sent[0]).type).toBe('error');

          // No messages should have been sent
          expect(deps.sentMessages).toHaveLength(0);
          expect(bridge.broadcasts).toHaveLength(0);

          return true;
        }),
        { numRuns: 10 },
      );
    });
  });
});
