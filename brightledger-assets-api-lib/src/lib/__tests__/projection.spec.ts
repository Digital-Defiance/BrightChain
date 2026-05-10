/**
 * @fileoverview Phase 3 property tests — snapshot/replay equivalence and
 * permutation idempotency.
 *
 * Property 5: Cold replay to N == warm replay from snapshot at K (K ≤ N)
 * Property 6: Permuting validator-accepted entries within nonce-respecting
 *             orderings yields identical final state
 *
 * @see Requirements 3.3, 3.6, 3.7
 */

import {
  QuorumType,
  SignerRole,
  SignerStatus,
} from '@brightchain/brightchain-lib';
import {
  ActionKind,
  type AssetIdBuffer,
  type IIssueAssetAction,
  type IMintAction,
} from '@brightchain/brightledger-assets-lib';
import * as fc from 'fast-check';
import {
  BalanceProjectionService,
  type ILedgerEntry,
} from '../balanceProjection.js';
import {
  computeStateHash,
  MemorySnapshotStore,
  SnapshotService,
} from '../snapshot.js';
import type { ILedgerContext } from '../validator.js';

// ── Shared helpers ─────────────────────────────────────────────────────────

const NOW = 1_700_000_000_000;

function makePk(seed: number): Uint8Array {
  const k = new Uint8Array(33);
  k[0] = seed % 256;
  k[1] = Math.floor(seed / 256) % 256;
  return k;
}

function fill32(b: number): Uint8Array {
  return new Uint8Array(32).fill(b % 256);
}

/** Deterministic 64-char hex asset-ID string from a seed. */
function assetId(seed: number): string {
  const buf = new Uint8Array(32);
  // Spread seed across multiple bytes so seeds in 0..255 produce unique IDs.
  buf[0] = seed % 256;
  buf[1] = Math.floor(seed / 256) % 256;
  buf[2] = Math.floor(seed / 65536) % 256;
  return Buffer.from(buf).toString('hex');
}

function assetIdBuf(seed: number): AssetIdBuffer {
  return fill32(seed % 256) as unknown as AssetIdBuffer;
}

/** Build a minimal `ILedgerEntry` that issues a new asset with the given seed. */
function makeIssueEntry(seed: number): ILedgerEntry {
  const issuerKey = makePk(seed + 100);
  const action: IIssueAssetAction = {
    kind: ActionKind.IssueAsset,
    symbol: `T${seed % 1000}`,
    displayName: `Asset ${seed}`,
    decimals: 6,
    supplyPolicy: 'mintable' as const,
    transferPolicy: 'open' as const,
    freezable: false,
    burnable: false,
    initialIssuerSet: [
      {
        publicKey: issuerKey,
        role: SignerRole.Admin,
        status: SignerStatus.Active,
        metadata: new Map(),
      },
    ],
    initialBrightTrustPolicy: { type: QuorumType.Threshold, threshold: 1 },
  };
  const context: ILedgerContext = {
    now: NOW,
    signerPublicKeys: [issuerKey],
    derivedAssetId: assetId(seed),
  };
  return { action, context };
}

/** Build a minimal `ILedgerEntry` that mints `amount` units to `recipient`. */
function makeMintEntry(
  seed: number,
  recipient: Uint8Array,
  amount: bigint,
  nonce: bigint,
): ILedgerEntry {
  const issuerKey = makePk(seed + 100);
  const action: IMintAction = {
    kind: ActionKind.Mint,
    assetId: assetIdBuf(seed) as ReturnType<typeof assetIdBuf> & {
      readonly __brand: true;
    },
    to: recipient,
    amount,
    nonce,
  };
  const context: ILedgerContext = {
    now: NOW,
    signerPublicKeys: [issuerKey],
  };
  return { action, context };
}

/** Return true iff two Uint8Arrays are byte-identical. */
function hashesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  return a.every((byte, i) => byte === b[i]);
}

// ── Property 5: snapshot/replay equivalence ────────────────────────────────

