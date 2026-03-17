/**
 * @fileoverview LedgerChainValidator — validates chain integrity by walking
 * entries and checking hashes, signatures, and sequence links.
 *
 * Validation does not throw — it returns an IValidationResult with error
 * descriptors. All errors are collected (validation does not stop at the
 * first error).
 *
 * @see Design: Block Chain Ledger — LedgerChainValidator
 * @see Requirements 3.2, 3.3, 4.3–4.6, 8.1–8.4
 */

import { ILedgerEntry } from '../interfaces/ledger/ledgerEntry';
import { ILedgerSignatureVerifier } from '../interfaces/ledger/ledgerSignatureVerifier';
import {
  ILedgerValidationError,
  IValidationResult,
} from '../interfaces/ledger/validationResult';
import { LedgerEntrySerializer } from './ledgerEntrySerializer';

/**
 * Validates ledger chain integrity by walking entries and verifying:
 * - Contiguous sequence numbers
 * - Genesis entry correctness
 * - Hash-chain links (previousEntryHash)
 * - EntryHash recomputation
 * - Signature verification
 */
export class LedgerChainValidator {
  constructor(
    private readonly serializer: LedgerEntrySerializer,
    private readonly signatureVerifier: ILedgerSignatureVerifier,
  ) {}

  /**
   * Validate the entire chain from genesis to head.
   *
   * Expects entries ordered by sequenceNumber starting from 0.
   * Returns { isValid: true, entriesChecked: 0, errors: [] } for an empty chain.
   */
  validateAll(entries: ILedgerEntry[]): IValidationResult {
    if (entries.length === 0) {
      return { isValid: true, entriesChecked: 0, errors: [] };
    }

    const errors: ILedgerValidationError[] = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const expectedSeq = i;

      // Verify contiguous sequence numbers starting from 0
      if (entry.sequenceNumber !== expectedSeq) {
        errors.push({
          sequenceNumber: entry.sequenceNumber,
          errorType: 'sequence_gap',
          message: `Expected sequenceNumber ${expectedSeq}, got ${entry.sequenceNumber}`,
        });
      }

      if (i === 0) {
        // Genesis entry: previousEntryHash must be null
        if (entry.previousEntryHash !== null) {
          errors.push({
            sequenceNumber: entry.sequenceNumber,
            errorType: 'genesis_invalid',
            message:
              'Genesis entry (sequenceNumber 0) must have null previousEntryHash',
          });
        }
      } else {
        // Non-genesis: previousEntryHash must equal preceding entry's entryHash
        const prev = entries[i - 1];
        if (
          entry.previousEntryHash === null ||
          !entry.previousEntryHash.equals(prev.entryHash)
        ) {
          errors.push({
            sequenceNumber: entry.sequenceNumber,
            errorType: 'previous_hash_mismatch',
            message: `previousEntryHash does not match preceding entry's entryHash at sequenceNumber ${entry.sequenceNumber}`,
          });
        }
      }

      // Recompute entryHash and verify
      this.verifyEntryHash(entry, errors);

      // Verify signature
      this.verifySignature(entry, errors);
    }

    return {
      isValid: errors.length === 0,
      entriesChecked: entries.length,
      errors,
    };
  }

  /**
   * Validate a sub-range of entries, including the link to the predecessor.
   *
   * @param entries - The sub-range of entries to validate (ordered by sequenceNumber).
   * @param predecessor - The entry immediately before the sub-range, or null if
   *   the sub-range starts at genesis.
   */
  validateRange(
    entries: ILedgerEntry[],
    predecessor: ILedgerEntry | null,
  ): IValidationResult {
    if (entries.length === 0) {
      return { isValid: true, entriesChecked: 0, errors: [] };
    }

    const errors: ILedgerValidationError[] = [];
    const startSeq = predecessor !== null ? predecessor.sequenceNumber + 1 : 0;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const expectedSeq = startSeq + i;

      // Verify contiguous sequence numbers
      if (entry.sequenceNumber !== expectedSeq) {
        errors.push({
          sequenceNumber: entry.sequenceNumber,
          errorType: 'sequence_gap',
          message: `Expected sequenceNumber ${expectedSeq}, got ${entry.sequenceNumber}`,
        });
      }

      if (i === 0) {
        if (predecessor !== null) {
          // First entry in range must link to predecessor
          if (
            entry.previousEntryHash === null ||
            !entry.previousEntryHash.equals(predecessor.entryHash)
          ) {
            errors.push({
              sequenceNumber: entry.sequenceNumber,
              errorType: 'previous_hash_mismatch',
              message: `previousEntryHash does not match predecessor's entryHash at sequenceNumber ${entry.sequenceNumber}`,
            });
          }
        } else {
          // No predecessor means this should be genesis
          if (entry.previousEntryHash !== null) {
            errors.push({
              sequenceNumber: entry.sequenceNumber,
              errorType: 'genesis_invalid',
              message:
                'Genesis entry (sequenceNumber 0) must have null previousEntryHash',
            });
          }
        }
      } else {
        // Subsequent entries link to the previous entry in the range
        const prev = entries[i - 1];
        if (
          entry.previousEntryHash === null ||
          !entry.previousEntryHash.equals(prev.entryHash)
        ) {
          errors.push({
            sequenceNumber: entry.sequenceNumber,
            errorType: 'previous_hash_mismatch',
            message: `previousEntryHash does not match preceding entry's entryHash at sequenceNumber ${entry.sequenceNumber}`,
          });
        }
      }

      // Recompute entryHash and verify
      this.verifyEntryHash(entry, errors);

      // Verify signature
      this.verifySignature(entry, errors);
    }

    return {
      isValid: errors.length === 0,
      entriesChecked: entries.length,
      errors,
    };
  }

  // ── private helpers ──────────────────────────────────────────────────

  /**
   * Recompute the entryHash for the given entry and compare it to the
   * stored entryHash. Pushes an error if they don't match.
   */
  private verifyEntryHash(
    entry: ILedgerEntry,
    errors: ILedgerValidationError[],
  ): void {
    const recomputed = this.serializer.computeEntryHash(entry);
    if (!recomputed.equals(entry.entryHash)) {
      errors.push({
        sequenceNumber: entry.sequenceNumber,
        errorType: 'hash_mismatch',
        message: `Recomputed entryHash does not match stored entryHash at sequenceNumber ${entry.sequenceNumber}`,
      });
    }
  }

  /**
   * Verify the entry's signature against its signerPublicKey and entryHash.
   * Pushes an error if verification fails.
   */
  private verifySignature(
    entry: ILedgerEntry,
    errors: ILedgerValidationError[],
  ): void {
    const entryHashBytes = entry.entryHash.toUint8Array();
    const isValid = this.signatureVerifier.verify(
      entry.signerPublicKey,
      entryHashBytes,
      entry.signature,
    );
    if (!isValid) {
      errors.push({
        sequenceNumber: entry.sequenceNumber,
        errorType: 'signature_invalid',
        message: `Signature verification failed at sequenceNumber ${entry.sequenceNumber}`,
      });
    }
  }
}
