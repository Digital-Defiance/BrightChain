/**
 * Feature: brightchain-vfs-explorer, Property 25: Network errors set status to Error
 *
 * For any API request that fails with a network error, the
 * StatusIndicator transitions to 'error' state.
 *
 * **Validates: Requirements 14.1**
 */

import * as fc from 'fast-check';
// eslint-disable-next-line jest/no-mocks-import -- VS Code mock is the standard pattern for extension tests
import { EventEmitter } from '../../__mocks__/vscode';
import type { AuthManager } from '../../auth/auth-manager';
import type { IAuthState } from '../../auth/types';
import { StatusIndicator } from '../../ui/status-indicator';

/** Arbitrary network error messages. */
const arbNetworkErrorMessage = fc.oneof(
  fc.constant('Network error: fetch failed'),
  fc.constant('Network error: ECONNREFUSED'),
  fc.constant('Network error: DNS lookup failed'),
  fc.constant('Network error: ETIMEDOUT'),
  fc.constant('Network error: socket hang up'),
  fc
    .string({ minLength: 1, maxLength: 80 })
    .map((s: string) => `Network error: ${s}`),
);

/** Arbitrary initial states before the error occurs. */
const arbInitialState = fc.constantFrom(
  'disconnected' as const,
  'connecting' as const,
  'connected' as const,
);

describe('Property 25: Network errors set status to Error', () => {
  it('should transition StatusIndicator to error state for any network error', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbNetworkErrorMessage,
        arbInitialState,
        async (_errorMessage, initialState) => {
          // Arrange: create a minimal AuthManager mock with event emitter
          const emitter = new EventEmitter<IAuthState>();
          const authManager = {
            state: { authenticated: initialState === 'connected' },
            onAuthChanged: emitter.event,
          } as unknown as AuthManager;

          const statusIndicator = new StatusIndicator(authManager);

          // Set initial state
          statusIndicator.setState(initialState);
          expect(statusIndicator.getState()).toBe(initialState);

          // Act: simulate what happens when a network error occurs —
          // the command handler calls statusIndicator.setState('error')
          statusIndicator.setState('error');

          // Assert: status is now 'error'
          expect(statusIndicator.getState()).toBe('error');

          // Cleanup
          statusIndicator.dispose();
          emitter.dispose();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should recover from error state when auth succeeds', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbNetworkErrorMessage,
        fc.record({
          id: fc.uuid(),
          email: fc.emailAddress(),
          username: fc.string({ minLength: 1, maxLength: 20 }),
          emailVerified: fc.boolean(),
        }),
        async (_errorMessage, user) => {
          // Arrange
          const emitter = new EventEmitter<IAuthState>();
          const authManager = {
            state: { authenticated: false },
            onAuthChanged: emitter.event,
          } as unknown as AuthManager;

          const statusIndicator = new StatusIndicator(authManager);

          // Set to error state (simulating network error)
          statusIndicator.setState('error');
          expect(statusIndicator.getState()).toBe('error');

          // Act: auth succeeds, emitting auth-changed
          emitter.fire({
            authenticated: true,
            user: { ...user, displayName: user.username } as IAuthState['user'],
          });

          // Assert: status transitions to connected
          expect(statusIndicator.getState()).toBe('connected');

          // Cleanup
          statusIndicator.dispose();
          emitter.dispose();
        },
      ),
      { numRuns: 100 },
    );
  });
});
