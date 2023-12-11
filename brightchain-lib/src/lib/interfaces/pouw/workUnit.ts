import { PlatformID } from '@digitaldefiance/ecies-lib';
import { DifficultyTier } from '../../enumerations/difficultyTier';

/**
 * Describes the type of Merkle tree computation a work unit requires.
 */
export enum WorkUnitOperation {
  /** Hash raw leaf data to produce a leaf node checksum */
  LeafHash = 'leaf_hash',
  /** Concatenate child hashes and hash the result to produce an interior node */
  InteriorHash = 'interior_hash',
}

/**
 * A single unit of useful work issued to a rate-limited client.
 *
 * Follows the IBaseData<TID> workspace convention:
 * - Frontend uses IWorkUnit<string>
 * - Backend uses IWorkUnit<Uint8Array>
 *
 * @template TID - Platform ID type. Defaults to string for JSON/frontend.
 */
export interface IWorkUnit<TID extends PlatformID = string> {
  /** Unique identifier for this work unit (UUID v4) */
  id: string;
  /** The Merkle tree this work unit contributes to */
  treeId: string;
  /** Position index within the tree (level + offset) */
  treeLevel: number;
  treeIndex: number;
  /** The operation to perform */
  operation: WorkUnitOperation;
  /**
   * Input data — base64-encoded for JSON transport.
   * For LeafHash: the raw block data to hash.
   * For InteriorHash: concatenated child hashes (each 64 bytes).
   */
  inputData: string;
  /** Number of child hashes (for InteriorHash; 0 for LeafHash) */
  childCount: number;
  /** Difficulty tier governing this work unit */
  difficulty: DifficultyTier;
  /** Challenge token binding this work unit to a client */
  challengeToken: string;
  /** ISO 8601 timestamp when this work unit was created */
  createdAt: string;
  /** ISO 8601 timestamp when this work unit expires */
  expiresAt: string;
}
