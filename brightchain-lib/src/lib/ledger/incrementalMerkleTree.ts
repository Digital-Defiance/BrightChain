/**
 * @fileoverview IncrementalMerkleTree — a frontier-based incremental Merkle tree
 * built over SHA3-512 entry hashes.
 *
 * The tree supports O(log N) appends via a frontier (right-spine hashes) and
 * maintains the full leaf list for proof generation. All binary data uses
 * Uint8Array (no Node.js Buffer) for browser compatibility.
 *
 * @see Design: Merkle Tree Commitment Layer — IncrementalMerkleTree
 * @see Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 14.1, 15.1, 15.2
 */

import { LedgerError, LedgerErrorType } from '../errors/ledgerError';
import { IConsistencyProof } from '../interfaces/ledger/consistencyProof';
import {
  IMerkleProof,
  IMerkleProofStep,
  MerkleDirection,
} from '../interfaces/ledger/merkleProof';
import { ChecksumService } from '../services/checksum.service';
import { Checksum } from '../types/checksum';

/**
 * Incremental Merkle tree using frontier-based O(log N) appends.
 *
 * Leaves are the entryHash (SHA3-512, 64 bytes) of each ledger entry.
 * Internal nodes are SHA3-512(left_child || right_child).
 * The frontier stores the root hashes of the perfect binary subtrees
 * that compose the current tree.
 */
export class IncrementalMerkleTree {
  /** All leaf hashes, in order. */
  private leaves: Checksum[];
  /** Frontier: right-spine hashes for incremental root computation. */
  private frontier: Checksum[];
  /** Cached current root. */
  private cachedRoot: Checksum | null;
  /**
   * Tracked size, independent of leaves.length.
   * For frontier-only trees (restored via fromFrontier), leaves may be empty
   * while _size reflects the actual number of leaves the frontier represents.
   */
  private _size: number;

  constructor(private readonly checksumService: ChecksumService) {
    this.leaves = [];
    this.frontier = [];
    this.cachedRoot = null;
    this._size = 0;
  }

  /**
   * Current Merkle root. SHA3-512 of empty bytes if tree is empty.
   * Returns the leaf hash when there is a single leaf.
   */
  get root(): Checksum {
    if (this._size === 0) {
      return this.checksumService.calculateChecksum(new Uint8Array(0));
    }
    if (this._size === 1 && this.leaves.length === 1) {
      return this.leaves[0];
    }
    if (this.cachedRoot !== null) {
      return this.cachedRoot;
    }
    this.cachedRoot = this.computeRootFromFrontier();
    return this.cachedRoot;
  }

  /** Number of leaves in the tree. */
  get size(): number {
    return this._size;
  }

  /** Current frontier (right-spine hashes). Returns a copy. */
  get currentFrontier(): Checksum[] {
    return [...this.frontier];
  }

  /**
   * Append a new leaf hash. Updates frontier and root in O(log N).
   *
   * Algorithm (trailing-ones merge):
   *   1. Push leafHash onto frontier
   *   2. Increment size
   *   3. Count trailing 1-bits in binary(size) = mergeCount
   *   4. For mergeCount iterations: pop right, pop left, push SHA3-512(left || right)
   *   5. Recompute cachedRoot from frontier
   */
  append(leafHash: Checksum): void {
    this.leaves.push(leafHash);
    this.frontier.push(leafHash);
    this._size++;

    const mergeCount = this.trailingZeros(this._size);

    for (let i = 0; i < mergeCount; i++) {
      const right = this.frontier.pop()!;
      const left = this.frontier.pop()!;
      this.frontier.push(this.hashPair(left, right));
    }

    this.cachedRoot = this.computeRootFromFrontier();
  }

  /**
   * Generate an inclusion proof for the leaf at the given index.
   *
   * Uses the RFC 6962 recursive decomposition: split the N leaves into
   * a left subtree of size k (largest power of 2 < N) and a right subtree
   * of size N-k. Recurse into whichever subtree contains the target leaf,
   * recording the sibling subtree's hash at each level.
   *
   * This guarantees path length = ceil(log2(N)), or 0 when N = 1.
   *
   * @param leafIndex - Zero-based index of the leaf
   * @returns An IMerkleProof with the authentication path from leaf to root
   * @throws LedgerError(MerkleProofFailed) if leafIndex is out of range
   *
   * @see Requirements 3.1, 3.2, 3.3, 3.4, 14.2
   */
  getInclusionProof(leafIndex: number): IMerkleProof {
    const n = this._size;

    if (
      n === 0 ||
      leafIndex < 0 ||
      leafIndex >= n ||
      leafIndex >= this.leaves.length
    ) {
      throw new LedgerError(
        LedgerErrorType.MerkleProofFailed,
        `Leaf index ${leafIndex} is out of range [0, ${n})`,
      );
    }

    // Single leaf — proof path is empty
    if (n === 1) {
      return {
        leafHash: this.leaves[0],
        leafIndex: 0,
        treeSize: 1,
        path: [],
      };
    }

    const path: IMerkleProofStep[] = [];
    this.buildInclusionPath(this.leaves, leafIndex, path);

    // buildInclusionPath produces root-to-leaf order; reverse for leaf-to-root
    path.reverse();

    return {
      leafHash: this.leaves[leafIndex],
      leafIndex,
      treeSize: n,
      path,
    };
  }

