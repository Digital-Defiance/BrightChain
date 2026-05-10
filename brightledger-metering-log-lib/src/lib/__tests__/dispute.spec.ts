import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  GuidUint8Array,
  type GuidV7Uint8Array,
} from '@digitaldefiance/ecies-lib';

import {
  DEFAULT_DISPUTE_RESPONSE_MS,
  DEFAULT_DISPUTE_WINDOW_MS,
  DisputeResolver,
  type BatchChallengeAction,
  type ChallengeResponse,
  type DisputeWindowOptions,
  type ResolutionResult,
  type SettlementStatus,
  type ValidationResult,
} from '../disputeChallenge.js';
import {
  INDEX_DIR_NAME,
  writeBatchIndex,
  type BatchMerkleIndex,
} from '../merkleStore.js';
import { merkleLeafHash, merkleRootFromLeaves } from '../merkleTree.js';
import { encodeMeteringRecord } from '../record.js';

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeBytes(len: number, fill = 0): Uint8Array {
  return new Uint8Array(len).fill(fill);
}

function makeMemberId(seed: number): Uint8Array {
  const id = new Uint8Array(32);
  id[0] = seed & 0xff;
  id[1] = (seed >> 8) & 0xff;
  return id;
}

function makeEncodedRecord(
  seq: bigint,
  memberId: Uint8Array,
  opId: string,
): Uint8Array {
  return encodeMeteringRecord({
    seq,
    prev_hash: makeBytes(32),
    ts: 1_000_000n,
    op: 'test.op',
    memberId,
    assetId: 'asset-1',
    amount: 100n,
    opId,
    context_hash: makeBytes(32),
  });
}

/**
 * Build a small batch of encoded records and persist the merkle index to a
 * temp directory. Returns the records, their leaves, and the index.
 */
function buildBatch(
  dirPath: string,
  fromSeq: bigint,
  count: number,
): {
  encodedRecords: Uint8Array[];
  leaves: Uint8Array[];
  idx: BatchMerkleIndex;
} {
  const memberId = makeMemberId(1);
  const encodedRecords: Uint8Array[] = [];
  for (let i = 0; i < count; i++) {
    encodedRecords.push(
      makeEncodedRecord(fromSeq + BigInt(i), memberId, `op-${i}`),
    );
  }
  const leaves = encodedRecords.map((r) => merkleLeafHash(r));
  const toSeq = fromSeq + BigInt(count - 1);
  const indexDir = join(dirPath, INDEX_DIR_NAME);
  const idx = writeBatchIndex(indexDir, fromSeq, toSeq, leaves);
  return { encodedRecords, leaves, idx };
}

// ── Constants tests ───────────────────────────────────────────────────────────

describe('Phase 6 — Constants', () => {
  it('DEFAULT_DISPUTE_WINDOW_MS is 24 hours', () => {
    expect(DEFAULT_DISPUTE_WINDOW_MS).toBe(86_400_000);
  });

  it('DEFAULT_DISPUTE_RESPONSE_MS is 6 hours', () => {
    expect(DEFAULT_DISPUTE_RESPONSE_MS).toBe(21_600_000);
  });
});

// ── BatchChallengeAction type shape ───────────────────────────────────────────

const SHARD_1 = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000001',
) as GuidV7Uint8Array;

describe('BatchChallengeAction', () => {
  it('constructs a valid challenge action object', () => {
    const action: BatchChallengeAction = {
      kind: 'BatchChallenge',
      settlementBatchId: 'batch-001',
      shardId: SHARD_1,
      fromSeq: 0n,
      toSeq: 9n,
      challengerId: 'member-X',
      claimedDiscrepancy: 'tipHash does not match local records',
    };
    expect(action.kind).toBe('BatchChallenge');
    expect(action.fromSeq).toBe(0n);
    expect(action.toSeq).toBe(9n);
    expect(action.claimedDiscrepancy).toBe(
      'tipHash does not match local records',
    );
  });
});

// ── DisputeResolver — configuration ──────────────────────────────────────────

describe('DisputeResolver — configuration', () => {
  it('uses default window values when no options provided', () => {
    const resolver = new DisputeResolver('/tmp/test');
    expect(resolver.disputeWindowMs).toBe(DEFAULT_DISPUTE_WINDOW_MS);
    expect(resolver.disputeResponseMs).toBe(DEFAULT_DISPUTE_RESPONSE_MS);
  });

  it('accepts custom window values via DisputeWindowOptions', () => {
    const opts: DisputeWindowOptions = {
      disputeWindowMs: 3_600_000,
      disputeResponseMs: 1_800_000,
    };
    const resolver = new DisputeResolver('/tmp/test', opts);
    expect(resolver.disputeWindowMs).toBe(3_600_000);
    expect(resolver.disputeResponseMs).toBe(1_800_000);
  });
});

// ── DisputeResolver — validateSequenceContinuity ─────────────────────────────

