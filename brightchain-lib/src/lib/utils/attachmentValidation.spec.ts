import {
  MAX_ATTACHMENT_SIZE_BYTES,
  formatFileSize,
  validateAttachmentSize,
  validateTotalAttachmentSize,
} from './attachmentValidation';

describe('attachmentValidation', () => {
  describe('MAX_ATTACHMENT_SIZE_BYTES', () => {
    it('should equal 25 MB', () => {
      expect(MAX_ATTACHMENT_SIZE_BYTES).toBe(25 * 1024 * 1024);
    });
  });

  describe('validateAttachmentSize', () => {
    it('returns true when size equals max', () => {
      expect(
        validateAttachmentSize(25 * 1024 * 1024, MAX_ATTACHMENT_SIZE_BYTES),
      ).toBe(true);
    });

    it('returns true when size is below max', () => {
      expect(validateAttachmentSize(1024, MAX_ATTACHMENT_SIZE_BYTES)).toBe(
        true,
      );
    });

    it('returns false when size exceeds max', () => {
      expect(
        validateAttachmentSize(25 * 1024 * 1024 + 1, MAX_ATTACHMENT_SIZE_BYTES),
      ).toBe(false);
    });

    it('returns true for zero bytes', () => {
      expect(validateAttachmentSize(0, MAX_ATTACHMENT_SIZE_BYTES)).toBe(true);
    });
  });

  describe('validateTotalAttachmentSize', () => {
    it('returns true for empty array', () => {
      expect(validateTotalAttachmentSize([], MAX_ATTACHMENT_SIZE_BYTES)).toBe(
        true,
      );
    });

    it('returns true when all files and total are within limit', () => {
      expect(
        validateTotalAttachmentSize(
          [1024, 2048, 4096],
          MAX_ATTACHMENT_SIZE_BYTES,
        ),
      ).toBe(true);
    });

    it('returns false when a single file exceeds limit', () => {
      expect(
        validateTotalAttachmentSize(
          [MAX_ATTACHMENT_SIZE_BYTES + 1],
          MAX_ATTACHMENT_SIZE_BYTES,
        ),
      ).toBe(false);
    });

    it('returns false when total exceeds limit even if individual files are within', () => {
      const size = 15 * 1024 * 1024; // 15 MB each, total 30 MB
      expect(
        validateTotalAttachmentSize([size, size], MAX_ATTACHMENT_SIZE_BYTES),
      ).toBe(false);
    });

    it('returns true when total exactly equals limit', () => {
      const half = MAX_ATTACHMENT_SIZE_BYTES / 2;
      expect(
        validateTotalAttachmentSize([half, half], MAX_ATTACHMENT_SIZE_BYTES),
      ).toBe(true);
    });
  });

  describe('formatFileSize', () => {
    it('formats zero bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
    });

    it('formats bytes below 1 KB', () => {
      expect(formatFileSize(512)).toBe('512 B');
    });

    it('formats kilobytes', () => {
      expect(formatFileSize(1536)).toBe('1.50 KB');
    });

    it('formats megabytes', () => {
      expect(formatFileSize(25 * 1024 * 1024)).toBe('25.00 MB');
    });

    it('formats gigabytes', () => {
      expect(formatFileSize(2 * 1024 * 1024 * 1024)).toBe('2.00 GB');
    });

    it('formats 1023 bytes as B not KB', () => {
      expect(formatFileSize(1023)).toBe('1023 B');
    });

    it('formats exactly 1 KB', () => {
      expect(formatFileSize(1024)).toBe('1.00 KB');
    });

    it('formats exactly 1 MB', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.00 MB');
    });

    it('formats exactly 1 GB', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.00 GB');
    });
  });
});
