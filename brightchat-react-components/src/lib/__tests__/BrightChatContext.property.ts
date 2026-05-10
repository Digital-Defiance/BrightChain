/**
 * Property-based tests for BrightChatContext state management.
 *
 * Uses fast-check to verify universal properties across randomly generated inputs.
 * Tests are run via Jest with @testing-library/react for hook rendering.
 */

// ─── Mocks ──────────────────────────────────────────────────────────────────
// BrightChatContext imports PresenceStatus from brightchain-lib, which triggers
// a deep initialization chain (ECIES, blocks, etc.). Mock the module to provide
// only the enum values needed by the context.

const PresenceStatusEnum = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  IDLE: 'idle',
  DO_NOT_DISTURB: 'dnd',
} as const;

jest.mock('@brightchain/brightchain-lib', () => ({
  PresenceStatus: PresenceStatusEnum,
}));

import { act, renderHook } from '@testing-library/react';
import fc from 'fast-check';
import React from 'react';
import { BrightChatProvider, useBrightChat } from '../BrightChatContext';

// ─── Helpers ────────────────────────────────────────────────────────────────

const SIDEBAR_STORAGE_KEY = 'brightchat:sidebarOpen';

/** Wrapper component that provides BrightChatProvider to hooks under test. */
function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(BrightChatProvider, null, children);
}

// ─── Property 1: Sidebar state sessionStorage round-trip ────────────────────

