/**
 * Unit tests for generateBrightChatMenuOptions — iconFaClass priority.
 *
 * Validates that the menu builder uses the correct icon based on priority:
 *   1. iconFaClass  → createElement('i', { className: ... })
 *   2. iconUrl      → createElement('img', { src: ... })
 *   3. serverIcon   → fallback generic icon
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
  createElement: jest.fn((...args: unknown[]) => ({
    type: args[0],
    props: args[1],
  })),
}));

import { createElement } from 'react';
import { createMenuType } from '@digitaldefiance/express-suite-react-components';
import { generateBrightChatMenuOptions } from '../hooks/useBrightChatMenuItems';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const chatMenu = createMenuType('test-chat');

function createServer(overrides = {}) {
  return {
    id: 'srv-1',
    name: 'Alpha',
    ownerId: 'u1',
    memberIds: ['u1'],
    channelIds: [],
    categories: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('generateBrightChatMenuOptions — iconFaClass priority', () => {
  beforeEach(() => {
    (createElement as jest.Mock).mockClear();
  });

  it('server with iconFaClass gets a <span> wrapper icon (FA-safe)', () => {
    const server = createServer({ iconFaClass: 'fa-solid fa-gamepad' });
    const { options } = generateBrightChatMenuOptions(
      chatMenu,
      [server],
      0,
      'Direct Messages',
      'fallback-icon',
    );

    const serverEntry = options.find((o) => o.id === 'brightchat-server-srv-1');
    expect(serverEntry).toBeDefined();
    expect(serverEntry!.icon).toEqual({
      type: 'span',
      props: expect.objectContaining({
        style: expect.objectContaining({ display: 'inline-flex' }),
      }),
    });
  });

  it('server with iconUrl but no iconFaClass gets an <img> element icon', () => {
    const server = createServer({
      iconUrl: 'https://example.com/icon.png',
    });
    const { options } = generateBrightChatMenuOptions(
      chatMenu,
      [server],
      0,
      'Direct Messages',
      'fallback-icon',
    );

    const serverEntry = options.find((o) => o.id === 'brightchat-server-srv-1');
    expect(serverEntry).toBeDefined();
    expect(serverEntry!.icon).toEqual({
      type: 'img',
      props: expect.objectContaining({
        src: 'https://example.com/icon.png',
        alt: 'Alpha',
      }),
    });
  });

  it('server with both iconFaClass and iconUrl gets the FA icon (iconFaClass wins)', () => {
    const server = createServer({
      iconFaClass: 'fa-solid fa-heart',
      iconUrl: 'https://example.com/icon.png',
    });
    const { options } = generateBrightChatMenuOptions(
      chatMenu,
      [server],
      0,
      'Direct Messages',
      'fallback-icon',
    );

    const serverEntry = options.find((o) => o.id === 'brightchat-server-srv-1');
    expect(serverEntry).toBeDefined();
    // Should be a <span> wrapper (FA-safe), not <img>
    expect(serverEntry!.icon).toEqual({
      type: 'span',
      props: expect.objectContaining({
        style: expect.objectContaining({ display: 'inline-flex' }),
      }),
    });
  });

  it('server with neither iconFaClass nor iconUrl gets the fallback serverIcon', () => {
    const server = createServer();
    const { options } = generateBrightChatMenuOptions(
      chatMenu,
      [server],
      0,
      'Direct Messages',
      'fallback-icon',
    );

    const serverEntry = options.find((o) => o.id === 'brightchat-server-srv-1');
    expect(serverEntry).toBeDefined();
    expect(serverEntry!.icon).toBe('fallback-icon');
  });
});
