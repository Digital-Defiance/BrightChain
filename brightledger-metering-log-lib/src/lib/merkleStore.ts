import * as fs from 'node:fs';
import * as path from 'node:path';

import { decode, encode } from 'cbor-x';

import {
  merkleRootFromLeaves,
  proveInclusion,
  type ExclusionProof,
  type InclusionProof,
} from './merkleTree.js';
import { decodeMeteringRecord } from './record.js';

/** Name for the Merkle index sub-directory within a shard data directory. */
export const INDEX_DIR_NAME = 'index';

/**
 * In-memory representation of a loaded batch Merkle index.
 *
 * An index covers all records in one settlement batch window and persists
 * the leaf hashes so that O(log N) inclusion proofs can be generated
 * without re-reading every record from the log.
 */
export interface BatchMerkleIndex {
  fromSeq: bigint;
  toSeq: bigint;
  /**
   * Pre-computed leaf hashes in seq order.
   * Each entry = BLAKE3(0x00 || encodedRecord).
   */
  leaves: Uint8Array[];
  /** RFC-9162 Merkle root of the batch. */
  root: Uint8Array;
}

/** Return the filename for a batch index file. */
export function batchIndexFileName(fromSeq: bigint, toSeq: bigint): string {
  return `batch_${fromSeq}_${toSeq}.idx`;
}

/** Return the full path of a batch index file within `indexDir`. */
export function batchIndexPath(
  indexDir: string,
  fromSeq: bigint,
  toSeq: bigint,
): string {
  return path.join(indexDir, batchIndexFileName(fromSeq, toSeq));
}

/**
 * Persist a batch Merkle index to disk.
 *
 * The index is stored as a CBOR-encoded fixed-order array:
 *   [fromSeq, toSeq, leaves: Uint8Array[], root: Uint8Array]
 *
 * The `indexDir` is created if it does not already exist.
 *
 * @returns The in-memory {@link BatchMerkleIndex} for immediate use.
 */
export function writeBatchIndex(
  indexDir: string,
  fromSeq: bigint,
  toSeq: bigint,
  leaves: Uint8Array[],
): BatchMerkleIndex {
  fs.mkdirSync(indexDir, { recursive: true });
  const root = merkleRootFromLeaves(leaves);
  const encoded = encode([fromSeq, toSeq, leaves, root]);
  fs.writeFileSync(batchIndexPath(indexDir, fromSeq, toSeq), encoded);
  return { fromSeq, toSeq, leaves, root };
}

/**
 * Load a batch Merkle index from disk.
 *
 * @throws {Error} if the file is missing or malformed.
 */
export function readBatchIndex(
  indexDir: string,
  fromSeq: bigint,
  toSeq: bigint,
): BatchMerkleIndex {
  const filePath = batchIndexPath(indexDir, fromSeq, toSeq);
  const raw = fs.readFileSync(filePath);
  const arr = decode(raw) as unknown[];
  if (!Array.isArray(arr) || arr.length !== 4) {
    throw new Error(`Malformed batch index at ${filePath}`);
  }
  const [storedFromSeq, storedToSeq, storedLeaves, storedRoot] = arr as [
    bigint,
    bigint,
    Uint8Array[],
    Uint8Array,
  ];
  return {
    fromSeq: storedFromSeq,
    toSeq: storedToSeq,
    leaves: storedLeaves,
    root: storedRoot,
  };
}

/**
 * Delete a batch index file once its settlement's dispute window has closed.
 *
 * Silently succeeds if the file does not exist.
 */
export function deleteBatchIndex(
  indexDir: string,
  fromSeq: bigint,
  toSeq: bigint,
): void {
  const filePath = batchIndexPath(indexDir, fromSeq, toSeq);
  try {
    fs.unlinkSync(filePath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
}

/**
 * Generate an RFC-9162 inclusion proof for the record at `seqOffset` within
 * the batch (i.e., `seq = fromSeq + BigInt(seqOffset)`).
 *
 * @throws {RangeError} if `seqOffset` is out of bounds.
 */
export function generateInclusionProof(
  idx: BatchMerkleIndex,
  seqOffset: number,
): InclusionProof {
  return proveInclusion(idx.leaves, seqOffset);
}

/**
 * Generate an exclusion proof showing that `(memberId, opId)` does not appear
 * in the batch window.
 *
 * The proof is a "scan certificate": it includes every record for `memberId`
 * in the batch (if any), each with a valid inclusion proof.  The caller must
 * supply the encoded records in seq order (the same sequence used to build
 * the index's leaf hashes).
 *
 * The returned proof can be verified by {@link verifyExclusionProof} from
 * `merkleTree.ts` without any access to the log.
 */
export function generateExclusionProof(
  idx: BatchMerkleIndex,
  encodedRecords: Uint8Array[],
  memberId: Uint8Array,
  opId: string,
): ExclusionProof {
  const memberRecords: ExclusionProof['memberRecords'] = [];

  for (let i = 0; i < encodedRecords.length; i++) {
    const encoded = encodedRecords[i];
    let record;
    try {
      record = decodeMeteringRecord(encoded);
    } catch {
      continue; // skip records that fail to decode
    }
    if (bytesEqual(record.memberId, memberId)) {
      memberRecords.push({
        encodedRecord: encoded,
        inclusionProof: proveInclusion(idx.leaves, i),
      });
    }
  }

  return {
    memberId,
    opId,
    fromSeq: idx.fromSeq,
    toSeq: idx.toSeq,
    root: idx.root,
    treeSize: idx.leaves.length,
    memberRecords,
  };
}

// ── Internal utilities ────────────────────────────────────────────────────────

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