  /**
   * Generate a consistency proof between an earlier tree size M and the current
   * tree size N.
   *
   * Follows RFC 6962 Section 2.1.2: SUBPROOF(m, D[0:n], b).
   *
   * - M=0 or M=N → empty proof (trivially consistent)
   * - M > N → throw LedgerError(ConsistencyProofFailed)
   * - 0 < M < N → return minimal set of intermediate hashes
   *
   * @param earlierSize - The earlier tree size M
   * @returns An IConsistencyProof with the intermediate hashes
   * @throws LedgerError(ConsistencyProofFailed) if earlierSize > current size
   *
   * @see Requirements 5.1, 5.2, 5.3, 5.4, 14.3
   */
  getConsistencyProof(earlierSize: number): IConsistencyProof {
    const n = this._size;
    const m = earlierSize;

    if (m > n) {
      throw new LedgerError(
        LedgerErrorType.ConsistencyProofFailed,
        `Earlier size ${m} exceeds current size ${n}`,
      );
    }

    // M=0 or M=N → trivially consistent, empty proof
    if (m === 0 || m === n) {
      return {
        earlierSize: m,
        laterSize: n,
        hashes: [],
      };
    }

    // Consistency proofs require leaves for hash computation
    if (this.leaves.length === 0) {
      throw new LedgerError(
        LedgerErrorType.ConsistencyProofFailed,
        'Cannot generate consistency proof from a frontier-only tree (no leaves stored)',
      );
    }

    // RFC 6962 SUBPROOF(m, D[0:n], true)
    const hashes: Checksum[] = [];
    this.buildConsistencyProof(m, this.leaves.slice(0, n), true, hashes);

    return {
      earlierSize: m,
      laterSize: n,
      hashes,
    };
  }

  /**
   * Batch-construct a tree from a list of leaf hashes.
   * Produces the same root as appending each leaf one at a time.
   *
   * @param leaves - Array of leaf hashes (SHA3-512 Checksums)
   * @param checksumService - ChecksumService for hashing
   * @returns A fully populated IncrementalMerkleTree
   *
   * @see Requirements 2.3, 2.4, 8.2, 14.5
   */
  static fromLeaves(
    leaves: Checksum[],
    checksumService: ChecksumService,
  ): IncrementalMerkleTree {
    const tree = new IncrementalMerkleTree(checksumService);
    for (const leaf of leaves) {
      tree.append(leaf);
    }
    return tree;
  }

  /**
   * Restore a tree from a persisted frontier and size.
   * Creates a tree that can compute the root and accept further appends,
   * but cannot generate inclusion or consistency proofs (no leaves stored).
   *
   * @param frontier - The persisted frontier (right-spine hashes)
   * @param size - The number of leaves the frontier represents
   * @param checksumService - ChecksumService for hashing
   * @returns An IncrementalMerkleTree with frontier and size set, but no leaves
   *
   * @see Requirements 2.3, 2.4, 8.2, 14.5
   */
  static fromFrontier(
    frontier: Checksum[],
    size: number,
    checksumService: ChecksumService,
  ): IncrementalMerkleTree {
    const tree = new IncrementalMerkleTree(checksumService);
    tree.frontier = [...frontier];
    tree._size = size;
    tree.cachedRoot = tree.computeRootFromFrontier();
    return tree;
  }

  /**
   * Compute the Merkle root for a given set of leaves without creating
   * a full tree instance. Pure function for verification.
   *
   * @param leaves - Array of leaf hashes (SHA3-512 Checksums)
   * @param checksumService - ChecksumService for hashing
   * @returns The Merkle root Checksum
   *
   * @see Requirements 2.3, 2.4, 8.2, 14.5
   */
  static computeRoot(
    leaves: Checksum[],
    checksumService: ChecksumService,
  ): Checksum {
    const tree = IncrementalMerkleTree.fromLeaves(leaves, checksumService);
    return tree.root;
  }

