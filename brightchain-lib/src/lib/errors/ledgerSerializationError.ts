/**
 * Ledger serialization error class for the BrightChain blockchain ledger.
 *
 * Thrown when serialization or deserialization of ledger entries fails, such as:
 * - Data too short (below minimum entry size)
 * - Invalid magic bytes
 * - Unsupported version
 * - Field length exceeds remaining data
 * - Payload exceeds max size for block size
 *
 * @see Requirements 2.7, 6.3
 */

export enum LedgerSerializationErrorType {
  DataTooShort = 'DataTooShort',
  InvalidMagic = 'InvalidMagic',
  UnsupportedVersion = 'UnsupportedVersion',
  FieldOverflow = 'FieldOverflow',
  PayloadTooLarge = 'PayloadTooLarge',
}

export class LedgerSerializationError extends Error {
  constructor(
    public readonly errorType: LedgerSerializationErrorType,
    message?: string,
  ) {
    super(message ?? errorType);
    this.name = 'LedgerSerializationError';
  }
}
