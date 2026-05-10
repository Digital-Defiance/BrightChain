import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  GuidUint8Array,
  type GuidV7Uint8Array,
} from '@digitaldefiance/ecies-lib';

import {
  readShardState,
  recoverShard,
  writeShardState,
  type ShardState,
} from '../crashRecovery.js';
import { GENESIS_HASH, hashRecord } from '../hashChain.js';
import { encodeMeteringRecord } from '../record.js';
import {
  FlatFileMeteringStorage,
  formatLogFileName,
} from '../storage/flatFileMeteringStorage.js';

// ── Shard ID constants ───────────────────────────────────────────────────────

const EMPTY_SHARD = GuidUint8Array.parse(
  '01234567-0123-7000-8000-00000000000c',
) as GuidV7Uint8Array;
const COMPLETE_LOG = GuidUint8Array.parse(
  '01234567-0123-7000-8000-00000000000d',
) as GuidV7Uint8Array;
const PARTIAL_TAIL = GuidUint8Array.parse(
  '01234567-0123-7000-8000-00000000000e',
) as GuidV7Uint8Array;
const SINGLE_REC = GuidUint8Array.parse(
  '01234567-0123-7000-8000-00000000000f',
) as GuidV7Uint8Array;
const PARTIAL_PREFIX = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000010',
) as GuidV7Uint8Array;
const WRITE_TEST = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000011',
) as GuidV7Uint8Array;
const ROUND_TRIP_SHARD = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000012',
) as GuidV7Uint8Array;
const EMPTY_STATE = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000013',
) as GuidV7Uint8Array;
const BAK_FALLBACK_SHARD = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000014',
) as GuidV7Uint8Array;
const STATE_WRITE = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000015',
) as GuidV7Uint8Array;
const OVERWRITE_SHARD = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000016',
) as GuidV7Uint8Array;
const PROP_SHARD = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000005',
) as GuidV7Uint8Array;
const CLEAN_TRUNC = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000017',
) as GuidV7Uint8Array;
const ZERO_TRUNC = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000018',
) as GuidV7Uint8Array;

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'recovery-spec-'));
}

function cleanupDir(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // best-effort
  }
}

function makeRecord(seq: bigint): Uint8Array {
  return encodeMeteringRecord({
    seq,
    prev_hash: new Uint8Array(32),
    ts: BigInt(Date.now()) * 1000n,
    op: 'test.charge',
    memberId: new Uint8Array(32).fill(Number(seq % 256n) + 1),
    assetId: 'joule',
    amount: 100n,
    opId: `op-${seq}`,
    context_hash: new Uint8Array(32),
  });
}

async function writeRecords(
  dir: string,
  shardId: GuidV7Uint8Array,
  n: number,
): Promise<Uint8Array[]> {
  const storage = new FlatFileMeteringStorage({ groupCommitSize: 1 });
  await storage.open(dir, shardId);
  const encoded: Uint8Array[] = [];
  for (let i = 0; i < n; i++) {
    const rec = makeRecord(BigInt(i));
    await storage.append(rec);
    encoded.push(rec);
  }
  await storage.close();
  return encoded;
}

async function getBytePositions(
  dir: string,
  shardId: GuidV7Uint8Array,
): Promise<number[]> {
  const storage = new FlatFileMeteringStorage({ groupCommitSize: 1 });
  await storage.open(dir, shardId);
  const positions: number[] = [];
  for await (const entry of storage.scan()) {
    positions.push(entry.position.byteOffset);
  }
  await storage.close();
  return positions;
}

// ── Task 8.1 — Scan-forward recovery ─────────────────────────────────────────

