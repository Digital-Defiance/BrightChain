/**
 * Property-based test for useBrightChatMenuItems hook logic.
 *
 * Property 3: Hook index arithmetic is correct
 * Tests the pure `generateBrightChatMenuOptions` function directly
 * (no React rendering needed).
 *
 * Feature: brightchat-navigation-ux, Property 3: Hook index arithmetic is correct
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

/** Generate an array of servers (0 to 10). */
const serversArb = fc.array(serverArb, { minLength: 0, maxLength: 10 });

/** Generate a valid MenuType using createMenuType. */
const menuTypeArb = fc
  .string({ minLength: 1, maxLength: 20 })
  .map((s) => createMenuType(s));

// ─── Property 3: Hook index arithmetic is correct ───────────────────────────

describe('Feature: brightchat-navigation-ux, Property 3: Hook index arithmetic is correct', () => {
  /**
   * **Validates: Requirements 1.1, 1.5**
   *
   * For any starting index and any array of IServer<string> objects,
   * the `index` field of the i-th option (0-based) SHALL equal
   * `startingIndex + (i * 10)`, and `nextIndex` SHALL equal
   * `startingIndex + ((min(servers.length, 5) + 1) * 10)`.
   * The +1 accounts for the Direct Messages entry at position 0.
   */
  it('should assign correct index to each option and return correct nextIndex', () => {
    fc.assert(
      fc.property(
        menuTypeArb,
        serversArb,
        fc.nat({ max: 1000 }),
        (chatMenu, servers, startingIndex) => {
          const { options, nextIndex } = generateBrightChatMenuOptions(
            chatMenu,
            servers,
            startingIndex,
          );

          const cappedCount = Math.min(servers.length, 5);

          // Each option's index follows the arithmetic: startingIndex + (i * 10)
          options.forEach((option, i) => {
            expect(option.index).toBe(startingIndex + i * 10);
          });

          // nextIndex equals startingIndex + ((cappedCount + 1) * 10)
          // +1 for the DM entry
          expect(nextIndex).toBe(startingIndex + (cappedCount + 1) * 10);
        },
      ),
      { numRuns: 100 },
    );
  });
});
