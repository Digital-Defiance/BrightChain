/**
 * Property-based test for useBrightChatMenuItems hook logic.
 *
 * Property 1: Hook generates correct menu option fields
 * Tests the pure `generateBrightChatMenuOptions` function directly
 * (no React rendering needed).
 *
 * Feature: brightchat-navigation-ux, Property 1: Hook generates correct menu option fields
 */

jest.mock('@digitaldefiance/express-suite-react-components', () => {
  const createMenuType = (id: string) =>
    id as string & { readonly __brand: 'MenuType' };
  return {
    MenuTypes: {
      SideMenu: createMenuType('SideMenu'),
      TopMenu: createMenuType('TopMenu'),
      UserMenu: createMenuType('UserMenu'),
    },
    createMenuType,
  };
});

jest.mock('react', () => ({
  useMemo: (fn: () => unknown) => fn(),
}));

import type { IServer, IServerCategory } from '@brightchain/brightchain-lib';
import {
  createMenuType,
  MenuTypes,
} from '@digitaldefiance/express-suite-react-components';
import fc from 'fast-check';
import { generateBrightChatMenuOptions } from '../hooks/useBrightChatMenuItems';

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Generate a valid IServerCategory<string>. */
const serverCategoryArb: fc.Arbitrary<IServerCategory<string>> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  position: fc.nat({ max: 100 }),
  channelIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 5 }),
});

/** Generate a valid IServer<string>. */
const serverArb: fc.Arbitrary<IServer<string>> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  iconUrl: fc.option(fc.webUrl(), { nil: undefined }),
  ownerId: fc.uuid(),
  memberIds: fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }),
  channelIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 10 }),
  categories: fc.array(serverCategoryArb, { minLength: 0, maxLength: 3 }),
  createdAt: fc.date(),
  updatedAt: fc.date(),
});

/** Generate an array of servers (0 to 10). */
const serversArb = fc.array(serverArb, { minLength: 0, maxLength: 10 });

/** Generate a valid MenuType using createMenuType. */
const menuTypeArb = fc
  .string({ minLength: 1, maxLength: 20 })
  .map((s) => createMenuType(s));

// ─── Property 1: Hook generates correct menu option fields ──────────────────

describe('Feature: brightchat-navigation-ux, Property 1: Hook generates correct menu option fields', () => {
  /**
   * **Validates: Requirements 1.2, 1.3**
   *
   * For any array of IServer<string> objects and any valid menu type,
   * generateBrightChatMenuOptions SHALL produce:
   * - A "Direct Messages" entry first (id='brightchat-direct-messages', link='/brightchat')
   * - Then up to 5 server entries with correct id, link, label, requiresAuth, includeOnMenus
   */
  it('should generate a Direct Messages entry followed by correct server entries', () => {
    fc.assert(
      fc.property(
        menuTypeArb,
        serversArb,
        fc.nat({ max: 1000 }),
        (chatMenu, servers, startingIndex) => {
          const { options } = generateBrightChatMenuOptions(
            chatMenu,
            servers,
            startingIndex,
          );

          // Only the first 5 servers are used
          const expectedServers = servers.slice(0, 5);

          // Total options = 1 (DM) + capped servers
          expect(options.length).toBe(1 + expectedServers.length);

          // First entry is Direct Messages
          const dmOption = options[0];
          expect(dmOption.id).toBe('brightchat-direct-messages');
          expect(dmOption.link).toBe('/brightchat');
          expect(dmOption.requiresAuth).toBe(true);
          expect(dmOption.includeOnMenus).toContain(chatMenu);
          expect(dmOption.includeOnMenus).toContain(MenuTypes.SideMenu);

          // Remaining entries are server items
          expectedServers.forEach((server, i) => {
            const option = options[i + 1];

            // id matches pattern
            expect(option.id).toBe(`brightchat-server-${server.id}`);

            // link matches pattern
            expect(option.link).toBe(`/brightchat/server/${server.id}`);

            // label is the server name
            expect(option.label).toBe(server.name);

            // requiresAuth is true
            expect(option.requiresAuth).toBe(true);

            // includeOnMenus contains both the provided menu type and SideMenu
            expect(option.includeOnMenus).toContain(chatMenu);
            expect(option.includeOnMenus).toContain(MenuTypes.SideMenu);
            expect(option.includeOnMenus).toHaveLength(2);
          });
        },
      ),
      { numRuns: 100 },
    );
  });
});