describe('Task 8.1 — recoverShard scan-forward recovery', () => {
  it('recovers an empty shard with lastSeq=-1n and genesis tipHash', async () => {
    const dir = makeTmpDir();
    try {
      const result = await recoverShard(dir, EMPTY_SHARD);
      expect(result.state.lastSeq).toBe(-1n);
      expect(result.state.tipHash).toEqual(new Uint8Array(GENESIS_HASH));
      expect(result.wasTruncated).toBe(false);
      expect(result.recordCount).toBe(0);
    } finally {
      cleanupDir(dir);
    }
  });

  it('recovers a complete log and returns correct seq and tipHash', async () => {
    const dir = makeTmpDir();
    try {
      const records = await writeRecords(dir, COMPLETE_LOG, 5);
      const result = await recoverShard(dir, COMPLETE_LOG);
      expect(result.state.lastSeq).toBe(4n);
      expect(result.state.tipHash).toEqual(hashRecord(records[4]));
      expect(result.wasTruncated).toBe(false);
      expect(result.recordCount).toBe(5);
    } finally {
      cleanupDir(dir);
    }
  });

  it('truncates a partial trailing record and recovers to last complete record', async () => {
    const dir = makeTmpDir();
    try {
      const records = await writeRecords(dir, PARTIAL_TAIL, 3);

      // Append a partial record: length prefix says 16 bytes but only 2 bytes of payload follow
      const logPath = path.join(dir, formatLogFileName(1));
      const partial = new Uint8Array([0x00, 0x00, 0x00, 0x10, 0xde, 0xad]);
      fs.appendFileSync(logPath, partial);

      const result = await recoverShard(dir, PARTIAL_TAIL);
      expect(result.state.lastSeq).toBe(2n);
      expect(result.state.tipHash).toEqual(hashRecord(records[2]));
      expect(result.wasTruncated).toBe(true);
      expect(result.recordCount).toBe(3);
    } finally {
      cleanupDir(dir);
    }
  });

  it('recovers a single-record log correctly', async () => {
    const dir = makeTmpDir();
    try {
      const records = await writeRecords(dir, SINGLE_REC, 1);
      const result = await recoverShard(dir, SINGLE_REC);
      expect(result.state.lastSeq).toBe(0n);
      expect(result.state.tipHash).toEqual(hashRecord(records[0]));
      expect(result.recordCount).toBe(1);
      expect(result.wasTruncated).toBe(false);
    } finally {
      cleanupDir(dir);
    }
  });

  it('truncates a partial length-prefix (< 4 bytes) and recovers', async () => {
    const dir = makeTmpDir();
    try {
      const records = await writeRecords(dir, PARTIAL_PREFIX, 2);

      // Append only 3 bytes of a length prefix (incomplete)
      const logPath = path.join(dir, formatLogFileName(1));
      fs.appendFileSync(logPath, new Uint8Array([0x00, 0x00, 0x00]));

      const result = await recoverShard(dir, PARTIAL_PREFIX);
      expect(result.state.lastSeq).toBe(1n);
      expect(result.state.tipHash).toEqual(hashRecord(records[1]));
      expect(result.wasTruncated).toBe(true);
    } finally {
      cleanupDir(dir);
    }
  });
});

// ── Task 8.2 — Atomic state.json write ───────────────────────────────────────

describe('Task 8.2 — Atomic state.json write with .bak fallback', () => {
  it('writeShardState creates state.json and removes .bak', () => {
    const dir = makeTmpDir();
    try {
      const state: ShardState = {
        shardId: WRITE_TEST,
        lastSeq: 5n,
        tipHash: new Uint8Array(32).fill(0xab),
        recoveredAt: Date.now(),
      };
      writeShardState(dir, state);
      expect(fs.existsSync(path.join(dir, 'state.json'))).toBe(true);
      expect(fs.existsSync(path.join(dir, 'state.json.bak'))).toBe(false);
    } finally {
      cleanupDir(dir);
    }
  });

  it('readShardState returns null when no state files exist', () => {
    const dir = makeTmpDir();
    try {
      expect(readShardState(dir)).toBeNull();
    } finally {
      cleanupDir(dir);
    }
  });

  it('readShardState round-trips all fields correctly', () => {
    const dir = makeTmpDir();
    try {
      const tipHash = new Uint8Array(32).fill(0x55);
      const state: ShardState = {
        shardId: ROUND_TRIP_SHARD,
        lastSeq: 99n,
        tipHash,
        recoveredAt: 1_234_567_890,
      };
      writeShardState(dir, state);
      const read = readShardState(dir);
      expect(read).not.toBeNull();
      expect(read?.shardId).toEqual(ROUND_TRIP_SHARD);
      expect(read?.lastSeq).toBe(99n);
      expect(read?.tipHash).toEqual(tipHash);
      expect(read?.recoveredAt).toBe(1_234_567_890);
    } finally {
      cleanupDir(dir);
    }
  });

  it('readShardState preserves -1n for empty shards', () => {
    const dir = makeTmpDir();
    try {
      const state: ShardState = {
        shardId: EMPTY_STATE,
        lastSeq: -1n,
        tipHash: new Uint8Array(32),
        recoveredAt: 0,
      };
      writeShardState(dir, state);
      const read = readShardState(dir);
      expect(read?.lastSeq).toBe(-1n);
    } finally {
      cleanupDir(dir);
    }
  });

  it('readShardState falls back to .bak when state.json is absent', () => {
    const dir = makeTmpDir();
    try {
      const tipHex = '11'.repeat(32);
      const bakJson = JSON.stringify(
        {
          schemaVersion: 1,
          shardId: '01234567-0123-7000-8000-000000000014',
          lastSeq: '42',
          tipHash: tipHex,
          recoveredAt: 999,
        },
        null,
        2,
      );
      fs.writeFileSync(path.join(dir, 'state.json.bak'), bakJson, 'utf-8');

      const read = readShardState(dir);
      expect(read).not.toBeNull();
      expect(read?.shardId).toEqual(BAK_FALLBACK_SHARD);
      expect(read?.lastSeq).toBe(42n);
      expect(read?.tipHash).toEqual(Buffer.from(tipHex, 'hex'));
    } finally {
      cleanupDir(dir);
    }
  });

  it('recoverShard writes a readable state.json', async () => {
    const dir = makeTmpDir();
    try {
      const records = await writeRecords(dir, STATE_WRITE, 3);
      await recoverShard(dir, STATE_WRITE);
      expect(fs.existsSync(path.join(dir, 'state.json'))).toBe(true);
      const state = readShardState(dir);
      expect(state?.lastSeq).toBe(2n);
      expect(state?.tipHash).toEqual(hashRecord(records[2]));
    } finally {
      cleanupDir(dir);
    }
  });

  it('recoverShard overwrites stale state.json with fresh recovery data', async () => {
    const dir = makeTmpDir();
    try {
      // Write initial state with outdated lastSeq
      const stale: ShardState = {
        shardId: OVERWRITE_SHARD,
        lastSeq: 0n,
        tipHash: new Uint8Array(32),
        recoveredAt: 1,
      };
      writeShardState(dir, stale);

      const records = await writeRecords(dir, OVERWRITE_SHARD, 4);
      await recoverShard(dir, OVERWRITE_SHARD);
      const state = readShardState(dir);
      expect(state?.lastSeq).toBe(3n);
      expect(state?.tipHash).toEqual(hashRecord(records[3]));
    } finally {
      cleanupDir(dir);
    }
  });
});

