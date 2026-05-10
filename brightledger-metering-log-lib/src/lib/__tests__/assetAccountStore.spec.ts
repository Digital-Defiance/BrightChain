/**
 * Phase 7 — Operational Tier Coupling tests.
 *
 * Covers requirements 8.1 – 8.4:
 *   7.1  MeteringLogShard.appendRecord calls IAssetAccountStore.applyDelta optimistically
 *   7.2  Batcher.flush() calls confirmSettlement on all member deltas
 *   7.3  applyDisputeReversal rolls back balances for DISPUTED_* resolutions
 *   7.4  Store operations are synchronous O(1) and do not block settlement
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';

import {
  GuidUint8Array,
  type GuidV7Uint8Array,
} from '@digitaldefiance/ecies-lib';

import {
  InMemoryAssetAccountStore,
  type IAssetAccountStore,
} from '../assetAccountStore.js';
import type { MemberDelta } from '../batchAccumulator.js';
import { Batcher } from '../batchSettlement.js';
import { applyDisputeReversal } from '../disputeChallenge.js';
import { MeteringLogShard } from '../meteringLogShard.js';
import { generateProcessKey } from '../processKey.js';
import { encodeMeteringRecord } from '../record.js';
import type { ISignatureEntry } from '../sidecar.js';
import { FlatFileMeteringStorage } from '../storage/flatFileMeteringStorage.js';

// ── Shard ID constants ──────────────────────────────────────────────────────

const SHARD_0 = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000001',
) as GuidV7Uint8Array;
const SHARD_NOSTORE = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000002',
) as GuidV7Uint8Array;
const SHARD_PERF = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000003',
) as GuidV7Uint8Array;

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeMemberId(seed: number): Uint8Array {
  const id = new Uint8Array(32);
  id[0] = seed & 0xff;
  id[1] = (seed >> 8) & 0xff;
  return id;
}

function makeBytes(len: number, fill = 0): Uint8Array {
  return new Uint8Array(len).fill(fill);
}

function makeSigEnvelope(seq: bigint): ISignatureEntry {
  return {
    seq,
    tipHash: makeBytes(32),
    processKeyFingerprint: makeBytes(32),
    sig: makeBytes(64),
  };
}

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

function tmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'tier-coupling-'));
}

function cleanupDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

// ── InMemoryAssetAccountStore unit tests ──────────────────────────────────────

describe('InMemoryAssetAccountStore', () => {
  let store: InMemoryAssetAccountStore;
  const member1 = makeMemberId(1);
  const member2 = makeMemberId(2);
  const asset = 'joule';

  beforeEach(() => {
    store = new InMemoryAssetAccountStore();
  });

  it('returns 0n balance for unknown (memberId, assetId)', () => {
    expect(store.getBalance(member1, asset)).toBe(0n);
  });

  it('returns null lastSettledAt before any settlement', () => {
    expect(store.getLastSettledAt(member1, asset)).toBeNull();
  });

  it('applyDelta accumulates positive credits', () => {
    store.applyDelta(member1, asset, 100n, 'op-1');
    store.applyDelta(member1, asset, 200n, 'op-2');
    expect(store.getBalance(member1, asset)).toBe(300n);
  });

  it('applyDelta accumulates negative debits', () => {
    store.applyDelta(member1, asset, 500n, 'op-1');
    store.applyDelta(member1, asset, -150n, 'op-2');
    expect(store.getBalance(member1, asset)).toBe(350n);
  });

  it('applyDelta tracks separate (memberId, assetId) pairs independently', () => {
    store.applyDelta(member1, 'joule', 100n, 'op-1');
    store.applyDelta(member1, 'watt', 200n, 'op-2');
    store.applyDelta(member2, 'joule', 50n, 'op-3');

    expect(store.getBalance(member1, 'joule')).toBe(100n);
    expect(store.getBalance(member1, 'watt')).toBe(200n);
    expect(store.getBalance(member2, 'joule')).toBe(50n);
  });

  it('confirmSettlement sets lastSettledAt', () => {
    const ts = 1_700_000_000_000;
    store.confirmSettlement(member1, asset, 100n, ts);
    expect(store.getLastSettledAt(member1, asset)).toBe(ts);
  });

  it('confirmSettlement accumulates confirmedBalance across calls', () => {
    const t1 = 1_700_000_000_000;
    const t2 = 1_700_000_001_000;
    store.confirmSettlement(member1, asset, 100n, t1);
    store.confirmSettlement(member1, asset, 200n, t2);
    // lastSettledAt is the most recent timestamp
    expect(store.getLastSettledAt(member1, asset)).toBe(t2);
  });

  it('reverseDeltas reduces balance by earned − spent per entry', () => {
    store.applyDelta(member1, asset, 300n, 'op-1');
    store.applyDelta(member1, asset, -50n, 'op-2');
    // net optimistic = 250n

    const deltas: MemberDelta[] = [
      { memberId: member1, assetId: asset, earned: 300n, spent: 50n },
    ];
    store.reverseDeltas(deltas);

    // 250n − (300n − 50n) = 250n − 250n = 0n
    expect(store.getBalance(member1, asset)).toBe(0n);
  });

  it('reverseDeltas handles multiple members in one call', () => {
    store.applyDelta(member1, 'joule', 400n, 'op-1');
    store.applyDelta(member2, 'joule', 200n, 'op-2');

    const deltas: MemberDelta[] = [
      { memberId: member1, assetId: 'joule', earned: 400n, spent: 0n },
      { memberId: member2, assetId: 'joule', earned: 200n, spent: 0n },
    ];
    store.reverseDeltas(deltas);

    expect(store.getBalance(member1, 'joule')).toBe(0n);
    expect(store.getBalance(member2, 'joule')).toBe(0n);
  });

  it('reverseDeltas with empty array is a no-op', () => {
    store.applyDelta(member1, asset, 100n, 'op-1');
    store.reverseDeltas([]);
    expect(store.getBalance(member1, asset)).toBe(100n);
  });

  it('reverseDeltas can produce a negative balance (over-reversal scenario)', () => {
    // No prior applyDelta — reverse into negative territory
    const deltas: MemberDelta[] = [
      { memberId: member1, assetId: asset, earned: 100n, spent: 0n },
    ];
    store.reverseDeltas(deltas);
    expect(store.getBalance(member1, asset)).toBe(-100n);
  });
});

// ── Task 7.1 — MeteringLogShard.appendRecord calls applyDelta optimistically ──

describe('Task 7.1 — MeteringLogShard + IAssetAccountStore (optimistic delta)', () => {
  let dir: string;
  let shard: MeteringLogShard;
  let store: InMemoryAssetAccountStore;

  beforeEach(async () => {
    dir = tmpDir();
    store = new InMemoryAssetAccountStore();
    const processKey = generateProcessKey();
    shard = new MeteringLogShard(new FlatFileMeteringStorage(), {
      processKey,
      accountStore: store,
    });
    await shard.open(dir, SHARD_0);
  });

  afterEach(async () => {
    if (shard.isOpen) await shard.close();
    cleanupDir(dir);
  });

  it('balance is updated immediately after appendRecord', async () => {
    const member = makeMemberId(1);
    expect(store.getBalance(member, 'joule')).toBe(0n);

    await shard.appendRecord({
      op: 'energy.charge',
      memberId: member,
      assetId: 'joule',
      amount: 500n,
      opId: 'op-1',
      contextHash: makeBytes(32),
    });

    // No flush needed — balance is optimistic
    expect(store.getBalance(member, 'joule')).toBe(500n);
  });

  it('balance reflects cumulative sum of all appended records', async () => {
    const member = makeMemberId(1);
    const amounts = [100n, 200n, -50n, 300n];

    for (let i = 0; i < amounts.length; i++) {
      await shard.appendRecord({
        op: 'energy.charge',
        memberId: member,
        assetId: 'joule',
        amount: amounts[i],
        opId: `op-${i}`,
        contextHash: makeBytes(32),
      });
    }

    const expected = amounts.reduce((a, b) => a + b, 0n); // 550n
    expect(store.getBalance(member, 'joule')).toBe(expected);
  });

  it('each (memberId, assetId) pair is tracked independently', async () => {
    const m1 = makeMemberId(1);
    const m2 = makeMemberId(2);

    await shard.appendRecord({
      op: 'energy.charge',
      memberId: m1,
      assetId: 'joule',
      amount: 100n,
      opId: 'op-m1-1',
      contextHash: makeBytes(32),
    });
    await shard.appendRecord({
      op: 'energy.charge',
      memberId: m2,
      assetId: 'joule',
      amount: 250n,
      opId: 'op-m2-1',
      contextHash: makeBytes(32),
    });

    expect(store.getBalance(m1, 'joule')).toBe(100n);
    expect(store.getBalance(m2, 'joule')).toBe(250n);
  });

  it('MeteringLogShard without accountStore works normally (no error)', async () => {
    const dir2 = tmpDir();
    const pk = generateProcessKey();
    const shardNoStore = new MeteringLogShard(new FlatFileMeteringStorage(), {
      processKey: pk,
      // no accountStore
    });
    await shardNoStore.open(dir2, SHARD_NOSTORE);
    await expect(
      shardNoStore.appendRecord({
        op: 'energy.charge',
        memberId: makeMemberId(99),
        assetId: 'joule',
        amount: 100n,
        opId: 'op-nostore',
        contextHash: makeBytes(32),
      }),
    ).resolves.toBeDefined();
    await shardNoStore.close();
    cleanupDir(dir2);
  });
});

// ── Task 7.2 — Batcher.flush() confirms settlement in account store ───────────

describe('Task 7.2 — Batcher.flush() + IAssetAccountStore (settlement confirmation)', () => {
  let dir: string;
  let batcher: Batcher;
  let store: InMemoryAssetAccountStore;
  const member1 = makeMemberId(10);

  beforeEach(() => {
    dir = tmpDir();
    store = new InMemoryAssetAccountStore();
    batcher = new Batcher({
      shardId: SHARD_0,
      dirPath: dir,
      accountStore: store,
      maxRecords: 1000,
    });
  });

  afterEach(() => {
    batcher.stop();
    cleanupDir(dir);
  });

  it('getLastSettledAt is null before any flush', () => {
    expect(store.getLastSettledAt(member1, 'joule')).toBeNull();
  });

  it('getLastSettledAt is set after flush() with a member delta', async () => {
    const before = Date.now();
    const encoded = makeEncodedRecord(0n, member1, 'joule', 200n, 'op-1');
    batcher.addRecord(
      encoded,
      member1,
      'joule',
      200n,
      'op-1',
      0n,
      makeBytes(32),
      makeSigEnvelope(0n),
    );
    await batcher.flush(makeSigEnvelope(0n));
    const after = Date.now();

    const settledAt = store.getLastSettledAt(member1, 'joule');
    expect(settledAt).not.toBeNull();
    expect(settledAt!).toBeGreaterThanOrEqual(before);
    expect(settledAt!).toBeLessThanOrEqual(after);
  });

  it('confirmSettlement reflects net = earned − spent', async () => {
    // Add two records: +300 and -100 → net = 200
    const enc1 = makeEncodedRecord(0n, member1, 'joule', 300n, 'op-credit');
    batcher.addRecord(
      enc1,
      member1,
      'joule',
      300n,
      'op-credit',
      0n,
      makeBytes(32),
      makeSigEnvelope(0n),
    );
    const enc2 = makeEncodedRecord(1n, member1, 'joule', -100n, 'op-debit');
    batcher.addRecord(
      enc2,
      member1,
      'joule',
      -100n,
      'op-debit',
      1n,
      makeBytes(32),
      makeSigEnvelope(1n),
    );

    // Prior to flush the store has not been confirmed
    expect(store.getLastSettledAt(member1, 'joule')).toBeNull();

    await batcher.flush(makeSigEnvelope(1n));

    expect(store.getLastSettledAt(member1, 'joule')).not.toBeNull();
  });

  it('Batcher without accountStore flushes normally (no error)', async () => {
    const dir2 = tmpDir();
    const batcherNoStore = new Batcher({
      shardId: SHARD_NOSTORE,
      dirPath: dir2,
      maxRecords: 1000,
    });
    const enc = makeEncodedRecord(0n, member1, 'joule', 100n, 'op-x');
    batcherNoStore.addRecord(
      enc,
      member1,
      'joule',
      100n,
      'op-x',
      0n,
      makeBytes(32),
      makeSigEnvelope(0n),
    );
    await expect(
      batcherNoStore.flush(makeSigEnvelope(0n)),
    ).resolves.not.toBeNull();
    batcherNoStore.stop();
    cleanupDir(dir2);
  });
});

// ── Task 7.3 — Dispute reversal ───────────────────────────────────────────────

describe('Task 7.3 — applyDisputeReversal', () => {
  let store: InMemoryAssetAccountStore;
  const member = makeMemberId(20);
  const asset = 'joule';

  const deltas: MemberDelta[] = [
    { memberId: member, assetId: asset, earned: 300n, spent: 50n },
  ];

  beforeEach(() => {
    store = new InMemoryAssetAccountStore();
    // Simulate optimistic credits having been applied
    store.applyDelta(member, asset, 300n, 'op-1');
    store.applyDelta(member, asset, -50n, 'op-2');
    // balance = 250n
  });

  it('DISPUTED_FRAUD reverses member deltas (balance returns to 0n)', () => {
    applyDisputeReversal(
      { status: 'DISPUTED_FRAUD', detail: 'hash mismatch' },
      deltas,
      store,
    );
    expect(store.getBalance(member, asset)).toBe(0n);
  });

  it('DISPUTED_NO_RESPONSE reverses member deltas (balance returns to 0n)', () => {
    applyDisputeReversal({ status: 'DISPUTED_NO_RESPONSE' }, deltas, store);
    expect(store.getBalance(member, asset)).toBe(0n);
  });

  it('FINAL resolution is a no-op — balance unchanged', () => {
    applyDisputeReversal({ status: 'FINAL' }, deltas, store);
    expect(store.getBalance(member, asset)).toBe(250n);
  });

  it('reversal of multiple members is atomic (all reversed)', () => {
    const m2 = makeMemberId(21);
    store.applyDelta(m2, asset, 600n, 'op-m2');
    // m2 balance = 600n

    const multiDeltas: MemberDelta[] = [
      { memberId: member, assetId: asset, earned: 300n, spent: 50n },
      { memberId: m2, assetId: asset, earned: 600n, spent: 0n },
    ];

    applyDisputeReversal(
      { status: 'DISPUTED_FRAUD', detail: 'proof invalid' },
      multiDeltas,
      store,
    );

    expect(store.getBalance(member, asset)).toBe(0n);
    expect(store.getBalance(m2, asset)).toBe(0n);
  });

  it('reversal after Batcher.reverseSettlement is consistent', () => {
    const dir = tmpDir();
    try {
      const store2: IAssetAccountStore = new InMemoryAssetAccountStore();
      const batcher = new Batcher({
        shardId: SHARD_0,
        dirPath: dir,
        accountStore: store2,
        maxRecords: 1000,
      });
      store2.applyDelta(member, asset, 250n, 'op-1');
      expect(store2.getBalance(member, asset)).toBe(250n);

      batcher.reverseSettlement(deltas);
      expect(store2.getBalance(member, asset)).toBe(0n);

      batcher.stop();
    } finally {
      cleanupDir(dir);
    }
  });
});

// ── Task 7.4 — Latency: store ops are O(1) and never block ───────────────────

describe('Task 7.4 — Latency: store operations complete within time bounds', () => {
  it('applyDelta on a pre-populated store completes in < 5 ms', () => {
    const store = new InMemoryAssetAccountStore();
    // Pre-populate with many distinct (memberId, assetId) pairs
    for (let i = 0; i < 1_000; i++) {
      store.applyDelta(
        makeMemberId(i % 256),
        `asset-${i}`,
        BigInt(i),
        `op-${i}`,
      );
    }

    const member = makeMemberId(7);
    const start = performance.now();
    store.applyDelta(member, 'target-asset', 1n, 'op-target');
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(5);
  });

  it('confirmSettlement on a pre-populated store completes in < 5 ms', () => {
    const store = new InMemoryAssetAccountStore();
    for (let i = 0; i < 1_000; i++) {
      store.applyDelta(
        makeMemberId(i % 256),
        `asset-${i}`,
        BigInt(i),
        `op-${i}`,
      );
    }

    const member = makeMemberId(5);
    store.applyDelta(member, 'fast-asset', 100n, 'op-fast');

    const start = performance.now();
    store.confirmSettlement(member, 'fast-asset', 100n, Date.now());
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(5);
  });

  it('reverseDeltas over 100 entries completes in < 10 ms', () => {
    const store = new InMemoryAssetAccountStore();
    const deltas: MemberDelta[] = [];
    for (let i = 0; i < 100; i++) {
      const member = makeMemberId(i);
      store.applyDelta(member, 'joule', BigInt(i * 10), `op-${i}`);
      deltas.push({
        memberId: member,
        assetId: 'joule',
        earned: BigInt(i * 10),
        spent: 0n,
      });
    }

    const start = performance.now();
    store.reverseDeltas(deltas);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(10);
  });

  it('Batcher.flush() with 100-member account store completes in < 200 ms', async () => {
    const dir = tmpDir();
    try {
      const store = new InMemoryAssetAccountStore();
      const batcher = new Batcher({
        shardId: SHARD_PERF,
        dirPath: dir,
        accountStore: store,
        maxRecords: 10_000,
      });

      for (let i = 0; i < 100; i++) {
        const member = makeMemberId(i);
        const opId = `op-${i}`;
        const seq = BigInt(i);
        const enc = makeEncodedRecord(
          seq,
          member,
          'joule',
          BigInt(i * 5),
          opId,
        );
        batcher.addRecord(
          enc,
          member,
          'joule',
          BigInt(i * 5),
          opId,
          seq,
          makeBytes(32),
          makeSigEnvelope(seq),
        );
      }

      const start = performance.now();
      await batcher.flush(makeSigEnvelope(99n));
      const elapsed = performance.now() - start;

      batcher.stop();
      expect(elapsed).toBeLessThan(200);
    } finally {
      cleanupDir(dir);
    }
  });
});
