/**
 * Property-based tests for LedgerChainValidator.
 *
 * Feature: block-chain-ledger, Property 7: Valid Chains Pass Validation, Tampered Chains Fail
 *
 * Any chain produced by valid appends passes validateAll(); any chain with one
 * corrupted field fails with error identifying the tampered entry.
 *
 * **Validates: Requirements 3.2, 3.3, 4.3, 4.4, 8.1, 8.4**
 */
import { SignatureUint8Array } from '@digitaldefiance/ecies-lib';
import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';

import { ILedgerEntry } from '../../interfaces/ledger/ledgerEntry';
import { ILedgerSignatureVerifier } from '../../interfaces/ledger/ledgerSignatureVerifier';
import { ChecksumService } from '../../services/checksum.service';
import { Checksum } from '../../types/checksum';
import { IncrementalMerkleTree } from '../incrementalMerkleTree';
import { LedgerChainValidator } from '../ledgerChainValidator';
import { LedgerEntrySerializer } from '../ledgerEntrySerializer';

const HASH_LENGTH = 64;
const SIGNATURE_LENGTH = 64;

jest.setTimeout(120_000);

// ---------------------------------------------------------------------------
// Shared services
// ---------------------------------------------------------------------------

const checksumService = new ChecksumService();
const serializer = new LedgerEntrySerializer(checksumService);

/** Mock verifier that always returns true — used for valid-chain tests. */
const alwaysValidVerifier: ILedgerSignatureVerifier = {
  verify: () => true,
};

// ---------------------------------------------------------------------------
// Custom Generators
// ---------------------------------------------------------------------------

/** Generate a fake 64-byte signature filled from random bytes. */
function arbSignature(): fc.Arbitrary<SignatureUint8Array> {
  return fc
    .array(fc.integer({ min: 0, max: 255 }), {
      minLength: SIGNATURE_LENGTH,
      maxLength: SIGNATURE_LENGTH,
    })
    .map((arr) => new Uint8Array(arr) as SignatureUint8Array);
}

/** Generate a random signer public key (33–65 bytes). */
function arbSignerPublicKey(): fc.Arbitrary<Uint8Array> {
  return fc
    .array(fc.integer({ min: 0, max: 255 }), {
      minLength: 33,
      maxLength: 65,
    })
    .map((arr) => new Uint8Array(arr));
}

/** Generate a random payload (0–128 bytes, kept small for speed). */
function arbPayload(): fc.Arbitrary<Uint8Array> {
  return fc
    .array(fc.integer({ min: 0, max: 255 }), {
      minLength: 0,
      maxLength: 128,
    })
    .map((arr) => new Uint8Array(arr));
}

/**
 * Generate a valid chain of 1 to maxLength entries with proper linking,
 * real entryHashes, and fake signatures. Uses a consistent signer public key
 * per chain.
 */
function arbLedgerChain(maxLength: number): fc.Arbitrary<ILedgerEntry[]> {
  return fc
    .record({
      length: fc.integer({ min: 1, max: maxLength }),
      signerPublicKey: arbSignerPublicKey(),
      baseTimestamp: fc.integer({ min: 0, max: 1_900_000_000_000 }),
      payloads: fc.array(arbPayload(), {
        minLength: maxLength,
        maxLength: maxLength,
      }),
      signatures: fc.array(arbSignature(), {
        minLength: maxLength,
        maxLength: maxLength,
      }),
    })
    .map((fields) => {
      const chain: ILedgerEntry[] = [];
      for (let i = 0; i < fields.length; i++) {
        const previousEntryHash = i === 0 ? null : chain[i - 1].entryHash;

        const partial = {
          sequenceNumber: i,
          timestamp: new Date(fields.baseTimestamp + i * 1000),
          previousEntryHash,
          signerPublicKey: fields.signerPublicKey,
          payload: fields.payloads[i],
        };

        const entryHash = serializer.computeEntryHash(partial);

        chain.push({
          ...partial,
          entryHash,
          signature: fields.signatures[i],
        });
      }
      return chain;
    });
}