describe('Property 5: snapshot/replay equivalence', () => {
  it('cold replay to N equals warm replay from snapshot at K (K ≤ N)', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.integer({ min: 1, max: 500 }), {
          minLength: 4,
          maxLength: 15,
        }),
        (seeds) => {
          const entries: ILedgerEntry[] = seeds.map(makeIssueEntry);
          const n = entries.length;

          // Choose snapshot point K somewhere in [1, n-1].
          const k = Math.max(1, Math.floor(n / 2));

          // Cold path: replay all N entries from scratch.
          const coldState = BalanceProjectionService.replayAll(entries);

          // Warm path: replay first K, take snapshot state, replay remaining.
          const snapState = BalanceProjectionService.replayAll(
            entries.slice(0, k),
          );
          const warmState = BalanceProjectionService.replayAll(
            entries.slice(k),
            snapState,
          );

          return hashesEqual(
            computeStateHash(coldState),
            computeStateHash(warmState),
          );
        },
      ),
      { numRuns: 200 },
    );
  });

  it('SnapshotService.save + loadLatest warm-start matches cold-start', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(fc.integer({ min: 1, max: 300 }), {
          minLength: 4,
          maxLength: 12,
        }),
        async (seeds) => {
          const LEDGER_ID = `ledger-${seeds[0]}`;
          const entries: ILedgerEntry[] = seeds.map(makeIssueEntry);
          const n = entries.length;
          const k = Math.max(1, Math.floor(n / 2));

          // Build snapshot at k.
          const snapStore = new MemorySnapshotStore();
          const snapSvc = new SnapshotService(snapStore, 1_000);
          const snapState = BalanceProjectionService.replayAll(
            entries.slice(0, k),
          );
          await snapSvc.save(LEDGER_ID, snapState);

          // Warm-start via BalanceProjectionService.start.
          const proj = new BalanceProjectionService(snapSvc);
          await proj.start(LEDGER_ID, entries);

          // Cold reference.
          const coldState = BalanceProjectionService.replayAll(entries);

          return hashesEqual(
            computeStateHash(proj.state),
            computeStateHash(coldState),
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Property 6: permutation idempotency ───────────────────────────────────

describe('Property 6: permutation idempotency', () => {
  it('reversing independent IssueAsset entries yields identical final state', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.integer({ min: 1, max: 500 }), {
          minLength: 2,
          maxLength: 12,
        }),
        (seeds) => {
          const entries: ILedgerEntry[] = seeds.map(makeIssueEntry);
          const reversed: ILedgerEntry[] = [...entries].reverse();

          const state1 = BalanceProjectionService.replayAll(entries);
          const state2 = BalanceProjectionService.replayAll(reversed);

          return hashesEqual(
            computeStateHash(state1),
            computeStateHash(state2),
          );
        },
      ),
      { numRuns: 300 },
    );
  });

  it('arbitrary permutation of independent IssueAsset entries yields identical final state', () => {
    fc.assert(
      fc.property(
        // Generate unique seeds, then a permutation order for them.
        fc
          .uniqueArray(fc.integer({ min: 1, max: 500 }), {
            minLength: 2,
            maxLength: 10,
          })
          .chain((seeds) =>
            fc.tuple(
              fc.constant(seeds),
              fc.shuffledSubarray(seeds, { minLength: seeds.length }),
            ),
          ),
        ([seeds, shuffledSeeds]) => {
          const entries = seeds.map(makeIssueEntry);
          const shuffled = shuffledSeeds.map(makeIssueEntry);

          const state1 = BalanceProjectionService.replayAll(entries);
          const state2 = BalanceProjectionService.replayAll(shuffled);

          return hashesEqual(
            computeStateHash(state1),
            computeStateHash(state2),
          );
        },
      ),
      { numRuns: 200 },
    );
  });

  it('Mint entries for different assets are order-independent given issues applied first', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.integer({ min: 1, max: 200 }), {
          minLength: 2,
          maxLength: 8,
        }),
        fc.array(fc.bigInt({ min: 1n, max: 1_000n }), {
          minLength: 2,
          maxLength: 8,
        }),
        (seeds, amounts) => {
          const n = Math.min(seeds.length, amounts.length);
          const issuePart = seeds.slice(0, n).map(makeIssueEntry);
          const mintPart = seeds
            .slice(0, n)
            .map((seed, i) =>
              makeMintEntry(seed, makePk(seed + 200), amounts[i], 1n),
            );

          // Original order: issues first, then mints.
          const original = [...issuePart, ...mintPart];
          // Permuted order: issues first, mints reversed.
          const permuted = [...issuePart, ...[...mintPart].reverse()];

          const state1 = BalanceProjectionService.replayAll(original);
          const state2 = BalanceProjectionService.replayAll(permuted);

          return hashesEqual(
            computeStateHash(state1),
            computeStateHash(state2),
          );
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ── SnapshotService unit tests ─────────────────────────────────────────────

describe('SnapshotService', () => {
  it('save stores a snapshot with correct hash', async () => {
    const store = new MemorySnapshotStore();
    const svc = new SnapshotService(store, 100);

    const entry = makeIssueEntry(42);
    const state = BalanceProjectionService.replayAll([entry]);

    const snap = await svc.save('ledger-A', state);
    expect(snap.ledgerId).toBe('ledger-A');
    expect(snap.sequenceNumber).toBe(state.lastSequence);
    expect(snap.stateHash).toEqual(computeStateHash(state));
  });

  it('loadLatest returns undefined when no snapshots exist', async () => {
    const store = new MemorySnapshotStore();
    const svc = new SnapshotService(store, 100);
    const result = await svc.loadLatest('no-such-ledger');
    expect(result).toBeUndefined();
  });

  it('loadLatest returns most recent snapshot', async () => {
    const store = new MemorySnapshotStore();
    const svc = new SnapshotService(store, 100);

    const e1 = makeIssueEntry(1);
    const e2 = makeIssueEntry(2);
    const s1 = BalanceProjectionService.replayAll([e1]);
    const s2 = BalanceProjectionService.replayAll([e1, e2]);

    await svc.save('L', s1);
    await svc.save('L', s2);

    const latest = await svc.loadLatest('L');
    expect(latest?.sequenceNumber).toBe(s2.lastSequence);
  });
});

// ── BalanceProjectionService unit tests ───────────────────────────────────

describe('BalanceProjectionService', () => {
  it('start cold (no snapshot) produces correct state', async () => {
    const store = new MemorySnapshotStore();
    const svc = new SnapshotService(store, 1_000);
    const proj = new BalanceProjectionService(svc);

    const entries = [makeIssueEntry(1), makeIssueEntry(2), makeIssueEntry(3)];
    await proj.start('cold-ledger', entries);

    const expected = BalanceProjectionService.replayAll(entries);
    expect(
      hashesEqual(computeStateHash(proj.state), computeStateHash(expected)),
    ).toBe(true);
  });

  it('start warm (snapshot exists) produces correct state', async () => {
    const store = new MemorySnapshotStore();
    const svc = new SnapshotService(store, 1_000);

    const entries = [
      makeIssueEntry(10),
      makeIssueEntry(20),
      makeIssueEntry(30),
    ];

    // Save a snapshot after the first 2 entries.
    const snap2 = BalanceProjectionService.replayAll(entries.slice(0, 2));
    await svc.save('warm-ledger', snap2);

    const proj = new BalanceProjectionService(svc);
    await proj.start('warm-ledger', entries);

    const expected = BalanceProjectionService.replayAll(entries);
    expect(
      hashesEqual(computeStateHash(proj.state), computeStateHash(expected)),
    ).toBe(true);
  });

  it('falls back to cold replay when snapshot hash does not match', async () => {
    const store = new MemorySnapshotStore();
    const svc = new SnapshotService(store, 1_000);

    const entries = [makeIssueEntry(1), makeIssueEntry(2)];

    // Save a deliberately different state as the snapshot (e.g., only entry 1).
    const wrong = BalanceProjectionService.replayAll([makeIssueEntry(99)]);
    await svc.save('mismatch-ledger', wrong);

    const proj = new BalanceProjectionService(svc);
    await proj.start('mismatch-ledger', entries);

    // Should still arrive at the correct full-replay state.
    const expected = BalanceProjectionService.replayAll(entries);
    expect(
      hashesEqual(computeStateHash(proj.state), computeStateHash(expected)),
    ).toBe(true);
  });

  it('apply increments sequence and triggers snapshot at interval', async () => {
    const store = new MemorySnapshotStore();
    const INTERVAL = 3;
    const svc = new SnapshotService(store, INTERVAL);
    const proj = new BalanceProjectionService(svc);
    proj['_ledgerId'] = 'test-ledger'; // set ledger ID directly for apply tests

    const entries = [makeIssueEntry(1), makeIssueEntry(2), makeIssueEntry(3)];
    for (const { action, context } of entries) {
      await proj.apply(action, context);
    }

    // After INTERVAL entries, a snapshot should have been written.
    const snap = await svc.loadLatest('test-ledger');
    expect(snap).toBeDefined();
    expect(snap?.sequenceNumber).toBe(3n);
  });

  it('computeStateHash is deterministic', () => {
    const entry = makeIssueEntry(77);
    const state = BalanceProjectionService.replayAll([entry]);
    const h1 = computeStateHash(state);
    const h2 = computeStateHash(state);
    expect(h1).toEqual(h2);
  });

  it('computeStateHash differs after state change', () => {
    const e1 = makeIssueEntry(1);
    const e2 = makeIssueEntry(2);
    const s1 = BalanceProjectionService.replayAll([e1]);
    const s2 = BalanceProjectionService.replayAll([e1, e2]);
    expect(hashesEqual(computeStateHash(s1), computeStateHash(s2))).toBe(false);
  });
});
