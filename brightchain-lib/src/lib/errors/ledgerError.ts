/**
 * Ledger operation error class for the BrightChain blockchain ledger.
 *
 * Thrown when ledger operations fail, such as:
 * - Entry not found (invalid sequenceNumber)
 * - Invalid range (start > end or out of bounds)
 * - Metadata block corrupted during load
 * - Append operation failure
 *
 * @see Requirements 2.7, 6.3
 */

export enum LedgerErrorType {
  EntryNotFound = 'EntryNotFound',
  InvalidRange = 'InvalidRange',
  MetadataCorrupted = 'MetadataCorrupted',
  AppendFailed = 'AppendFailed',
}

export class LedgerError extends Error {
  constructor(
    public readonly errorType: LedgerErrorType,
    message?: string,
  ) {
    super(message ?? errorType);
    this.name = 'LedgerError';
  }
}
