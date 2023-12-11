import { Checksum, ChecksumService } from '@brightchain/brightchain-lib';

/**
 * Internal state for a partially-constructed Merkle tree.
 *
 * Level 0 = root (1 node)
 * Level (levels-1) = leaves (leafCount nodes)
 */
interface IMerkleTreeState {
  treeId: string;
  leafCount: number;
  /** Total levels = ceil(log2(leafCount)) + 1 (for leafCount > 1), or 1 for single leaf */
  levels: number;
  /** Number of nodes at each level, indexed by level */
  levelSizes: number[];
  /** Total expected node count across all levels */
  totalNodes: number;
  /** Nodes keyed by `${level}:${index}` = Checksum */
  nodes: Map<string, Checksum>;
  /** Set of completed node keys */
  completedNodes: Set<string>;
  createdAt: number;
  completedAt?: number;
}

/**
 * Compute the number of nodes at each level of a Merkle tree.
 *
 * @param leafCount - Number of leaf nodes
 * @returns Array where sizes[0] = root count (1), sizes[levels-1] = leafCount
 */
function computeLevelSizes(leafCount: number): number[] {
  const sizes: number[] = [];
  let currentSize = leafCount;
  sizes.unshift(currentSize); // leaf level is last
  while (currentSize > 1) {
    currentSize = Math.ceil(currentSize / 2);
    sizes.unshift(currentSize);
  }
  return sizes; // sizes[0] = root (1), sizes[levels-1] = leafCount
}

/**
 * Tracks partially-constructed Merkle trees and assembles
 * verified work results into complete trees.
 *
 * Each tree is identified by a treeId and tracks which nodes
 * have been computed. When all nodes are filled, the tree is
 * marked complete and made available for CBL integration.
 *
 * Tree structure:
 * - Level 0 = root (1 node)
 * - Level (levels-1) = leaves (leafCount nodes)
 * - Each interior node = SHA3-512(concat(children))
 *
 * @see Requirements 6.1, 6.2, 6.3, 6.4, 6.5
 */
export class MerkleTreeAssembler {
  private readonly trees: Map<string, IMerkleTreeState> = new Map();
  private readonly checksumService: ChecksumService;

  constructor(checksumService: ChecksumService) {
    this.checksumService = checksumService;
  }

  /**
   * Create a new tree with the given number of leaves.
   *
   * @param treeId - Unique identifier for the tree
   * @param leafCount - Number of leaf nodes (must be >= 1)
   * @throws Error if leafCount < 1 or treeId already exists
   */
  createTree(treeId: string, leafCount: number): void {
    if (leafCount < 1) {
      throw new Error(`leafCount must be at least 1, got ${leafCount}`);
    }
    if (this.trees.has(treeId)) {
      throw new Error(`Tree with id "${treeId}" already exists`);
    }

    const levelSizes = computeLevelSizes(leafCount);
    const totalNodes = levelSizes.reduce((sum, size) => sum + size, 0);

    const state: IMerkleTreeState = {
      treeId,
      leafCount,
      levels: levelSizes.length,
      levelSizes,
      totalNodes,
      nodes: new Map(),
      completedNodes: new Set(),
      createdAt: Date.now(),
    };

    this.trees.set(treeId, state);
  }

  /**
   * Insert a verified node hash at the given position.
   *
   * @param treeId - The tree to insert into
   * @param level - The level (0 = root, levels-1 = leaves)
   * @param index - The index within the level
   * @param hash - The computed Checksum for this node
   * @throws Error if tree not found or position is out of bounds
   */
  insertNode(
    treeId: string,
    level: number,
    index: number,
    hash: Checksum,
  ): void {
    const state = this.getTreeState(treeId);

    if (level < 0 || level >= state.levels) {
      throw new Error(
        `Level ${level} is out of bounds for tree "${treeId}" (0..${state.levels - 1})`,
      );
    }
    if (index < 0 || index >= state.levelSizes[level]) {
      throw new Error(
        `Index ${index} is out of bounds for level ${level} of tree "${treeId}" (0..${state.levelSizes[level] - 1})`,
      );
    }

    const key = `${level}:${index}`;
    state.nodes.set(key, hash);
    state.completedNodes.add(key);

    // Mark tree as completed if all nodes are filled
    if (state.completedNodes.size === state.totalNodes && !state.completedAt) {
      state.completedAt = Date.now();
    }
  }

  /**
   * Check if a tree is complete (all nodes computed).
   *
   * @param treeId - The tree to check
   * @returns true if all nodes have been computed
   */
  isComplete(treeId: string): boolean {
    const state = this.getTreeState(treeId);
    return state.completedNodes.size === state.totalNodes;
  }

