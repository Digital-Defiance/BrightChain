/**
 * Property-based test for ServerRail encryption badge.
 *
 * Property 2: Every server icon renders a shield badge
 *
 * Feature: brightchat-encryption-indicators, Property 2: Every server icon renders a shield badge
 */

jest.mock('@brightchain/brightchain-lib', () => ({
  PresenceStatus: {
    ONLINE: 'online',
    OFFLINE: 'offline',
    IDLE: 'idle',
    DO_NOT_DISTURB: 'dnd',
  },
}));

// Mock useI18n to avoid requiring I18nProvider in tests
jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useI18n: () => ({
    tComponent: (_componentId: string, key: string) => key,
    tBranded: (key: string) => key,
  }),
}));

// Async React property tests can exceed 5 s under parallel load — give them room.
jest.retryTimes(2, { logErrorsBeforeRetry: false });
jest.setTimeout(30000);

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import fc from 'fast-check';
import type { ServerRailProps } from '../ServerRail';
import ServerRail from '../ServerRail';

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Generate a server with a unique id and random name. */
const serverArb = (id: string) =>
  fc.record({
    id: fc.constant(id),
    name: fc
      .string({ minLength: 1, maxLength: 20 })
      .filter((s) => s.trim().length > 0),
    iconUrl: fc.option(fc.webUrl(), { nil: undefined }),
    ownerId: fc.constant('u1'),
    memberIds: fc.constant(['u1']),
    channelIds: fc.constant(['ch-1']),
    categories: fc.constant([]),
    createdAt: fc.constant(new Date()),
    updatedAt: fc.constant(new Date()),
  });

/** Generate an array of 1–10 servers with unique ids. */
const serversArb = fc.integer({ min: 1, max: 10 }).chain((count) => {
  const ids = Array.from({ length: count }, (_, i) => `srv-${i}`);
  return fc.tuple(...ids.map((id) => serverArb(id)));
});

// ─── Property 2: Every server icon renders a shield badge ───────────────────

describe('Feature: brightchat-encryption-indicators, Property 2: Every server icon renders a shield badge', () => {
  afterEach(() => {
    cleanup();
  });

  /**
   * **Validates: Requirements 5.1**
   *
   * For any non-empty array of servers, rendering the ServerRail SHALL
   * produce exactly one element with data-testid="encryption-badge-server"
   * per server in the array.
   */
  it('should render exactly one shield badge per server', () => {
    fc.assert(
      fc.property(serversArb, (servers) => {
        cleanup();

        const props: ServerRailProps = {
          servers: servers as any,
          activeServerId: null,
          onServerSelect: jest.fn(),
          onHomeClick: jest.fn(),
          onCreateServer: jest.fn(),
        };

        render(<ServerRail {...props} />);

        const badges = screen.getAllByTestId('encryption-badge-server');
        expect(badges).toHaveLength(servers.length);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 3: Server tooltip includes encryption suffix ──────────────────

describe('Feature: brightchat-encryption-indicators, Property 3: Server tooltip includes encryption suffix', () => {
  afterEach(() => {
    cleanup();
  });

  /**
   * **Validates: Requirements 5.4**
   *
   * For any server with a non-empty name, the tooltip text for that server's
   * icon in the ServerRail SHALL equal "{serverName} · Encrypted".
   */
  it('should display tooltip with "{serverName} · Encrypted" on hover', async () => {
    /** Generate a server name using only alphanumeric chars (no whitespace edge cases). */
    const serverNameArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9]{0,19}$/);

    const singleServerArb = fc.record({
      id: fc.constant('srv-prop3'),
      name: serverNameArb,
      iconUrl: fc.constant(undefined),
      ownerId: fc.constant('u1'),
      memberIds: fc.constant(['u1']),
      channelIds: fc.constant(['ch-1']),
      categories: fc.constant([]),
      createdAt: fc.constant(new Date()),
      updatedAt: fc.constant(new Date()),
    });

    await fc.assert(
      fc.asyncProperty(singleServerArb, async (server) => {
        cleanup();

        const props: ServerRailProps = {
          servers: [server] as any,
          activeServerId: null,
          onServerSelect: jest.fn(),
          onHomeClick: jest.fn(),
          onCreateServer: jest.fn(),
        };

        render(<ServerRail {...props} />);

        const serverBtn = screen.getByLabelText(server.name);
        fireEvent.mouseOver(serverBtn);

        const tooltip = await screen.findByRole('tooltip');
        expect(tooltip.textContent).toBe(
          `${server.name} · Encryption_ServerEncrypted`,
        );
      }),
      { numRuns: 100 },
    );
  });
});
