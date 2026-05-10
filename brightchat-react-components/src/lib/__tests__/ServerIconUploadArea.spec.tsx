/**
 * Unit tests for ServerIconUploadArea component.
 *
 * Tests avatar rendering, upload/change/remove buttons, uploading state,
 * error display, disabled state, and staging expiry.
 *
 * Validates: Requirements 6.1–6.3, 7.1–7.3
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Mock react-easy-crop (used by IconCropDialog internally)
jest.mock('react-easy-crop', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props: any) =>
      React.createElement('div', {
        'data-testid': 'mock-cropper',
        'data-image': props.image,
      }),
  };
});

jest.mock('@brightchain/brightchain-lib', () => ({
  DEFAULT_SERVER_ICON_CONFIG: {
    maxFileSizeBytes: 5 * 1024 * 1024,
    outputSizePx: 256,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
    outputMimeType: 'image/png',
  },
  isAllowedIconFileSize: (size: number) => size <= 5 * 1024 * 1024,
  isAllowedIconMimeType: (mime: string) =>
    ['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(mime),
  PresenceStatus: {
    ONLINE: 'online',
    OFFLINE: 'offline',
    IDLE: 'idle',
    DO_NOT_DISTURB: 'dnd',
  },
}));

jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useI18n: () => ({
    tComponent: (_componentId: string, key: string) => key,
    tBranded: (key: string) => key,
  }),
}));

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ServerIconUploadAreaProps } from '../ServerIconUploadArea';
import ServerIconUploadArea from '../ServerIconUploadArea';

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
  iconUrl: '/api/servers/server-1/icon',
  iconAssetId: 'asset-1',
  iconVaultContainerId: 'vault-1',
};

function createMockChatApi() {
  return {
    stageFile: jest.fn().mockResolvedValue({
      commitToken: 'test-token',
      previewUrl: '/api/temp-upload/test-token/preview',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      originalFilename: 'icon.png',
      mimeType: 'image/png',
      sizeBytes: 1024,
    }),
    uploadServerIcon: jest.fn().mockResolvedValue(mockServer),
  };
}

function renderArea(overrides: Partial<ServerIconUploadAreaProps> = {}) {
  const defaultProps: ServerIconUploadAreaProps = {
    serverName: 'Test Server',
    hasIcon: false,
    ...overrides,
  };
  return {
    ...render(<ServerIconUploadArea {...defaultProps} />),
    props: defaultProps,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ServerIconUploadArea', () => {
  it('renders letter avatar when no icon URL is provided', () => {
    renderArea({ serverName: 'My Server', hasIcon: false });
    const avatar = screen.getByTestId('server-icon-avatar');
    expect(avatar).toBeTruthy();
    expect(avatar.textContent).toBe('M');
  });

  it('renders image avatar when icon URL is provided', () => {
    renderArea({
      currentIconUrl: '/api/servers/s1/icon',
      hasIcon: true,
      serverName: 'My Server',
    });
    const avatar = screen.getByTestId('server-icon-avatar');
    const img = avatar.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toBe('/api/servers/s1/icon');
  });

  it('shows "Upload Icon" button when hasIcon is false', () => {
    renderArea({ hasIcon: false });
    expect(screen.getByText('Server_Icon_Upload')).toBeTruthy();
  });

  it('shows "Change Icon" button when hasIcon is true', () => {
    renderArea({ hasIcon: true, currentIconUrl: '/icon.png' });
    expect(screen.getByText('Server_Icon_Change')).toBeTruthy();
  });

  it('shows "Remove Icon" button only when hasIcon is true', () => {
    const { rerender } = render(
      <ServerIconUploadArea serverName="Test" hasIcon={false} />,
    );
    expect(screen.queryByTestId('remove-icon-button')).toBeNull();

    rerender(
      <ServerIconUploadArea
        serverName="Test"
        hasIcon={true}
        currentIconUrl="/icon.png"
      />,
    );
    expect(screen.getByTestId('remove-icon-button')).toBeTruthy();
  });

  it('calls onIconRemove when Remove button is clicked', () => {
    const onIconRemove = jest.fn();
    renderArea({
      hasIcon: true,
      currentIconUrl: '/icon.png',
      onIconRemove,
    });

    fireEvent.click(screen.getByTestId('remove-icon-button'));
    expect(onIconRemove).toHaveBeenCalled();
  });

  it('opens crop dialog when upload button is clicked', () => {
    const chatApi = createMockChatApi();
    renderArea({ chatApi, hasIcon: false });

    fireEvent.click(screen.getByTestId('upload-icon-button'));

    // The crop dialog should now be open
    expect(screen.getByText('Server_Icon_CropTitle')).toBeTruthy();
  });

  it('shows uploading state with progress indicator', () => {
    renderArea({ uploading: true, serverName: 'Test' });
    expect(screen.getByTestId('upload-progress')).toBeTruthy();
  });

  it('shows error message when error prop is provided', () => {
    renderArea({ error: 'Upload failed', serverName: 'Test' });
    expect(screen.getByTestId('icon-upload-error')).toBeTruthy();
    expect(screen.getByText('Upload failed')).toBeTruthy();
  });

  it('disables buttons when disabled prop is true', () => {
    renderArea({ disabled: true, hasIcon: true, currentIconUrl: '/icon.png' });
    expect(
      screen.getByTestId('upload-icon-button').hasAttribute('disabled'),
    ).toBe(true);
    expect(
      screen.getByTestId('remove-icon-button').hasAttribute('disabled'),
    ).toBe(true);
  });

  it('disables buttons when uploading', () => {
    renderArea({
      uploading: true,
      hasIcon: true,
      currentIconUrl: '/icon.png',
    });
    expect(
      screen.getByTestId('upload-icon-button').hasAttribute('disabled'),
    ).toBe(true);
    expect(
      screen.getByTestId('remove-icon-button').hasAttribute('disabled'),
    ).toBe(true);
  });

  it('shows staging expiry error when upload returns 410', async () => {
    const chatApi = createMockChatApi();
    chatApi.uploadServerIcon.mockRejectedValue(
      new Error('410: Staged file expired'),
    );

    renderArea({
      chatApi,
      serverId: 'server-1',
      hasIcon: false,
    });

    // Open crop dialog
    fireEvent.click(screen.getByTestId('upload-icon-button'));

    // Stage a file
    const fileInput = screen.getByTestId('icon-file-input');
    const file = new File([new ArrayBuffer(1024)], 'icon.png', {
      type: 'image/png',
    });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Wait for staging to complete
    await waitFor(() => {
      expect(chatApi.stageFile).toHaveBeenCalled();
    });

    // Click confirm in the crop dialog
    await waitFor(() => {
      const confirmBtn = screen.getByText('Server_Icon_CropConfirm');
      expect(confirmBtn.hasAttribute('disabled')).toBe(false);
      fireEvent.click(confirmBtn);
    });

    // Should show staging expired error
    await waitFor(() => {
      expect(screen.getByText('Server_Icon_StagingExpired')).toBeTruthy();
    });
  });

  it('has aria-live region for upload status (Req 9.4)', () => {
    renderArea({ uploading: true, serverName: 'Test' });
    const statusRegion = screen.getByRole('status');
    expect(statusRegion).toBeTruthy();
    expect(statusRegion.getAttribute('aria-live')).toBe('polite');
  });

  it('uses first letter of server name for fallback avatar', () => {
    renderArea({ serverName: 'awesome server', hasIcon: false });
    const avatar = screen.getByTestId('server-icon-avatar');
    expect(avatar.textContent).toBe('A');
  });
});