// ── Task 8.3 — Property test: truncate at every byte offset ──────────────────

describe('Task 8.3 — Property: truncate last record at every byte offset', () => {
  it('recovery converges to penultimate tip regardless of truncation offset', async () => {
    const srcDir = makeTmpDir();
    try {
      // Write 4 records (seq 0..3); expected penultimate is seq=2
      const records = await writeRecords(srcDir, PROP_SHARD, 4);
      const expectedLastSeq = 2n;
      const expectedTipHash = hashRecord(records[2]);

      // Read full log file bytes
      const logPath = path.join(srcDir, formatLogFileName(1));
      const fullBytes = fs.readFileSync(logPath);

      // Get the byte position of the last (4th) record
      const positions = await getBytePositions(srcDir, PROP_SHARD);
      const lastRecordStart = positions[positions.length - 1];

      // For each byte offset in (lastRecordStart, fileSize) — partial last record
      for (
        let offset = lastRecordStart + 1;
        offset < fullBytes.length;
        offset++
      ) {
        const testDir = makeTmpDir();
        try {
          fs.writeFileSync(
            path.join(testDir, formatLogFileName(1)),
            fullBytes.subarray(0, offset),
          );
          const result = await recoverShard(testDir, PROP_SHARD);
          expect(result.state.lastSeq).toBe(expectedLastSeq);
          expect(result.state.tipHash).toEqual(expectedTipHash);
          expect(result.wasTruncated).toBe(true);
          expect(result.recordCount).toBe(3);
        } finally {
          cleanupDir(testDir);
        }
      }
    } finally {
      cleanupDir(srcDir);
    }
  });

  it('truncating to exactly the start of the last record is clean (no wasTruncated)', async () => {
    const srcDir = makeTmpDir();
    try {
      const records = await writeRecords(srcDir, CLEAN_TRUNC, 4);
      const logPath = path.join(srcDir, formatLogFileName(1));
      const fullBytes = fs.readFileSync(logPath);
      const positions = await getBytePositions(srcDir, CLEAN_TRUNC);
      const lastRecordStart = positions[positions.length - 1];

      const testDir = makeTmpDir();
      try {
        // File ends exactly where the last record begins — no partial data
        fs.writeFileSync(
          path.join(testDir, formatLogFileName(1)),
          fullBytes.subarray(0, lastRecordStart),
        );
        const result = await recoverShard(testDir, CLEAN_TRUNC);
        expect(result.state.lastSeq).toBe(2n);
        expect(result.state.tipHash).toEqual(hashRecord(records[2]));
        expect(result.wasTruncated).toBe(false);
      } finally {
        cleanupDir(testDir);
      }
    } finally {
      cleanupDir(srcDir);
    }
  });

  it('truncating entire file to 0 bytes yields empty shard recovery', async () => {
    const dir = makeTmpDir();
    try {
      fs.writeFileSync(path.join(dir, formatLogFileName(1)), Buffer.alloc(0));
      const result = await recoverShard(dir, ZERO_TRUNC);
      expect(result.state.lastSeq).toBe(-1n);
      expect(result.state.tipHash).toEqual(new Uint8Array(GENESIS_HASH));
      expect(result.recordCount).toBe(0);
    } finally {
      cleanupDir(dir);
    }
  });
});
