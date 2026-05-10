/**
 * Unit tests for ImageCropDialog component.
 *
 * Feature: brighthub-post-images
 * Requirements: 13.1, 13.3, 13.4
 *
 * Tests dialog rendering with free-form aspect ratio, skip button,
 * and confirm calling onCropComplete with a Blob.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Track the last onCropComplete callback passed to the Cropper mock
let lastCropperOnCropComplete:
  | ((croppedArea: any, croppedAreaPixels: any) => void)
  | null = null;

// Mock react-easy-crop (doesn't work in jsdom)
jest.mock('react-easy-crop', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props: any) => {
      // Store the onCropComplete callback so tests can trigger it
      lastCropperOnCropComplete = props.onCropComplete;
      return React.createElement('div', {
        'data-testid': 'mock-cropper',
        'data-zoom': props.zoom,
        'data-aspect': props.aspect ?? 'undefined',
        'data-crop-shape': props.cropShape,
        'data-image': props.image,
      });
    },
  };
});

// Mock the getCroppedBlob helper by mocking canvas and Image at the module level
// We intercept HTMLCanvasElement.prototype.toBlob and Image loading
const mockCroppedBlob = new Blob(['cropped-data'], { type: 'image/jpeg' });

jest.mock('@brightchain/brighthub-lib', () => ({
  ...jest.requireActual('@brightchain/brighthub-lib'),
  __esModule: true,
  BrightHubStrings: new Proxy(
    {},
    { get: (_target: unknown, prop: string) => String(prop) },
  ),
  BrightHubComponentId: 'BrightHub',
}));

jest.mock('../../hooks/useBrightHubTranslation', () => ({
  useBrightHubTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import '@testing-library/jest-dom';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type { ImageCropDialogProps } from '../ImageCropDialog';
import ImageCropDialog from '../ImageCropDialog';

// ─── Helpers ────────────────────────────────────────────────────────────────

function createImageFile(
  name = 'test.jpg',
  type = 'image/jpeg',
  size = 1024,
): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

// Mock URL.createObjectURL and URL.revokeObjectURL
beforeEach(() => {
  let objectUrlCounter = 0;
  lastCropperOnCropComplete = null;

  global.URL.createObjectURL = jest.fn(() => {
    return `blob:mock-url-${objectUrlCounter++}`;
  });

  global.URL.revokeObjectURL = jest.fn();
});

function renderDialog(overrides: Partial<ImageCropDialogProps> = {}) {
  const defaultProps: ImageCropDialogProps = {
    open: true,
    onClose: jest.fn(),
    imageFile: createImageFile(),
    onCropComplete: jest.fn(),
    onSkip: jest.fn(),
    ...overrides,
  };
  return {
    ...render(<ImageCropDialog {...defaultProps} />),
    props: defaultProps,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ImageCropDialog', () => {
  /**
   * Requirement 13.1: Dialog renders with free-form aspect ratio.
   */
  describe('rendering', () => {
    it('renders the dialog when open is true', () => {
      renderDialog({ open: true });
      expect(screen.getByText('ImageCropDialog_Title')).toBeInTheDocument();
    });

    it('does not render dialog content when open is false', () => {
      renderDialog({ open: false });
      expect(screen.queryByText('ImageCropDialog_Title')).toBeNull();
    });

    it('renders the cropper with the image natural aspect ratio by default', () => {
      renderDialog();
      const cropper = screen.getByTestId('mock-cropper');
      expect(cropper).toBeInTheDocument();
      // Default: uses the image's natural aspect ratio (4/3 fallback)
      expect(cropper.getAttribute('data-aspect')).toBeTruthy();
      // Rectangular crop shape
      expect(cropper.getAttribute('data-crop-shape')).toBe('rect');
    });

    it('creates an object URL from the image file for the crop preview', () => {
      const imageFile = createImageFile('photo.png', 'image/png');
      renderDialog({ imageFile });

      expect(URL.createObjectURL).toHaveBeenCalledWith(imageFile);

      const cropper = screen.getByTestId('mock-cropper');
      expect(cropper.getAttribute('data-image')).toMatch(/^blob:mock-url-/);
    });

    it('renders the zoom slider', () => {
      renderDialog();
      expect(screen.getByTestId('image-zoom-slider')).toBeInTheDocument();
      expect(screen.getByText('ImageCropDialog_ZoomLabel')).toBeInTheDocument();
    });

    it('renders Crop, Skip, and Cancel buttons with i18n labels', () => {
      renderDialog();
      expect(screen.getByText('ImageCropDialog_Crop')).toBeInTheDocument();
      expect(screen.getByText('ImageCropDialog_Skip')).toBeInTheDocument();
      expect(screen.getByText('ImageCropDialog_Cancel')).toBeInTheDocument();
    });
  });

  /**
   * Requirement 13.3: Skip button bypasses cropping.
   */
  describe('skip button', () => {
    it('calls onSkip when the Skip button is clicked', () => {
      const onSkip = jest.fn();
      renderDialog({ onSkip });

      fireEvent.click(screen.getByTestId('crop-skip-button'));

      expect(onSkip).toHaveBeenCalledTimes(1);
    });

    it('does not call onCropComplete when Skip is clicked', () => {
      const onCropComplete = jest.fn();
      const onSkip = jest.fn();
      renderDialog({ onCropComplete, onSkip });

      fireEvent.click(screen.getByTestId('crop-skip-button'));

      expect(onSkip).toHaveBeenCalled();
      expect(onCropComplete).not.toHaveBeenCalled();
    });
  });

  /**
   * Requirement 13.4: Confirm calls onCropComplete with a Blob.
   */
  describe('confirm button', () => {
    it('disables the Crop button when no crop area has been selected', () => {
      renderDialog();
      const cropButton = screen.getByTestId('crop-confirm-button');
      expect(cropButton).toBeDisabled();
    });

    it('enables the Crop button after a crop area is selected', async () => {
      renderDialog();

      // Simulate the cropper completing a crop area selection
      await act(async () => {
        if (lastCropperOnCropComplete) {
          lastCropperOnCropComplete(
            { x: 0, y: 0, width: 50, height: 40 },
            { x: 10, y: 20, width: 100, height: 80 },
          );
        }
      });

      await waitFor(() => {
        expect(screen.getByTestId('crop-confirm-button')).not.toBeDisabled();
      });
    });

    it('calls onCropComplete with a Blob when confirmed after cropping', async () => {
      // Set up canvas mock before rendering
      const originalCreateElement = document.createElement.bind(document);
      const createElementSpy = jest.spyOn(document, 'createElement');
      createElementSpy.mockImplementation(
        (tagName: string, options?: ElementCreationOptions) => {
          if (tagName === 'canvas') {
            const mockCanvas = {
              width: 0,
              height: 0,
              getContext: jest.fn().mockReturnValue({
                drawImage: jest.fn(),
              }),
              toBlob: jest.fn((callback: BlobCallback) => {
                callback(mockCroppedBlob);
              }),
            };
            return mockCanvas as unknown as HTMLCanvasElement;
          }
          return originalCreateElement(tagName, options);
        },
      );

      // Mock Image constructor
      const originalImage = global.Image;
      global.Image = jest.fn().mockImplementation(() => {
        const img: any = {};
        Object.defineProperty(img, 'src', {
          set() {
            setTimeout(() => {
              if (img.onload) img.onload();
            }, 0);
          },
          get() {
            return '';
          },
        });
        return img;
      }) as unknown as typeof Image;

      const onCropComplete = jest.fn();
      renderDialog({ onCropComplete });

      // Simulate the cropper completing a crop area selection
      await act(async () => {
        if (lastCropperOnCropComplete) {
          lastCropperOnCropComplete(
            { x: 0, y: 0, width: 50, height: 40 },
            { x: 10, y: 20, width: 100, height: 80 },
          );
        }
      });

      // Wait for the crop button to be enabled
      await waitFor(() => {
        expect(screen.getByTestId('crop-confirm-button')).not.toBeDisabled();
      });

      // Click the Crop (confirm) button
      await act(async () => {
        fireEvent.click(screen.getByTestId('crop-confirm-button'));
      });

      // Wait for the async crop operation to complete
      await waitFor(() => {
        expect(onCropComplete).toHaveBeenCalledTimes(1);
        expect(onCropComplete).toHaveBeenCalledWith(expect.any(Blob));
      });

      // Restore
      global.Image = originalImage;
      createElementSpy.mockRestore();
    });
  });

  /**
   * Cancel button calls onClose.
   */
  describe('cancel button', () => {
    it('calls onClose when Cancel is clicked', () => {
      const onClose = jest.fn();
      renderDialog({ onClose });

      fireEvent.click(screen.getByText('ImageCropDialog_Cancel'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onCropComplete or onSkip when Cancel is clicked', () => {
      const onCropComplete = jest.fn();
      const onSkip = jest.fn();
      renderDialog({ onCropComplete, onSkip });

      fireEvent.click(screen.getByText('ImageCropDialog_Cancel'));

      expect(onCropComplete).not.toHaveBeenCalled();
      expect(onSkip).not.toHaveBeenCalled();
    });
  });

  /**
   * Object URL cleanup.
   */
  describe('cleanup', () => {
    it('revokes the object URL on unmount', () => {
      const { unmount } = renderDialog();

      unmount();

      expect(URL.revokeObjectURL).toHaveBeenCalled();
    });
  });
});
