/**
 * Property-based tests for ProofSerializer.
 *
 * Properties 8 and 9 from the design document.
 * Uses fast-check with minimum 100 iterations per property.
 *
 * @see Design: Merkle Tree Commitment Layer — Correctness Properties
 */

import * as fc from 'fast-check';
import { Checksum } from '../../types/checksum';
import {
  IMerkleProof,
  MerkleDirection,
} from '../../interfaces/ledger/merkleProof';
import { IConsistencyProof } from '../../interfaces/ledger/consistencyProof';
import { ProofSerializer } from '../proofSerializer';

// ── Custom Generators ────────────────────────────────────────────────

function arbChecksum(): fc.Arbitrary<Checksum> {
  return fc
    .array(fc.integer({ min: 0, max: 255 }), { minLength: 64, maxLength: 64 })
    .map((arr) => Checksum.fromUint8Array(new Uint8Array(arr)));
}

function arbMerkleProof(): fc.Arbitrary<IMerkleProof> {
  return fc
    .record({
      leafHash: arbChecksum(),
      leafIndex: fc.integer({ min: 0, max: 0xffffffff }),
      treeSize: fc.integer({ min: 1, max: 0xffffffff }),
      pathLength: fc.integer({ min: 0, max: 30 }),
    })
    .chain((fields) =>
      fc
        .array(
          fc.record({
            hash: arbChecksum(),
            direction: fc.constantFrom(
              MerkleDirection.LEFT,
              MerkleDirection.RIGHT,
            ),
          }),
          { minLength: fields.pathLength, maxLength: fields.pathLength },
        )
        .map((path) => ({
          leafHash: fields.leafHash,
          leafIndex: fields.leafIndex,
          treeSize: fields.treeSize,
          path,
        })),
    );
}

function arbConsistencyProof(): fc.Arbitrary<IConsistencyProof> {
  return fc
    .record({
      earlierSize: fc.integer({ min: 0, max: 0xffffffff }),
      laterSize: fc.integer({ min: 0, max: 0xffffffff }),
      hashCount: fc.integer({ min: 0, max: 30 }),
    })
    .chain((fields) =>
      fc
        .array(arbChecksum(), {
          minLength: fields.hashCount,
          maxLength: fields.hashCount,
        })
        .map((hashes) => ({
          earlierSize: Math.min(fields.earlierSize, fields.laterSize),
          laterSize: Math.max(fields.earlierSize, fields.laterSize),
          hashes,
        })),
    );
}

// ── Property Tests ───────────────────────────────────────────────────

describe('ProofSerializer PBT', () => {
  /**
   * Property 8: Inclusion Proof Serialization Round-Trip
   *
   * For any valid IMerkleProof object, serializing it via
   * ProofSerializer.serializeInclusionProof() and then deserializing via
   * ProofSerializer.deserializeInclusionProof() should produce an object
   * with identical field values.
   *
   * **Validates: Requirements 10.1, 10.5**
   */
  it('Property 8: Inclusion Proof Serialization Round-Trip', () => {
    fc.assert(
      fc.property(arbMerkleProof(), (proof) => {
        const serialized = ProofSerializer.serializeInclusionProof(proof);
        const deserialized =
          ProofSerializer.deserializeInclusionProof(serialized);

        // leafHash round-trips
        expect(deserialized.leafHash.equals(proof.leafHash)).toBe(true);

        // scalar fields round-trip
        expect(deserialized.leafIndex).toBe(proof.leafIndex);
        expect(deserialized.treeSize).toBe(proof.treeSize);

        // path length round-trips
        expect(deserialized.path.length).toBe(proof.path.length);

        // each path step round-trips
        for (let i = 0; i < proof.path.length; i++) {
          expect(deserialized.path[i].hash.equals(proof.path[i].hash)).toBe(
            true,
          );
          expect(deserialized.path[i].direction).toBe(
            proof.path[i].direction,
          );
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 9: Consistency Proof Serialization Round-Trip
   *
   * For any valid IConsistencyProof object, serializing it via
   * ProofSerializer.serializeConsistencyProof() and then deserializing via
   * ProofSerializer.deserializeConsistencyProof() should produce an object
   * with identical field values.
   *
   * **Validates: Requirements 10.2, 10.6**
   */
  it('Property 9: Consistency Proof Serialization Round-Trip', () => {
    fc.assert(
      fc.property(arbConsistencyProof(), (proof) => {
        const serialized = ProofSerializer.serializeConsistencyProof(proof);
        const deserialized =
          ProofSerializer.deserializeConsistencyProof(serialized);

        // scalar fields round-trip
        expect(deserialized.earlierSize).toBe(proof.earlierSize);
        expect(deserialized.laterSize).toBe(proof.laterSize);

        // hashes length round-trips
        expect(deserialized.hashes.length).toBe(proof.hashes.length);

        // each hash round-trips
        for (let i = 0; i < proof.hashes.length; i++) {
          expect(deserialized.hashes[i].equals(proof.hashes[i])).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });
});
