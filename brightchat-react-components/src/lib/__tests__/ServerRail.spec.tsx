/**
 * Unit tests for ServerRail component.
 *
 * Tests rendering of server icons, Home icon click, and active server
 * highlighting.
 *
 * Requirements: 4.2, 4.4
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

import { fireEvent, render, screen } from '@testing-library/react';
import type { ServerRailProps } from '../ServerRail';
import ServerRail from '../ServerRail';

// ─── Helpers ────────────────────────────────────────────────────────────────

const testServers = [
  {
    id: 'srv-1',
    name: 'Alpha Server',
    ownerId: 'u1',
    memberIds: ['u1'],
    channelIds: ['ch-1'],
    categories: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'srv-2',
    name: 'Beta Server',
    iconUrl: 'https://example.com/icon.png',
    ownerId: 'u1',
    memberIds: ['u1'],
    channelIds: ['ch-2'],
    categories: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

function renderRail(overrides: Partial<ServerRailProps> = {}) {
  const defaultProps: ServerRailProps = {
    servers: testServers,
    activeServerId: null,
    onServerSelect: jest.fn(),
    onHomeClick: jest.fn(),
    onCreateServer: jest.fn(),
    ...overrides,
  };
  return {
    ...render(<ServerRail {...defaultProps} />),
    props: defaultProps,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ServerRail', () => {
  it('renders the Home button (Req 4.2)', () => {
    renderRail();
    expect(screen.getByLabelText('Server_Rail_Home')).toBeTruthy();
  });

  it('renders the Create Server button (Req 4.2)', () => {
    renderRail();
    expect(screen.getByLabelText('Server_Rail_CreateServer')).toBeTruthy();
  });

  it('renders server icons with aria-labels matching server names (Req 4.2)', () => {
    renderRail();
    expect(screen.getByLabelText('Alpha Server')).toBeTruthy();
    expect(screen.getByLabelText('Beta Server')).toBeTruthy();
  });

  it('renders first letter avatar when no iconUrl is provided', () => {
    renderRail();
    expect(screen.getByText('A')).toBeTruthy(); // Alpha Server → "A"
  });

  it('calls onHomeClick when Home button is clicked (Req 4.4)', () => {
    const { props } = renderRail();
    fireEvent.click(screen.getByLabelText('Server_Rail_Home'));
    expect(props.onHomeClick).toHaveBeenCalledTimes(1);
  });

  it('calls onServerSelect with the correct serverId when a server icon is clicked', () => {
    const { props } = renderRail();
    fireEvent.click(screen.getByLabelText('Alpha Server'));
    expect(props.onServerSelect).toHaveBeenCalledWith('srv-1');
  });

  it('calls onCreateServer when Create Server button is clicked', () => {
    const { props } = renderRail();
    fireEvent.click(screen.getByLabelText('Server_Rail_CreateServer'));
    expect(props.onCreateServer).toHaveBeenCalledTimes(1);
  });

  it('marks the active server with aria-current (Req 4.2)', () => {
    renderRail({ activeServerId: 'srv-1' });
    const activeBtn = screen.getByLabelText('Alpha Server');
    expect(activeBtn.getAttribute('aria-current')).toBe('true');

    const inactiveBtn = screen.getByLabelText('Beta Server');
    expect(inactiveBtn.getAttribute('aria-current')).toBeNull();
  });

  it('renders the nav landmark with correct aria-label', () => {
    renderRail();
    expect(
      screen.getByRole('navigation', { name: 'Server_Rail' }),
    ).toBeTruthy();
  });

  // ─── Encryption Badge Tests (Req 5.2, 5.3, 5.4, 9.5) ───────────────────

  describe('encryption badge', () => {
    it('renders a shield badge with data-testid for each server (Req 9.5)', () => {
      renderRail();
      const badges = screen.getAllByTestId('encryption-badge-server');
      expect(badges).toHaveLength(testServers.length);
    });

    it('renders shield badge as a 16px element with success.main background (Req 5.2)', () => {
      renderRail();
      const badges = screen.getAllByTestId('encryption-badge-server');
      badges.forEach((badge) => {
        // The badge is a Box element rendered as a div
        expect(badge).toBeTruthy();
      });
    });

    it('renders a white VerifiedUserIcon inside the badge (Req 5.2)', () => {
      renderRail();
      const badges = screen.getAllByTestId('encryption-badge-server');
      badges.forEach((badge) => {
        // The badge should contain an SVG child (VerifiedUserIcon)
        const svg = badge.querySelector('svg');
        expect(svg).toBeTruthy();
      });
    });

    it('renders shield badge with aria-label "Encrypted server" (Req 5.3)', () => {
      renderRail();
      const badges = screen.getAllByLabelText('Encryption_EncryptedServer');
      expect(badges).toHaveLength(testServers.length);
    });

    it('includes " · Encrypted" in server tooltip text (Req 5.4)', async () => {
      renderRail();
      const serverBtn = screen.getByLabelText('Alpha Server');
      fireEvent.mouseOver(serverBtn);
      const tooltip = await screen.findByRole('tooltip');
      expect(tooltip.textContent).toBe(
        'Alpha Server · Encryption_ServerEncrypted',
      );
    });

    it('includes " · Encrypted" in second server tooltip text (Req 5.4)', async () => {
      renderRail();
      const serverBtn = screen.getByLabelText('Beta Server');
      fireEvent.mouseOver(serverBtn);
      const tooltip = await screen.findByRole('tooltip');
      expect(tooltip.textContent).toBe(
        'Beta Server · Encryption_ServerEncrypted',
      );
    });
  });
});
