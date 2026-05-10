/**
 * Unit tests for IconCropDialog component.
 *
 * Tests file picker, staging, crop area, zoom, confirm/cancel, error display,
 * and keyboard navigation.
 *
 * Validates: Requirements 5.1–5.10, 9.1–9.6
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Mock react-easy-crop (doesn't work in jsdom)
jest.mock('react-easy-crop', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props: any) => {
      // Store props for test assertions
      return React.createElement('div', {
        'data-testid': 'mock-cropper',
        'data-zoom': props.zoom,
        'data-aspect': props.aspect,
        'data-crop-shape': props.cropShape,
        'data-image': props.image,
      });
    },
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
import type { IconCropDialogProps } from '../IconCropDialog';
import IconCropDialog from '../IconCropDialog';

// ─── Helpers ────────────────────────────────────────────────────────────────

const mockStagingResponse = {
  commitToken: 'test-commit-token-123',
  previewUrl: '/api/temp-upload/test-commit-token-123/preview',
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
  originalFilename: 'icon.png',
  mimeType: 'image/png',
  sizeBytes: 1024,
};

function createMockChatApi(
  overrides: Partial<IconCropDialogProps['chatApi']> = {},
) {
  return {
    stageFile: jest.fn().mockResolvedValue(mockStagingResponse),
    ...overrides,
  };
}

function renderDialog(overrides: Partial<IconCropDialogProps> = {}) {
  const defaultProps: IconCropDialogProps = {
    open: true,
    onClose: jest.fn(),
    onImageStaged: jest.fn(),
    onCropComplete: jest.fn(),
    chatApi: createMockChatApi(),
    ...overrides,
  };
  return {
    ...render(<IconCropDialog {...defaultProps} />),
    props: defaultProps,
  };
}

function createFile(name: string, sizeBytes: number, type = 'image/png'): File {
  const buffer = new ArrayBuffer(sizeBytes);
  return new File([buffer], name, { type });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('IconCropDialog', () => {
  it('renders the dialog when open is true', () => {
    renderDialog({ open: true });
    expect(screen.getByText('Server_Icon_CropTitle')).toBeTruthy();
  });

  it('does not render dialog content when open is false', () => {
    renderDialog({ open: false });
    expect(screen.queryByText('Server_Icon_CropTitle')).toBeNull();
  });

  it('renders the browse button when no image is staged', () => {
    renderDialog();
    expect(screen.getByText('Server_Icon_DropOrBrowse')).toBeTruthy();
  });

  it('has a hidden file input with correct accept attribute (Req 9.1)', () => {
    renderDialog();
    const fileInput = screen.getByTestId('icon-file-input');
    expect(fileInput).toBeTruthy();
    expect(fileInput.getAttribute('accept')).toBe(
      'image/png,image/jpeg,image/gif,image/webp',
    );
    expect(fileInput.getAttribute('aria-label')).toBe(
      'Server_Icon_UploadLabel',
    );
  });

  it('rejects files larger than 5MB with client-side error (Req 5.10)', async () => {
    const chatApi = createMockChatApi();
    renderDialog({ chatApi });

    const fileInput = screen.getByTestId('icon-file-input');
    const largeFile = createFile('big.png', 6 * 1024 * 1024);

    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    // The validation is synchronous, but React state update needs a tick
    await waitFor(() => {
      const errorEl = screen.getByTestId('icon-crop-error');
      expect(errorEl.textContent).toBe('Server_Icon_FileTooLarge');
    });

    // Should NOT call stageFile
    expect(chatApi.stageFile).not.toHaveBeenCalled();
  });

  it('calls chatApi.stageFile on valid file selection', async () => {
    const chatApi = createMockChatApi();
    renderDialog({ chatApi });

    const fileInput = screen.getByTestId('icon-file-input');
    const validFile = createFile('icon.png', 1024);

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(chatApi.stageFile).toHaveBeenCalledWith(validFile);
    });
  });

  it('calls onImageStaged after successful staging', async () => {
    const onImageStaged = jest.fn();
    const chatApi = createMockChatApi();
    renderDialog({ chatApi, onImageStaged });

    const fileInput = screen.getByTestId('icon-file-input');
    const validFile = createFile('icon.png', 1024);

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(onImageStaged).toHaveBeenCalledWith(
        'test-commit-token-123',
        '/api/temp-upload/test-commit-token-123/preview',
      );
    });
  });

  it('renders crop area after staging succeeds', async () => {
    const chatApi = createMockChatApi();
    renderDialog({ chatApi });

    const fileInput = screen.getByTestId('icon-file-input');
    const validFile = createFile('icon.png', 1024);

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await waitFor(() => {
      const cropper = screen.getByTestId('mock-cropper');
      expect(cropper).toBeTruthy();
      expect(cropper.getAttribute('data-aspect')).toBe('1');
      expect(cropper.getAttribute('data-crop-shape')).toBe('round');
      expect(cropper.getAttribute('data-image')).toBe(
        '/api/temp-upload/test-commit-token-123/preview',
      );
    });
  });

  it('renders zoom slider after staging succeeds', async () => {
    const chatApi = createMockChatApi();
    renderDialog({ chatApi });

    const fileInput = screen.getByTestId('icon-file-input');
    fireEvent.change(fileInput, {
      target: { files: [createFile('icon.png', 1024)] },
    });

    await waitFor(() => {
      expect(screen.getByTestId('zoom-slider')).toBeTruthy();
      expect(screen.getByText('Server_Icon_ZoomLabel')).toBeTruthy();
    });
  });

  it('renders circular preview after staging succeeds (Req 5.5, 9.3)', async () => {
    const chatApi = createMockChatApi();
    renderDialog({ chatApi });

    const fileInput = screen.getByTestId('icon-file-input');
    fireEvent.change(fileInput, {
      target: { files: [createFile('icon.png', 1024)] },
    });

    await waitFor(() => {
      const preview = screen.getByTestId('icon-preview');
      expect(preview).toBeTruthy();
      expect(screen.getByAltText('Server_Icon_PreviewAlt')).toBeTruthy();
    });
  });

  it('calls onCropComplete with commitToken on confirm', async () => {
    const onCropComplete = jest.fn();
    const chatApi = createMockChatApi();
    renderDialog({ chatApi, onCropComplete });

    // Stage a file first
    const fileInput = screen.getByTestId('icon-file-input');
    fireEvent.change(fileInput, {
      target: { files: [createFile('icon.png', 1024)] },
    });

    await waitFor(() => {
      expect(screen.getByTestId('mock-cropper')).toBeTruthy();
    });

    // Click confirm
    fireEvent.click(screen.getByText('Server_Icon_CropConfirm'));

    expect(onCropComplete).toHaveBeenCalledWith('test-commit-token-123');
  });

  it('calls onClose on cancel without calling onCropComplete', () => {
    const onClose = jest.fn();
    const onCropComplete = jest.fn();
    renderDialog({ onClose, onCropComplete });

    fireEvent.click(screen.getByText('Server_Icon_CropCancel'));

    expect(onClose).toHaveBeenCalled();
    expect(onCropComplete).not.toHaveBeenCalled();
  });

  it('shows staging failure error inline (Req 5.9)', async () => {
    const chatApi = createMockChatApi({
      stageFile: jest.fn().mockRejectedValue(new Error('Network error')),
    });
    renderDialog({ chatApi });

    const fileInput = screen.getByTestId('icon-file-input');
    fireEvent.change(fileInput, {
      target: { files: [createFile('icon.png', 1024)] },
    });

    await waitFor(() => {
      expect(screen.getByTestId('icon-crop-error')).toBeTruthy();
      expect(screen.getByTestId('icon-crop-error').textContent).toBe(
        'Network error',
      );
    });
  });

  it('disables confirm button when no image is staged', () => {
    renderDialog();
    const confirmBtn = screen.getByText('Server_Icon_CropConfirm');
    expect(confirmBtn.hasAttribute('disabled')).toBe(true);
  });

  it('renders with initial preview URL and commit token', () => {
    renderDialog({
      initialPreviewUrl: '/api/temp-upload/existing-token/preview',
      initialCommitToken: 'existing-token',
    });

    const cropper = screen.getByTestId('mock-cropper');
    expect(cropper.getAttribute('data-image')).toBe(
      '/api/temp-upload/existing-token/preview',
    );
  });

  it('handles Enter key to confirm (Req 9.2)', async () => {
    const onCropComplete = jest.fn();
    renderDialog({
      onCropComplete,
      initialPreviewUrl: '/api/temp-upload/token/preview',
      initialCommitToken: 'token',
    });

    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Enter' });

    expect(onCropComplete).toHaveBeenCalledWith('token');
  });

  it('handles Escape key to cancel (Req 9.2)', () => {
    const onClose = jest.fn();
    renderDialog({ onClose });

    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
  });
});
