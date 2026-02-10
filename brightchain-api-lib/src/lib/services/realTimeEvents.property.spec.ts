/**
 * Property tests for real-time message event delivery.
 *
 * Feature: communication-api-controllers, Property 18: Real-time message event delivery
 * Validates: Requirements 7.1
 *
 * Property 18: For any message sent to a Conversation, Group, or Channel,
 * all other members with active WebSocket connections SHALL receive a message
 * event containing the message ID and context ID.
 */

import {
  ChannelVisibility,
  CommunicationEventType,
} from '@brightchain/brightchain-lib';
import { ChannelService } from '@brightchain/brightchain-lib/lib/services/communication/channelService';
import { ConversationService } from '@brightchain/brightchain-lib/lib/services/communication/conversationService';
import { GroupService } from '@brightchain/brightchain-lib/lib/services/communication/groupService';
import { PermissionService } from '@brightchain/brightchain-lib/lib/services/communication/permissionService';
import * as fc from 'fast-check';
import { WebSocket } from 'ws';
import { EventNotificationSystem } from './eventNotificationSystem';

// --- helpers ---

/** Create a mock WebSocket in OPEN state */
function createMockWs(): jest.Mocked<WebSocket> {
  return {
    readyState: 1, // WebSocket.OPEN
    send: jest.fn(),
    on: jest.fn(),
    close: jest.fn(),
  } as unknown as jest.Mocked<WebSocket>;
}

/** Extract parsed events from a mock WebSocket's send calls */
function extractEvents(
  ws: jest.Mocked<WebSocket>,
): Array<{ type: string; contextId: string; data: { messageId: string } }> {
  return (ws.send as jest.Mock).mock.calls
    .map(([payload]: [string]) => {
      try {
        return JSON.parse(payload);
      } catch {
        return null;
      }
    })
    .filter(
      (e: { type: string } | null) =>
        e !== null && e.type === CommunicationEventType.MESSAGE_SENT,
    );
}

// --- arbitraries ---

const arbMemberId = fc.uuid();
const arbMessageContent = fc.string({ minLength: 1, maxLength: 100 });

describe('Real-time events – Property 18: Real-time message event delivery', () => {
  /**
   * **Validates: Requirements 7.1**
   *
   * When a message is sent to a conversation, all subscribed members
   * receive a MESSAGE_SENT event with the correct messageId and contextId.
   */
  it('conversation: all subscribed members receive message event', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMemberId,
        arbMemberId,
        arbMessageContent,
        async (senderIdRaw, recipientIdRaw, content) => {
          // Ensure distinct members
          const senderId = `sender-${senderIdRaw}`;
          const recipientId = `recipient-${recipientIdRaw}`;
          fc.pre(senderId !== recipientId);

          const eventSystem = new EventNotificationSystem();
          const service = new ConversationService(null, eventSystem);
          service.registerMember(senderId);
          service.registerMember(recipientId);

          // Subscribe both members' WebSockets
          const senderWs = createMockWs();
          const recipientWs = createMockWs();
          eventSystem.subscribe(senderWs);
          eventSystem.subscribe(recipientWs);

          // Send message
          const msg = await service.sendMessage(senderId, recipientId, content);

          // Both subscribers should receive the event
          const senderEvents = extractEvents(senderWs);
          const recipientEvents = extractEvents(recipientWs);

          // At least one MESSAGE_SENT event per subscriber
          expect(senderEvents.length).toBeGreaterThanOrEqual(1);
          expect(recipientEvents.length).toBeGreaterThanOrEqual(1);

          // Event contains correct messageId and contextId
          const senderEvt = senderEvents[0];
          expect(senderEvt.data.messageId).toBe(msg.id);
          expect(senderEvt.contextId).toBe(msg.contextId);

          const recipientEvt = recipientEvents[0];
          expect(recipientEvt.data.messageId).toBe(msg.id);
          expect(recipientEvt.contextId).toBe(msg.contextId);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 7.1**
   *
   * When a message is sent to a group, all subscribed members
   * receive a MESSAGE_SENT event with the correct messageId and contextId.
   */
  it('group: all subscribed members receive message event', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMemberId,
        fc.array(arbMemberId, { minLength: 1, maxLength: 4 }),
        arbMessageContent,
        async (creatorIdRaw, otherIdsRaw, content) => {
          const creatorId = `creator-${creatorIdRaw}`;
          const otherIds = otherIdsRaw.map(
            (id: string, i: number) => `member-${i}-${id}`,
          );
          const allIds = [creatorId, ...otherIds];

          // Ensure all unique
          fc.pre(new Set(allIds).size === allIds.length);

          const eventSystem = new EventNotificationSystem();
          const permissionService = new PermissionService();
          const groupService = new GroupService(
            permissionService,
            undefined,
            undefined,
            eventSystem,
          );

          // Subscribe WebSockets for all members
          const wsByMember = new Map<string, jest.Mocked<WebSocket>>();
          for (const id of allIds) {
            const ws = createMockWs();
            eventSystem.subscribe(ws);
            wsByMember.set(id, ws);
          }

          const group = await groupService.createGroup(
            'test-group',
            creatorId,
            otherIds,
          );

          // Clear events from group creation
          for (const ws of wsByMember.values()) {
            (ws.send as jest.Mock).mockClear();
          }

          const msg = await groupService.sendMessage(
            group.id,
            creatorId,
            content,
          );

          // All members should receive the event
          for (const [, ws] of wsByMember) {
            const events = extractEvents(ws);
            expect(events.length).toBeGreaterThanOrEqual(1);
            expect(events[0].data.messageId).toBe(msg.id);
            expect(events[0].contextId).toBe(group.id);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 7.1**
   *
   * When a message is sent to a channel, all subscribed members
   * receive a MESSAGE_SENT event with the correct messageId and contextId.
   */
  it('channel: all subscribed members receive message event', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMemberId,
        fc.array(arbMemberId, { minLength: 1, maxLength: 4 }),
        arbMessageContent,
        async (creatorIdRaw, joinerIdsRaw, content) => {
          const creatorId = `creator-${creatorIdRaw}`;
          const joinerIds = joinerIdsRaw.map(
            (id: string, i: number) => `joiner-${i}-${id}`,
          );
          const allIds = [creatorId, ...joinerIds];

          fc.pre(new Set(allIds).size === allIds.length);

          const eventSystem = new EventNotificationSystem();
          const permissionService = new PermissionService();
          const channelService = new ChannelService(
            permissionService,
            undefined,
            undefined,
            eventSystem,
          );

          // Subscribe WebSockets for all members
          const wsByMember = new Map<string, jest.Mocked<WebSocket>>();
          for (const id of allIds) {
            const ws = createMockWs();
            eventSystem.subscribe(ws);
            wsByMember.set(id, ws);
          }

          const channel = await channelService.createChannel(
            `ch-${creatorId.slice(0, 8)}`,
            creatorId,
            ChannelVisibility.PUBLIC,
          );

          // Join other members
          for (const joinerId of joinerIds) {
            await channelService.joinChannel(channel.id, joinerId);
          }

          // Clear events from creation/join
          for (const ws of wsByMember.values()) {
            (ws.send as jest.Mock).mockClear();
          }

          const msg = await channelService.sendMessage(
            channel.id,
            creatorId,
            content,
          );

          // All members should receive the event
          for (const [, ws] of wsByMember) {
            const events = extractEvents(ws);
            expect(events.length).toBeGreaterThanOrEqual(1);
            expect(events[0].data.messageId).toBe(msg.id);
            expect(events[0].contextId).toBe(channel.id);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
