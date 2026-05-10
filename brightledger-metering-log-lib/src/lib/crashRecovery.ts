import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  GuidUint8Array,
  type GuidV7Uint8Array,
} from '@digitaldefiance/ecies-lib';

import { GENESIS_HASH, hashRecord } from './hashChain.js';
import { decodeMeteringRecord } from './record.js';
import { FlatFileMeteringStorage } from './storage/flatFileMeteringStorage.js';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Name of the atomic state checkpoint file within a shard directory. */
const STATE_FILE = 'state.json';

/** Name of the in-progress backup used for atomic writes. */
const STATE_BAK_FILE = 'state.json.bak';

// ── Public interfaces ─────────────────────────────────────────────────────────

/**
 * Recoverable state snapshot for a shard.
 * Written atomically after every crash-recovery scan (Requirement 1.5).
 */
export interface ShardState {
  /** Owning shard identifier. */
  shardId: GuidV7Uint8Array;
  /** Highest sequence number of a complete record, or -1n if the log is empty. */
  lastSeq: bigint;
  /** BLAKE3 hash of the last complete record (32 zero bytes if empty). */
  tipHash: Uint8Array;
  /** `Date.now()` timestamp when this state was written. */
  recoveredAt: number;
}

/**
 * Result returned by {@link recoverShard}.
 */
export interface ShardRecoveryResult {
  /** Recovered shard state, already written to `state.json`. */
  state: ShardState;
  /** `true` when at least one partially-written record was truncated. */
  wasTruncated: boolean;
  /** Total number of complete records found in the log after truncation. */
  recordCount: number;
}

// ── Serialization helpers ─────────────────────────────────────────────────────

interface ShardStateJson {
  schemaVersion: number;
  shardId: string;
  lastSeq: string;
  tipHash: string;
  recoveredAt: number;
}

function _serializeState(state: ShardState): string {
  const json: ShardStateJson = {
    schemaVersion: 1,
    shardId: state.shardId.asFullHexGuid,
    lastSeq: state.lastSeq.toString(),
    tipHash: Buffer.from(state.tipHash).toString('hex'),
    recoveredAt: state.recoveredAt,
  };
  return JSON.stringify(json, null, 2);
}

function _deserializeState(raw: string): ShardState {
  const parsed = JSON.parse(raw) as ShardStateJson;
  return {
    shardId: GuidUint8Array.parse(parsed.shardId) as GuidV7Uint8Array,
    lastSeq: BigInt(parsed.lastSeq),
    tipHash: Buffer.from(parsed.tipHash, 'hex'),
    recoveredAt: parsed.recoveredAt,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Atomically persist shard state to `<dirPath>/state.json`.
 *
 * Writes to `state.json.bak` first, then uses `fs.renameSync` (atomic on
 * POSIX file systems and best-effort on Windows) to promote the backup to
 * the final path.  Callers can recover from a crash-before-rename by reading
 * `state.json.bak` via {@link readShardState} (Requirement 1.5).
 */
export function writeShardState(dirPath: string, state: ShardState): void {
  const bakPath = path.join(dirPath, STATE_BAK_FILE);
  const finalPath = path.join(dirPath, STATE_FILE);
  fs.writeFileSync(bakPath, _serializeState(state), { encoding: 'utf-8' });
  fs.renameSync(bakPath, finalPath);
}

/**
 * Read the most recent shard state from `<dirPath>/state.json`, falling back
 * to `state.json.bak` if the primary file is absent or the rename was
 * interrupted by a crash (Requirement 1.5).
 *
 * Returns `null` when neither file exists.
 */
export function readShardState(dirPath: string): ShardState | null {
  const finalPath = path.join(dirPath, STATE_FILE);
  const bakPath = path.join(dirPath, STATE_BAK_FILE);

  let raw: string | null = null;
  if (fs.existsSync(finalPath)) {
    raw = fs.readFileSync(finalPath, 'utf-8');
  } else if (fs.existsSync(bakPath)) {
    raw = fs.readFileSync(bakPath, 'utf-8');
  }
  if (raw === null) return null;
  return _deserializeState(raw);
}

/**
 * Perform crash recovery on a shard directory (Requirement 1.5).
 *
 * Steps:
 *  1. Open the storage (acquires the exclusive writer lock).
 *  2. Detect and remove any partially-written trailing record via
 *     {@link FlatFileMeteringStorage.findTruncationPoint} /
 *     {@link FlatFileMeteringStorage.truncate}.
 *  3. Scan forward to rebuild `lastSeq` and `tipHash`.
 *  4. Write an atomic `state.json` checkpoint.
 *  5. Close the storage (releases the lock).
 */
export async function recoverShard(
  dirPath: string,
  shardId: GuidV7Uint8Array,
): Promise<ShardRecoveryResult> {
  const storage = new FlatFileMeteringStorage();
  await storage.open(dirPath, shardId);

  let wasTruncated = false;
  let lastSeq = -1n;
  let lastEncoded: Uint8Array | null = null;
  let recordCount = 0;

  try {
    const truncPoint = await storage.findTruncationPoint();
    if (truncPoint !== null) {
      await storage.truncate(truncPoint);
      wasTruncated = true;
    }

    for await (const entry of storage.scan()) {
      const rec = decodeMeteringRecord(entry.payload);
      lastSeq = rec.seq;
      lastEncoded = entry.payload;
      recordCount++;
    }
  } finally {
    await storage.close();
  }

  const tipHash =
    lastEncoded !== null
      ? hashRecord(lastEncoded)
      : new Uint8Array(GENESIS_HASH);

  const state: ShardState = {
    shardId,
    lastSeq,
    tipHash,
    recoveredAt: Date.now(),
  };

  writeShardState(dirPath, state);

  return { state, wasTruncated, recordCount };
}