  /**
   * RFC 6962 Section 2.1.2 SUBPROOF(m, leaves, startFromOldRoot).
   *
   * Recursively decomposes the tree to produce the minimal set of hashes
   * needed to prove consistency between tree sizes m and |leaves|.
   *
   * @param m - The earlier tree size within this subtree
   * @param leaves - The leaves of the current subtree
   * @param startFromOldRoot - If true, omit the hash when m == |leaves|
   *   (because the verifier can compute it from the earlier root)
   * @param hashes - Accumulator for the proof hashes
   */
  private buildConsistencyProof(
    m: number,
    leaves: Checksum[],
    startFromOldRoot: boolean,
    hashes: Checksum[],
  ): void {
    const n = leaves.length;

    if (m === n) {
      // When startFromOldRoot is true, the verifier already knows this hash
      // (it's the old root). When false, we must include it.
      if (!startFromOldRoot) {
        hashes.push(this.computeSubtreeHash(leaves));
      }
      return;
    }

    // k = largest power of 2 less than n
    const k = this.largestPowerOf2LessThan(n);

    if (m <= k) {
      // The old tree fits entirely in the left subtree
      this.buildConsistencyProof(
        m,
        leaves.slice(0, k),
        startFromOldRoot,
        hashes,
      );
      // Include the right subtree hash
      hashes.push(this.computeSubtreeHash(leaves.slice(k)));
    } else {
      // The old tree spans both subtrees: left is full (size k), right has m-k
      this.buildConsistencyProof(m - k, leaves.slice(k), false, hashes);
      // Include the left subtree hash
      hashes.push(this.computeSubtreeHash(leaves.slice(0, k)));
    }
  }

  /**
   * Recursively build the inclusion proof path using RFC 6962 decomposition.
   *
   * Split leaves into left (size k = largest power of 2 < n) and right (n-k).
   * Record the sibling subtree hash and recurse into the subtree containing
   * the target leaf.
   */
  private buildInclusionPath(
    leaves: Checksum[],
    targetIndex: number,
    path: IMerkleProofStep[],
  ): void {
    const n = leaves.length;
    if (n <= 1) {
      return;
    }

    // k = largest power of 2 less than n
    const k = this.largestPowerOf2LessThan(n);

    if (targetIndex < k) {
      // Target is in the left subtree; sibling is the right subtree hash
      const rightHash = this.computeSubtreeHash(leaves.slice(k));
      path.push({ hash: rightHash, direction: MerkleDirection.RIGHT });
      this.buildInclusionPath(leaves.slice(0, k), targetIndex, path);
    } else {
      // Target is in the right subtree; sibling is the left subtree hash
      const leftHash = this.computeSubtreeHash(leaves.slice(0, k));
      path.push({ hash: leftHash, direction: MerkleDirection.LEFT });
      this.buildInclusionPath(leaves.slice(k), targetIndex - k, path);
    }
  }

  /**
   * Compute the Merkle hash of a subtree given its leaves.
   * Uses the same RFC 6962 recursive decomposition.
   */
  private computeSubtreeHash(leaves: Checksum[]): Checksum {
    const n = leaves.length;
    if (n === 0) {
      return this.checksumService.calculateChecksum(new Uint8Array(0));
    }
    if (n === 1) {
      return leaves[0];
    }
    const k = this.largestPowerOf2LessThan(n);
    const leftHash = this.computeSubtreeHash(leaves.slice(0, k));
    const rightHash = this.computeSubtreeHash(leaves.slice(k));
    return this.hashPair(leftHash, rightHash);
  }

  /**
   * Returns the largest power of 2 that is strictly less than n.
   * For n=2, returns 1. For n=3, returns 2. For n=5, returns 4.
   */
  private largestPowerOf2LessThan(n: number): number {
    let k = 1;
    while (k * 2 < n) {
      k *= 2;
    }
    return k;
  }

  /**
   * Compute the root from the frontier by folding right-to-left.
   * SHA3-512(frontier[i] || result) for i from second-to-last down to 0.
   */
  private computeRootFromFrontier(): Checksum {
    if (this.frontier.length === 0) {
      return this.checksumService.calculateChecksum(new Uint8Array(0));
    }

    let result = this.frontier[this.frontier.length - 1];
    for (let i = this.frontier.length - 2; i >= 0; i--) {
      result = this.hashPair(this.frontier[i], result);
    }
    return result;
  }

  /**
   * Hash two child nodes: SHA3-512(left || right).
   * Concatenates the 64-byte left and right hashes, then hashes the 128-byte result.
   */
  private hashPair(left: Checksum, right: Checksum): Checksum {
    const leftBytes = left.toUint8Array();
    const rightBytes = right.toUint8Array();
    const combined = new Uint8Array(leftBytes.length + rightBytes.length);
    combined.set(leftBytes, 0);
    combined.set(rightBytes, leftBytes.length);
    return this.checksumService.calculateChecksum(combined);
  }

  /**
   * Count the number of trailing 1-bits in the binary representation of n.
   */
  private trailingOnes(n: number): number {
    let count = 0;
    while ((n & 1) === 1) {
      count++;
      n >>>= 1;
    }
    return count;
  }

  /**
   * Count the number of trailing 0-bits in the binary representation of n.
   * For n=0, returns 0.
   */
  private trailingZeros(n: number): number {
    if (n === 0) return 0;
    let count = 0;
    while ((n & 1) === 0) {
      count++;
      n >>>= 1;
    }
    return count;
  }
}
