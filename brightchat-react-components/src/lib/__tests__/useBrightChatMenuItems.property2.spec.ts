/**
 * Property-based test for useBrightChatMenuItems hook logic.
 *
 * Property 2: Hook limits output to maximum 5 servers
 * Tests the pure `generateBrightChatMenuOptions` function directly
 * (no React rendering needed).
 *
 * Feature: brightchat-navigation-ux, Property 2: Hook limits output to maximum 5 servers
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
import { createMenuType } from '@digitaldefiance/express-suite-react-components';
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

/** Generate an array of servers (0 to 20, to test well beyond the 5-cap). */
const serversArb = fc.array(serverArb, { minLength: 0, maxLength: 20 });

/** Generate a valid MenuType using createMenuType. */
const menuTypeArb = fc
  .string({ minLength: 1, maxLength: 20 })
  .map((s) => createMenuType(s));

// ─── Property 2: Hook limits output to maximum 5 servers ────────────────────

describe('Feature: brightchat-navigation-ux, Property 2: Hook limits output to maximum 5 servers', () => {
  /**
   * **Validates: Requirements 1.4**
   *
   * For any array of IServer<string> objects of any length (0 to N),
   * the `options` array returned by generateBrightChatMenuOptions SHALL
   * have length equal to `1 + Math.min(servers.length, 5)` (1 for DM entry + capped servers).
   */
  it('should return at most 6 options (1 DM + 5 servers) regardless of input server count', () => {
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

          expect(options.length).toBe(1 + Math.min(servers.length, 5));
        },
      ),
      { numRuns: 100 },
    );
  });
});
