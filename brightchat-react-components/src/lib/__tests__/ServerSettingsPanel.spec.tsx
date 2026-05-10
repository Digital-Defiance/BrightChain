/**
 * Unit tests for ServerSettingsPanel component.
 *
 * Tests tab rendering, role assignment controls, settings save API call,
 * icon upload/change flow, and icon removal with confirmation.
 *
 * Requirements: 8.1, 8.2, 8.4, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

const DefaultRoleEnum = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  MEMBER: 'member',
} as const;

jest.mock('@brightchain/brightchain-lib', () => ({
  PresenceStatus: {
    ONLINE: 'online',
    OFFLINE: 'offline',
    IDLE: 'idle',
    DO_NOT_DISTURB: 'dnd',
  },
  DefaultRole: DefaultRoleEnum,
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
  DEFAULT_SERVER_ICON_CONFIG: {
    maxFileSizeBytes: 5 * 1024 * 1024,
    outputSizePx: 256,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
    outputMimeType: 'image/png',
  },
  isAllowedIconFileSize: (size: number) => size <= 5 * 1024 * 1024,
  isAllowedIconMimeType: (mime: string) =>
    ['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(mime),
}));

// Mock useI18n to avoid requiring I18nProvider in tests
jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useI18n: () => ({
    tComponent: (_componentId: string, key: string) => key,
    tBranded: (key: string) => key,
  }),
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

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ServerSettingsPanelProps } from '../ServerSettingsPanel';
import ServerSettingsPanel from '../ServerSettingsPanel';

// ─── Helpers ────────────────────────────────────────────────────────────────

const testServer = {
  id: 'srv-1',
  name: 'Test Server',
  iconUrl: 'https://example.com/icon.png',
  ownerId: 'u1',
  memberIds: ['u1', 'u2'],
  channelIds: ['ch-1'],
  categories: [
    { id: 'cat-1', name: 'General', position: 0, channelIds: ['ch-1'] },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const testMembers = [
  {
    id: 'u1',
    displayName: 'Alice (Owner)',
    role: DefaultRoleEnum.OWNER as any,
  },
  {
    id: 'u2',
    displayName: 'Bob (Member)',
    role: DefaultRoleEnum.MEMBER as any,
  },
];

const testInvites = [
  {
    token: 'abc123def456ghi789',
    serverId: 'srv-1',
    createdBy: 'u1',
    createdAt: new Date(),
    currentUses: 3,
    maxUses: 10,
  },
];

const mockChatApi = {
  stageFile: jest.fn().mockResolvedValue({
    commitToken: 'staged-token-123',
    previewUrl: 'https://example.com/preview.png',
  }),
  uploadServerIcon: jest.fn().mockResolvedValue({
    ...testServer,
    iconUrl: '/api/servers/srv-1/icon',
    iconAssetId: 'asset-1',
  }),
};

function renderPanel(overrides: Partial<ServerSettingsPanelProps> = {}) {
  const defaultProps: ServerSettingsPanelProps = {
    open: true,
    onClose: jest.fn(),
    server: testServer,
    members: testMembers,
    invites: testInvites,
    currentUserRole: DefaultRoleEnum.OWNER as any,
    onUpdateServer: jest.fn().mockResolvedValue(undefined),
    onAssignRole: jest.fn().mockResolvedValue(undefined),
    onRemoveMember: jest.fn().mockResolvedValue(undefined),
    onCreateInvite: jest.fn().mockResolvedValue({
      token: 'new-token-xyz',
      serverId: 'srv-1',
      createdBy: 'u1',
      createdAt: new Date(),
      currentUses: 0,
    }),
    onCreateCategory: jest.fn().mockResolvedValue(undefined),
    onUploadServerIcon: jest.fn().mockResolvedValue(testServer),
    onRemoveServerIcon: jest.fn().mockResolvedValue({
      ...testServer,
      iconUrl: undefined,
      iconAssetId: undefined,
      iconVaultContainerId: undefined,
    }),
    chatApi: mockChatApi,
    ...overrides,
  };
  return {
    ...render(<ServerSettingsPanel {...defaultProps} />),
    props: defaultProps,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ServerSettingsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the panel title and server name (Req 8.1)', () => {
    renderPanel();
    expect(screen.getByText('Server_Settings_Title')).toBeTruthy();
    expect(screen.getByText('Test Server')).toBeTruthy();
  });

  it('renders all four tabs (Req 8.2)', () => {
    renderPanel();
    expect(screen.getByText('Server_Settings_Overview')).toBeTruthy();
    expect(screen.getByText('Server_Settings_Members')).toBeTruthy();
    expect(screen.getByText('Server_Settings_Categories')).toBeTruthy();
    expect(screen.getByText('Server_Settings_Invites')).toBeTruthy();
  });

  it('shows Overview tab content by default with Server Name field and icon upload area (Req 7.1)', () => {
    renderPanel();
    expect(
      screen.getByLabelText(/Server_Settings_ServerNameLabel/i),
    ).toBeTruthy();
    // Should have the icon upload area instead of icon URL text field
    expect(screen.getByTestId('server-icon-upload-area')).toBeTruthy();
    // Should NOT have an icon URL text field
    expect(screen.queryByLabelText(/Server_Settings_IconUrlLabel/i)).toBeNull();
    expect(screen.getByText('Server_Settings_Save')).toBeTruthy();
  });

  it('calls onUpdateServer when Save is clicked (Req 8.3)', async () => {
    const { props } = renderPanel();

    fireEvent.click(screen.getByText('Server_Settings_Save'));

    await waitFor(() => {
      expect(props.onUpdateServer).toHaveBeenCalled();
    });
  });

  it('switches to Members tab and shows member list (Req 8.4)', () => {
    renderPanel();

    fireEvent.click(screen.getByText('Server_Settings_Members'));

    expect(screen.getByText('Alice (Owner)')).toBeTruthy();
    expect(screen.getByText('Bob (Member)')).toBeTruthy();
  });

  it('shows role assignment dropdowns for owner (Req 8.4)', () => {
    renderPanel({ currentUserRole: DefaultRoleEnum.OWNER as any });

    fireEvent.click(screen.getByText('Server_Settings_Members'));

    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThan(0);
  });

  it('hides role assignment dropdowns for non-owner', () => {
    renderPanel({ currentUserRole: DefaultRoleEnum.ADMIN as any });

    fireEvent.click(screen.getByText('Server_Settings_Members'));

    const selects = screen.queryAllByRole('combobox');
    expect(selects.length).toBe(0);
  });

  it('switches to Categories tab and shows categories', () => {
    renderPanel();

    fireEvent.click(screen.getByText('Server_Settings_Categories'));

    expect(screen.getByText('General')).toBeTruthy();
    expect(screen.getByText('1 Server_Settings_ChannelCount')).toBeTruthy();
  });

  it('switches to Invites tab and shows invite list', () => {
    renderPanel();

    fireEvent.click(screen.getByText('Server_Settings_Invites'));

    expect(screen.getByText('Server_Settings_GenerateInvite')).toBeTruthy();
    expect(screen.getByText('Server_Settings_Uses 3/10')).toBeTruthy();
  });

  it('calls onCreateInvite when Generate Invite is clicked', async () => {
    const { props } = renderPanel();

    fireEvent.click(screen.getByText('Server_Settings_Invites'));
    fireEvent.click(screen.getByText('Server_Settings_GenerateInvite'));

    await waitFor(() => {
      expect(props.onCreateInvite).toHaveBeenCalled();
    });
  });

  it('does not render when open is false', () => {
    renderPanel({ open: false });
    expect(screen.queryByText('Server_Settings_Title')).toBeNull();
  });

  // ─── Icon change flow (Req 7.2, 7.4) ─────────────────────────────

  it('shows "Change Icon" button when server has an icon (Req 7.2)', () => {
    renderPanel();
    // The ServerIconUploadArea should show "Change Icon" when hasIcon is true
    expect(screen.getByTestId('upload-icon-button')).toBeTruthy();
    expect(screen.getByTestId('upload-icon-button').textContent).toBe(
      'Server_Icon_Change',
    );
  });

  // ─── Icon remove flow (Req 7.3, 7.5, 7.6) ────────────────────────

  it('shows "Remove Icon" button when server has an icon (Req 7.3)', () => {
    renderPanel();
    expect(screen.getByTestId('remove-icon-button')).toBeTruthy();
  });

  it('opens confirmation dialog when Remove Icon is clicked (Req 7.6)', () => {
    renderPanel();

    fireEvent.click(screen.getByTestId('remove-icon-button'));

    expect(screen.getByTestId('remove-icon-confirm-dialog')).toBeTruthy();
    expect(screen.getByText('Server_Icon_RemoveConfirmTitle')).toBeTruthy();
    expect(screen.getByText('Server_Icon_RemoveConfirm')).toBeTruthy();
  });

  it('calls onRemoveServerIcon when removal is confirmed (Req 7.5)', async () => {
    const { props } = renderPanel();

    // Click remove icon button
    fireEvent.click(screen.getByTestId('remove-icon-button'));

    // Confirm removal
    fireEvent.click(screen.getByTestId('remove-icon-confirm-button'));

    await waitFor(() => {
      expect(props.onRemoveServerIcon).toHaveBeenCalledWith('srv-1');
    });
  });

  it('does not call onRemoveServerIcon when removal is cancelled', async () => {
    const { props } = renderPanel();

    // Click remove icon button
    fireEvent.click(screen.getByTestId('remove-icon-button'));

    // Cancel removal
    fireEvent.click(screen.getByTestId('remove-icon-cancel-button'));

    // Confirmation dialog should close
    await waitFor(() => {
      expect(screen.queryByTestId('remove-icon-confirm-dialog')).toBeNull();
    });

    expect(props.onRemoveServerIcon).not.toHaveBeenCalled();
  });

  it('does not show Remove Icon button when server has no icon', () => {
    renderPanel({
      server: { ...testServer, iconUrl: undefined },
    });
    expect(screen.queryByTestId('remove-icon-button')).toBeNull();
  });
});
