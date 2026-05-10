/**
 * Unit tests for generateBrightChatMenuOptions — serverIcon behaviour.
 *
 * Validates that the serverIcon parameter is:
 *   1. Applied to server entries when provided
 *   2. Omitted from server entries when not provided
 *   3. Never applied to the "Direct Messages" entry
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

import { createMenuType } from '@digitaldefiance/express-suite-react-components';
import { generateBrightChatMenuOptions } from '../hooks/useBrightChatMenuItems';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const chatMenu = createMenuType('test-chat');

const servers = [
  {
    id: 'srv-1',
    name: 'Alpha',
    ownerId: 'u1',
    memberIds: ['u1'],
    channelIds: [],
    categories: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('generateBrightChatMenuOptions — serverIcon', () => {
  it('server entries include the icon when serverIcon is provided', () => {
    const { options } = generateBrightChatMenuOptions(
      chatMenu,
      servers,
      0,
      'Direct Messages',
      'chat-icon',
    );

    const serverEntry = options.find((o) => o.id === 'brightchat-server-srv-1');
    expect(serverEntry).toBeDefined();
    expect(serverEntry!.icon).toBe('chat-icon');
  });

  it('server entries do not have icon when serverIcon is omitted', () => {
    const { options } = generateBrightChatMenuOptions(
      chatMenu,
      servers,
      0,
    );

    const serverEntry = options.find((o) => o.id === 'brightchat-server-srv-1');
    expect(serverEntry).toBeDefined();
    expect(serverEntry!.icon).toBeUndefined();
  });

  it('the "Direct Messages" entry does not get the serverIcon', () => {
    const { options } = generateBrightChatMenuOptions(
      chatMenu,
      servers,
      0,
      'Direct Messages',
      'chat-icon',
    );

    const dmEntry = options.find(
      (o) => o.id === 'brightchat-direct-messages',
    );
    expect(dmEntry).toBeDefined();
    expect(dmEntry!.icon).toBeUndefined();
  });
});
