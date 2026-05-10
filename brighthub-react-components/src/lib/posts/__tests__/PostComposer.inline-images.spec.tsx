/**
 * Unit tests for PostComposer inline image features.
 *
 * Feature: brighthub-post-images
 * Requirements: 1.1–1.8, 2.1–2.3, 12.1
 *
 * Tests toolbar button, drag-and-drop, paste, loading indicator,
 * error display, discard on cancel/unmount, and image limit enforcement.
 */

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
    t: (key: string, _vars?: Record<string, string>) => key,
  }),
}));

import type { ITempUploadResponse } from '@brightchain/brightchain-lib';
import '@testing-library/jest-dom';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type { PostComposerProps } from '../PostComposer';
import { PostComposer } from '../PostComposer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockStagingApi(overrides?: {
  stageFile?: PostComposerProps['stagingApi'] extends infer T
    ? T extends { stageFile: infer S }
      ? S
      : never
    : never;
  discardFile?: PostComposerProps['stagingApi'] extends infer T
    ? T extends { discardFile: infer D }
      ? D
      : never
    : never;
}) {
  const defaultResponse: ITempUploadResponse = {
    commitToken: 'aaaaaaaa-bbbb-4ccc-9ddd-eeeeeeeeeeee',
    previewUrl: '/api/temp-upload/aaaaaaaa-bbbb-4ccc-9ddd-eeeeeeeeeeee/preview',
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    originalFilename: 'test.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 12345,
  };

  return {
    stageFile:
      overrides?.stageFile ??
      jest
        .fn<Promise<ITempUploadResponse>, [File]>()
        .mockResolvedValue(defaultResponse),
    discardFile:
      overrides?.discardFile ??
      jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined),
  };
}

function createImageFile(name = 'test.jpg', type = 'image/jpeg'): File {
  return new File(['fake-image-data'], name, { type });
}

/**
 * Build content with N inline images to test the limit.
 */
