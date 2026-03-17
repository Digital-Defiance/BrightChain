/**
 * Unit tests for ProofSerializer — deterministic binary serialization
 * of Merkle inclusion proofs and consistency proofs.
 *
 * @see Requirements 10.5, 10.6, 10.7, 10.8
 */

import {
  LedgerSerializationError,
  LedgerSerializationErrorType,
} from '../../errors/ledgerSerializationError';
import { IConsistencyProof } from '../../interfaces/ledger/consistencyProof';
import {
  IMerkleProof,
  MerkleDirection,
} from '../../interfaces/ledger/merkleProof';
import { Checksum } from '../../types/checksum';
import { ProofSerializer } from '../proofSerializer';

/** Helper: create a deterministic 64-byte Checksum from a single byte value. */
function makeChecksum(val: number): Checksum {
  const bytes = new Uint8Array(64);
  bytes.fill(val);
  return Checksum.fromUint8Array(bytes);
}

describe('ProofSerializer', () => {
  // ── Known inclusion proof ───────────────────────────────────────────

  describe('inclusion proof round-trip (Req 10.5)', () => {
    const knownProof: IMerkleProof = {
      leafHash: makeChecksum(0xaa),
      leafIndex: 5,
      treeSize: 16,
      path: [
        { hash: makeChecksum(0xbb), direction: MerkleDirection.LEFT },
        { hash: makeChecksum(0xcc), direction: MerkleDirection.RIGHT },
        { hash: makeChecksum(0xdd), direction: MerkleDirection.LEFT },
        { hash: makeChecksum(0xee), direction: MerkleDirection.RIGHT },
      ],
    };

    it('should serialize and deserialize back to an identical proof', () => {
      const serialized = ProofSerializer.serializeInclusionProof(knownProof);
      const deserialized =
        ProofSerializer.deserializeInclusionProof(serialized);

      expect(deserialized.leafHash.equals(knownProof.leafHash)).toBe(true);
      expect(deserialized.leafIndex).toBe(knownProof.leafIndex);
      expect(deserialized.treeSize).toBe(knownProof.treeSize);
      expect(deserialized.path.length).toBe(knownProof.path.length);

      for (let i = 0; i < knownProof.path.length; i++) {
        expect(deserialized.path[i].hash.equals(knownProof.path[i].hash)).toBe(
          true,
        );
        expect(deserialized.path[i].direction).toBe(
          knownProof.path[i].direction,
        );
      }
    });

    it('should produce deterministic binary output', () => {
      const a = ProofSerializer.serializeInclusionProof(knownProof);
      const b = ProofSerializer.serializeInclusionProof(knownProof);
      expect(a).toEqual(b);
    });

    it('should encode version 0x01 and proof type 0x01 in the header', () => {
      const serialized = ProofSerializer.serializeInclusionProof(knownProof);
      expect(serialized[0]).toBe(0x01); // version
      expect(serialized[1]).toBe(0x01); // inclusion proof type
    });
  });

  // ── Known consistency proof ─────────────────────────────────────────

  describe('consistency proof round-trip (Req 10.6)', () => {
    const knownProof: IConsistencyProof = {
      earlierSize: 8,
      laterSize: 16,
      hashes: [makeChecksum(0x11), makeChecksum(0x22), makeChecksum(0x33)],
    };

    it('should serialize and deserialize back to an identical proof', () => {
      const serialized = ProofSerializer.serializeConsistencyProof(knownProof);
      const deserialized =
        ProofSerializer.deserializeConsistencyProof(serialized);

      expect(deserialized.earlierSize).toBe(knownProof.earlierSize);
      expect(deserialized.laterSize).toBe(knownProof.laterSize);
      expect(deserialized.hashes.length).toBe(knownProof.hashes.length);

      for (let i = 0; i < knownProof.hashes.length; i++) {
        expect(deserialized.hashes[i].equals(knownProof.hashes[i])).toBe(true);
      }
    });

    it('should produce deterministic binary output', () => {
      const a = ProofSerializer.serializeConsistencyProof(knownProof);
      const b = ProofSerializer.serializeConsistencyProof(knownProof);
      expect(a).toEqual(b);
    });

    it('should encode version 0x01 and proof type 0x02 in the header', () => {
      const serialized = ProofSerializer.serializeConsistencyProof(knownProof);
      expect(serialized[0]).toBe(0x01); // version
      expect(serialized[1]).toBe(0x02); // consistency proof type
    });
  });

  // ── Empty path / empty hashes round-trip ────────────────────────────

  describe('edge cases', () => {
    it('should round-trip an inclusion proof with empty path', () => {
      const proof: IMerkleProof = {
        leafHash: makeChecksum(0xff),
        leafIndex: 0,
        treeSize: 1,
        path: [],
      };
      const serialized = ProofSerializer.serializeInclusionProof(proof);
      const deserialized =
        ProofSerializer.deserializeInclusionProof(serialized);

      expect(deserialized.leafHash.equals(proof.leafHash)).toBe(true);
      expect(deserialized.leafIndex).toBe(0);
      expect(deserialized.treeSize).toBe(1);
      expect(deserialized.path.length).toBe(0);
    });

    it('should round-trip a consistency proof with empty hashes', () => {
      const proof: IConsistencyProof = {
        earlierSize: 5,
        laterSize: 5,
        hashes: [],
      };
      const serialized = ProofSerializer.serializeConsistencyProof(proof);
      const deserialized =
        ProofSerializer.deserializeConsistencyProof(serialized);

      expect(deserialized.earlierSize).toBe(5);
      expect(deserialized.laterSize).toBe(5);
      expect(deserialized.hashes.length).toBe(0);
    });
  });

  // ── Truncated data (Req 10.7) ───────────────────────────────────────

  describe('truncated data throws LedgerSerializationError (Req 10.7)', () => {
    it('should throw DataTooShort for inclusion proof with insufficient header', () => {
      const tooShort = new Uint8Array(10); // less than 76-byte header
      tooShort[0] = 0x01;
      tooShort[1] = 0x01;

      expect(() => ProofSerializer.deserializeInclusionProof(tooShort)).toThrow(
        LedgerSerializationError,
      );

      try {
        ProofSerializer.deserializeInclusionProof(tooShort);
      } catch (e) {
        expect(e).toBeInstanceOf(LedgerSerializationError);
        expect((e as LedgerSerializationError).errorType).toBe(
          LedgerSerializationErrorType.DataTooShort,
        );
      }
    });

    it('should throw DataTooShort for consistency proof with insufficient header', () => {
      const tooShort = new Uint8Array(5); // less than 12-byte header
      tooShort[0] = 0x01;
      tooShort[1] = 0x02;

      expect(() =>
        ProofSerializer.deserializeConsistencyProof(tooShort),
      ).toThrow(LedgerSerializationError);

      try {
        ProofSerializer.deserializeConsistencyProof(tooShort);
      } catch (e) {
        expect(e).toBeInstanceOf(LedgerSerializationError);
        expect((e as LedgerSerializationError).errorType).toBe(
          LedgerSerializationErrorType.DataTooShort,
        );
      }
    });

    it('should throw FieldOverflow for inclusion proof with truncated path', () => {
      const proof: IMerkleProof = {
        leafHash: makeChecksum(0xaa),
        leafIndex: 0,
        treeSize: 4,
        path: [
          { hash: makeChecksum(0xbb), direction: MerkleDirection.LEFT },
          { hash: makeChecksum(0xcc), direction: MerkleDirection.RIGHT },
        ],
      };
      const full = ProofSerializer.serializeInclusionProof(proof);
      const truncated = full.slice(0, full.length - 10);

      expect(() =>
        ProofSerializer.deserializeInclusionProof(truncated),
      ).toThrow(LedgerSerializationError);

      try {
        ProofSerializer.deserializeInclusionProof(truncated);
      } catch (e) {
        expect(e).toBeInstanceOf(LedgerSerializationError);
        expect((e as LedgerSerializationError).errorType).toBe(
          LedgerSerializationErrorType.FieldOverflow,
        );
      }
    });

    it('should throw FieldOverflow for consistency proof with truncated hashes', () => {
      const proof: IConsistencyProof = {
        earlierSize: 4,
        laterSize: 8,
        hashes: [makeChecksum(0x11), makeChecksum(0x22)],
      };
      const full = ProofSerializer.serializeConsistencyProof(proof);
      const truncated = full.slice(0, full.length - 10);

      expect(() =>
        ProofSerializer.deserializeConsistencyProof(truncated),
      ).toThrow(LedgerSerializationError);

      try {
        ProofSerializer.deserializeConsistencyProof(truncated);
      } catch (e) {
        expect(e).toBeInstanceOf(LedgerSerializationError);
        expect((e as LedgerSerializationError).errorType).toBe(
          LedgerSerializationErrorType.FieldOverflow,
        );
      }
    });
  });

  // ── Unrecognized version byte (Req 10.8) ────────────────────────────

  describe('unrecognized version byte throws (Req 10.8)', () => {
    it('should throw UnsupportedVersion for inclusion proof with bad version', () => {
      const buf = new Uint8Array(76);
      buf[0] = 0xff; // bad version
      buf[1] = 0x01; // inclusion type

      expect(() => ProofSerializer.deserializeInclusionProof(buf)).toThrow(
        LedgerSerializationError,
      );

      try {
        ProofSerializer.deserializeInclusionProof(buf);
      } catch (e) {
        expect(e).toBeInstanceOf(LedgerSerializationError);
        expect((e as LedgerSerializationError).errorType).toBe(
          LedgerSerializationErrorType.UnsupportedVersion,
        );
      }
    });

    it('should throw UnsupportedVersion for consistency proof with bad version', () => {
      const buf = new Uint8Array(12);
      buf[0] = 0x00; // bad version
      buf[1] = 0x02; // consistency type

      expect(() => ProofSerializer.deserializeConsistencyProof(buf)).toThrow(
        LedgerSerializationError,
      );

      try {
        ProofSerializer.deserializeConsistencyProof(buf);
      } catch (e) {
        expect(e).toBeInstanceOf(LedgerSerializationError);
        expect((e as LedgerSerializationError).errorType).toBe(
          LedgerSerializationErrorType.UnsupportedVersion,
        );
      }
    });
  });

  // ── Unrecognized proof type byte ────────────────────────────────────

  describe('unrecognized proof type byte throws', () => {
    it('should throw InvalidMagic for inclusion deserializer given wrong proof type', () => {
      const buf = new Uint8Array(76);
      buf[0] = 0x01; // correct version
      buf[1] = 0x02; // consistency type, not inclusion

      expect(() => ProofSerializer.deserializeInclusionProof(buf)).toThrow(
        LedgerSerializationError,
      );

      try {
        ProofSerializer.deserializeInclusionProof(buf);
      } catch (e) {
        expect(e).toBeInstanceOf(LedgerSerializationError);
        expect((e as LedgerSerializationError).errorType).toBe(
          LedgerSerializationErrorType.InvalidMagic,
        );
      }
    });

    it('should throw InvalidMagic for consistency deserializer given wrong proof type', () => {
      const buf = new Uint8Array(12);
      buf[0] = 0x01; // correct version
      buf[1] = 0x01; // inclusion type, not consistency

      expect(() => ProofSerializer.deserializeConsistencyProof(buf)).toThrow(
        LedgerSerializationError,
      );

      try {
        ProofSerializer.deserializeConsistencyProof(buf);
      } catch (e) {
        expect(e).toBeInstanceOf(LedgerSerializationError);
        expect((e as LedgerSerializationError).errorType).toBe(
          LedgerSerializationErrorType.InvalidMagic,
        );
      }
    });

    it('should throw InvalidMagic for inclusion deserializer given unknown proof type byte', () => {
      const buf = new Uint8Array(76);
      buf[0] = 0x01; // correct version
      buf[1] = 0xfe; // unknown proof type

      expect(() => ProofSerializer.deserializeInclusionProof(buf)).toThrow(
        LedgerSerializationError,
      );

      try {
        ProofSerializer.deserializeInclusionProof(buf);
      } catch (e) {
        expect(e).toBeInstanceOf(LedgerSerializationError);
        expect((e as LedgerSerializationError).errorType).toBe(
          LedgerSerializationErrorType.InvalidMagic,
        );
      }
    });

    it('should throw InvalidMagic for consistency deserializer given unknown proof type byte', () => {
      const buf = new Uint8Array(12);
      buf[0] = 0x01; // correct version
      buf[1] = 0xfe; // unknown proof type

      expect(() => ProofSerializer.deserializeConsistencyProof(buf)).toThrow(
        LedgerSerializationError,
      );

      try {
        ProofSerializer.deserializeConsistencyProof(buf);
      } catch (e) {
        expect(e).toBeInstanceOf(LedgerSerializationError);
        expect((e as LedgerSerializationError).errorType).toBe(
          LedgerSerializationErrorType.InvalidMagic,
        );
      }
    });
  });
});
