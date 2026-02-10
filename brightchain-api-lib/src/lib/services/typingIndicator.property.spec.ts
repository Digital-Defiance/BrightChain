/**
 * Property tests for typing indicator broadcast scope.
 *
 * Feature: communication-api-controllers, Property 19: Typing indicator broadcast scope
 * Validates: Requirements 7.2
 *
 * Property 19: For any typing event in a Conversation, Group, or Channel,
 * the typing indicator SHALL be delivered to all other participants with
 * active WebSocket connections, and SHALL NOT be delivered to non-participants.
 */

import {
  CommunicationContextType,
  CommunicationEventType,
} from '@brightchain/brightchain-lib';
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

/** Create a mock WebSocket in CLOSED state */
function createClosedWs(): jest.Mocked<WebSocket> {
  return {
    readyState: 3, // WebSocket.CLOSED
    send: jest.fn(),
    on: jest.fn(),
    close: jest.fn(),
  } as unknown as jest.Mocked<WebSocket>;
}

/** Extract typing events from a mock WebSocket's send calls */
function extractTypingEvents(ws: jest.Mocked<WebSocket>): Array<{
  type: string;
  contextType: string;
  contextId: string;
  data: { memberId: string };
}> {
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
        e !== null &&
        (e.type === CommunicationEventType.TYPING_START ||
          e.type === CommunicationEventType.TYPING_STOP),
    );
}

// --- arbitraries ---

const arbMemberId = fc.uuid();
const arbContextId = fc.uuid();
const arbContextType = fc.constantFrom<CommunicationContextType>(
  'conversation',
  'group',
  'channel',
);
const arbTypingType = fc.constantFrom(
  CommunicationEventType.TYPING_START,
  CommunicationEventType.TYPING_STOP,
);

describe('Typing indicator – Property 19: Typing indicator broadcast scope', () => {
  /**
   * **Validates: Requirements 7.2**
   *
   * All subscribed (participant) WebSockets receive the typing event,
   * and non-subscribed (non-participant) WebSockets do not.
   */
  it('typing event is delivered to all subscribers and not to non-subscribers', () => {
    fc.assert(
      fc.property(
        arbMemberId,
        arbContextType,
        arbContextId,
        arbTypingType,
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 0, max: 5 }),
        (
          memberId,
          contextType,
          contextId,
          typingType,
          subCount,
          nonSubCount,
        ) => {
          const eventSystem = new EventNotificationSystem();

          // Create subscribed (participant) WebSockets
          const subscribedWs: jest.Mocked<WebSocket>[] = [];
          for (let i = 0; i < subCount; i++) {
            const ws = createMockWs();
            eventSystem.subscribe(ws);
            subscribedWs.push(ws);
          }

          // Create non-subscribed (non-participant) WebSockets
          const nonSubscribedWs: jest.Mocked<WebSocket>[] = [];
          for (let i = 0; i < nonSubCount; i++) {
            nonSubscribedWs.push(createMockWs());
          }

          // Emit typing event
          eventSystem.emitTypingEvent(
            typingType,
            contextType,
            contextId,
            memberId,
          );

          // All subscribed WebSockets should receive the typing event
          for (const ws of subscribedWs) {
            const events = extractTypingEvents(ws);
            expect(events.length).toBe(1);
            expect(events[0].type).toBe(typingType);
            expect(events[0].contextType).toBe(contextType);
            expect(events[0].contextId).toBe(contextId);
            expect(events[0].data.memberId).toBe(memberId);
          }

          // Non-subscribed WebSockets should NOT receive any events
          for (const ws of nonSubscribedWs) {
            expect((ws.send as jest.Mock).mock.calls.length).toBe(0);
          }

          return true;
        },
      ),
      { numRuns: 200 },
    );
  });

  /**
   * **Validates: Requirements 7.2**
   *
   * Closed WebSocket connections do not receive typing events.
   */
  it('typing event is not delivered to closed WebSocket connections', () => {
    fc.assert(
      fc.property(
        arbMemberId,
        arbContextType,
        arbContextId,
        arbTypingType,
        (memberId, contextType, contextId, typingType) => {
          const eventSystem = new EventNotificationSystem();

          // Subscribe a closed WebSocket
          const closedWs = createClosedWs();
          eventSystem.subscribe(closedWs);

          // Also subscribe an open one for comparison
          const openWs = createMockWs();
          eventSystem.subscribe(openWs);

          // Emit typing event
          eventSystem.emitTypingEvent(
            typingType,
            contextType,
            contextId,
            memberId,
          );

          // Closed WebSocket should NOT receive the event
          expect((closedWs.send as jest.Mock).mock.calls.length).toBe(0);

          // Open WebSocket should receive the event
          const events = extractTypingEvents(openWs);
          expect(events.length).toBe(1);

          return true;
        },
      ),
      { numRuns: 200 },
    );
  });
});