describe('DisputeResolver — validateSequenceContinuity (Req 5.5)', () => {
  let resolver: DisputeResolver;

  beforeEach(() => {
    resolver = new DisputeResolver('/tmp/test');
  });

  it('accepts fromSeq=0 as the first batch (prevToSeq=null)', () => {
    const result: ValidationResult = resolver.validateSequenceContinuity(
      0n,
      null,
    );
    expect(result.valid).toBe(true);
  });

  it('accepts correct continuation (fromSeq = prevToSeq + 1)', () => {
    const result = resolver.validateSequenceContinuity(10n, 9n);
    expect(result.valid).toBe(true);
  });

  it('rejects fromSeq that skips ahead (gap in sequence)', () => {
    const result = resolver.validateSequenceContinuity(5n, 2n);
    expect(result.valid).toBe(false);
    if (result.valid === false) {
      expect(result.reason).toBe('FROM_SEQ_DISCONTINUITY');
      expect(result.detail).toContain('Expected fromSeq=3');
    }
  });

  it('rejects fromSeq that overlaps previous batch', () => {
    const result = resolver.validateSequenceContinuity(3n, 5n);
    expect(result.valid).toBe(false);
    if (result.valid === false) {
      expect(result.reason).toBe('FROM_SEQ_DISCONTINUITY');
    }
  });

  it('rejects fromSeq > 0 when no previous batch exists', () => {
    const result = resolver.validateSequenceContinuity(5n, null);
    expect(result.valid).toBe(false);
    if (result.valid === false) {
      expect(result.reason).toBe('FROM_SEQ_DISCONTINUITY');
      expect(result.detail).toContain('Expected fromSeq=0');
    }
  });
});

// ── DisputeResolver — validateChallengeHashes ────────────────────────────────

describe('DisputeResolver — validateChallengeHashes (Req 5.6)', () => {
  let resolver: DisputeResolver;

  beforeEach(() => {
    resolver = new DisputeResolver('/tmp/test');
  });

  it('returns valid when tipHash and itemsRoot match records', () => {
    const memberId = makeMemberId(1);
    const records = [
      makeEncodedRecord(0n, memberId, 'op-0'),
      makeEncodedRecord(1n, memberId, 'op-1'),
    ];
    const leaves = records.map((r) => merkleLeafHash(r));
    const root = merkleRootFromLeaves(leaves);
    const tipHash = makeBytes(32, 0xab);

    const result = resolver.validateChallengeHashes(
      tipHash,
      tipHash,
      root,
      records,
    );
    expect(result.valid).toBe(true);
  });

  it('returns TIP_HASH_MISMATCH when tipHash differs (adversarial — Req 10.5)', () => {
    const memberId = makeMemberId(2);
    const records = [makeEncodedRecord(0n, memberId, 'op-0')];
    const leaves = records.map((r) => merkleLeafHash(r));
    const root = merkleRootFromLeaves(leaves);

    const onChainTip = makeBytes(32, 0x01);
    const presentedTip = makeBytes(32, 0x02); // different!

    const result = resolver.validateChallengeHashes(
      onChainTip,
      presentedTip,
      root,
      records,
    );
    expect(result.valid).toBe(false);
    if (result.valid === false) {
      expect(result.reason).toBe('TIP_HASH_MISMATCH');
    }
  });

  it('returns ITEMS_ROOT_MISMATCH when records do not match committed root', () => {
    const memberId = makeMemberId(3);
    const records = [makeEncodedRecord(0n, memberId, 'op-0')];
    const tipHash = makeBytes(32, 0xcc);

    // Compute root for different set of records (simulates tampered batch)
    const tamperedRecords = [makeEncodedRecord(0n, memberId, 'op-tampered')];
    const tamperedLeaves = tamperedRecords.map((r) => merkleLeafHash(r));
    const tamperedRoot = merkleRootFromLeaves(tamperedLeaves);

    const result = resolver.validateChallengeHashes(
      tipHash,
      tipHash,
      tamperedRoot, // on-chain root is for different records
      records, // but operator presents original records
    );
    expect(result.valid).toBe(false);
    if (result.valid === false) {
      expect(result.reason).toBe('ITEMS_ROOT_MISMATCH');
    }
  });
});

// ── DisputeResolver — buildDisputeResponse ───────────────────────────────────

describe('DisputeResolver — buildDisputeResponse (Req 7.3)', () => {
  let tmpDir: string;
  let resolver: DisputeResolver;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'dispute-test-'));
    resolver = new DisputeResolver(tmpDir);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns ChallengeResponse with proofs for all records', () => {
    const { encodedRecords, idx } = buildBatch(tmpDir, 0n, 3);
    const tipHash = makeBytes(32, 0xaa);
    const response: ChallengeResponse = resolver.buildDisputeResponse(
      'batch-001',
      0n,
      2n,
      tipHash,
      idx.root,
      encodedRecords,
    );
    expect(response.batchId).toBe('batch-001');
    expect(response.fromSeq).toBe(0n);
    expect(response.toSeq).toBe(2n);
    expect(response.encodedRecords).toHaveLength(3);
    expect(response.inclusionProofs).toHaveLength(3);
  });

  it('inclusion proofs in response verify against itemsRoot', () => {
    const { encodedRecords, idx } = buildBatch(tmpDir, 5n, 4);
    const tipHash = makeBytes(32, 0xbb);
    const response = resolver.buildDisputeResponse(
      'batch-005',
      5n,
      8n,
      tipHash,
      idx.root,
      encodedRecords,
    );
    // Every proof must verify
    for (const proof of response.inclusionProofs) {
      expect(proof.root).toEqual(idx.root);
    }
  });
});