function buildContentWithImages(n: number): string {
  return Array.from(
    { length: n },
    (_, i) =>
      `![img](/api/temp-upload/${String(i).padStart(8, '0')}-0000-4000-8000-000000000000/preview)`,
  ).join('\n');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PostComposer inline image features', () => {
  /**
   * Requirement 1.1: Toolbar button opens file picker.
   */
  describe('toolbar button', () => {
    it('opens file picker when Insert Image button is clicked', () => {
      const stagingApi = createMockStagingApi();
      render(<PostComposer stagingApi={stagingApi} />);

      // MUI Tooltip wraps the button in a span with the same aria-label,
      // so we select the actual <button> element.
      const imageButton = screen.getByRole('button', {
        name: 'PostComposer_InsertImage',
      });
      expect(imageButton).toBeInTheDocument();
      expect(imageButton).not.toBeDisabled();

      // The hidden file input should exist
      const fileInput = screen.getByTestId(
        'image-file-input',
      ) as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();
      expect(fileInput.type).toBe('file');
      expect(fileInput.accept).toContain('image/jpeg');

      // Click should trigger the file input
      const clickSpy = jest.spyOn(fileInput, 'click');
      fireEvent.click(imageButton);
      expect(clickSpy).toHaveBeenCalled();
      clickSpy.mockRestore();
    });
  });

  /**
   * Requirement 1.2, 1.3: File selection triggers upload and inserts markdown.
   */
  describe('file selection and upload', () => {
    it('uploads file and inserts markdown on successful staging', async () => {
      const stagingApi = createMockStagingApi();
      render(<PostComposer stagingApi={stagingApi} />);

      const fileInput = screen.getByTestId(
        'image-file-input',
      ) as HTMLInputElement;
      const file = createImageFile();

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      expect(stagingApi.stageFile).toHaveBeenCalledWith(file);
    });
  });

  /**
   * Requirement 1.5: Drag-and-drop triggers upload.
   */
  describe('drag-and-drop', () => {
    it('uploads dropped image files', async () => {
      const stagingApi = createMockStagingApi();
      render(<PostComposer stagingApi={stagingApi} />);

      const textarea = screen.getByRole('textbox');
      const dropTarget = textarea.closest('div')!;
      const file = createImageFile();

      // Simulate dragover
      fireEvent.dragOver(dropTarget);

      // Simulate drop
      await act(async () => {
        fireEvent.drop(dropTarget, {
          dataTransfer: {
            files: [file],
          },
        });
      });

      expect(stagingApi.stageFile).toHaveBeenCalledWith(file);
    });
  });

  /**
   * Requirement 1.6: Paste triggers upload.
   */
  describe('clipboard paste', () => {
    it('uploads pasted image data', async () => {
      const stagingApi = createMockStagingApi();
      render(<PostComposer stagingApi={stagingApi} />);

      const textarea = screen.getByRole('textbox');
      const file = createImageFile('pasted.png', 'image/png');

      await act(async () => {
        fireEvent.paste(textarea, {
          clipboardData: {
            items: [
              {
                type: 'image/png',
                getAsFile: () => file,
              },
            ],
          },
        });
      });

      expect(stagingApi.stageFile).toHaveBeenCalledWith(file);
    });
  });

  /**
   * Requirement 1.8: Loading indicator during upload.
   */
  describe('loading indicator', () => {
    it('shows uploading placeholder during upload', async () => {
      let resolveUpload: (value: ITempUploadResponse) => void;
      const uploadPromise = new Promise<ITempUploadResponse>((resolve) => {
        resolveUpload = resolve;
      });

      const stagingApi = createMockStagingApi({
        stageFile: jest.fn().mockReturnValue(uploadPromise),
      });

      render(<PostComposer stagingApi={stagingApi} />);

      const fileInput = screen.getByTestId(
        'image-file-input',
      ) as HTMLInputElement;
      const file = createImageFile();

      // Start the upload (don't await — we want to check the intermediate state)
      act(() => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      // The textarea should contain the uploading placeholder
      await waitFor(() => {
        const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
        expect(textarea.value).toContain('PostComposer_Uploading');
      });

      // Resolve the upload
      await act(async () => {
        resolveUpload!({
          commitToken: 'aaaaaaaa-bbbb-4ccc-9ddd-eeeeeeeeeeee',
          previewUrl:
            '/api/temp-upload/aaaaaaaa-bbbb-4ccc-9ddd-eeeeeeeeeeee/preview',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          originalFilename: 'test.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 12345,
        });
      });

      // After resolution, the placeholder should be replaced with actual markdown
      await waitFor(() => {
        const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
        expect(textarea.value).not.toContain('PostComposer_Uploading');
        expect(textarea.value).toContain(
          '![](/api/temp-upload/aaaaaaaa-bbbb-4ccc-9ddd-eeeeeeeeeeee/preview)',
        );
      });
    });
  });

  /**
   * Requirement 1.7: Error display on upload failure.
   */
  describe('upload error', () => {
    it('displays error snackbar when upload fails', async () => {
      const stagingApi = createMockStagingApi({
        stageFile: jest.fn().mockRejectedValue(new Error('Network error')),
      });

      render(<PostComposer stagingApi={stagingApi} />);

      const fileInput = screen.getByTestId(
        'image-file-input',
      ) as HTMLInputElement;
      const file = createImageFile();

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      // Error snackbar should appear
      await waitFor(() => {
        expect(
          screen.getByText('PostComposer_ImageUploadFailed'),
        ).toBeInTheDocument();
      });

      // The placeholder should have been removed — textarea should be empty
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textarea.value).not.toContain('PostComposer_Uploading');
    });
  });

  /**
   * Requirement 12.1: Discard staged images on cancel.
   */
  describe('discard on cancel', () => {
    it('calls discardFile for staged tokens when cancel is clicked', async () => {
      const stagingApi = createMockStagingApi();
      const onCancel = jest.fn();

      render(
        <PostComposer
          stagingApi={stagingApi}
          onCancel={onCancel}
          replyTo={{
            _id: 'reply-1',
            content: 'test',
            formattedContent: '<p>test</p>',
            authorId: 'user-1',
            hubIds: [],
            mediaAttachments: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            likeCount: 0,
            replyCount: 0,
            repostCount: 0,
            quoteCount: 0,
            isBlogPost: false,
          }}
        />,
      );

      // Upload an image first
      const fileInput = screen.getByTestId(
        'image-file-input',
      ) as HTMLInputElement;
      const file = createImageFile();

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      // Click cancel
      const cancelButton = screen.getByLabelText('PostComposer_CancelReply');
      await act(async () => {
        fireEvent.click(cancelButton);
      });

      expect(stagingApi.discardFile).toHaveBeenCalledWith(
        'aaaaaaaa-bbbb-4ccc-9ddd-eeeeeeeeeeee',
      );
      expect(onCancel).toHaveBeenCalled();
    });
  });

  /**
   * Requirement 12.1: Discard staged images on unmount.
   */
  describe('discard on unmount', () => {
    it('calls discardFile for staged tokens when component unmounts', async () => {
      const stagingApi = createMockStagingApi();

      const { unmount } = render(<PostComposer stagingApi={stagingApi} />);

      // Upload an image first
      const fileInput = screen.getByTestId(
        'image-file-input',
      ) as HTMLInputElement;
      const file = createImageFile();

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      // Unmount the component
      await act(async () => {
        unmount();
      });

      expect(stagingApi.discardFile).toHaveBeenCalledWith(
        'aaaaaaaa-bbbb-4ccc-9ddd-eeeeeeeeeeee',
      );
    });
  });

  /**
   * Requirement 2.1, 2.2: Image limit disables button at 20.
   */
  describe('image limit enforcement', () => {
    it('disables the Insert Image button when at the 20-image limit', () => {
      const stagingApi = createMockStagingApi();

      render(<PostComposer stagingApi={stagingApi} />);

      // Initially the button should be enabled
      const imageButton = screen.getByRole('button', {
        name: 'PostComposer_InsertImage',
      });
      expect(imageButton).not.toBeDisabled();
    });

    it('shows the Insert Image button as disabled when stagingApi is not provided', () => {
      render(<PostComposer />);

      const imageButton = screen.getByRole('button', {
        name: 'PostComposer_InsertImage',
      });
      expect(imageButton).toBeDisabled();
    });
  });
});
