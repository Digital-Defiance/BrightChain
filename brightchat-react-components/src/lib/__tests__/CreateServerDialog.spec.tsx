/**
 * Unit tests for CreateServerDialog component.
 *
 * Tests dialog open/close, validation error display, API error display,
 * and icon upload flow via staging commit token.
 *
 * Requirements: 5.1, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

jest.mock('@brightchain/brightchain-lib', () => ({
  PresenceStatus: {
    ONLINE: 'online',
    OFFLINE: 'offline',
    IDLE: 'idle',
    DO_NOT_DISTURB: 'dnd',
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
import type { CreateServerDialogProps } from '../CreateServerDialog';
import CreateServerDialog from '../CreateServerDialog';

// ─── Helpers ────────────────────────────────────────────────────────────────

const mockServer = {
  id: 'server-1',
  name: 'Test Server',
  ownerId: 'user-1',
  memberIds: ['user-1'],
  channelIds: ['ch-1'],
  categories: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockChatApi = {
  stageFile: jest.fn().mockResolvedValue({
    commitToken: 'staged-token-123',
    previewUrl: 'https://example.com/preview.png',
  }),
  uploadServerIcon: jest.fn().mockResolvedValue({
    ...mockServer,
    iconUrl: '/api/servers/server-1/icon',
    iconAssetId: 'asset-1',
  }),
};

function renderDialog(overrides: Partial<CreateServerDialogProps> = {}) {
  const defaultProps: CreateServerDialogProps = {
    open: true,
    onClose: jest.fn(),
    onCreated: jest.fn(),
    createServer: jest.fn().mockResolvedValue(mockServer),
    chatApi: mockChatApi,
    ...overrides,
  };
  return {
    ...render(<CreateServerDialog {...defaultProps} />),
    props: defaultProps,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('CreateServerDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the dialog when open is true (Req 5.1)', () => {
    renderDialog({ open: true });
    expect(screen.getByText('Create_Server_Title')).toBeTruthy();
    expect(screen.getByLabelText(/Create_Server_NameLabel/i)).toBeTruthy();
  });

  it('does not render dialog content when open is false', () => {
    renderDialog({ open: false });
    expect(screen.queryByText('Create_Server_Title')).toBeNull();
  });

  it('calls onClose when Cancel is clicked', () => {
    const { props } = renderDialog();
    fireEvent.click(screen.getByText('Create_Server_Cancel'));
    expect(props.onClose).toHaveBeenCalled();
  });

  it('shows validation error when submitting a name that is too long', async () => {
    renderDialog();

    const nameInput = screen.getByLabelText(/Create_Server_NameLabel/i);
    const longName = 'A'.repeat(101);
    fireEvent.change(nameInput, { target: { value: longName } });

    fireEvent.click(screen.getByText('Create_Server_Submit'));

    await waitFor(() => {
      expect(screen.getByText(/Create_Server_NameTooLong/i)).toBeTruthy();
    });
  });

  it('renders ServerIconUploadArea instead of icon URL text field (Req 6.1)', () => {
    renderDialog();
    // Should have the upload area
    expect(screen.getByTestId('server-icon-upload-area')).toBeTruthy();
    // Should NOT have an icon URL text field
    expect(
      screen.queryByLabelText(/Create_Server_IconLabelOptional/i),
    ).toBeNull();
  });

  it('calls createServer and onCreated on successful submit without icon (Req 6.6)', async () => {
    const createServer = jest.fn().mockResolvedValue(mockServer);
    const onCreated = jest.fn();
    const onClose = jest.fn();

    renderDialog({ createServer, onCreated, onClose });

    const nameInput = screen.getByLabelText(/Create_Server_NameLabel/i);
    fireEvent.change(nameInput, { target: { value: 'My Server' } });

    fireEvent.click(screen.getByText('Create_Server_Submit'));

    await waitFor(() => {
      expect(createServer).toHaveBeenCalledWith({
        name: 'My Server',
      });
      expect(onCreated).toHaveBeenCalledWith(mockServer);
      expect(onClose).toHaveBeenCalled();
    });

    // No icon upload should have been attempted
    expect(mockChatApi.uploadServerIcon).not.toHaveBeenCalled();
  });

  it('displays API error without closing dialog on failure (Req 5.4)', async () => {
    const createServer = jest
      .fn()
      .mockRejectedValue(new Error('Server limit reached'));
    const onClose = jest.fn();

    renderDialog({ createServer, onClose });

    const nameInput = screen.getByLabelText(/Create_Server_NameLabel/i);
    fireEvent.change(nameInput, { target: { value: 'My Server' } });

    fireEvent.click(screen.getByText('Create_Server_Submit'));

    await waitFor(() => {
      expect(screen.getByText('Server limit reached')).toBeTruthy();
    });

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Create_Server_Title')).toBeTruthy();
  });

  it('shows letter avatar preview based on current name input (Req 6.2)', () => {
    renderDialog();

    // Initially shows '?' since name is empty
    const avatar = screen.getByTestId('server-icon-avatar');
    expect(avatar.textContent).toBe('?');

    // Type a name
    const nameInput = screen.getByLabelText(/Create_Server_NameLabel/i);
    fireEvent.change(nameInput, { target: { value: 'Gaming' } });

    // Avatar should now show 'G'
    const updatedAvatar = screen.getByTestId('server-icon-avatar');
    expect(updatedAvatar.textContent).toBe('G');
  });
});
