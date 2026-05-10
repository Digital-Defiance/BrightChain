import { BloomFilter } from 'bloom-filters';
import { DeserializationError } from '../errors';

/**
 * Bloom filter witness over Merkle tree nodes for lightweight membership proofs.
 * Tree nodes are hex-encoded before insertion (Bloom filters operate on strings).
 *
 * Validates: Requirements 7.1–7.5
 */
export class BloomWitness {
  private constructor(private readonly filter: BloomFilter) {}

  /** Create a BloomWitness from tree nodes with a target false positive rate. */
  static create(
    nodes: Uint8Array[],
    falsePositiveRate: number = 0.001,
  ): BloomWitness {
    const bf = BloomFilter.create(nodes.length, falsePositiveRate);
    for (const node of nodes) {
      bf.add(BloomWitness.toHex(node));
    }
    return new BloomWitness(bf);
  }

  /** Query probabilistic membership. */
  query(candidate: Uint8Array): boolean {
    return this.filter.has(BloomWitness.toHex(candidate));
  }

  /** Serialize to Uint8Array. */
  serialize(): Uint8Array {
    const json = this.filter.saveAsJSON();
    return new TextEncoder().encode(JSON.stringify(json));
  }

  /** Deserialize from Uint8Array. Throws DeserializationError on malformed data. */
  static deserialize(data: Uint8Array): BloomWitness {
    try {
      const text = new TextDecoder().decode(data);
      const json = JSON.parse(text);
      const filter = BloomFilter.fromJSON(json) as unknown as BloomFilter;
      return new BloomWitness(filter);
    } catch (e) {
      throw new DeserializationError(
        `Failed to deserialize BloomWitness: ${(e as Error).message}`,
      );
    }
  }

  private static toHex(buf: Uint8Array): string {
    return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
  }
}
