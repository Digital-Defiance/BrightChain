import fc from 'fast-check';
import { BloomWitness } from '../crypto/bloom-witness';
import { MerkleCommitmentTree } from '../crypto/merkle-commitment-tree';
import { DeserializationError } from '../errors';

describe('BloomWitness', () => {
  // Feature: digital-burn-bag, Property 9: Bloom witness contains all tree nodes (no false negatives)
  // Validates: Requirements 7.1, 7.3
  it('Property 9: every tree node is found in the bloom witness', () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 32, maxLength: 32 }), (seed) => {
        const tree = MerkleCommitmentTree.build(seed, 8);
        const nodes = tree.allNodes();
        const witness = BloomWitness.create(nodes);
        for (const node of nodes) {
          expect(witness.query(node)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: digital-burn-bag, Property 10: Bloom witness serialization round-trip
  // Validates: Requirements 7.4
  it('Property 10: serialize then deserialize preserves membership', () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 32, maxLength: 32 }), (seed) => {
        const tree = MerkleCommitmentTree.build(seed, 8);
        const nodes = tree.allNodes();
        const witness = BloomWitness.create(nodes);
        const serialized = witness.serialize();
        const restored = BloomWitness.deserialize(serialized);
        for (const node of nodes) {
          expect(restored.query(node)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('deserialize throws on malformed data', () => {
    const bad = new TextEncoder().encode('not valid json{{{');
    expect(() => BloomWitness.deserialize(bad)).toThrow(DeserializationError);
  });
});
