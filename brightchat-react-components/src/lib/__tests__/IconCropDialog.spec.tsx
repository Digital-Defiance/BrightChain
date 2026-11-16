/**
 * Unit tests for IconCropDialog component.
 *
 * Tests file picker, staging, crop area, zoom, confirm/cancel, error display,
 * and keyboard navigation.
 *
 * Validates: Requirements 5.1–5.10, 9.1–9.6
 */

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Crop area the mock cropper reports once mounted (null = reports nothing,
// as when the image has not loaded yet). Set per test.
let mockReportedArea: {
  x: number;
  y: number;
  width: number;
  height: number;
} | null = null;

// Mock react-easy-crop (doesn't work in jsdom)
jest.mock('react-easy-crop', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    __esModule: true,
    default: function MockCropper(
      props: import('react-easy-crop').CropperProps,
    ) {
      const { onCropComplete, mediaProps = {} } = props;
      React.useEffect(() => {
        if (mockReportedArea) {
          onCropComplete?.(mockReportedArea, mockReportedArea);
        }
        // Report once on mount, like the real cropper after image load.
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      // Store props for test assertions. The <img> carries the cropper's
      // media error handler so a test can fire a load failure on it.
      return React.createElement(
        'div',
        {
          'data-testid': 'mock-cropper',
          'data-zoom': props.zoom,
          'data-aspect': props.aspect,
          'data-crop-shape': props.cropShape,
          'data-image': props.image,
        },
        React.createElement('img', {
          'data-testid': 'mock-cropper-media',
          alt: '',
          onError: mediaProps.onError,
        }),
      );
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

// Canvas cropping is unavailable in jsdom; the real helper is unit-tested
// separately (clampCropArea below), so stub only the canvas step here.
jest.mock('../IconCropDialog.helpers', () => ({
  ...jest.requireActual<typeof import('../IconCropDialog.helpers')>(
    '../IconCropDialog.helpers',
  ),
  cropImageToFile: jest.fn(),
}));

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type { IconCropDialogProps } from '../IconCropDialog';
import IconCropDialog from '../IconCropDialog';
import {
  clampCropArea,
  cropImageToFile,
  IconCropError,
} from '../IconCropDialog.helpers';

const mockCropImageToFile = jest.mocked(cropImageToFile);

afterEach(() => {
  mockReportedArea = null;
  mockCropImageToFile.mockReset();
});

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

  it('calls onCropComplete with the cropped commitToken on confirm', async () => {
    mockReportedArea = { x: 0, y: 0, width: 10, height: 10 };
    mockCropImageToFile.mockResolvedValue(createFile('server-icon.png', 64));
    const onCropComplete = jest.fn();
    const chatApi = createMockChatApi();
    renderDialog({ chatApi, onCropComplete });

    // Stage a file first
    const fileInput = screen.getByTestId('icon-file-input');
    fireEvent.change(fileInput, {
      target: { files: [createFile('icon.png', 1024)] },
    });

    // Confirm enables once the cropper has reported its area.
    await waitFor(() => {
      expect(
        screen.getByText('Server_Icon_CropConfirm').hasAttribute('disabled'),
      ).toBe(false);
    });
    // Click confirm
    fireEvent.click(screen.getByText('Server_Icon_CropConfirm'));
    await waitFor(() => {
      expect(onCropComplete).toHaveBeenCalledWith('test-commit-token-123');
    });
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
    mockReportedArea = { x: 0, y: 0, width: 10, height: 10 };
    mockCropImageToFile.mockResolvedValue(createFile('server-icon.png', 64));
    const onCropComplete = jest.fn();
    renderDialog({
      onCropComplete,
      initialPreviewUrl: '/api/temp-upload/token/preview',
      initialCommitToken: 'token',
    });

    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Enter' });
    await waitFor(() => {
      expect(onCropComplete).toHaveBeenCalledWith('test-commit-token-123');
    });
  });

  it('keeps Confirm disabled and ignores Enter until the cropper reports an area', () => {
    // mockReportedArea stays null: the image has not loaded yet.
    const onCropComplete = jest.fn();
    renderDialog({
      onCropComplete,
      initialPreviewUrl: '/api/temp-upload/token/preview',
      initialCommitToken: 'token',
    });
    expect(
      screen.getByText('Server_Icon_CropConfirm').hasAttribute('disabled'),
    ).toBe(true);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' });
    expect(mockCropImageToFile).not.toHaveBeenCalled();
    expect(onCropComplete).not.toHaveBeenCalled();
  });

  it('disables Confirm again when a new file is selected, until its area is reported', async () => {
    mockReportedArea = { x: 0, y: 0, width: 10, height: 10 };
    renderDialog({
      initialPreviewUrl: '/api/temp-upload/token/preview',
      initialCommitToken: 'token',
    });
    expect(
      screen.getByText('Server_Icon_CropConfirm').hasAttribute('disabled'),
    ).toBe(false);
    // The new image's cropper reports nothing, so the old rectangle must not linger.
    mockReportedArea = null;
    fireEvent.change(screen.getByTestId('icon-file-input'), {
      target: { files: [createFile('next.png', 1024)] },
    });
    await waitFor(() => {
      expect(
        screen.getByText('Server_Icon_CropConfirm').hasAttribute('disabled'),
      ).toBe(true);
    });
  });

  it('shows a translated error and keeps Confirm disabled when the preview image fails to load', () => {
    // mockReportedArea stays null: a failed image never reports an area.
    renderDialog({
      initialPreviewUrl: '/api/temp-upload/token/preview',
      initialCommitToken: 'token',
    });
    expect(screen.queryByTestId('icon-crop-error')).toBeNull();
    fireEvent.error(screen.getByTestId('mock-cropper-media'));
    expect(screen.getByTestId('icon-crop-error').textContent).toBe(
      'Server_Icon_PreviewLoadFailed',
    );
    expect(
      screen.getByText('Server_Icon_CropConfirm').hasAttribute('disabled'),
    ).toBe(true);
  });

  it('handles Escape key to cancel (Req 9.2)', () => {
    const onClose = jest.fn();
    renderDialog({ onClose });

    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
  });
});

describe('IconCropDialog — applying the crop on confirm', () => {
  const croppedStagingResponse = {
    ...mockStagingResponse,
    commitToken: 'cropped-commit-token',
    previewUrl: '/api/temp-upload/cropped-commit-token/preview',
  };

  it('crops the selection, stages the cropped file and completes with its token', async () => {
    mockReportedArea = { x: 10, y: 20, width: 100, height: 100 };
    const croppedFile = createFile('server-icon.png', 512);
    mockCropImageToFile.mockResolvedValue(croppedFile);
    const chatApi = createMockChatApi({
      stageFile: jest.fn().mockResolvedValue(croppedStagingResponse),
    });
    const onImageStaged = jest.fn();
    const onCropComplete = jest.fn();
    renderDialog({
      chatApi,
      onImageStaged,
      onCropComplete,
      initialPreviewUrl: '/api/temp-upload/raw-token/preview',
      initialCommitToken: 'raw-token',
    });

    fireEvent.click(screen.getByText('Server_Icon_CropConfirm'));

    await waitFor(() => {
      expect(onCropComplete).toHaveBeenCalledWith('cropped-commit-token');
    });
    expect(mockCropImageToFile).toHaveBeenCalledWith(
      '/api/temp-upload/raw-token/preview',
      mockReportedArea,
    );
    expect(chatApi.stageFile).toHaveBeenCalledWith(croppedFile);
    // The parent's preview switches to the cropped image.
    expect(onImageStaged).toHaveBeenCalledWith(
      'cropped-commit-token',
      '/api/temp-upload/cropped-commit-token/preview',
    );
    expect(onCropComplete).not.toHaveBeenCalledWith('raw-token');
  });

  it('keeps the dialog open with an error and never sends the uncropped image when cropping fails', async () => {
    mockReportedArea = { x: 0, y: 0, width: 50, height: 50 };
    mockCropImageToFile.mockRejectedValue(new Error('Canvas export failed'));
    const chatApi = createMockChatApi();
    const onCropComplete = jest.fn();
    renderDialog({
      chatApi,
      onCropComplete,
      initialPreviewUrl: '/api/temp-upload/raw-token/preview',
      initialCommitToken: 'raw-token',
    });

    fireEvent.click(screen.getByText('Server_Icon_CropConfirm'));

    await waitFor(() => {
      expect(screen.getByTestId('icon-crop-error').textContent).toBe(
        'Server_Icon_CropFailed',
      );
    });
    expect(onCropComplete).not.toHaveBeenCalled();
    expect(chatApi.stageFile).not.toHaveBeenCalled();
  });

  it('shows the too-large message when the cropped icon exceeds the size limit', async () => {
    mockReportedArea = { x: 0, y: 0, width: 50, height: 50 };
    mockCropImageToFile.mockRejectedValue(
      new IconCropError('too-large', 'Cropped icon exceeds the size limit'),
    );
    const chatApi = createMockChatApi();
    renderDialog({
      chatApi,
      initialPreviewUrl: '/api/temp-upload/raw-token/preview',
      initialCommitToken: 'raw-token',
    });
    fireEvent.click(screen.getByText('Server_Icon_CropConfirm'));
    await waitFor(() => {
      expect(screen.getByTestId('icon-crop-error').textContent).toBe(
        'Server_Icon_FileTooLarge',
      );
    });
    expect(chatApi.stageFile).not.toHaveBeenCalled();
  });

  it('shows a generic staging error and does not complete when the cropped upload fails', async () => {
    mockReportedArea = { x: 0, y: 0, width: 50, height: 50 };
    mockCropImageToFile.mockResolvedValue(createFile('server-icon.png', 256));
    const chatApi = createMockChatApi({
      stageFile: jest.fn().mockRejectedValue(new Error('Network error')),
    });
    const onCropComplete = jest.fn();
    renderDialog({
      chatApi,
      onCropComplete,
      initialPreviewUrl: '/api/temp-upload/raw-token/preview',
      initialCommitToken: 'raw-token',
    });
    fireEvent.click(screen.getByText('Server_Icon_CropConfirm'));
    await waitFor(() => {
      expect(screen.getByTestId('icon-crop-error').textContent).toBe(
        'Server_Icon_StagingFailed',
      );
    });
    expect(onCropComplete).not.toHaveBeenCalled();
  });
  it('crops, stages and completes once when confirm is triggered twice while staging is pending', async () => {
    mockReportedArea = { x: 0, y: 0, width: 50, height: 50 };
    mockCropImageToFile.mockResolvedValue(createFile('server-icon.png', 256));
    let resolveStage: (value: typeof mockStagingResponse) => void = () => {
      throw new Error('stageFile was not called');
    };
    const chatApi = createMockChatApi({
      stageFile: jest.fn().mockReturnValue(
        new Promise<typeof mockStagingResponse>((resolve) => {
          resolveStage = resolve;
        }),
      ),
    });
    const onCropComplete = jest.fn();
    renderDialog({
      chatApi,
      onCropComplete,
      initialPreviewUrl: '/api/temp-upload/raw-token/preview',
      initialCommitToken: 'raw-token',
    });
    const confirmBtn = screen.getByText('Server_Icon_CropConfirm');
    // Both clicks run before React re-renders the button as disabled.
    act(() => {
      confirmBtn.click();
      confirmBtn.click();
    });
    await waitFor(() => expect(chatApi.stageFile).toHaveBeenCalledTimes(1));
    // A further confirm while the upload is still pending is also ignored.
    fireEvent.click(confirmBtn);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' });
    resolveStage(mockStagingResponse);
    await waitFor(() => expect(onCropComplete).toHaveBeenCalledTimes(1));
    expect(mockCropImageToFile).toHaveBeenCalledTimes(1);
    expect(chatApi.stageFile).toHaveBeenCalledTimes(1);
    expect(onCropComplete).toHaveBeenCalledWith(
      mockStagingResponse.commitToken,
    );
  });
});
describe('clampCropArea', () => {
  it('keeps an area that lies inside the image, rounding each edge to whole pixels', () => {
    // Edges: left 10.4→10, right 60.6→61, top 5.6→6, bottom 56.3→56.
    expect(
      clampCropArea({ x: 10.4, y: 5.6, width: 50.2, height: 50.7 }, 200, 100),
    ).toEqual({
      x: 10,
      y: 6,
      width: 51,
      height: 50,
    });
  });

  it('trims an area that overhangs the right and bottom edges', () => {
    expect(
      clampCropArea({ x: 150, y: 80, width: 100, height: 100 }, 200, 100),
    ).toEqual({
      x: 150,
      y: 80,
      width: 50,
      height: 20,
    });
  });

  it('trims an area that overhangs the left and top edges instead of shifting it', () => {
    expect(
      clampCropArea({ x: -5, y: -3, width: 20, height: 20 }, 100, 100),
    ).toEqual({
      x: 0,
      y: 0,
      width: 15,
      height: 17,
    });
  });

  it('returns null when the area is entirely outside the image', () => {
    expect(
      clampCropArea({ x: 300, y: 0, width: 10, height: 10 }, 200, 100),
    ).toBeNull();
  });
});