// ── DisputeResolver — resolveChallenge ───────────────────────────────────────

describe('DisputeResolver — resolveChallenge (Req 7.4)', () => {
  let tmpDir: string;
  let resolver: DisputeResolver;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'dispute-resolve-'));
    resolver = new DisputeResolver(tmpDir);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns DISPUTED_NO_RESPONSE when operator provides no response', () => {
    const tipHash = makeBytes(32, 0xaa);
    const itemsRoot = makeBytes(32, 0xbb);
    const result: ResolutionResult = resolver.resolveChallenge(
      null,
      tipHash,
      itemsRoot,
    );
    expect(result.status).toBe('DISPUTED_NO_RESPONSE');
  });

  it('returns FINAL when tipHash, itemsRoot, and all proofs are valid', () => {
    const { encodedRecords, idx } = buildBatch(tmpDir, 0n, 3);
    const tipHash = makeBytes(32, 0x01);
    const response = resolver.buildDisputeResponse(
      'batch-001',
      0n,
      2n,
      tipHash,
      idx.root,
      encodedRecords,
    );
    const result = resolver.resolveChallenge(response, tipHash, idx.root);
    expect(result.status).toBe('FINAL');
  });

  it('returns DISPUTED_FRAUD when response tipHash differs from on-chain (Req 10.5)', () => {
    const { encodedRecords, idx } = buildBatch(tmpDir, 0n, 2);
    const realTipHash = makeBytes(32, 0x01);
    const fakeTipHash = makeBytes(32, 0x99); // malicious: different tip

    const response = resolver.buildDisputeResponse(
      'batch-002',
      0n,
      1n,
      fakeTipHash, // operator presents altered tipHash
      idx.root,
      encodedRecords,
    );
    const result = resolver.resolveChallenge(response, realTipHash, idx.root);
    expect(result.status).toBe('DISPUTED_FRAUD');
    if (result.status === 'DISPUTED_FRAUD') {
      expect(result.detail).toBeTruthy();
    }
  });

  it('returns DISPUTED_FRAUD when itemsRoot recomputed from records does not match on-chain', () => {
    const { encodedRecords, idx } = buildBatch(tmpDir, 0n, 2);
    const tipHash = makeBytes(32, 0x01);

    // Build a response with different (tampered) records but original root claim
    const tamperedRecords = [
      makeEncodedRecord(0n, makeMemberId(99), 'op-tampered-0'),
      makeEncodedRecord(1n, makeMemberId(99), 'op-tampered-1'),
    ];
    // We manually assemble a tampered response
    const tamperedResponse: ChallengeResponse = {
      batchId: 'batch-tampered',
      fromSeq: 0n,
      toSeq: 1n,
      tipHash,
      itemsRoot: idx.root,
      encodedRecords: tamperedRecords, // different records
      inclusionProofs: [],
    };
    const result = resolver.resolveChallenge(
      tamperedResponse,
      tipHash,
      idx.root,
    );
    expect(result.status).toBe('DISPUTED_FRAUD');
  });
});

// ── DisputeResolver — finalizeIfExpired ──────────────────────────────────────

describe('DisputeResolver — finalizeIfExpired (Req 7.5)', () => {
  it('returns PENDING when dispute window has not yet expired', () => {
    const resolver = new DisputeResolver('/tmp/test', {
      disputeWindowMs: 60_000, // 1 min
    });
    const settledAt = Date.now() - 30_000; // 30 s ago
    const status: SettlementStatus = resolver.finalizeIfExpired(settledAt);
    expect(status).toBe('PENDING');
  });

  it('returns FINAL when dispute window has expired', () => {
    const resolver = new DisputeResolver('/tmp/test', {
      disputeWindowMs: 60_000,
    });
    const settledAt = Date.now() - 120_000; // 2 min ago
    const status = resolver.finalizeIfExpired(settledAt);
    expect(status).toBe('FINAL');
  });

  it('returns FINAL at exact expiry boundary', () => {
    const resolver = new DisputeResolver('/tmp/test', {
      disputeWindowMs: 60_000,
    });
    const settledAt = 1_000_000;
    const nowMs = settledAt + 60_000; // exactly at boundary
    const status = resolver.finalizeIfExpired(settledAt, nowMs);
    expect(status).toBe('FINAL');
  });

  it('accepts deterministic nowMs to avoid flakiness', () => {
    const resolver = new DisputeResolver('/tmp/test', {
      disputeWindowMs: 3_600_000,
    });
    const settledAt = 0;
    expect(resolver.finalizeIfExpired(settledAt, 3_599_999)).toBe('PENDING');
    expect(resolver.finalizeIfExpired(settledAt, 3_600_000)).toBe('FINAL');
    expect(resolver.finalizeIfExpired(settledAt, 3_600_001)).toBe('FINAL');
  });
});