  /**
   * Get the root hash of a tree.
   *
   * @param treeId - The tree to get the root hash from
   * @returns The root Checksum (level 0, index 0)
   * @throws Error if the root node has not been computed
   */
  getRootHash(treeId: string): Checksum {
    const state = this.getTreeState(treeId);
    const rootHash = state.nodes.get('0:0');
    if (!rootHash) {
      throw new Error(`Root hash not yet computed for tree "${treeId}"`);
    }
    return rootHash;
  }

  /**
   * Validate the parent-child hash consistency invariant:
   * each interior node = SHA3-512(concat(children)).
   *
   * Only validates nodes that have been computed. Returns true if
   * all computed interior nodes are consistent with their children.
   *
   * @param treeId - The tree to validate
   * @returns true if all interior nodes match SHA3-512(concat(children))
   */
  validateTree(treeId: string): boolean {
    const state = this.getTreeState(treeId);

    // For a single-level tree (1 leaf), there are no interior nodes to validate
    if (state.levels <= 1) {
      return true;
    }

    // Validate each interior node (levels 0 through levels-2)
    for (let level = 0; level < state.levels - 1; level++) {
      const childLevel = level + 1;

      for (let index = 0; index < state.levelSizes[level]; index++) {
        const nodeKey = `${level}:${index}`;
        const nodeHash = state.nodes.get(nodeKey);

        // Skip nodes that haven't been computed yet
        if (!nodeHash) {
          continue;
        }

        // Get children
        const leftChildIndex = index * 2;
        const rightChildIndex = index * 2 + 1;

        const leftChildKey = `${childLevel}:${leftChildIndex}`;
        const leftChildHash = state.nodes.get(leftChildKey);

        // If left child isn't computed, we can't validate this node
        if (!leftChildHash) {
          continue;
        }

        // Build concatenated child bytes
        const childBuffers: Uint8Array[] = [leftChildHash.toUint8Array()];

        // Right child may not exist (odd number of nodes at child level)
        if (rightChildIndex < state.levelSizes[childLevel]) {
          const rightChildKey = `${childLevel}:${rightChildIndex}`;
          const rightChildHash = state.nodes.get(rightChildKey);

          // If right child exists in the tree but isn't computed, skip validation
          if (!rightChildHash) {
            continue;
          }

          childBuffers.push(rightChildHash.toUint8Array());
        }

        // Compute expected hash: SHA3-512(concat(children))
        const expectedHash =
          this.checksumService.calculateChecksumForBuffers(childBuffers);

        if (!nodeHash.equals(expectedHash)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Get IDs of trees that have remaining uncomputed nodes.
   *
   * @returns Array of tree IDs that are not yet complete
   */
  getPartialTreeIds(): string[] {
    const partialIds: string[] = [];
    for (const [treeId, state] of this.trees) {
      if (state.completedNodes.size < state.totalNodes) {
        partialIds.push(treeId);
      }
    }
    return partialIds;
  }

  /**
   * Get remaining uncomputed node positions for a tree.
   *
   * @param treeId - The tree to query
   * @returns Array of { level, index } for nodes not yet computed
   */
  getRemainingNodes(treeId: string): Array<{ level: number; index: number }> {
    const state = this.getTreeState(treeId);
    const remaining: Array<{ level: number; index: number }> = [];

    for (let level = 0; level < state.levels; level++) {
      for (let index = 0; index < state.levelSizes[level]; index++) {
        const key = `${level}:${index}`;
        if (!state.completedNodes.has(key)) {
          remaining.push({ level, index });
        }
      }
    }

    return remaining;
  }

  /**
   * Export a completed tree's addresses as Checksum[] for CBL consumption.
   * Returns all node hashes ordered by level (root first) then by index.
   *
   * @param treeId - The tree to export
   * @returns Array of Checksum values for all nodes
   * @throws Error if tree is not complete
   */
  exportAddresses(treeId: string): Checksum[] {
    const state = this.getTreeState(treeId);

    if (state.completedNodes.size < state.totalNodes) {
      throw new Error(
        `Cannot export incomplete tree "${treeId}": ${state.completedNodes.size}/${state.totalNodes} nodes computed`,
      );
    }

    const addresses: Checksum[] = [];

    for (let level = 0; level < state.levels; level++) {
      for (let index = 0; index < state.levelSizes[level]; index++) {
        const key = `${level}:${index}`;
        const hash = state.nodes.get(key);
        if (!hash) {
          // This shouldn't happen if completedNodes.size === totalNodes
          throw new Error(
            `Missing node at ${key} in tree "${treeId}" despite being marked complete`,
          );
        }
        addresses.push(hash);
      }
    }

    return addresses;
  }

  /**
   * Get the internal tree state, throwing if the tree doesn't exist.
   */
  private getTreeState(treeId: string): IMerkleTreeState {
    const state = this.trees.get(treeId);
    if (!state) {
      throw new Error(`Tree with id "${treeId}" not found`);
    }
    return state;
  }
}
