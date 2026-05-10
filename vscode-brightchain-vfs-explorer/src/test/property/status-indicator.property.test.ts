/**
 * Feature: brightchain-vfs-explorer, Property 19: StatusIndicator renders correct state
 *
 * For any ConnectionState value and optional username, the StatusIndicator
 * should display the correct text and command.
 *
 * **Validates: Requirements 11.1, 11.2, 11.3**
 */

import * as fc from 'fast-check';
import type { ConnectionState } from '../../auth/types';
import { getStatusCommand, renderStatusText } from '../../ui/status-indicator';

const connectionStateArb: fc.Arbitrary<ConnectionState> = fc.constantFrom(
  'disconnected',
  'connecting',
  'connected',
  'error',
);

const optionalUsernameArb = fc.option(
  fc.string({ minLength: 1, maxLength: 50 }),
  { nil: undefined },
);

describe('Property 19: StatusIndicator renders correct state', () => {
  it('should render correct text for every connection state', () => {
    fc.assert(
      fc.property(
        connectionStateArb,
        optionalUsernameArb,
        (state, username) => {
          const text = renderStatusText(state, username);

          switch (state) {
            case 'disconnected':
              expect(text).toBe('$(cloud) BrightChain: Disconnected');
              break;
            case 'connecting':
              expect(text).toBe('$(sync~spin) BrightChain: Connecting...');
              break;
            case 'connected':
              if (username) {
                expect(text).toBe(
                  `$(cloud) BrightChain: Connected: ${username}`,
                );
              } else {
                expect(text).toBe('$(cloud) BrightChain: Connected');
              }
              break;
            case 'error':
              expect(text).toBe('$(error) BrightChain: Error');
              break;
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should return correct command for every connection state', () => {
    fc.assert(
      fc.property(connectionStateArb, (state) => {
        const command = getStatusCommand(state);

        switch (state) {
          case 'disconnected':
          case 'error':
            expect(command).toBe('brightchain.login');
            break;
          case 'connected':
            expect(command).toBe('brightchain.statusMenu');
            break;
          case 'connecting':
            expect(command).toBeUndefined();
            break;
        }
      }),
      { numRuns: 100 },
    );
  });
});