/**
 * Generate a valid chain of minLength to maxLength entries with proper linking,
 * real entryHashes, and fake signatures. Uses a consistent signer public key
 * per chain.
 */
function arbLedgerChainRange(
  minLength: number,
  maxLength: number,
): fc.Arbitrary<ILedgerEntry[]> {
  return fc
    .record({
      length: fc.integer({ min: minLength, max: maxLength }),
      signerPublicKey: arbSignerPublicKey(),
      baseTimestamp: fc.integer({ min: 0, max: 1_900_000_000_000 }),
      payloads: fc.array(arbPayload(), {
        minLength: maxLength,
        maxLength: maxLength,
      }),
      signatures: fc.array(arbSignature(), {
        minLength: maxLength,
        maxLength: maxLength,
      }),
    })
    .map((fields) => {
      const chain: ILedgerEntry[] = [];
      for (let i = 0; i < fields.length; i++) {
        const previousEntryHash = i === 0 ? null : chain[i - 1].entryHash;

        const partial = {
          sequenceNumber: i,
          timestamp: new Date(fields.baseTimestamp + i * 1000),
          previousEntryHash,
          signerPublicKey: fields.signerPublicKey,
          payload: fields.payloads[i],
        };

        const entryHash = serializer.computeEntryHash(partial);

        chain.push({
          ...partial,
          entryHash,
          signature: fields.signatures[i],
        });
      }
      return chain;
    });
}

/**
 * Corruption type enum for arbCorruptedEntry.
 * We focus on entryHash and previousEntryHash corruption since we use
 * an always-true signature verifier with fake signatures.
 */
type CorruptionType = 'entryHash' | 'previousEntryHash';

/**
 * Takes a valid entry and corrupts one of: entryHash or previousEntryHash.
 * Returns the corrupted entry and the type of corruption applied.
 */
function arbCorruptedEntry(
  entry: ILedgerEntry,
  indexInChain: number,
): fc.Arbitrary<{ corrupted: ILedgerEntry; corruptionType: CorruptionType }> {
  // Build the list of possible corruptions for this entry
  const possibleCorruptions: CorruptionType[] = ['entryHash'];
  // For non-genesis entries, we can also corrupt previousEntryHash
  if (indexInChain > 0) {
    possibleCorruptions.push('previousEntryHash');
  }

  return fc
    .record({
      corruptionChoice: fc.integer({
        min: 0,
        max: possibleCorruptions.length - 1,
      }),
      randomHashBytes: fc
        .array(fc.integer({ min: 0, max: 255 }), {
          minLength: HASH_LENGTH,
          maxLength: HASH_LENGTH,
        })
        .map((arr) => new Uint8Array(arr)),
    })
    .filter((fields) => {
      // Ensure the random bytes actually differ from the original
      const corruptionType = possibleCorruptions[fields.corruptionChoice];
      if (corruptionType === 'entryHash') {
        const original = entry.entryHash.toUint8Array();
        return !bytesEqual(original, fields.randomHashBytes);
      } else {
        // previousEntryHash corruption — must differ from original
        if (entry.previousEntryHash === null) return true; // null → non-null is always different
        const original = entry.previousEntryHash.toUint8Array();
        return !bytesEqual(original, fields.randomHashBytes);
      }
    })
    .map((fields) => {
      const corruptionType = possibleCorruptions[fields.corruptionChoice];
      const corruptedHash = Checksum.fromUint8Array(fields.randomHashBytes);

      let corrupted: ILedgerEntry;
      if (corruptionType === 'entryHash') {
        corrupted = { ...entry, entryHash: corruptedHash };
      } else {
        corrupted = { ...entry, previousEntryHash: corruptedHash };
      }

      return { corrupted, corruptionType };
    });
}

