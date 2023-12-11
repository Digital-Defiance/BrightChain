/**
 * Unit tests for LedgerChainValidator.
 *
 * @see Requirements 3.2, 3.3, 4.3–4.6, 8.1–8.4
 */

import { SignatureUint8Array } from '@digitaldefiance/ecies-lib';
import { ILedgerEntry } from '../../interfaces/ledger/ledgerEntry';
import { ILedgerSignatureVerifier } from '../../interfaces/ledger/ledgerSignatureVerifier';
import { ChecksumService } from '../../services/checksum.service';
import { Checksum } from '../../types/checksum';
import { IncrementalMerkleTree } from '../incrementalMerkleTree';
import { LedgerChainValidator } from '../ledgerChainValidator';
import { LedgerEntrySerializer } from '../ledgerEntrySerializer';

const HASH_LENGTH = 64;
const SIGNATURE_LENGTH = 64;

describe('LedgerChainValidator', () => {
  let checksumService: ChecksumService;
  let serializer: LedgerEntrySerializer;
  let alwaysValidVerifier: ILedgerSignatureVerifier;
  let alwaysInvalidVerifier: ILedgerSignatureVerifier;
  let validator: LedgerChainValidator;

  /** Create a fake 64-byte Checksum filled with a given byte value. */
  function makeChecksum(fill: number): Checksum {
    return Checksum.fromUint8Array(new Uint8Array(HASH_LENGTH).fill(fill));
  }

  /** Create a fake 64-byte SignatureUint8Array filled with a given byte value. */
  function makeSignature(fill: number): SignatureUint8Array {
    return new Uint8Array(SIGNATURE_LENGTH).fill(fill) as SignatureUint8Array;
  }

  /**
   * Build a valid chain of the given length with proper linking.
   * Each entry has a real entryHash computed by the serializer and
   * previousEntryHash pointing to the preceding entry's entryHash.
   */
  function buildChain(length: number): ILedgerEntry[] {
    const chain: ILedgerEntry[] = [];

    for (let i = 0; i < length; i++) {
      const previousEntryHash = i === 0 ? null : chain[i - 1].entryHash;

      const partial = {
        sequenceNumber: i,
        timestamp: new Date(1700000000000 + i * 1000),
        previousEntryHash,
        signerPublicKey: new Uint8Array(33).fill(0x02),
        payload: new Uint8Array([0xde, 0xad, i & 0xff]),
      };

      const entryHash = serializer.computeEntryHash(partial);
      const signature = makeSignature(i + 1);

      chain.push({
        ...partial,
        entryHash,
        signature,
      });
    }

    return chain;
  }

  beforeEach(() => {
    checksumService = new ChecksumService();
    serializer = new LedgerEntrySerializer(checksumService);

    alwaysValidVerifier = {
      verify: () => true,
    };

    alwaysInvalidVerifier = {
      verify: () => false,
    };

    validator = new LedgerChainValidator(serializer, alwaysValidVerifier);
  });

  // ── Empty chain ─────────────────────────────────────────────────────

  describe('empty chain', () => {
    it('should return valid with 0 entries checked', () => {
      const result = validator.validateAll([]);

      expect(result.isValid).toBe(true);
      expect(result.entriesChecked).toBe(0);
      expect(result.errors).toEqual([]);
    });
  });

  // ── Valid single-entry chain (genesis only) ─────────────────────────

  describe('valid single-entry chain (genesis only)', () => {
    it('should pass validation for a properly constructed genesis entry', () => {
      const chain = buildChain(1);
      const result = validator.validateAll(chain);

      expect(result.isValid).toBe(true);
      expect(result.entriesChecked).toBe(1);
      expect(result.errors).toEqual([]);
    });
  });

  // ── Valid multi-entry chain ─────────────────────────────────────────

  describe('valid multi-entry chain', () => {
    it('should pass validation for a properly linked 5-entry chain', () => {
      const chain = buildChain(5);
      const result = validator.validateAll(chain);

      expect(result.isValid).toBe(true);
      expect(result.entriesChecked).toBe(5);
      expect(result.errors).toEqual([]);
    });
  });

  // ── Tampered entryHash detected ─────────────────────────────────────

  describe('tampered entryHash detected', () => {
    it('should detect a corrupted entryHash', () => {
      const chain = buildChain(3);
      // Tamper with the middle entry's entryHash
      const tampered: ILedgerEntry = {
        ...chain[1],
        entryHash: makeChecksum(0xff),
      };
      chain[1] = tampered;

      const result = validator.validateAll(chain);

      expect(result.isValid).toBe(false);
      // Should have at least a hash_mismatch error for entry 1
      const hashErrors = result.errors.filter(
        (e) => e.errorType === 'hash_mismatch' && e.sequenceNumber === 1,
      );
      expect(hashErrors.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Tampered signature detected ─────────────────────────────────────

  describe('tampered signature detected', () => {
    it('should detect an invalid signature', () => {
      const chain = buildChain(3);
      // Use a verifier that rejects all signatures
      const strictValidator = new LedgerChainValidator(
        serializer,
        alwaysInvalidVerifier,
      );

      const result = strictValidator.validateAll(chain);

      expect(result.isValid).toBe(false);
      const sigErrors = result.errors.filter(
        (e) => e.errorType === 'signature_invalid',
      );
      // Every entry should fail signature verification
      expect(sigErrors.length).toBe(3);
    });
  });

  // ── Tampered previousEntryHash detected ─────────────────────────────

  describe('tampered previousEntryHash detected', () => {
    it('should detect a corrupted previousEntryHash link', () => {
      const chain = buildChain(3);
      // Tamper with entry 2's previousEntryHash (break the link to entry 1)
      const tampered: ILedgerEntry = {
        ...chain[2],
        previousEntryHash: makeChecksum(0xee),
      };
      chain[2] = tampered;

      const result = validator.validateAll(chain);

      expect(result.isValid).toBe(false);
      const linkErrors = result.errors.filter(
        (e) =>
          e.errorType === 'previous_hash_mismatch' && e.sequenceNumber === 2,
      );
      expect(linkErrors.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Sequence gap detected ───────────────────────────────────────────

  describe('sequence gap detected', () => {
    it('should detect a gap in sequence numbers', () => {
      const chain = buildChain(3);
      // Create a gap: change entry 1's sequenceNumber to 5
      const tampered: ILedgerEntry = {
        ...chain[1],
        sequenceNumber: 5,
      };
      chain[1] = tampered;

      const result = validator.validateAll(chain);

      expect(result.isValid).toBe(false);
      const seqErrors = result.errors.filter(
        (e) => e.errorType === 'sequence_gap',
      );
      expect(seqErrors.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Genesis entry with non-null previousEntryHash ───────────────────

  describe('genesis entry with non-null previousEntryHash', () => {
    it('should detect genesis entry that has a non-null previousEntryHash', () => {
      const chain = buildChain(1);
      // Tamper genesis to have a non-null previousEntryHash
      const tampered: ILedgerEntry = {
        ...chain[0],
        previousEntryHash: makeChecksum(0xdd),
      };
      chain[0] = tampered;

      const result = validator.validateAll(chain);

      expect(result.isValid).toBe(false);
      const genesisErrors = result.errors.filter(
        (e) => e.errorType === 'genesis_invalid' && e.sequenceNumber === 0,
      );
      expect(genesisErrors.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── validateRange on a sub-range ────────────────────────────────────

  describe('validateRange', () => {
    it('should validate a sub-range with a predecessor', () => {
      const chain = buildChain(5);
      // Validate entries [2, 3, 4] with entry 1 as predecessor
      const subRange = chain.slice(2, 5);
      const predecessor = chain[1];

      const result = validator.validateRange(subRange, predecessor);

      expect(result.isValid).toBe(true);
      expect(result.entriesChecked).toBe(3);
      expect(result.errors).toEqual([]);
    });

    it('should validate a sub-range starting at genesis (no predecessor)', () => {
      const chain = buildChain(3);
      const subRange = chain.slice(0, 2);

      const result = validator.validateRange(subRange, null);

      expect(result.isValid).toBe(true);
      expect(result.entriesChecked).toBe(2);
      expect(result.errors).toEqual([]);
    });

    it('should return valid with 0 entries for empty sub-range', () => {
      const result = validator.validateRange([], null);

      expect(result.isValid).toBe(true);
      expect(result.entriesChecked).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it('should detect broken link to predecessor', () => {
      const chain = buildChain(5);
      // Validate entries [2, 3, 4] but give a wrong predecessor
      const subRange = chain.slice(2, 5);
      const wrongPredecessor: ILedgerEntry = {
        ...chain[1],
        entryHash: makeChecksum(0xcc),
      };

      const result = validator.validateRange(subRange, wrongPredecessor);

      expect(result.isValid).toBe(false);
      const linkErrors = result.errors.filter(
        (e) => e.errorType === 'previous_hash_mismatch',
      );
      expect(linkErrors.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Merkle root verification in validateAll ─────────────────────────

  describe('Merkle root verification', () => {
    it('should pass when merkleRoot matches reconstructed tree root', () => {
      const chain = buildChain(5);
      // Build the expected Merkle root from entry hashes
      const entryHashes = chain.map((e) => e.entryHash);
      const tree = IncrementalMerkleTree.fromLeaves(
        entryHashes,
        checksumService,
      );
      const correctRoot = tree.root;

      const result = validator.validateAll(chain, correctRoot);

      expect(result.isValid).toBe(true);
      expect(result.entriesChecked).toBe(5);
      expect(result.errors).toEqual([]);
    });

    it('should detect merkle_root_mismatch when provided root differs', () => {
      const chain = buildChain(3);
      const wrongRoot = makeChecksum(0xab);

      const result = validator.validateAll(chain, wrongRoot);

      expect(result.isValid).toBe(false);
      const merkleErrors = result.errors.filter(
        (e) => e.errorType === 'merkle_root_mismatch',
      );
      expect(merkleErrors.length).toBe(1);
      expect(merkleErrors[0].message).toContain('Merkle root');
    });

    it('should skip Merkle validation when no merkleRoot is provided', () => {
      const chain = buildChain(3);

      // No merkleRoot argument — should behave exactly as before
      const result = validator.validateAll(chain);

      expect(result.isValid).toBe(true);
      expect(result.entriesChecked).toBe(3);
      expect(result.errors).toEqual([]);
    });

    it('should report both chain errors and merkle_root_mismatch together', () => {
      const chain = buildChain(3);
      // Tamper with entry 1's entryHash AND provide a wrong Merkle root
      const tampered: ILedgerEntry = {
        ...chain[1],
        entryHash: makeChecksum(0xff),
      };
      chain[1] = tampered;
      const wrongRoot = makeChecksum(0xab);

      const result = validator.validateAll(chain, wrongRoot);

      expect(result.isValid).toBe(false);
      // Should have hash_mismatch errors from the tampered entry
      const hashErrors = result.errors.filter(
        (e) => e.errorType === 'hash_mismatch',
      );
      expect(hashErrors.length).toBeGreaterThanOrEqual(1);
      // Should also have merkle_root_mismatch
      const merkleErrors = result.errors.filter(
        (e) => e.errorType === 'merkle_root_mismatch',
      );
      expect(merkleErrors.length).toBe(1);
    });
  });

  // ── Merkle proof verification in validateRange ──────────────────────

  describe('validateRange with Merkle proofs', () => {
    it('should pass when valid Merkle proofs are provided', () => {
      const chain = buildChain(5);
      const entryHashes = chain.map((e) => e.entryHash);
      const tree = IncrementalMerkleTree.fromLeaves(
        entryHashes,
        checksumService,
      );
      const merkleRoot = tree.root;

      // Validate entries [2, 3, 4] with Merkle proofs
      const subRange = chain.slice(2, 5);
      const predecessor = chain[1];
      const merkleProofs = [2, 3, 4].map((i) => tree.getInclusionProof(i));

      const result = validator.validateRange(
        subRange,
        predecessor,
        undefined,
        merkleRoot,
        merkleProofs,
      );

      expect(result.isValid).toBe(true);
      expect(result.entriesChecked).toBe(3);
      expect(result.errors).toEqual([]);
    });

    it('should detect mismatch when an invalid Merkle proof is provided', () => {
      const chain = buildChain(5);
      const entryHashes = chain.map((e) => e.entryHash);
      const tree = IncrementalMerkleTree.fromLeaves(
        entryHashes,
        checksumService,
      );
      const merkleRoot = tree.root;

      const subRange = chain.slice(2, 5);
      const predecessor = chain[1];

      // Get valid proofs, then corrupt one
      const merkleProofs = [2, 3, 4].map((i) => tree.getInclusionProof(i));
      // Replace the middle proof's leafHash with a wrong value to make it invalid
      merkleProofs[1] = {
        ...merkleProofs[1],
        leafHash: makeChecksum(0xba),
      };

      const result = validator.validateRange(
        subRange,
        predecessor,
        undefined,
        merkleRoot,
        merkleProofs,
      );

      expect(result.isValid).toBe(false);
      const merkleErrors = result.errors.filter(
        (e) => e.errorType === 'merkle_root_mismatch',
      );
      expect(merkleErrors.length).toBe(1);
      expect(merkleErrors[0].sequenceNumber).toBe(3);
    });

    it('should skip Merkle validation when no merkleRoot is provided (existing behavior)', () => {
      const chain = buildChain(5);
      const subRange = chain.slice(2, 5);
      const predecessor = chain[1];

      // No merkleRoot — existing behavior preserved
      const result = validator.validateRange(subRange, predecessor);

      expect(result.isValid).toBe(true);
      expect(result.entriesChecked).toBe(3);
      expect(result.errors).toEqual([]);
    });

    it('should skip Merkle validation when merkleRoot is provided but merkleProofs is not', () => {
      const chain = buildChain(5);
      const entryHashes = chain.map((e) => e.entryHash);
      const tree = IncrementalMerkleTree.fromLeaves(
        entryHashes,
        checksumService,
      );
      const merkleRoot = tree.root;

      const subRange = chain.slice(2, 5);
      const predecessor = chain[1];

      // merkleRoot provided but no merkleProofs — should skip Merkle validation
      const result = validator.validateRange(
        subRange,
        predecessor,
        undefined,
        merkleRoot,
      );

      expect(result.isValid).toBe(true);
      expect(result.entriesChecked).toBe(3);
      expect(result.errors).toEqual([]);
    });
  });

  // ── validateAllParallel ─────────────────────────────────────────────

  describe('validateAllParallel', () => {
    it('should produce the same result as validateAll for a valid chain', async () => {
      const chain = buildChain(8);
      const sequential = validator.validateAll(chain);
      const parallel = await validator.validateAllParallel(chain);

      expect(parallel.isValid).toBe(sequential.isValid);
      expect(parallel.entriesChecked).toBe(sequential.entriesChecked);
      expect(parallel.errors).toEqual([]);
    });

    it('should detect a tampered entry', async () => {
      const chain = buildChain(6);
      // Tamper with entry 3's entryHash
      chain[3] = { ...chain[3], entryHash: makeChecksum(0xff) };

      const parallel = await validator.validateAllParallel(chain);

      expect(parallel.isValid).toBe(false);
      const hashErrors = parallel.errors.filter(
        (e) => e.errorType === 'hash_mismatch',
      );
      expect(hashErrors.length).toBeGreaterThanOrEqual(1);
    });

    it('should verify Merkle root when provided', async () => {
      const chain = buildChain(5);
      const entryHashes = chain.map((e) => e.entryHash);
      const tree = IncrementalMerkleTree.fromLeaves(
        entryHashes,
        checksumService,
      );
      const correctRoot = tree.root;

      const result = await validator.validateAllParallel(chain, correctRoot);

      expect(result.isValid).toBe(true);
      expect(result.entriesChecked).toBe(5);
      expect(result.errors).toEqual([]);
    });

    it('should detect merkle_root_mismatch when provided root differs', async () => {
      const chain = buildChain(4);
      const wrongRoot = makeChecksum(0xab);

      const result = await validator.validateAllParallel(chain, wrongRoot);

      expect(result.isValid).toBe(false);
      const merkleErrors = result.errors.filter(
        (e) => e.errorType === 'merkle_root_mismatch',
      );
      expect(merkleErrors.length).toBe(1);
    });

    it('should return valid with 0 entries for empty chain', async () => {
      const result = await validator.validateAllParallel([]);

      expect(result.isValid).toBe(true);
      expect(result.entriesChecked).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it('should handle a single-entry chain', async () => {
      const chain = buildChain(1);
      const sequential = validator.validateAll(chain);
      const parallel = await validator.validateAllParallel(chain);

      expect(parallel.isValid).toBe(sequential.isValid);
      expect(parallel.entriesChecked).toBe(sequential.entriesChecked);
    });
  });
});
