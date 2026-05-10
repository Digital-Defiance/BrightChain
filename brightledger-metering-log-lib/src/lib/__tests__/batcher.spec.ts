import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  GuidUint8Array,
  type GuidV7Uint8Array,
} from '@digitaldefiance/ecies-lib';

import { BatchAccumulator } from '../batchAccumulator.js';
import {
  Batcher,
  DEFAULT_MAX_AGE_MS,
  DEFAULT_MAX_RECORDS,
  type AddRecordResult,
  type BatchSettlementAction,
  type DuplicateAddRecordResult,
} from '../batchSettlement.js';
import { DuplicateOpIdError } from '../errors.js';
import { merkleLeafHash, merkleRootFromLeaves } from '../merkleTree.js';
import { encodeMeteringRecord } from '../record.js';
import type { ISignatureEntry } from '../sidecar.js';

// ── Shard ID constants ──────────────────────────────────────────────────────

const SHARD_TEST = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000001',
) as GuidV7Uint8Array;
const SHARD_AGE = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000002',
) as GuidV7Uint8Array;
const SHARD_AUTOFLUSH = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000003',
) as GuidV7Uint8Array;
const SHARD_LEDGER = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000004',
) as GuidV7Uint8Array;
const PROP_SHARD = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000005',
) as GuidV7Uint8Array;
const PROP_DELTAS = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000006',
) as GuidV7Uint8Array;
const PROP_DEDUP = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000007',
) as GuidV7Uint8Array;

// ── Test helpers ──────────────────────────────────────────────────────────────

/** Build a fixed-size Uint8Array filled with a repeated byte value. */
function makeBytes(len: number, fill = 0): Uint8Array {
  return new Uint8Array(len).fill(fill);
}

/** Build a deterministic memberId from a small integer seed. */
function makeMemberId(seed: number): Uint8Array {
  const id = new Uint8Array(32);
  id[0] = seed & 0xff;
  id[1] = (seed >> 8) & 0xff;
  return id;
}

/** Build a minimal (but valid) CBOR-encoded metering record. */
function makeEncodedRecord(
  seq: bigint,
  memberId: Uint8Array,
  assetId: string,
  amount: bigint,
  opId: string,
): Uint8Array {
  return encodeMeteringRecord({
    seq,
    prev_hash: makeBytes(32),
    ts: BigInt(Date.now()) * 1000n,
    op: 'test.op',
    memberId,
    assetId,
    amount,
    opId,
    context_hash: makeBytes(32),
  });
}

/** Build a fake (zero-filled) signature entry for a given seq. */
function makeSigEnvelope(seq: bigint): ISignatureEntry {
  return {
    seq,
    tipHash: makeBytes(32),
    processKeyFingerprint: makeBytes(32),
    sig: makeBytes(64),
  };
}

// ── BatchAccumulator tests ────────────────────────────────────────────────────

