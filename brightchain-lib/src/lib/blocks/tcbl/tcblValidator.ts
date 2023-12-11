/**
 * @fileoverview TCBL input validation utilities.
 *
 * Provides static validation methods for TCBL entry inputs including
 * file name length/traversal checks and MIME type length checks.
 *
 * @see Requirement 10 (Validation and Error Handling)
 */

import { CBL } from '../../constants';
import { TcblErrorType } from '../../enumerations/tcblErrorType';
import { TcblError } from '../../errors/tcblError';
import { ITcblEntryInput } from '../../interfaces/tcbl/tcblEntryInput';

/**
 * Static validation utilities for TCBL archive entry inputs.
 *
 * All methods throw {@link TcblError} with the appropriate
 * {@link TcblErrorType} on validation failure.
 */
export class TcblValidator {
  /**
   * Validate a file name for TCBL entry use.
   *
   * Rejects names that:
   * - Exceed {@link CBL.MAX_FILE_NAME_LENGTH} (255) characters
   * - Contain path traversal sequences (`../`, `..\\`)
   * - Start with `/` or `\\` (absolute paths)
   *
   * @param name - The file name to validate
   * @throws {TcblError} with {@link TcblErrorType.FileNameTooLong} if name exceeds 255 chars
   * @throws {TcblError} with {@link TcblErrorType.PathTraversal} if name contains traversal or absolute path
   *
   * @see Requirement 10.5, 10.7
   */
  public static validateFileName(name: string): void {
    if (name.length > CBL.MAX_FILE_NAME_LENGTH) {
      throw new TcblError(
        TcblErrorType.FileNameTooLong,
        new Map([
          ['fileName', name.substring(0, 50) + (name.length > 50 ? '...' : '')],
          ['length', String(name.length)],
          ['maxLength', String(CBL.MAX_FILE_NAME_LENGTH)],
        ]),
      );
    }

    // Reject absolute paths (leading / or \)
    if (name.startsWith('/') || name.startsWith('\\')) {
      throw new TcblError(
        TcblErrorType.PathTraversal,
        new Map([
          ['fileName', name.substring(0, 50) + (name.length > 50 ? '...' : '')],
          ['reason', 'absolute path'],
        ]),
      );
    }

    // Reject path traversal sequences (../ or ..\)
    if (CBL.FILE_NAME_TRAVERSAL_PATTERN.test(name)) {
      throw new TcblError(
        TcblErrorType.PathTraversal,
        new Map([
          ['fileName', name.substring(0, 50) + (name.length > 50 ? '...' : '')],
          ['reason', 'path traversal sequence'],
        ]),
      );
    }
  }

  /**
   * Validate a MIME type for TCBL entry use.
   *
   * Rejects MIME types that exceed {@link CBL.MAX_MIME_TYPE_LENGTH} (127) characters.
   *
   * @param mimeType - The MIME type string to validate
   * @throws {TcblError} with {@link TcblErrorType.MimeTypeTooLong} if mimeType exceeds 127 chars
   *
   * @see Requirement 10.6
   */
  public static validateMimeType(mimeType: string): void {
    if (mimeType.length > CBL.MAX_MIME_TYPE_LENGTH) {
      throw new TcblError(
        TcblErrorType.MimeTypeTooLong,
        new Map([
          [
            'mimeType',
            mimeType.substring(0, 50) + (mimeType.length > 50 ? '...' : ''),
          ],
          ['length', String(mimeType.length)],
          ['maxLength', String(CBL.MAX_MIME_TYPE_LENGTH)],
        ]),
      );
    }
  }

  /**
   * Validate all entries in an array of TCBL entry inputs.
   *
   * Validates each entry's file name and MIME type, throwing a
   * {@link TcblError} on the first violation encountered.
   *
   * @param entries - The array of entry inputs to validate
   * @throws {TcblError} on the first validation failure
   *
   * @see Requirement 10.5, 10.6, 10.7
   */
  public static validateEntryInputs(entries: ITcblEntryInput[]): void {
    for (const entry of entries) {
      TcblValidator.validateFileName(entry.fileName);
      TcblValidator.validateMimeType(entry.mimeType);
    }
  }
}