/** Byte-by-byte equality check for two Uint8Arrays. */
function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Property 7 Tests
// ---------------------------------------------------------------------------

// Feature: block-chain-ledger, Property 7: Valid Chains Pass Validation, Tampered Chains Fail
describe('Feature: block-chain-ledger, Property 7: Valid Chains Pass Validation, Tampered Chains Fail', () => {
  const validator = new LedgerChainValidator(serializer, alwaysValidVerifier);

  /**
   * **Validates: Requirements 3.2, 3.3, 4.3, 4.4, 8.1, 8.4**
   *
   * Part 1: For any valid chain of N entries, validateAll() returns
   * { isValid: true, entriesChecked: N }.
   */
  it('any valid chain of N entries passes validateAll()', () => {
    fc.assert(
      fc.property(arbLedgerChain(10), (chain) => {
        const result = validator.validateAll(chain);

        expect(result.isValid).toBe(true);
        expect(result.entriesChecked).toBe(chain.length);
        expect(result.errors).toEqual([]);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 3.2, 3.3, 4.3, 4.4, 8.1, 8.4**
   *
   * Part 2: For any valid chain where one entry has a corrupted field,
   * validateAll() returns { isValid: false } with at least one error
   * identifying the tampered entry's sequenceNumber.
   */
  it('any valid chain with one corrupted entry fails validateAll() with error identifying the tampered entry', () => {
    fc.assert(
      fc.property(
        // Generate a chain of 1–8 entries, then pick an index to corrupt
        arbLedgerChain(8).chain((chain) => {
          const tamperIndex = fc.integer({
            min: 0,
            max: chain.length - 1,
          });
          return tamperIndex.chain((idx) => {
            return arbCorruptedEntry(chain[idx], idx).map(
              ({ corrupted, corruptionType }) => ({
                chain,
                tamperIndex: idx,
                corrupted,
                corruptionType,
              }),
            );
          });
        }),
        ({ chain, tamperIndex, corrupted, corruptionType }) => {
          // Replace the entry at tamperIndex with the corrupted version
          const tamperedChain = [...chain];
          tamperedChain[tamperIndex] = corrupted;

          const result = validator.validateAll(tamperedChain);

          expect(result.isValid).toBe(false);

          // Determine which sequence numbers should appear in errors
          const tamperedSeqNum = corrupted.sequenceNumber;

          if (corruptionType === 'entryHash') {
            // Corrupting entryHash should produce a hash_mismatch error
            // at the tampered entry. It may also cause a
            // previous_hash_mismatch at the next entry (if one exists).
            const hashErrors = result.errors.filter(
              (e) =>
                e.errorType === 'hash_mismatch' &&
                e.sequenceNumber === tamperedSeqNum,
            );
            expect(hashErrors.length).toBeGreaterThanOrEqual(1);
          } else {
            // Corrupting previousEntryHash should produce a
            // previous_hash_mismatch error at the tampered entry.
            // It will also cause a hash_mismatch since the recomputed
            // entryHash won't match (previousEntryHash is part of the
            // hashable content).
            const relevantErrors = result.errors.filter(
              (e) => e.sequenceNumber === tamperedSeqNum,
            );
            expect(relevantErrors.length).toBeGreaterThanOrEqual(1);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 10 Tests
// ---------------------------------------------------------------------------

// Feature: block-chain-ledger, Property 10: Sub-Range Validation
describe('Feature: block-chain-ledger, Property 10: Sub-Range Validation', () => {
  const validator = new LedgerChainValidator(serializer, alwaysValidVerifier);

  /**
   * **Validates: Requirements 8.2**
   *
   * For any valid chain of N ≥ 2 entries and any sub-range [start, end]
   * where 0 ≤ start ≤ end < N, validateRange() called with entries in
   * that range and the predecessor (entries[start-1] or null if start===0)
   * returns { isValid: true } with entriesChecked === end - start + 1.
   */
  it('validateRange returns valid with correct entriesChecked for any sub-range of a valid chain', () => {
    fc.assert(
      fc.property(
        arbLedgerChainRange(2, 10).chain((chain) =>
          fc
            .record({
              start: fc.integer({ min: 0, max: chain.length - 1 }),
              end: fc.integer({ min: 0, max: chain.length - 1 }),
            })
            .filter(({ start, end }) => start <= end)
            .map(({ start, end }) => ({ chain, start, end })),
        ),
        ({ chain, start, end }) => {
          const subRange = chain.slice(start, end + 1);
          const predecessor = start > 0 ? chain[start - 1] : null;

          const result = validator.validateRange(subRange, predecessor);

          expect(result.isValid).toBe(true);
          expect(result.entriesChecked).toBe(end - start + 1);
          expect(result.errors).toEqual([]);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 12 Tests
// ---------------------------------------------------------------------------

// Feature: block-chain-ledger-merkle-upgrade, Property 12: Parallel Validation Equals Sequential Validation
describe('Feature: block-chain-ledger-merkle-upgrade, Property 12: Parallel Validation Equals Sequential Validation', () => {
  const validator = new LedgerChainValidator(serializer, alwaysValidVerifier);

  /**
   * **Validates: Requirements 17.2, 17.3**
   *
   * For any valid ledger chain of 1–10 entries, validateAllParallel()
   * produces the same result as validateAll(): same isValid, same
   * entriesChecked, and same error types (sorted by sequenceNumber
   * since parallel ordering may differ).
   */
  it('validateAllParallel() produces the same result as validateAll() for any valid chain', async () => {
    await fc.assert(
      fc.asyncProperty(arbLedgerChain(10), async (chain) => {
        const sequential = validator.validateAll(chain);
        const parallel = await validator.validateAllParallel(chain);

        expect(parallel.isValid).toBe(sequential.isValid);
        expect(parallel.entriesChecked).toBe(sequential.entriesChecked);

        // Sort errors by sequenceNumber for comparison since parallel
        // ordering may differ
        const sortErrors = (
          errors: readonly { sequenceNumber: number; errorType: string }[],
        ) =>
          [...errors].sort((a, b) =>
            a.sequenceNumber !== b.sequenceNumber
              ? a.sequenceNumber - b.sequenceNumber
              : a.errorType.localeCompare(b.errorType),
          );

        expect(sortErrors(parallel.errors)).toEqual(
          sortErrors(sequential.errors),
        );
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 17.2, 17.3**
   *
   * For any valid ledger chain, validateAllParallel() with a Merkle root
   * produces the same result as validateAll() with the same Merkle root.
   */
  it('validateAllParallel() with Merkle root produces the same result as validateAll() with Merkle root', async () => {
    await fc.assert(
      fc.asyncProperty(arbLedgerChain(10), async (chain) => {
        // Build Merkle tree from entry hashes and get the root
        const entryHashes = chain.map((e) => e.entryHash);
        const tree = IncrementalMerkleTree.fromLeaves(
          entryHashes,
          checksumService,
        );
        const merkleRoot = tree.root;

        const sequential = validator.validateAll(chain, merkleRoot);
        const parallel = await validator.validateAllParallel(chain, merkleRoot);

        expect(parallel.isValid).toBe(sequential.isValid);
        expect(parallel.entriesChecked).toBe(sequential.entriesChecked);

        // Sort errors by sequenceNumber for comparison
        const sortErrors = (
          errors: readonly { sequenceNumber: number; errorType: string }[],
        ) =>
          [...errors].sort((a, b) =>
            a.sequenceNumber !== b.sequenceNumber
              ? a.sequenceNumber - b.sequenceNumber
              : a.errorType.localeCompare(b.errorType),
          );

        expect(sortErrors(parallel.errors)).toEqual(
          sortErrors(sequential.errors),
        );
      }),
      { numRuns: 100 },
    );
  });
});