describe('BatchAccumulator', () => {
  let acc: BatchAccumulator;

  beforeEach(() => {
    acc = new BatchAccumulator();
  });

  it('starts empty', () => {
    expect(acc.recordCount).toBe(0);
    expect(acc.materialize()).toHaveLength(0);
  });

  it('adds a credit record and materialises earned delta', () => {
    const memberId = makeMemberId(1);
    acc.add(memberId, 'joule', 500n, 'op-1', 0n);

    const deltas = acc.materialize();
    expect(deltas).toHaveLength(1);
    expect(deltas[0].earned).toBe(500n);
    expect(deltas[0].spent).toBe(0n);
    expect(deltas[0].assetId).toBe('joule');
    expect(Buffer.from(deltas[0].memberId).toString('hex')).toBe(
      Buffer.from(memberId).toString('hex'),
    );
  });

  it('adds a debit record and materialises spent delta', () => {
    const memberId = makeMemberId(2);
    acc.add(memberId, 'joule', -300n, 'op-2', 0n);

    const deltas = acc.materialize();
    expect(deltas).toHaveLength(1);
    expect(deltas[0].earned).toBe(0n);
    expect(deltas[0].spent).toBe(300n);
  });

  it('accumulates multiple operations for the same (memberId, assetId)', () => {
    const memberId = makeMemberId(3);
    acc.add(memberId, 'joule', 100n, 'op-a', 0n);
    acc.add(memberId, 'joule', 200n, 'op-b', 1n);
    acc.add(memberId, 'joule', -50n, 'op-c', 2n);

    const deltas = acc.materialize();
    expect(deltas).toHaveLength(1);
    expect(deltas[0].earned).toBe(300n);
    expect(deltas[0].spent).toBe(50n);
  });

  it('tracks separate (memberId, assetId) pairs independently', () => {
    const m1 = makeMemberId(1);
    const m2 = makeMemberId(2);
    acc.add(m1, 'joule', 10n, 'op-1', 0n);
    acc.add(m2, 'joule', 20n, 'op-2', 1n);
    acc.add(m1, 'watt', 30n, 'op-3', 2n);

    const deltas = acc.materialize();
    expect(deltas).toHaveLength(3);
  });

  it('throws DuplicateOpIdError for duplicate (memberId, opId)', () => {
    const memberId = makeMemberId(5);
    acc.add(memberId, 'joule', 10n, 'op-dup', 0n);

    expect(() => acc.add(memberId, 'joule', 20n, 'op-dup', 1n)).toThrow(
      DuplicateOpIdError,
    );
  });

  it('allows the same opId for different memberIds', () => {
    const m1 = makeMemberId(1);
    const m2 = makeMemberId(2);
    expect(() => {
      acc.add(m1, 'joule', 10n, 'shared-op', 0n);
      acc.add(m2, 'joule', 10n, 'shared-op', 1n);
    }).not.toThrow();
  });

  it('hasDuplicate returns false before add', () => {
    expect(acc.hasDuplicate(makeMemberId(1), 'op-x')).toBe(false);
  });

  it('hasDuplicate returns true after add', () => {
    const memberId = makeMemberId(7);
    acc.add(memberId, 'joule', 1n, 'op-y', 5n);
    expect(acc.hasDuplicate(memberId, 'op-y')).toBe(true);
  });

  it('getExistingSeq returns null before add', () => {
    expect(acc.getExistingSeq(makeMemberId(1), 'missing')).toBeNull();
  });

  it('getExistingSeq returns the original seq after add', () => {
    const memberId = makeMemberId(9);
    acc.add(memberId, 'joule', 1n, 'op-z', 42n);
    expect(acc.getExistingSeq(memberId, 'op-z')).toBe(42n);
  });

  it('zero-amount record is tracked for idempotency, does not affect earned/spent', () => {
    const memberId = makeMemberId(10);
    acc.add(memberId, 'joule', 0n, 'op-zero', 0n);

    expect(acc.hasDuplicate(memberId, 'op-zero')).toBe(true);
    const deltas = acc.materialize();
    expect(deltas).toHaveLength(1);
    expect(deltas[0].earned).toBe(0n);
    expect(deltas[0].spent).toBe(0n);
  });

  it('materialize sorts by memberId bytes then assetId', () => {
    // m2 > m1 byte-wise (first byte 2 vs 1)
    const m1 = makeMemberId(1);
    const m2 = makeMemberId(2);
    acc.add(m2, 'alpha', 1n, 'op-1', 0n);
    acc.add(m1, 'zebra', 1n, 'op-2', 1n);
    acc.add(m1, 'alpha', 1n, 'op-3', 2n);

    const deltas = acc.materialize();
    // Expected order: (m1, alpha), (m1, zebra), (m2, alpha)
    expect(deltas[0].memberId[0]).toBe(1);
    expect(deltas[0].assetId).toBe('alpha');
    expect(deltas[1].memberId[0]).toBe(1);
    expect(deltas[1].assetId).toBe('zebra');
    expect(deltas[2].memberId[0]).toBe(2);
  });

  it('reset clears all state', () => {
    const memberId = makeMemberId(11);
    acc.add(memberId, 'joule', 100n, 'op-r', 0n);
    acc.reset();

    expect(acc.recordCount).toBe(0);
    expect(acc.materialize()).toHaveLength(0);
    expect(acc.hasDuplicate(memberId, 'op-r')).toBe(false);
  });

  it('materialize returns independent copies (mutation-safe)', () => {
    const memberId = makeMemberId(12);
    acc.add(memberId, 'joule', 100n, 'op-m', 0n);
    const d = acc.materialize();
    d[0].earned = 999n;

    const d2 = acc.materialize();
    expect(d2[0].earned).toBe(100n);
  });
});

