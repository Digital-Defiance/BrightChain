import { describe, expect, it } from '@jest/globals';
import { IAttachmentMetadata } from './attachmentMetadata';

/**
 * Helper to create a minimal valid IAttachmentMetadata object.
 */
function createAttachmentMetadata(
  overrides?: Partial<IAttachmentMetadata>,
): IAttachmentMetadata {
  return {
    filename: 'document.pdf',
    mimeType: 'application/pdf',
    size: 102400,
    cblMagnetUrl: 'magnet:?xt=urn:brightchain:abc123def456',
    blockIds: ['block-001', 'block-002'],
    checksum: 'sha3-a1b2c3d4e5f6',
    ...overrides,
  };
}

describe('IAttachmentMetadata Interface', () => {
  describe('Required fields', () => {
    it('should include filename', () => {
      const attachment = createAttachmentMetadata();
      expect(attachment.filename).toBe('document.pdf');
    });

    it('should include mimeType', () => {
      const attachment = createAttachmentMetadata();
      expect(attachment.mimeType).toBe('application/pdf');
    });

    it('should include size in bytes', () => {
      const attachment = createAttachmentMetadata();
      expect(attachment.size).toBe(102400);
    });

    it('should include cblMagnetUrl for storage reference', () => {
      const attachment = createAttachmentMetadata();
      expect(attachment.cblMagnetUrl).toBe(
        'magnet:?xt=urn:brightchain:abc123def456',
      );
    });

    it('should include blockIds as an array', () => {
      const attachment = createAttachmentMetadata();
      expect(Array.isArray(attachment.blockIds)).toBe(true);
      expect(attachment.blockIds).toEqual(['block-001', 'block-002']);
    });

    it('should include checksum for integrity verification', () => {
      const attachment = createAttachmentMetadata();
      expect(attachment.checksum).toBe('sha3-a1b2c3d4e5f6');
    });
  });

  describe('Optional fields', () => {
    it('should support optional contentId for inline attachments', () => {
      const attachment = createAttachmentMetadata({
        contentId: '<image001@example.com>',
      });
      expect(attachment.contentId).toBe('<image001@example.com>');
    });

    it('should support optional contentMd5 for RFC 1864 integrity', () => {
      const attachment = createAttachmentMetadata({
        contentMd5: 'Q2hlY2sgSW50ZWdyaXR5IQ==',
      });
      expect(attachment.contentMd5).toBe('Q2hlY2sgSW50ZWdyaXR5IQ==');
    });

    it('should allow contentId to be undefined', () => {
      const attachment = createAttachmentMetadata();
      expect(attachment.contentId).toBeUndefined();
    });

    it('should allow contentMd5 to be undefined', () => {
      const attachment = createAttachmentMetadata();
      expect(attachment.contentMd5).toBeUndefined();
    });
  });

  describe('Storage reference fields (Requirement 8.1)', () => {
    it('should store attachment as ExtendedCBL with magnet URL', () => {
      const attachment = createAttachmentMetadata({
        cblMagnetUrl: 'magnet:?xt=urn:brightchain:xyz789',
        blockIds: ['blk-a', 'blk-b', 'blk-c'],
      });
      expect(attachment.cblMagnetUrl).toContain('magnet:');
      expect(attachment.blockIds).toHaveLength(3);
    });

    it('should support single block attachment', () => {
      const attachment = createAttachmentMetadata({
        blockIds: ['single-block'],
        size: 512,
      });
      expect(attachment.blockIds).toHaveLength(1);
    });

    it('should support large attachments with many blocks', () => {
      const manyBlockIds = Array.from({ length: 100 }, (_, i) => `block-${i}`);
      const attachment = createAttachmentMetadata({
        blockIds: manyBlockIds,
        size: 25 * 1024 * 1024, // 25MB
      });
      expect(attachment.blockIds).toHaveLength(100);
      expect(attachment.size).toBe(25 * 1024 * 1024);
    });
  });

  describe('Integrity fields (Requirements 8.3, 8.10)', () => {
    it('should preserve original filename and MIME type', () => {
      const attachment = createAttachmentMetadata({
        filename: 'report-2024.xlsx',
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      expect(attachment.filename).toBe('report-2024.xlsx');
      expect(attachment.mimeType).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
    });

    it('should store SHA-3 checksum for integrity verification', () => {
      const attachment = createAttachmentMetadata({
        checksum:
          'sha3-256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      });
      expect(attachment.checksum).toContain('sha3');
    });

    it('should support MD5 Content-MD5 header per RFC 1864', () => {
      const attachment = createAttachmentMetadata({
        contentMd5: 'rL0Y20zC+Fzt72VPzMSk2A==',
      });
      expect(attachment.contentMd5).toBe('rL0Y20zC+Fzt72VPzMSk2A==');
    });
  });

  describe('Common attachment types', () => {
    it('should support PDF attachments', () => {
      const attachment = createAttachmentMetadata({
        filename: 'contract.pdf',
        mimeType: 'application/pdf',
      });
      expect(attachment.mimeType).toBe('application/pdf');
    });

    it('should support image attachments', () => {
      const attachment = createAttachmentMetadata({
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
        size: 2048000,
      });
      expect(attachment.mimeType).toBe('image/jpeg');
    });

    it('should support inline image attachments with contentId', () => {
      const attachment = createAttachmentMetadata({
        filename: 'logo.png',
        mimeType: 'image/png',
        contentId: '<logo@company.com>',
        size: 15000,
      });
      expect(attachment.contentId).toBe('<logo@company.com>');
      expect(attachment.mimeType).toBe('image/png');
    });

    it('should support binary/octet-stream attachments', () => {
      const attachment = createAttachmentMetadata({
        filename: 'data.bin',
        mimeType: 'application/octet-stream',
      });
      expect(attachment.mimeType).toBe('application/octet-stream');
    });
  });

  describe('Re-export compatibility', () => {
    it('should be importable from attachmentMetadata directly', () => {
      // Verify the module exports are correct by creating an object
      const attachment: IAttachmentMetadata = createAttachmentMetadata();
      expect(attachment).toBeDefined();
      expect(attachment.filename).toBeDefined();
      expect(attachment.cblMagnetUrl).toBeDefined();
      expect(attachment.checksum).toBeDefined();
    });
  });
});
