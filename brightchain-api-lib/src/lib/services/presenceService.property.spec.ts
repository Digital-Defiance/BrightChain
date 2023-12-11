/**
 * Property tests for PresenceService.
 *
 * Feature: communication-api-controllers, Property 20: Presence broadcast scope
 * Validates: Requirements 7.3
 *
 * Property 20: For any Member whose presence status changes, the status
 * change event SHALL be delivered only to Members who share at least one
 * Conversation, Group, or Channel with them.
 */

import { PresenceStatus } from '@brightchain/brightchain-lib';
import * as fc from 'fast-check';
import { WebSocket } from 'ws';
import { PresenceService, SharedContextResolver } from './presenceService';

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

// --- arbitraries ---

const arbMemberId = fc.uuid();
const arbStatus = fc.constantFrom(...Object.values(PresenceStatus));

describe('PresenceService – Property 20: Presence broadcast scope', () => {
  /**
   * **Validates: Requirements 7.3**
   *
   * When a member's status changes, only members who share a context
   * receive the broadcast. Non-shared members receive nothing.
   */
  it('presence change is delivered only to shared-context members', () => {
    fc.assert(
      fc.property(
        arbMemberId,
        fc.array(arbMemberId, { minLength: 1, maxLength: 5 }),
        fc.array(arbMemberId, { minLength: 0, maxLength: 5 }),
        arbStatus,
        (changingMember, sharedArr, nonSharedArr, newStatus) => {
          // Ensure no overlap and exclude changingMember
          const sharedSet = new Set<string>(
            sharedArr.filter((m: string) => m !== changingMember),
          );
          const nonSharedFiltered = nonSharedArr.filter(
            (m: string) => m !== changingMember && !sharedSet.has(m),
          );
          const nonSharedSet = new Set<string>(nonSharedFiltered);

          if (sharedSet.size === 0) return true; // need at least one shared

          const resolver: SharedContextResolver = (memberId: string) => {
            if (memberId === changingMember) return new Set(sharedSet);
            return new Set<string>();
          };

          const svc = new PresenceService(resolver);

          // Connect shared members
          const sharedWs = new Map<string, jest.Mocked<WebSocket>>();
          for (const m of sharedSet) {
            const ws = createMockWs();
            sharedWs.set(m, ws);
            svc.onConnect(m, ws);
          }

          // Connect non-shared members
          const nonSharedWs = new Map<string, jest.Mocked<WebSocket>>();
          for (const m of nonSharedSet) {
            const ws = createMockWs();
            nonSharedWs.set(m, ws);
            svc.onConnect(m, ws);
          }

          // Connect the changing member and clear initial sends
          const changingWs = createMockWs();
          svc.onConnect(changingMember, changingWs);
          for (const ws of sharedWs.values()) {
            (ws.send as jest.Mock).mockClear();
          }
          for (const ws of nonSharedWs.values()) {
            (ws.send as jest.Mock).mockClear();
          }
          (changingWs.send as jest.Mock).mockClear();

          // Trigger a status change
          svc.setStatus(changingMember, newStatus);

          // Non-shared members must NOT receive any presence change
          for (const ws of nonSharedWs.values()) {
            const calls = (ws.send as jest.Mock).mock.calls;
            for (const [payload] of calls) {
              const parsed = JSON.parse(payload as string);
              expect(parsed.type).not.toBe('communication:presence_changed');
            }
          }

          // The changing member should NOT receive their own broadcast
          const changingCalls = (changingWs.send as jest.Mock).mock.calls;
          for (const [payload] of changingCalls) {
            const parsed = JSON.parse(payload as string);
            if (parsed.type === 'communication:presence_changed') {
              expect(parsed.data.memberId).not.toBe(changingMember);
            }
          }

          return true;
        },
      ),
      { numRuns: 200 },
    );
  });

  /**
   * **Validates: Requirements 7.3**
   *
   * Setting the same status twice does not produce a duplicate broadcast.
   */
  it('duplicate status set does not broadcast again', () => {
    fc.assert(
      fc.property(
        arbMemberId,
        arbMemberId,
        arbStatus,
        (changingMember, sharedMember, status) => {
          fc.pre(changingMember !== sharedMember);

          const resolver: SharedContextResolver = (memberId: string) => {
            if (memberId === changingMember) {
              return new Set([sharedMember]);
            }
            return new Set<string>();
          };

          const svc = new PresenceService(resolver);

          const sharedWs = createMockWs();
          svc.onConnect(sharedMember, sharedWs);

          const changingWs = createMockWs();
          svc.onConnect(changingMember, changingWs);

          // Clear initial sends
          (sharedWs.send as jest.Mock).mockClear();

          // Set status once
          svc.setStatus(changingMember, status);
          const countAfterFirst = (
            sharedWs.send as jest.Mock
          ).mock.calls.filter((c: string[]) => {
            const p = JSON.parse(c[0]);
            return p.type === 'communication:presence_changed';
          }).length;

          // Set same status again
          svc.setStatus(changingMember, status);
          const countAfterSecond = (
            sharedWs.send as jest.Mock
          ).mock.calls.filter((c: string[]) => {
            const p = JSON.parse(c[0]);
            return p.type === 'communication:presence_changed';
          }).length;

          // No additional broadcast for the duplicate set
          return countAfterSecond === countAfterFirst;
        },
      ),
      { numRuns: 200 },
    );
  });
});
