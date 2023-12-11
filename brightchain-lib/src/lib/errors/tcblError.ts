import {
  BrightChainStringKey,
  BrightChainStrings,
} from '../enumerations/brightChainStrings';
import { TcblErrorType } from '../enumerations/tcblErrorType';
import { TypedError } from './typedError';

/**
 * Error class for TCBL (Tarball CBL) operations.
 *
 * Extends TypedError with TcblErrorType for typed error handling,
 * and includes an optional details map for additional context.
 */
export class TcblError extends TypedError<TcblErrorType> {
  /**
   * Optional details map providing additional context about the error.
   */
  public readonly details?: ReadonlyMap<string, string>;

  protected get reasonMap(): Record<TcblErrorType, BrightChainStringKey> {
    return {
      [TcblErrorType.InvalidHeader]:
        BrightChainStrings.Error_TcblError_InvalidHeader,
      [TcblErrorType.ManifestChecksumMismatch]:
        BrightChainStrings.Error_TcblError_ManifestChecksumMismatch,
      [TcblErrorType.ManifestCountMismatch]:
        BrightChainStrings.Error_TcblError_ManifestCountMismatch,
      [TcblErrorType.ManifestCorrupted]:
        BrightChainStrings.Error_TcblError_ManifestCorrupted,
      [TcblErrorType.ManifestTruncated]:
        BrightChainStrings.Error_TcblError_ManifestTruncated,
      [TcblErrorType.EntryNotFound]:
        BrightChainStrings.Error_TcblError_EntryNotFound,
      [TcblErrorType.FileNameTooLong]:
        BrightChainStrings.Error_TcblError_FileNameTooLong,
      [TcblErrorType.MimeTypeTooLong]:
        BrightChainStrings.Error_TcblError_MimeTypeTooLong,
      [TcblErrorType.PathTraversal]:
        BrightChainStrings.Error_TcblError_PathTraversal,
      [TcblErrorType.DecompressionFailed]:
        BrightChainStrings.Error_TcblError_DecompressionFailed,
      [TcblErrorType.DecryptionFailed]:
        BrightChainStrings.Error_TcblError_DecryptionFailed,
      [TcblErrorType.InvalidManifestVersion]:
        BrightChainStrings.Error_TcblError_InvalidManifestVersion,
    };
  }

  /**
   * Create a new TCBL error.
   *
   * @param errorType - The specific TCBL error type
   * @param details - Optional key-value map with additional context
   * @param language - Optional language code for localized messages
   * @param templateParams - Optional template parameters for message formatting
   */
  constructor(
    errorType: TcblErrorType,
    details?: Map<string, string>,
    language?: string,
    templateParams?: Record<string, string>,
  ) {
    super(errorType, undefined, templateParams);
    this.name = 'TcblError';
    this.details = details ? new Map(details) : undefined;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, TcblError.prototype);
  }

  /**
   * Convenience alias for the error type.
   */
  public get errorType(): TcblErrorType {
    return this.type;
  }
}
