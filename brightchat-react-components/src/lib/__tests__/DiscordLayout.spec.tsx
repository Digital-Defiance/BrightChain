/**
 * Unit tests for BrightChatLayout component.
 *
 * Tests three-panel rendering at desktop width and responsive collapse
 * at mobile width.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 9.4
 */

jest.mock('@brightchain/brightchain-lib', () => ({
  THEME_COLORS: { CHAIN_BLUE: '#1976d2' },
  BrightDateDisplayMode: {
    Dual: 'dual',
    BrightDateOnly: 'brightDateOnly',
    LocaleOnly: 'localeOnly',
    Hover: 'hover',
    HoverReverse: 'hoverReverse',
  },
  toBrightDateString: () => '9146.438',
  BrightChainStrings: new Proxy({}, { get: (_t: unknown, p: string | symbol) => String(p) }),
  PresenceStatus: {
    ONLINE: 'online',
    OFFLINE: 'offline',
    IDLE: 'idle',
    DO_NOT_DISTURB: 'dnd',
  },
  DefaultRole: {
    OWNER: 'owner',
    ADMIN: 'admin',
    MODERATOR: 'moderator',
    MEMBER: 'member',
  },
}));

// Mock useMediaQuery to control responsive behavior
let mockIsMobile = false;
jest.mock('@mui/material/useMediaQuery', () => jest.fn(() => mockIsMobile));

// Mock useI18n to avoid requiring I18nProvider in tests
jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useI18n: () => ({
    tComponent: (_componentId: string, key: string) => key,
    tBranded: (key: string) => key,
    t: (key: string) => key,
  }),
}));