describe('Feature: brightchat-frontend, Property 1: Sidebar state sessionStorage round-trip', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  /**
   * **Validates: Requirements 2.2**
   *
   * For any boolean value, setting sidebar open state via setSidebarOpen
   * and reading from sessionStorage should return the same value.
   */
  it('should persist any boolean sidebar state to sessionStorage and read back the same value', () => {
    fc.assert(
      fc.property(fc.boolean(), (value: boolean) => {
        sessionStorage.clear();

        const { result } = renderHook(() => useBrightChat(), { wrapper });

        act(() => {
          result.current.setSidebarOpen(value);
        });

        // Context state matches
        expect(result.current.sidebarOpen).toBe(value);

        // SessionStorage matches
        const stored = sessionStorage.getItem(SIDEBAR_STORAGE_KEY);
        expect(stored).toBe(String(value));
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 2: Compose state machine transitions ──────────────────────────

describe('Feature: brightchat-frontend, Property 2: Compose state machine transitions', () => {
  /**
   * **Validates: Requirements 2.3**
   *
   * For any sequence of compose operations (open, minimize, close),
   * state should always be 'open', 'minimized', or 'closed' with
   * consistent transitions.
   */
  it('should always produce a valid compose state for any sequence of operations', () => {
    const operationArb = fc.constantFrom(
      'open' as const,
      'minimize' as const,
      'close' as const,
    );

    fc.assert(
      fc.property(
        fc.array(operationArb, { minLength: 1, maxLength: 50 }),
        (operations) => {
          const { result } = renderHook(() => useBrightChat(), { wrapper });

          for (const op of operations) {
            act(() => {
              switch (op) {
                case 'open':
                  result.current.openCompose();
                  break;
                case 'minimize':
                  result.current.minimizeCompose();
                  break;
                case 'close':
                  result.current.closeCompose();
                  break;
              }
            });

            // State is always one of the valid values
            expect(['open', 'minimized', 'closed']).toContain(
              result.current.composeState,
            );
          }

          // Verify final state matches the last operation's expected outcome
          const lastOp = operations[operations.length - 1];
          const expectedState =
            lastOp === 'open'
              ? 'open'
              : lastOp === 'minimize'
                ? 'minimized'
                : 'closed';
          expect(result.current.composeState).toBe(expectedState);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 3: Presence status set/get round-trip ─────────────────────────

describe('Feature: brightchat-frontend, Property 3: Presence status set/get round-trip', () => {
  /**
   * **Validates: Requirements 2.4**
   *
   * For any valid PresenceStatus value, calling setPresenceStatus
   * and reading presenceStatus should return the same value.
   */
  it('should round-trip any valid PresenceStatus through the context', () => {
    const presenceArb = fc.constantFrom(
      PresenceStatusEnum.ONLINE,
      PresenceStatusEnum.OFFLINE,
      PresenceStatusEnum.IDLE,
      PresenceStatusEnum.DO_NOT_DISTURB,
    );

    fc.assert(
      fc.property(presenceArb, (status: string) => {
        const { result } = renderHook(() => useBrightChat(), { wrapper });

        act(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          result.current.setPresenceStatus(status as any);
        });

        expect(result.current.presenceStatus).toBe(status);
      }),
      { numRuns: 100 },
    );
  });
});

// Import pure helpers for property tests 22 & 23
import {
  readSessionStorageValue,
  resolveRestoredServerId,
  writeSessionStorageValue,
} from '../BrightChatContext';

// ─── Property 22: SessionStorage navigation state round-trip ────────────────

describe('Feature: brightchat-discord-experience, Property 22: SessionStorage navigation state round-trip', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  /**
   * **Validates: Requirements 11.3**
   *
   * For any valid serverId and channelId strings, writing them to
   * sessionStorage via the persistence helpers and then reading them back
   * SHALL produce the same values.
   */
  it('should round-trip any serverId string through sessionStorage write/read', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        (serverId: string) => {
          sessionStorage.clear();

          const key = 'brightchat:activeServerId';
          writeSessionStorageValue(key, serverId);
          const read = readSessionStorageValue(key);

          expect(read).toBe(serverId);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should round-trip any channelId string through sessionStorage write/read', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        (channelId: string) => {
          sessionStorage.clear();

          const key = 'brightchat:activeChannelId';
          writeSessionStorageValue(key, channelId);
          const read = readSessionStorageValue(key);

          expect(read).toBe(channelId);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should return null after writing null (removal)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        (initialValue: string) => {
          sessionStorage.clear();

          const key = 'brightchat:activeServerId';
          writeSessionStorageValue(key, initialValue);
          expect(readSessionStorageValue(key)).toBe(initialValue);

          writeSessionStorageValue(key, null);
          expect(readSessionStorageValue(key)).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should round-trip serverId and channelId independently', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        (serverId: string, channelId: string) => {
          sessionStorage.clear();

          const serverKey = 'brightchat:activeServerId';
          const channelKey = 'brightchat:activeChannelId';

          writeSessionStorageValue(serverKey, serverId);
          writeSessionStorageValue(channelKey, channelId);

          expect(readSessionStorageValue(serverKey)).toBe(serverId);
          expect(readSessionStorageValue(channelKey)).toBe(channelId);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 23: Conditional state restoration based on membership ─────────

describe('Feature: brightchat-discord-experience, Property 23: Conditional state restoration based on membership', () => {
  /**
   * **Validates: Requirements 11.4**
   *
   * For any stored serverId and a membership list, the restoration function
   * SHALL return the stored serverId if and only if the user's server list
   * contains that serverId. Otherwise it SHALL return null.
   */
  it('should return storedServerId when it exists in memberServerIds', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.array(fc.uuid(), { minLength: 0, maxLength: 20 }),
        (storedServerId: string, otherIds: string[]) => {
          // Ensure storedServerId is in the list
          const memberServerIds = [
            ...otherIds.filter((id) => id !== storedServerId),
            storedServerId,
          ];

          const result = resolveRestoredServerId(
            storedServerId,
            memberServerIds,
          );
          expect(result).toBe(storedServerId);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should return null when storedServerId is NOT in memberServerIds', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.array(fc.uuid(), { minLength: 0, maxLength: 20 }),
        (storedServerId: string, memberServerIds: string[]) => {
          // Ensure storedServerId is NOT in the list
          const filtered = memberServerIds.filter(
            (id) => id !== storedServerId,
          );

          const result = resolveRestoredServerId(storedServerId, filtered);
          expect(result).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should return null when storedServerId is null', () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 0, maxLength: 20 }),
        (memberServerIds: string[]) => {
          const result = resolveRestoredServerId(null, memberServerIds);
          expect(result).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should return null when memberServerIds is empty', () => {
    fc.assert(
      fc.property(fc.uuid(), (storedServerId: string) => {
        const result = resolveRestoredServerId(storedServerId, []);
        expect(result).toBeNull();
      }),
      { numRuns: 100 },
    );
  });
});
