/**
 * Unit tests for AttachmentBar component.
 *
 * Tests: empty state rendering, file picker trigger, remove button at boundary
 * indices, exactly-25-MB file accepted, 25MB+1 byte rejected, file picker cancel
 * leaves list unchanged.
 *
 * Requirements: 3.1, 3.2, 3.4, 3.5, 3.8
 */

import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

// Import after mocks
import AttachmentBar, {
  type AttachmentBarProps,
  type AttachmentFile,
} from '../AttachmentBar';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

const mockEngine = {
  translate: jest.fn((_componentId: string, key: string) => key),
  translateEnum: jest.fn((_enumType: unknown, value: unknown) => String(value)),
  registerIfNotExists: jest.fn(),
  registerStringKeyEnum: jest.fn(),
};

jest.mock('@brightchain/brightchain-lib', () => ({
  MAX_ATTACHMENT_SIZE_BYTES: MAX_BYTES,
  validateAttachmentSize: (size: number, max: number) => size <= max,
  validateTotalAttachmentSize: (sizes: number[], max: number) => {
    let total = 0;
    for (const s of sizes) {
      if (s > max) return false;
      total += s;
    }
    return total <= max;
  },
  formatFileSize: (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(2)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(2)} GB`;
  },
  getBrightChainI18nEngine: () => mockEngine,
}));

jest.mock('@brightchain/brightmail-lib', () => ({
  BrightMailStrings: new Proxy(
    {},
    { get: (_t: unknown, p: string | symbol) => String(p) },
  ),
  BrightMailComponentId: 'BrightMail',
}));

// Mock useI18n to avoid requiring I18nProvider in tests
jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useI18n: () => ({
    tComponent: (_componentId: string, key: string) => key,
    tBranded: (key: string) => key,
    currentLanguage: 'en-US',
  }),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeAttachment(name: string, sizeBytes: number): AttachmentFile {
  return {
    file: new File(['x'.repeat(Math.min(sizeBytes, 64))], name, {
      type: 'application/octet-stream',
    }),
    filename: name,
    mimeType: 'application/octet-stream',
    sizeBytes,
  };
}

function createMockFileList(files: File[]): FileList {
  const fileList = {
    length: files.length,
    item: (i: number) => files[i] ?? null,
    [Symbol.iterator]: function* () {
      for (let i = 0; i < files.length; i++) yield files[i];
    },
  } as unknown as FileList;
  for (let i = 0; i < files.length; i++) {
    (fileList as Record<number, File>)[i] = files[i];
  }
  return fileList;
}

function createFileWithSize(name: string, size: number): File {
  // We can't actually create a File with an arbitrary .size, so we use
  // Object.defineProperty to override it.
  const file = new File([''], name, { type: 'application/octet-stream' });
  Object.defineProperty(file, 'size', { value: size, writable: false });
  return file;
}

const defaultProps: AttachmentBarProps = {
  attachments: [],
  onChange: jest.fn(),
};

function renderBar(overrides: Partial<AttachmentBarProps> = {}) {
  return render(<AttachmentBar {...defaultProps} {...overrides} />);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('AttachmentBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Requirement 3.1: Empty state rendering ────────────────────────────

  it('renders the attachment bar container', () => {
    renderBar();
    expect(screen.getByTestId('attachment-bar')).toBeInTheDocument();
  });

  it('renders the attach button', () => {
    renderBar();
    expect(screen.getByTestId('attach-button')).toBeInTheDocument();
  });

  it('does not render the attachment list when there are no attachments', () => {
    renderBar();
    expect(screen.queryByTestId('attachment-list')).not.toBeInTheDocument();
  });

  it('does not render an error message initially', () => {
    renderBar();
    expect(screen.queryByTestId('attachment-error')).not.toBeInTheDocument();
  });

  // ── Requirement 3.2: File picker trigger ──────────────────────────────

  it('triggers the hidden file input when attach button is clicked', () => {
    renderBar();
    const fileInput = screen.getByTestId(
      'attachment-file-input',
    ) as HTMLInputElement;
    const clickSpy = jest.spyOn(fileInput, 'click');

    fireEvent.click(screen.getByTestId('attach-button'));
    expect(clickSpy).toHaveBeenCalled();
  });

  // ── Requirement 3.1: Attachment list rendering ────────────────────────

  it('renders attachment items when attachments are provided', () => {
    const attachments = [
      makeAttachment('file1.txt', 1024),
      makeAttachment('file2.txt', 2048),
    ];
    renderBar({ attachments });

    expect(screen.getByTestId('attachment-list')).toBeInTheDocument();
    expect(screen.getByTestId('attachment-item-0')).toBeInTheDocument();
    expect(screen.getByTestId('attachment-item-1')).toBeInTheDocument();
  });

  // ── Requirement 3.6: Remove button at boundary indices ────────────────

  it('calls onChange without the first item when remove-0 is clicked', () => {
    const onChange = jest.fn();
    const attachments = [
      makeAttachment('first.txt', 100),
      makeAttachment('middle.txt', 200),
      makeAttachment('last.txt', 300),
    ];
    renderBar({ attachments, onChange });

    fireEvent.click(screen.getByTestId('attachment-remove-0'));
    expect(onChange).toHaveBeenCalledWith([attachments[1], attachments[2]]);
  });

  it('calls onChange without the last item when remove at last index is clicked', () => {
    const onChange = jest.fn();
    const attachments = [
      makeAttachment('first.txt', 100),
      makeAttachment('middle.txt', 200),
      makeAttachment('last.txt', 300),
    ];
    renderBar({ attachments, onChange });

    fireEvent.click(screen.getByTestId('attachment-remove-2'));
    expect(onChange).toHaveBeenCalledWith([attachments[0], attachments[1]]);
  });

  // ── Requirement 3.4: Exactly 25 MB file accepted ─────────────────────

  it('accepts a file that is exactly 25 MB', () => {
    const onChange = jest.fn();
    renderBar({ onChange });

    const fileInput = screen.getByTestId('attachment-file-input');
    const file = createFileWithSize('exact25.bin', MAX_BYTES);

    fireEvent.change(fileInput, {
      target: { files: createMockFileList([file]) },
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    const newAttachments = onChange.mock.calls[0][0] as AttachmentFile[];
    expect(newAttachments).toHaveLength(1);
    expect(newAttachments[0].filename).toBe('exact25.bin');
    expect(newAttachments[0].sizeBytes).toBe(MAX_BYTES);
  });

  it('does not show an error for an exactly 25 MB file', () => {
    renderBar();

    const fileInput = screen.getByTestId('attachment-file-input');
    const file = createFileWithSize('exact25.bin', MAX_BYTES);

    fireEvent.change(fileInput, {
      target: { files: createMockFileList([file]) },
    });

    expect(screen.queryByTestId('attachment-error')).not.toBeInTheDocument();
  });

  // ── Requirement 3.4: 25 MB + 1 byte rejected ─────────────────────────

  it('rejects a file that is 25 MB + 1 byte', () => {
    const onChange = jest.fn();
    renderBar({ onChange });

    const fileInput = screen.getByTestId('attachment-file-input');
    const file = createFileWithSize('toobig.bin', MAX_BYTES + 1);

    fireEvent.change(fileInput, {
      target: { files: createMockFileList([file]) },
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('attachment-error')).toBeInTheDocument();
  });

  // ── Requirement 3.5: Cumulative size exceeds 25 MB ────────────────────

  it('rejects addition when cumulative size would exceed 25 MB', () => {
    const onChange = jest.fn();
    const existing = [makeAttachment('existing.bin', MAX_BYTES - 100)];
    renderBar({ attachments: existing, onChange });

    const fileInput = screen.getByTestId('attachment-file-input');
    const file = createFileWithSize('extra.bin', 200);

    fireEvent.change(fileInput, {
      target: { files: createMockFileList([file]) },
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('attachment-error')).toBeInTheDocument();
  });

  // ── Requirement 3.8: File picker cancel leaves list unchanged ─────────

  it('does not call onChange when file picker is cancelled (empty files)', () => {
    const onChange = jest.fn();
    const attachments = [makeAttachment('keep.txt', 512)];
    renderBar({ attachments, onChange });

    const fileInput = screen.getByTestId('attachment-file-input');

    // Simulate cancel: change event with no files
    fireEvent.change(fileInput, {
      target: { files: createMockFileList([]) },
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not call onChange when file picker is cancelled (null files)', () => {
    const onChange = jest.fn();
    renderBar({ onChange });

    const fileInput = screen.getByTestId('attachment-file-input');

    // Simulate cancel: change event with null files
    fireEvent.change(fileInput, {
      target: { files: null },
    });

    expect(onChange).not.toHaveBeenCalled();
  });
});
