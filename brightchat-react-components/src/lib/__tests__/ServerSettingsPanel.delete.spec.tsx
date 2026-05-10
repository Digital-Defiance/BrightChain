/**
 * Unit tests for the "Delete Server" functionality in ServerSettingsPanel.
 *
 * Covers visibility rules (owner-only, requires onDeleteServer prop),
 * confirmation dialog flow, and callback invocation.
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

jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useI18n: () => ({
    tComponent: (_componentId: string, key: string) => key,
    tBranded: (key: string) => key,
  }),
}));

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

// ─── Fixtures ───────────────────────────────────────────────────────────────

const mockServer = {
  id: 'srv-1',
  name: 'Test Server',
  ownerId: 'user-1',
  memberIds: ['user-1'],
  channelIds: ['ch-1'],
  categories: [
    { id: 'cat-1', name: 'General', position: 0, channelIds: ['ch-1'] },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

/** Render helper with sensible defaults; every prop can be overridden. */
function renderPanel(overrides: Partial<ServerSettingsPanelProps> = {}) {
  const defaultProps: ServerSettingsPanelProps = {
    open: true,
    onClose: jest.fn(),
    server: mockServer,
    members: [],
    invites: [],
    currentUserRole: DefaultRoleEnum.OWNER as any,
    onUpdateServer: jest.fn().mockResolvedValue(undefined),
    onAssignRole: jest.fn().mockResolvedValue(undefined),
    onRemoveMember: jest.fn().mockResolvedValue(undefined),
    onCreateInvite: jest.fn().mockResolvedValue({
      token: 'tok',
      serverId: 'srv-1',
      createdBy: 'user-1',
      createdAt: new Date(),
      currentUses: 0,
    }),
    onCreateCategory: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return {
    ...render(<ServerSettingsPanel {...defaultProps} />),
    props: defaultProps,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ServerSettingsPanel — Delete Server', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Visibility ──────────────────────────────────────────────────────

  it('does not show the delete button when onDeleteServer is not provided', () => {
    renderPanel({ onDeleteServer: undefined });

    expect(screen.queryByTestId('delete-server-button')).toBeNull();
  });

  it('does not show the delete button when currentUserRole is not OWNER', () => {
    renderPanel({
      onDeleteServer: jest.fn().mockResolvedValue(undefined),
      currentUserRole: DefaultRoleEnum.MEMBER as any,
    });

    expect(screen.queryByTestId('delete-server-button')).toBeNull();
  });

  it('shows the delete button when onDeleteServer is provided and role is OWNER', () => {
    renderPanel({
      onDeleteServer: jest.fn().mockResolvedValue(undefined),
    });

    expect(screen.getByTestId('delete-server-button')).toBeTruthy();
  });

  // ── Confirmation dialog ─────────────────────────────────────────────

  it('opens the confirmation dialog when the delete button is clicked', () => {
    renderPanel({
      onDeleteServer: jest.fn().mockResolvedValue(undefined),
    });

    // Dialog should not be visible yet
    expect(screen.queryByTestId('delete-server-confirm-dialog')).toBeNull();

    fireEvent.click(screen.getByTestId('delete-server-button'));

    expect(screen.getByTestId('delete-server-confirm-dialog')).toBeTruthy();
  });

  it('calls onDeleteServer with the server id when confirmed', async () => {
    const onDeleteServer = jest.fn().mockResolvedValue(undefined);
    const { props } = renderPanel({ onDeleteServer });

    // Open dialog
    fireEvent.click(screen.getByTestId('delete-server-button'));

    // Confirm deletion
    fireEvent.click(screen.getByTestId('delete-server-confirm-button'));

    await waitFor(() => {
      expect(onDeleteServer).toHaveBeenCalledWith('srv-1');
    });

    // Panel should close after successful deletion
    await waitFor(() => {
      expect(props.onClose).toHaveBeenCalled();
    });
  });

  it('does not call onDeleteServer when the dialog is cancelled', async () => {
    const onDeleteServer = jest.fn().mockResolvedValue(undefined);
    renderPanel({ onDeleteServer });

    // Open dialog
    fireEvent.click(screen.getByTestId('delete-server-button'));
    expect(screen.getByTestId('delete-server-confirm-dialog')).toBeTruthy();

    // Cancel — the cancel button uses the same i18n key as icon-remove cancel
    const cancelButton = screen
      .getByTestId('delete-server-confirm-dialog')
      .querySelector('button:not([data-testid="delete-server-confirm-button"])');
    expect(cancelButton).toBeTruthy();
    fireEvent.click(cancelButton!);

    // Dialog should close
    await waitFor(() => {
      expect(
        screen.queryByTestId('delete-server-confirm-dialog'),
      ).toBeNull();
    });

    expect(onDeleteServer).not.toHaveBeenCalled();
  });
});
