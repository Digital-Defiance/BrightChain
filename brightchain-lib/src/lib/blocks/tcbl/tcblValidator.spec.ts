/**
 * @fileoverview Unit tests for TcblValidator.
 *
 * Tests validation edge cases: empty names, boundary lengths, traversal patterns,
 * and MIME type length limits.
 *
 * @see Requirements 10.5, 10.6, 10.7
 */

import { CBL } from '../../constants';
import { TcblErrorType } from '../../enumerations/tcblErrorType';
import { TcblError } from '../../errors/tcblError';
import { ITcblEntryInput } from '../../interfaces/tcbl/tcblEntryInput';
import { TcblValidator } from './tcblValidator';

describe('TcblValidator', () => {
  describe('validateFileName', () => {
    it('should accept an empty file name', () => {
      expect(() => TcblValidator.validateFileName('')).not.toThrow();
    });

    it('should accept a simple valid file name', () => {
      expect(() => TcblValidator.validateFileName('hello.txt')).not.toThrow();
    });

    it('should accept a name at exactly 255 characters (boundary)', () => {
      const name = 'a'.repeat(CBL.MAX_FILE_NAME_LENGTH);
      expect(() => TcblValidator.validateFileName(name)).not.toThrow();
    });

    it('should reject a name at 256 characters (one over boundary)', () => {
      const name = 'a'.repeat(CBL.MAX_FILE_NAME_LENGTH + 1);
      expect(() => TcblValidator.validateFileName(name)).toThrow(TcblError);
      try {
        TcblValidator.validateFileName(name);
      } catch (e) {
        expect((e as TcblError).errorType).toBe(TcblErrorType.FileNameTooLong);
      }
    });

    it('should reject a very long file name', () => {
      const name = 'x'.repeat(1000);
      expect(() => TcblValidator.validateFileName(name)).toThrow(TcblError);
      try {
        TcblValidator.validateFileName(name);
      } catch (e) {
        expect((e as TcblError).errorType).toBe(TcblErrorType.FileNameTooLong);
      }
    });

    // Path traversal tests
    it('should reject "../" traversal at the start', () => {
      expect(() => TcblValidator.validateFileName('../etc/passwd')).toThrow(
        TcblError,
      );
      try {
        TcblValidator.validateFileName('../etc/passwd');
      } catch (e) {
        expect((e as TcblError).errorType).toBe(TcblErrorType.PathTraversal);
      }
    });

    it('should reject "..\\" traversal at the start', () => {
      expect(() => TcblValidator.validateFileName('..\\etc\\passwd')).toThrow(
        TcblError,
      );
      try {
        TcblValidator.validateFileName('..\\etc\\passwd');
      } catch (e) {
        expect((e as TcblError).errorType).toBe(TcblErrorType.PathTraversal);
      }
    });

    it('should reject "../" traversal in the middle', () => {
      expect(() => TcblValidator.validateFileName('foo/../bar')).toThrow(
        TcblError,
      );
      try {
        TcblValidator.validateFileName('foo/../bar');
      } catch (e) {
        expect((e as TcblError).errorType).toBe(TcblErrorType.PathTraversal);
      }
    });

    it('should reject "..\\" traversal in the middle', () => {
      expect(() => TcblValidator.validateFileName('foo\\..\\bar')).toThrow(
        TcblError,
      );
      try {
        TcblValidator.validateFileName('foo\\..\\bar');
      } catch (e) {
        expect((e as TcblError).errorType).toBe(TcblErrorType.PathTraversal);
      }
    });

    it('should reject leading "/" (absolute path)', () => {
      expect(() => TcblValidator.validateFileName('/etc/passwd')).toThrow(
        TcblError,
      );
      try {
        TcblValidator.validateFileName('/etc/passwd');
      } catch (e) {
        expect((e as TcblError).errorType).toBe(TcblErrorType.PathTraversal);
      }
    });

    it('should reject leading "\\" (absolute path)', () => {
      expect(() =>
        TcblValidator.validateFileName('\\Windows\\System32'),
      ).toThrow(TcblError);
      try {
        TcblValidator.validateFileName('\\Windows\\System32');
      } catch (e) {
        expect((e as TcblError).errorType).toBe(TcblErrorType.PathTraversal);
      }
    });

    it('should accept a name with ".." that is not a traversal (e.g. "file..txt")', () => {
      expect(() => TcblValidator.validateFileName('file..txt')).not.toThrow();
    });

    it('should accept a relative path without traversal', () => {
      expect(() =>
        TcblValidator.validateFileName('subdir/file.txt'),
      ).not.toThrow();
    });

    it('should reject bare ".." as a file name', () => {
      expect(() => TcblValidator.validateFileName('..')).toThrow(TcblError);
      try {
        TcblValidator.validateFileName('..');
      } catch (e) {
        expect((e as TcblError).errorType).toBe(TcblErrorType.PathTraversal);
      }
    });
  });

  describe('validateMimeType', () => {
    it('should accept a standard MIME type', () => {
      expect(() => TcblValidator.validateMimeType('text/plain')).not.toThrow();
    });

    it('should accept an empty MIME type', () => {
      expect(() => TcblValidator.validateMimeType('')).not.toThrow();
    });

    it('should accept a MIME type at exactly 127 characters (boundary)', () => {
      const mime = 'a'.repeat(CBL.MAX_MIME_TYPE_LENGTH);
      expect(() => TcblValidator.validateMimeType(mime)).not.toThrow();
    });

    it('should reject a MIME type at 128 characters (one over boundary)', () => {
      const mime = 'a'.repeat(CBL.MAX_MIME_TYPE_LENGTH + 1);
      expect(() => TcblValidator.validateMimeType(mime)).toThrow(TcblError);
      try {
        TcblValidator.validateMimeType(mime);
      } catch (e) {
        expect((e as TcblError).errorType).toBe(TcblErrorType.MimeTypeTooLong);
      }
    });

    it('should reject a very long MIME type', () => {
      const mime = 'application/' + 'x'.repeat(500);
      expect(() => TcblValidator.validateMimeType(mime)).toThrow(TcblError);
      try {
        TcblValidator.validateMimeType(mime);
      } catch (e) {
        expect((e as TcblError).errorType).toBe(TcblErrorType.MimeTypeTooLong);
      }
    });
  });

  describe('validateEntryInputs', () => {
    const validEntry: ITcblEntryInput = {
      fileName: 'test.txt',
      mimeType: 'text/plain',
      data: new Uint8Array([1, 2, 3]),
    };

    it('should accept an empty entries array', () => {
      expect(() => TcblValidator.validateEntryInputs([])).not.toThrow();
    });

    it('should accept valid entries', () => {
      expect(() =>
        TcblValidator.validateEntryInputs([validEntry]),
      ).not.toThrow();
    });

    it('should accept multiple valid entries', () => {
      const entries: ITcblEntryInput[] = [
        validEntry,
        {
          fileName: 'image.png',
          mimeType: 'image/png',
          data: new Uint8Array([4, 5]),
        },
      ];
      expect(() => TcblValidator.validateEntryInputs(entries)).not.toThrow();
    });

    it('should throw on first entry with invalid file name', () => {
      const entries: ITcblEntryInput[] = [
        validEntry,
        {
          fileName: '../evil.txt',
          mimeType: 'text/plain',
          data: new Uint8Array([]),
        },
        {
          fileName: 'a'.repeat(300),
          mimeType: 'text/plain',
          data: new Uint8Array([]),
        },
      ];
      expect(() => TcblValidator.validateEntryInputs(entries)).toThrow(
        TcblError,
      );
      try {
        TcblValidator.validateEntryInputs(entries);
      } catch (e) {
        // Should fail on the path traversal (second entry), not the long name (third)
        expect((e as TcblError).errorType).toBe(TcblErrorType.PathTraversal);
      }
    });

    it('should throw on entry with invalid MIME type', () => {
      const entries: ITcblEntryInput[] = [
        {
          fileName: 'file.bin',
          mimeType: 'x'.repeat(200),
          data: new Uint8Array([]),
        },
      ];
      expect(() => TcblValidator.validateEntryInputs(entries)).toThrow(
        TcblError,
      );
      try {
        TcblValidator.validateEntryInputs(entries);
      } catch (e) {
        expect((e as TcblError).errorType).toBe(TcblErrorType.MimeTypeTooLong);
      }
    });

    it('should validate file name before MIME type for each entry', () => {
      // Entry has both an invalid file name and invalid MIME type
      const entries: ITcblEntryInput[] = [
        {
          fileName: '/absolute.txt',
          mimeType: 'x'.repeat(200),
          data: new Uint8Array([]),
        },
      ];
      expect(() => TcblValidator.validateEntryInputs(entries)).toThrow(
        TcblError,
      );
      try {
        TcblValidator.validateEntryInputs(entries);
      } catch (e) {
        // File name is validated first, so PathTraversal should be thrown
        expect((e as TcblError).errorType).toBe(TcblErrorType.PathTraversal);
      }
    });
  });
});