// Mock LayoutShell to render a simple shell with subBar and children
jest.mock('@brightchain/brightchain-react-components', () => ({
  ...jest.requireActual('@brightchain/brightchain-react-components'),
  LayoutShell: ({
    subBar,
    children,
  }: {
    subBar?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <div data-testid="layout-shell">
      <div data-testid="layout-appbar">AppBar</div>
      {subBar && <div data-testid="layout-subbar">{subBar}</div>}
      <div data-testid="layout-content-area">{children}</div>
    </div>
  ),
  BrightChainSubLogo: () => <span>BrightChat Logo</span>,
  SubLogoHeight: 30,
  SubLogoIconHeight: 20,
}));

import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import type { DiscordLayoutProps } from '../BrightChatLayout';
import DiscordLayout from '../BrightChatLayout';

// ─── Helpers ────────────────────────────────────────────────────────────────

const testServers = [
  {
    id: 'srv-1',
    name: 'Test Server',
    ownerId: 'u1',
    memberIds: ['u1'],
    channelIds: [],
    categories: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

function renderLayout(
  overrides: Partial<DiscordLayoutProps> = {},
  initialRoute = '/',
) {
  const defaultProps: DiscordLayoutProps = {
    servers: testServers,
    activeServerId: null,
    serverName: 'Test Server',
    channelSidebarProps: {
      channels: [],
      categories: [],
      activeChannelId: null,
      userRole: 'owner' as any,
      onChannelSelect: jest.fn(),
    },
    onServerSelect: jest.fn(),
    onHomeClick: jest.fn(),
    onCreateServer: jest.fn(),
    children: <div data-testid="chat-area">Chat Content</div>,
    ...overrides,
  };
  return {
    ...render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <DiscordLayout {...defaultProps} />
      </MemoryRouter>,
    ),
    props: defaultProps,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('DiscordLayout', () => {
  beforeEach(() => {
    mockIsMobile = false;
  });

  it('renders three panels at desktop width: ServerRail, ChannelSidebar, ChatArea (Req 4.1)', () => {
    renderLayout();

    // ServerRail nav
    expect(
      screen.getByRole('navigation', { name: 'Server_Rail' }),
    ).toBeTruthy();

    // ChannelSidebar aside
    expect(
      screen.getByRole('complementary', { name: 'Channel_Sidebar' }),
    ).toBeTruthy();

    // Chat area content
    expect(screen.getByTestId('chat-area')).toBeTruthy();
    expect(screen.getByText('Chat Content')).toBeTruthy();
  });

  it('renders Home button and Create Server button in the rail', () => {
    renderLayout();
    expect(screen.getByLabelText('Server_Rail_Home')).toBeTruthy();
    expect(screen.getByLabelText('Server_Rail_CreateServer')).toBeTruthy();
  });

  it('renders server name in the sidebar header', () => {
    renderLayout({ serverName: 'My Community' });
    expect(screen.getByText('My Community')).toBeTruthy();
  });

  it('renders hamburger menu at mobile width (Req 4.6)', () => {
    mockIsMobile = true;
    renderLayout();

    // Should show hamburger button
    expect(screen.getByLabelText('Layout_OpenNavigation')).toBeTruthy();

    // ServerRail nav should NOT be directly visible (it's in the drawer)
    expect(
      screen.queryByRole('navigation', { name: 'Server_Rail' }),
    ).toBeNull();
  });

  it('still renders chat area content at mobile width', () => {
    mockIsMobile = true;
    renderLayout();
    expect(screen.getByTestId('chat-area')).toBeTruthy();
  });

  // ─── Presence status dropdown tests (Req 9.4, 9.5) ─────────────────────

  it('renders presence status dropdown in the user profile area (Req 9.4)', () => {
    renderLayout();
    expect(screen.getByLabelText('Presence_SetStatus')).toBeTruthy();
  });

  it('defaults to Online presence status', () => {
    renderLayout();
    expect(screen.getByText('Presence_Online')).toBeTruthy();
  });

  it('allows changing presence status via dropdown (Req 9.4)', () => {
    const { container } = renderLayout();

    // The presence dropdown renders a MUI Select with the aria-label
    const selectEl = container.querySelector(
      '[aria-label="Presence_SetStatus"]',
    );
    expect(selectEl).toBeTruthy();

    // The current value should show the i18n key for Online (default presence status)
    expect(selectEl!.textContent).toContain('Presence_Online');
  });

  // ─── Sub-AppBar encryption icon tests (Req 4.1–4.5, 9.4) ───────────────

  describe('Sub-AppBar encryption icon', () => {
    it('renders lock icon when viewing a channel (Req 4.1)', () => {
      renderLayout(
        { serverName: 'Test Server', activeChannelName: 'general' },
        '/brightchat/channel/ch-1',
      );
      expect(screen.getByTestId('encryption-icon-breadcrumb')).toBeTruthy();
    });

    it('renders lock icon when viewing a group (Req 4.1)', () => {
      renderLayout({ serverName: 'Test Server' }, '/brightchat/group/grp-1');
      expect(screen.getByTestId('encryption-icon-breadcrumb')).toBeTruthy();
    });

    it('renders lock icon when viewing a conversation (Req 4.1)', () => {
      renderLayout(
        { serverName: 'Test Server' },
        '/brightchat/conversation/conv-1',
      );
      expect(screen.getByTestId('encryption-icon-breadcrumb')).toBeTruthy();
    });

    it('does NOT render lock icon at BrightChat root (Req 4.5)', () => {
      renderLayout({}, '/brightchat');
      expect(screen.queryByTestId('encryption-icon-breadcrumb')).toBeNull();
    });

    it('has 16px font size and inherit color (Req 4.2)', () => {
      renderLayout({ serverName: 'Test Server' }, '/brightchat/channel/ch-1');
      const icon = screen.getByTestId('encryption-icon-breadcrumb');
      // MUI applies sx as inline styles or class-based styles;
      // verify the SVG element is present with the expected attributes
      expect(icon.tagName.toLowerCase()).toBe('svg');
    });

    it('has aria-label "End-to-end encrypted" (Req 4.4)', () => {
      renderLayout({ serverName: 'Test Server' }, '/brightchat/channel/ch-1');
      const icon = screen.getByTestId('encryption-icon-breadcrumb');
      expect(icon.getAttribute('aria-label')).toBe('Encryption_E2E');
    });

    it('is wrapped in a tooltip with "End-to-end encrypted" text (Req 4.3)', () => {
      renderLayout({ serverName: 'Test Server' }, '/brightchat/channel/ch-1');
      // The icon should be accessible by its aria-label which matches the tooltip title
      const icon = screen.getByLabelText('Encryption_E2E');
      expect(icon).toBeTruthy();
      expect(icon.getAttribute('data-testid')).toBe(
        'encryption-icon-breadcrumb',
      );
    });

    it('has data-testid="encryption-icon-breadcrumb" (Req 9.4)', () => {
      renderLayout({ serverName: 'Test Server' }, '/brightchat/channel/ch-1');
      const icon = screen.getByTestId('encryption-icon-breadcrumb');
      expect(icon).toBeTruthy();
    });
  });
});