// ── Batcher tests ─────────────────────────────────────────────────────────────

describe('Batcher', () => {
  let dirPath: string;

  beforeEach(() => {
    dirPath = mkdtempSync(join(tmpdir(), 'batcher-test-'));
  });

  afterEach(() => {
    rmSync(dirPath, { recursive: true, force: true });
  });

  function makeBatcher(
    overrides: Partial<{
      maxRecords: number;
      maxAgeMs: number;
      fromSeq: bigint;
    }> = {},
  ): Batcher {
    return new Batcher({
      shardId: SHARD_TEST,
      dirPath,
      maxRecords: overrides.maxRecords ?? DEFAULT_MAX_RECORDS,
      maxAgeMs: overrides.maxAgeMs ?? 0, // disable timer unless explicitly set
      fromSeq: overrides.fromSeq ?? 0n,
    });
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  it('starts with no pending records', () => {
    const batcher = makeBatcher();
    expect(batcher.pendingCount).toBe(0);
    expect(batcher.pendingFlush).toBe(false);
    expect(batcher.fromSeq).toBe(0n);
  });

  it('flush on empty window returns null', async () => {
    const batcher = makeBatcher();
    const result = await batcher.flush(makeSigEnvelope(0n));
    expect(result).toBeNull();
  });

  // ── Single-record flush ──────────────────────────────────────────────────

  it('produces a correct BatchSettlementAction for one record', async () => {
    const batcher = makeBatcher();
    const memberId = makeMemberId(1);
    const encoded = makeEncodedRecord(0n, memberId, 'joule', 100n, 'op-1');
    const tipHash = makeBytes(32, 0xab);
    const sig = makeSigEnvelope(0n);

    batcher.addRecord(
      encoded,
      memberId,
      'joule',
      100n,
      'op-1',
      0n,
      tipHash,
      sig,
    );

    const action = (await batcher.flush(sig)) as BatchSettlementAction;

    expect(action).not.toBeNull();
    expect(action.kind).toBe('BatchSettlement');
    expect(action.shardId).toEqual(SHARD_TEST);
    expect(action.fromSeq).toBe(0n);
    expect(action.toSeq).toBe(0n);
    expect(Buffer.from(action.tipHash).toString('hex')).toBe(
      Buffer.from(tipHash).toString('hex'),
    );
    expect(action.memberDeltas).toHaveLength(1);
    expect(action.memberDeltas[0].earned).toBe(100n);
    expect(action.sigEnvelope).toBe(sig);
  });

  // ── fromSeq continuity ───────────────────────────────────────────────────

  it('advances fromSeq correctly across two flushes (Req 5.5)', async () => {
    const batcher = makeBatcher();
    const memberId = makeMemberId(1);
    const tipHash = makeBytes(32);

    // First window: seq 0..2
    for (let i = 0; i < 3; i++) {
      const enc = makeEncodedRecord(
        BigInt(i),
        memberId,
        'joule',
        1n,
        `op-${i}`,
      );
      batcher.addRecord(
        enc,
        memberId,
        'joule',
        1n,
        `op-${i}`,
        BigInt(i),
        tipHash,
      );
    }
    const sig0 = makeSigEnvelope(2n);
    const action0 = (await batcher.flush(sig0)) as BatchSettlementAction;
    expect(action0.fromSeq).toBe(0n);
    expect(action0.toSeq).toBe(2n);
    expect(batcher.fromSeq).toBe(3n);

    // Second window: seq 3..4
    for (let i = 3; i <= 4; i++) {
      const enc = makeEncodedRecord(
        BigInt(i),
        memberId,
        'joule',
        1n,
        `op-${i}`,
      );
      batcher.addRecord(
        enc,
        memberId,
        'joule',
        1n,
        `op-${i}`,
        BigInt(i),
        tipHash,
      );
    }
    const sig1 = makeSigEnvelope(4n);
    const action1 = (await batcher.flush(sig1)) as BatchSettlementAction;
    expect(action1.fromSeq).toBe(3n);
    expect(action1.toSeq).toBe(4n);
  });

  // ── Idempotency ──────────────────────────────────────────────────────────

  it('returns isDuplicate=true for repeated (memberId, opId)', () => {
    const batcher = makeBatcher();
    const memberId = makeMemberId(1);
    const encoded = makeEncodedRecord(0n, memberId, 'joule', 100n, 'op-dup');
    const tipHash = makeBytes(32);

    const r1 = batcher.addRecord(
      encoded,
      memberId,
      'joule',
      100n,
      'op-dup',
      0n,
      tipHash,
    );
    expect((r1 as AddRecordResult).isDuplicate).toBe(false);

    const r2 = batcher.addRecord(
      encoded,
      memberId,
      'joule',
      100n,
      'op-dup',
      0n,
      tipHash,
    );
    expect((r2 as DuplicateAddRecordResult).isDuplicate).toBe(true);
    expect((r2 as DuplicateAddRecordResult).existingSeq).toBe(0n);
  });

  it('duplicate record is NOT counted in pendingCount', () => {
    const batcher = makeBatcher();
    const memberId = makeMemberId(1);
    const encoded = makeEncodedRecord(0n, memberId, 'joule', 100n, 'op-dup2');
    const tipHash = makeBytes(32);

    batcher.addRecord(encoded, memberId, 'joule', 100n, 'op-dup2', 0n, tipHash);
    batcher.addRecord(encoded, memberId, 'joule', 100n, 'op-dup2', 0n, tipHash);

    expect(batcher.pendingCount).toBe(1);
  });

  // ── maxRecords trigger ───────────────────────────────────────────────────

  it('sets pendingFlush when maxRecords is reached', () => {
    const batcher = makeBatcher({ maxRecords: 3 });
    const memberId = makeMemberId(1);
    const tipHash = makeBytes(32);

    for (let i = 0; i < 3; i++) {
      const enc = makeEncodedRecord(
        BigInt(i),
        memberId,
        'joule',
        1n,
        `op-${i}`,
      );
      batcher.addRecord(
        enc,
        memberId,
        'joule',
        1n,
        `op-${i}`,
        BigInt(i),
        tipHash,
      );
    }

    expect(batcher.isWindowFull()).toBe(true);
    expect(batcher.pendingFlush).toBe(true);
  });

  it('does NOT set pendingFlush before maxRecords', () => {
    const batcher = makeBatcher({ maxRecords: 5 });
    const memberId = makeMemberId(1);
    const tipHash = makeBytes(32);

    for (let i = 0; i < 4; i++) {
      const enc = makeEncodedRecord(
        BigInt(i),
        memberId,
        'joule',
        1n,
        `op-${i}`,
      );
      batcher.addRecord(
        enc,
        memberId,
        'joule',
        1n,
        `op-${i}`,
        BigInt(i),
        tipHash,
      );
    }

    expect(batcher.pendingFlush).toBe(false);
  });

  // ── maxAgeMs trigger ─────────────────────────────────────────────────────

  it('sets pendingFlush via age timer when no sig is available', async () => {
    jest.useFakeTimers();

    const batcher = new Batcher({
      shardId: SHARD_AGE,
      dirPath,
      maxRecords: DEFAULT_MAX_RECORDS,
      maxAgeMs: 100,
    });

    const memberId = makeMemberId(1);
    const tipHash = makeBytes(32);
    const enc = makeEncodedRecord(0n, memberId, 'joule', 1n, 'op-age');
    // No sigEnvelope provided → timer fires → pendingFlush
    batcher.addRecord(enc, memberId, 'joule', 1n, 'op-age', 0n, tipHash);

    jest.advanceTimersByTime(200);
    // Give the microtask queue a chance to run.
    await Promise.resolve();

    expect(batcher.pendingFlush).toBe(true);

    jest.useRealTimers();
  });

  it('auto-flushes via age timer when a sig is available', async () => {
    jest.useFakeTimers();

    const batcher = new Batcher({
      shardId: SHARD_AUTOFLUSH,
      dirPath,
      maxRecords: DEFAULT_MAX_RECORDS,
      maxAgeMs: 100,
    });

    const memberId = makeMemberId(1);
    const tipHash = makeBytes(32);
    const sig = makeSigEnvelope(0n);
    const enc = makeEncodedRecord(0n, memberId, 'joule', 1n, 'op-autoflush');
    batcher.addRecord(
      enc,
      memberId,
      'joule',
      1n,
      'op-autoflush',
      0n,
      tipHash,
      sig,
    );

    expect(batcher.pendingCount).toBe(1);

    jest.advanceTimersByTime(200);
    // Flush is async; let the promise chain complete.
    await Promise.resolve();
    await Promise.resolve();

    // Window should be empty after auto-flush.
    expect(batcher.pendingCount).toBe(0);

    jest.useRealTimers();
  });

  // ── memberDeltas shape ───────────────────────────────────────────────────

  it('aggregates multiple ops into one delta per (memberId, assetId)', async () => {
    const batcher = makeBatcher();
    const memberId = makeMemberId(1);
    const tipHash = makeBytes(32);
    const sig = makeSigEnvelope(2n);

    for (let i = 0; i < 3; i++) {
      const enc = makeEncodedRecord(
        BigInt(i),
        memberId,
        'joule',
        10n,
        `op-${i}`,
      );
      batcher.addRecord(
        enc,
        memberId,
        'joule',
        10n,
        `op-${i}`,
        BigInt(i),
        tipHash,
        sig,
      );
    }

    const action = (await batcher.flush(sig)) as BatchSettlementAction;
    expect(action.memberDeltas).toHaveLength(1);
    expect(action.memberDeltas[0].earned).toBe(30n);
  });

  it('sorts memberDeltas by (memberId, assetId)', async () => {
    const batcher = makeBatcher();
    const m1 = makeMemberId(1);
    const m2 = makeMemberId(2);
    const tipHash = makeBytes(32);
    const sig = makeSigEnvelope(2n);

    batcher.addRecord(
      makeEncodedRecord(0n, m2, 'joule', 1n, 'op-0'),
      m2,
      'joule',
      1n,
      'op-0',
      0n,
      tipHash,
      sig,
    );
    batcher.addRecord(
      makeEncodedRecord(1n, m1, 'watt', 1n, 'op-1'),
      m1,
      'watt',
      1n,
      'op-1',
      1n,
      tipHash,
      sig,
    );
    batcher.addRecord(
      makeEncodedRecord(2n, m1, 'joule', 1n, 'op-2'),
      m1,
      'joule',
      1n,
      'op-2',
      2n,
      tipHash,
      sig,
    );

    const action = (await batcher.flush(sig)) as BatchSettlementAction;
    const deltas = action.memberDeltas;
    expect(deltas[0].memberId[0]).toBe(1); // m1
    expect(deltas[0].assetId).toBe('joule');
    expect(deltas[1].memberId[0]).toBe(1); // m1
    expect(deltas[1].assetId).toBe('watt');
    expect(deltas[2].memberId[0]).toBe(2); // m2
  });

  // ── Local settlement persistence ─────────────────────────────────────────

  it('persists a local settlement file after flush', async () => {
    const batcher = makeBatcher();
    const memberId = makeMemberId(1);
    const enc = makeEncodedRecord(0n, memberId, 'joule', 5n, 'op-persist');
    const sig = makeSigEnvelope(0n);
    batcher.addRecord(
      enc,
      memberId,
      'joule',
      5n,
      'op-persist',
      0n,
      makeBytes(32),
      sig,
    );

    await batcher.flush(sig);

    const { readdirSync } = await import('node:fs');
    const settlementsDir = join(dirPath, 'settlements');
    const files = readdirSync(settlementsDir);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/settlement_0_0\.json/);
  });

  // ── Ledger adapter ───────────────────────────────────────────────────────

  it('submits to the ledger adapter when configured', async () => {
    const submitted: BatchSettlementAction[] = [];
    const fakeLedger = {
      submit: async (action: BatchSettlementAction) => {
        submitted.push(action);
        return 'batch-id-123';
      },
    };

    const batcher = new Batcher({
      shardId: SHARD_LEDGER,
      dirPath,
      ledger: fakeLedger,
    });

    const memberId = makeMemberId(1);
    const enc = makeEncodedRecord(0n, memberId, 'joule', 99n, 'op-ledger');
    const sig = makeSigEnvelope(0n);
    batcher.addRecord(
      enc,
      memberId,
      'joule',
      99n,
      'op-ledger',
      0n,
      makeBytes(32),
      sig,
    );

    await batcher.flush(sig);

    expect(submitted).toHaveLength(1);
    expect(submitted[0].kind).toBe('BatchSettlement');
  });

  // ── stop() ────────────────────────────────────────────────────────────────

  it('stop() sets pendingFlush when records are buffered', () => {
    const batcher = makeBatcher();
    const memberId = makeMemberId(1);
    const enc = makeEncodedRecord(0n, memberId, 'joule', 1n, 'op-stop');
    batcher.addRecord(enc, memberId, 'joule', 1n, 'op-stop', 0n, makeBytes(32));

    batcher.stop();
    expect(batcher.pendingFlush).toBe(true);
  });

  // ── Defaults ─────────────────────────────────────────────────────────────

  it('DEFAULT_MAX_RECORDS is 10_000', () => {
    expect(DEFAULT_MAX_RECORDS).toBe(10_000);
  });

  it('DEFAULT_MAX_AGE_MS is 5_000', () => {
    expect(DEFAULT_MAX_AGE_MS).toBe(5_000);
  });
});

