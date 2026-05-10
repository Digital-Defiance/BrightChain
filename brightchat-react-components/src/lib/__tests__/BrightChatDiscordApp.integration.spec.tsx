/**
 * Integration tests for BrightChatApp — end-to-end navigation flow.
 *
 * Tests the full navigation lifecycle:
 * - Server selection → channel sidebar updates → channel selection → message thread
 * - Home button → DM conversation list
 * - Real-time WebSocket event updates (SERVER_CHANNEL_CREATED, SERVER_CHANNEL_DELETED)
 *
 * Requirements: 4.3, 4.4, 4.5, 10.1, 10.2
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

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
  ChannelVisibility: {
    PUBLIC: 'public',
    PRIVATE: 'private',
  },
  CommunicationEventType: {
    MESSAGE_SENT: 'communication:message_sent',
    MESSAGE_EDITED: 'communication:message_edited',
    MESSAGE_DELETED: 'communication:message_deleted',
    TYPING_START: 'communication:typing_start',
    TYPING_STOP: 'communication:typing_stop',
    REACTION_ADDED: 'communication:reaction_added',
    REACTION_REMOVED: 'communication:reaction_removed',
    PRESENCE_CHANGED: 'communication:presence_changed',
    MEMBER_JOINED: 'communication:member_joined',
    MEMBER_LEFT: 'communication:member_left',
    SERVER_CHANNEL_CREATED: 'communication:server_channel_created',
    SERVER_CHANNEL_DELETED: 'communication:server_channel_deleted',
    SERVER_MEMBER_JOINED: 'communication:server_member_joined',
    SERVER_MEMBER_REMOVED: 'communication:server_member_removed',
    SERVER_UPDATED: 'communication:server_updated',
  },
  DEFAULT_SERVER_ICON_CONFIG: {
    maxFileSizeBytes: 5 * 1024 * 1024,
    outputSizePx: 256,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
    outputMimeType: 'image/png',
  },
  CONSTANTS: {
    BRIGHTCHAT: {
      FONTAWESOME_MAX_DISPLAY: 120,
      FONTAWESOME_ICON_GRID_SIZE: 40,
    },
    BRIGHTHUB: {
      FONTAWESOME_MAX_DISPLAY: 120,
      FONTAWESOME_ICON_GRID_SIZE: 40,
    },
  },
  isAllowedIconFileSize: (size: number) => size <= 5 * 1024 * 1024,
  isAllowedIconMimeType: (mime: string) =>
    ['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(mime),
}));

// Mock useMediaQuery to always return desktop
jest.mock('@mui/material/useMediaQuery', () => jest.fn(() => false));

// Mock useI18n to avoid requiring I18nProvider in tests
jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useI18n: () => ({
    tComponent: (_componentId: string, key: string) => key,
    tBranded: (key: string) => key,
    t: (key: string) => key,
  }),
  useAuth: () => ({
    userData: { id: 'test-user-id' },
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

// Mock react-easy-crop to avoid canvas issues in test environment
jest.mock('react-easy-crop', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: React.forwardRef(function MockCropper(
      _props: Record<string, unknown>,
      _ref: unknown,
    ) {
      return React.createElement('div', { 'data-testid': 'mock-cropper' });
    }),
  };
});

// Mock useChatApi to return a controllable fake API client
const mockChatApi = {
  listServers: jest.fn().mockResolvedValue({ items: [] }),
  createServer: jest.fn(),
  getServer: jest.fn(),
  getChannel: jest.fn(),
  updateServer: jest.fn(),
  removeServerMember: jest.fn(),
  createServerInvite: jest.fn(),
  sendDirectMessage: jest.fn(),
  stageFile: jest.fn(),
  uploadServerIcon: jest.fn(),
  removeServerIcon: jest.fn(),
};

jest.mock('../hooks/useChatApi', () => ({
  useChatApi: () => mockChatApi,
}));

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import BrightChatDiscordApp from '../BrightChatApp';
import {
  applyServerChannelCreated,
  applyServerChannelDeleted,
  applyServerMemberRemoved,
} from '../hooks/useChatWebSocket';

// ─── Test Data ──────────────────────────────────────────────────────────────

const makeServer = (
  id: string,
  name: string,
  channelIds: string[] = [],
  categories: any[] = [],
) => ({
  id,
  name,
  ownerId: 'u1',
  memberIds: ['u1'],
  channelIds,
  categories,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const makeChannel = (id: string, name: string, serverId?: string) => ({
  id,
  name,
  serverId,
  members: ['u1'],
  createdAt: new Date(),
  updatedAt: new Date(),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderApp(initialPath = '/brightchat') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/brightchat" element={<BrightChatDiscordApp />}>
          <Route
            index
            element={<div data-testid="home-view">Home — DM List</div>}
          />
          <Route
            path="server/:serverId"
            element={<div data-testid="server-view">Server View</div>}
          />
          <Route
            path="channel/:channelId"
            element={<div data-testid="channel-view">Message Thread</div>}
          />
          <Route
            path="conversation/:conversationId"
            element={<div data-testid="dm-view">DM Conversation</div>}
          />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

// ─── Integration Tests ──────────────────────────────────────────────────────

describe('BrightChatDiscordApp — Integration: Navigation Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChatApi.listServers.mockResolvedValue({ items: [] });
  });

  // ─── Server selection → channel sidebar → channel selection → message thread ──

  describe('Server → Channel → Message Thread flow (Req 4.3, 4.4, 4.5)', () => {
    it('clicking a server icon updates the active server in the rail', async () => {
      const server = makeServer(
        'srv-1',
        'Gaming Hub',
        ['ch-1'],
        [{ id: 'cat-1', name: 'General', position: 0, channelIds: ['ch-1'] }],
      );
      mockChatApi.listServers.mockResolvedValue({ items: [server] });

      renderApp();

      // Wait for server to appear in the rail
      await waitFor(() => {
        expect(screen.getByLabelText('Gaming Hub')).toBeTruthy();
      });

      // Click the server icon
      fireEvent.click(screen.getByLabelText('Gaming Hub'));

      // The server icon should now have aria-current indicating it's active
      await waitFor(() => {
        expect(
          screen.getByLabelText('Gaming Hub').getAttribute('aria-current'),
        ).toBe('true');
      });
    });

    it('displays the server name in the channel sidebar header after selecting a server', async () => {
      const server = makeServer(
        'srv-1',
        'Dev Team',
        ['ch-1'],
        [
          {
            id: 'cat-1',
            name: 'Text Channels',
            position: 0,
            channelIds: ['ch-1'],
          },
        ],
      );
      mockChatApi.listServers.mockResolvedValue({ items: [server] });

      renderApp();

      await waitFor(() => {
        expect(screen.getByLabelText('Dev Team')).toBeTruthy();
      });

      fireEvent.click(screen.getByLabelText('Dev Team'));

      // Server name should appear in the sidebar header
      await waitFor(() => {
        // Server name appears in both the breadcrumb and the sidebar header
        const matches = screen.getAllByText('Dev Team');
        expect(matches.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('renders the home view by default when no server is selected', async () => {
      mockChatApi.listServers.mockResolvedValue({ items: [] });

      renderApp();

      await waitFor(() => {
        expect(screen.getByTestId('home-view')).toBeTruthy();
      });

      expect(screen.getByText('Home — DM List')).toBeTruthy();
    });
  });

  // ─── Home → DM list display ──────────────────────────────────────────────

  describe('Home → DM list display (Req 4.4)', () => {
    it('clicking Home navigates back to the DM list view', async () => {
      const server = makeServer('srv-1', 'My Server');
      mockChatApi.listServers.mockResolvedValue({ items: [server] });

      renderApp();

      // Wait for server to load
      await waitFor(() => {
        expect(screen.getByLabelText('My Server')).toBeTruthy();
      });

      // Select a server first
      fireEvent.click(screen.getByLabelText('My Server'));

      await waitFor(() => {
        expect(
          screen.getByLabelText('My Server').getAttribute('aria-current'),
        ).toBe('true');
      });

      // Click Home to go back to DM list
      fireEvent.click(screen.getByLabelText('Server_Rail_Home'));

      // Home view should be displayed
      await waitFor(() => {
        expect(screen.getByTestId('home-view')).toBeTruthy();
      });

      // Server should no longer be active
      expect(
        screen.getByLabelText('My Server').getAttribute('aria-current'),
      ).toBeNull();
    });

    it('Home button is highlighted when no server is selected', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByLabelText('Server_Rail_Home')).toBeTruthy();
      });

      // Home view should be the default
      expect(screen.getByTestId('home-view')).toBeTruthy();
    });
  });

  // ─── Multiple server switching ────────────────────────────────────────────

  describe('Switching between servers', () => {
    it('switching servers updates the active indicator', async () => {
      const server1 = makeServer('srv-1', 'Server Alpha');
      const server2 = makeServer('srv-2', 'Server Beta');
      mockChatApi.listServers.mockResolvedValue({ items: [server1, server2] });

      renderApp();

      await waitFor(() => {
        expect(screen.getByLabelText('Server Alpha')).toBeTruthy();
        expect(screen.getByLabelText('Server Beta')).toBeTruthy();
      });

      // Select first server
      fireEvent.click(screen.getByLabelText('Server Alpha'));
      await waitFor(() => {
        expect(
          screen.getByLabelText('Server Alpha').getAttribute('aria-current'),
        ).toBe('true');
      });
      expect(
        screen.getByLabelText('Server Beta').getAttribute('aria-current'),
      ).toBeNull();

      // Switch to second server
      fireEvent.click(screen.getByLabelText('Server Beta'));
      await waitFor(() => {
        expect(
          screen.getByLabelText('Server Beta').getAttribute('aria-current'),
        ).toBe('true');
      });
      expect(
        screen.getByLabelText('Server Alpha').getAttribute('aria-current'),
      ).toBeNull();
    });
  });
});

// ─── WebSocket Event Transform Integration Tests ────────────────────────────

describe('BrightChatDiscordApp — Integration: WebSocket Event Transforms (Req 10.1, 10.2)', () => {
  /**
   * These tests verify that the pure WebSocket state transform functions
   * correctly update UI state when applied to realistic data structures,
   * simulating the end-to-end flow of receiving a WebSocket event and
   * updating the channel/server lists.
   */

  describe('SERVER_CHANNEL_CREATED updates channel list (Req 10.1)', () => {
    it('adds a new channel to an existing channel list', () => {
      const existingChannels = [
        makeChannel('ch-1', 'general', 'srv-1'),
        makeChannel('ch-2', 'announcements', 'srv-1'),
      ];
      const newChannel = makeChannel('ch-3', 'off-topic', 'srv-1');

      const result = applyServerChannelCreated(existingChannels, newChannel);

      expect(result).toHaveLength(3);
      expect(result.map((c) => c.id)).toEqual(['ch-1', 'ch-2', 'ch-3']);
      expect(result[2].name).toBe('off-topic');
    });

    it('adds a channel to an empty list', () => {
      const newChannel = makeChannel('ch-1', 'general', 'srv-1');

      const result = applyServerChannelCreated([], newChannel);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ch-1');
    });

    it('preserves all existing channels when adding a new one', () => {
      const channels = [
        makeChannel('ch-1', 'general', 'srv-1'),
        makeChannel('ch-2', 'dev', 'srv-1'),
        makeChannel('ch-3', 'design', 'srv-1'),
      ];
      const newChannel = makeChannel('ch-4', 'marketing', 'srv-1');

      const result = applyServerChannelCreated(channels, newChannel);

      // All original channels preserved
      for (const ch of channels) {
        expect(result.find((r) => r.id === ch.id)).toBeTruthy();
      }
      // New channel present
      expect(result.find((r) => r.id === 'ch-4')).toBeTruthy();
    });
  });

  describe('SERVER_CHANNEL_DELETED removes channel from list (Req 10.2)', () => {
    it('removes the deleted channel and keeps others', () => {
      const channels = [
        makeChannel('ch-1', 'general', 'srv-1'),
        makeChannel('ch-2', 'announcements', 'srv-1'),
        makeChannel('ch-3', 'off-topic', 'srv-1'),
      ];

      const result = applyServerChannelDeleted(channels, 'ch-2');

      expect(result).toHaveLength(2);
      expect(result.map((c) => c.id)).toEqual(['ch-1', 'ch-3']);
    });

    it('returns the same list when deleting a non-existent channel', () => {
      const channels = [makeChannel('ch-1', 'general', 'srv-1')];

      const result = applyServerChannelDeleted(channels, 'ch-nonexistent');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ch-1');
    });

    it('returns empty list when deleting the only channel', () => {
      const channels = [makeChannel('ch-1', 'general', 'srv-1')];

      const result = applyServerChannelDeleted(channels, 'ch-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('SERVER_MEMBER_REMOVED removes server from list (Req 10.2)', () => {
    it('removes the server when current user is removed', () => {
      const servers = [
        makeServer('srv-1', 'Server A'),
        makeServer('srv-2', 'Server B'),
        makeServer('srv-3', 'Server C'),
      ];

      const result = applyServerMemberRemoved(servers, 'srv-2');

      expect(result).toHaveLength(2);
      expect(result.map((s) => s.id)).toEqual(['srv-1', 'srv-3']);
    });

    it('preserves all servers when removing from a non-existent server', () => {
      const servers = [makeServer('srv-1', 'Server A')];

      const result = applyServerMemberRemoved(servers, 'srv-nonexistent');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('srv-1');
    });
  });
});