// ── Property tests (Requirement 10.1) ────────────────────────────────────────

describe('Batcher — property tests', () => {
  let dirPath: string;

  beforeEach(() => {
    dirPath = mkdtempSync(join(tmpdir(), 'batcher-prop-'));
  });

  afterEach(() => {
    rmSync(dirPath, { recursive: true, force: true });
  });

  /**
   * For a random batch of N records the Merkle root stored in the emitted
   * action must match the root independently recomputed from the same encoded
   * records.
   */
  it('itemsRoot matches independently recomputed Merkle root (Req 10.1)', async () => {
    const batcher = new Batcher({
      shardId: PROP_SHARD,
      dirPath,
      maxAgeMs: 0,
    });

    const N = 50;
    const encodedRecords: Uint8Array[] = [];
    const tipHash = makeBytes(32);

    for (let i = 0; i < N; i++) {
      const memberId = makeMemberId((i % 10) + 1);
      const assetId = i % 2 === 0 ? 'joule' : 'watt';
      const amount = i % 3 === 0 ? -BigInt(i + 1) : BigInt(i + 1);
      const opId = `prop-op-${i}`;
      const enc = makeEncodedRecord(BigInt(i), memberId, assetId, amount, opId);
      encodedRecords.push(enc);
      batcher.addRecord(
        enc,
        memberId,
        assetId,
        amount,
        opId,
        BigInt(i),
        tipHash,
      );
    }

    const sig = makeSigEnvelope(BigInt(N - 1));
    const action = (await batcher.flush(sig)) as BatchSettlementAction;

    // Independently recompute the Merkle root from the encoded records.
    const leaves = encodedRecords.map(merkleLeafHash);
    const expectedRoot = merkleRootFromLeaves(leaves);

    expect(Buffer.from(action.itemsRoot).toString('hex')).toBe(
      Buffer.from(expectedRoot).toString('hex'),
    );
  });

  /**
   * `memberDeltas` emitted in the action must match deltas recomputed
   * independently from the same record stream.
   */
  it('memberDeltas match independently computed deltas (Req 10.1)', async () => {
    const batcher = new Batcher({
      shardId: PROP_DELTAS,
      dirPath,
      maxAgeMs: 0,
    });

    // Use a deterministic but non-trivial pattern.
    const records: Array<{
      memberId: Uint8Array;
      assetId: string;
      amount: bigint;
      opId: string;
      seq: bigint;
    }> = [];

    for (let i = 0; i < 40; i++) {
      records.push({
        memberId: makeMemberId((i % 5) + 1),
        assetId: ['joule', 'watt', 'bit'][i % 3],
        amount: i % 4 === 0 ? -BigInt(i * 7 + 1) : BigInt(i * 3 + 1),
        opId: `prop-delta-${i}`,
        seq: BigInt(i),
      });
    }

    const tipHash = makeBytes(32);
    for (const r of records) {
      const enc = makeEncodedRecord(
        r.seq,
        r.memberId,
        r.assetId,
        r.amount,
        r.opId,
      );
      batcher.addRecord(
        enc,
        r.memberId,
        r.assetId,
        r.amount,
        r.opId,
        r.seq,
        tipHash,
      );
    }

    const sig = makeSigEnvelope(BigInt(records.length - 1));
    const action = (await batcher.flush(sig)) as BatchSettlementAction;

    // Independently compute expected deltas.
    const deltaMap = new Map<
      string,
      { memberId: Uint8Array; assetId: string; earned: bigint; spent: bigint }
    >();
    for (const r of records) {
      const key = `${Buffer.from(r.memberId).toString('hex')}|${r.assetId}`;
      let d = deltaMap.get(key);
      if (!d) {
        d = { memberId: r.memberId, assetId: r.assetId, earned: 0n, spent: 0n };
        deltaMap.set(key, d);
      }
      if (r.amount > 0n) d.earned += r.amount;
      else if (r.amount < 0n) d.spent += -r.amount;
    }

    const expectedDeltas = [...deltaMap.values()].sort((a, b) => {
      const len = Math.min(a.memberId.length, b.memberId.length);
      for (let i = 0; i < len; i++) {
        const diff = (a.memberId[i] ?? 0) - (b.memberId[i] ?? 0);
        if (diff !== 0) return diff;
      }
      if (a.memberId.length !== b.memberId.length) {
        return a.memberId.length - b.memberId.length;
      }
      return a.assetId < b.assetId ? -1 : a.assetId > b.assetId ? 1 : 0;
    });

    expect(action.memberDeltas).toHaveLength(expectedDeltas.length);
    for (let i = 0; i < expectedDeltas.length; i++) {
      expect(action.memberDeltas[i].earned).toBe(expectedDeltas[i].earned);
      expect(action.memberDeltas[i].spent).toBe(expectedDeltas[i].spent);
      expect(action.memberDeltas[i].assetId).toBe(expectedDeltas[i].assetId);
      expect(Buffer.from(action.memberDeltas[i].memberId).toString('hex')).toBe(
        Buffer.from(expectedDeltas[i].memberId).toString('hex'),
      );
    }
  });

  /**
   * Duplicate (memberId, opId) pairs submitted to the Batcher MUST NOT
   * double-count in the memberDeltas (Requirement 2.5).
   */
  it('duplicate ops do not double-count in memberDeltas (Req 2.5)', async () => {
    const batcher = new Batcher({
      shardId: PROP_DEDUP,
      dirPath,
      maxAgeMs: 0,
    });

    const memberId = makeMemberId(1);
    const tipHash = makeBytes(32);
    const enc0 = makeEncodedRecord(0n, memberId, 'joule', 100n, 'op-0');
    const enc1 = makeEncodedRecord(1n, memberId, 'joule', 200n, 'op-1');
    const encDup = makeEncodedRecord(0n, memberId, 'joule', 100n, 'op-0'); // duplicate

    batcher.addRecord(enc0, memberId, 'joule', 100n, 'op-0', 0n, tipHash);
    batcher.addRecord(enc1, memberId, 'joule', 200n, 'op-1', 1n, tipHash);
    // Submitting the duplicate — should be silently ignored in the delta.
    const dupResult = batcher.addRecord(
      encDup,
      memberId,
      'joule',
      100n,
      'op-0',
      0n,
      tipHash,
    );
    expect((dupResult as DuplicateAddRecordResult).isDuplicate).toBe(true);

    const sig = makeSigEnvelope(1n);
    const action = (await batcher.flush(sig)) as BatchSettlementAction;

    expect(action.memberDeltas).toHaveLength(1);
    // earned should be 100 + 200 = 300, NOT 400 (duplicate not re-added)
    expect(action.memberDeltas[0].earned).toBe(300n);
  });
});
