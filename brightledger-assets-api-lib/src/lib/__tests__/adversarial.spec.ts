/**
 * @fileoverview Adversarial and edge-case tests for the AssetActionValidator.
 *
 * Covers replay attacks, underflow attempts, boundary conditions, and
 * sequences that should be rejected at every step.
 *
 * @see Requirements 2.1–2.9, 10.1–10.5
 */

import {
  AuthorizedSignerSet,
  QuorumType,
  SignerRole,
  SignerStatus,
  type IAuthorizedSigner,
} from '@brightchain/brightchain-lib';
import {
  ActionKind,
  DEFAULT_DISPUTE_WINDOW_MS,
  PROCESS_KEY_MAX_VALIDITY_MS,
  type AssetIdBuffer,
  type IBatchChallengeAction,
  type IBatchSettlementAction,
  type IBurnAction,
  type IMintAction,
  type IProcessKeyCertAction,
  type IProcessKeyRevokeAction,
  type IRetireAssetAction,
  type ITransferAction,
  type SupplyPolicy,
} from '@brightchain/brightledger-assets-lib';
import {
  emptyState,
  type IAssetProjectedState,
  type IProcessKeyRecord,
  type IShardSettlementState,
} from '../projectedState.js';
import { AssetStateReducer } from '../reducer.js';
import { AssetValidationErrorCode } from '../validationResult.js';
import { AssetActionValidator, type ILedgerContext } from '../validator.js';
import { shardIdFromString, shardIdHex } from './shardIdFixture';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePk(seed: number): Uint8Array {
  const k = new Uint8Array(33);
  k[0] = seed;
  return k;
}

function makePkHex(seed: number): string {
  return Buffer.from(makePk(seed)).toString('hex');
}

function fill32(b: number): Uint8Array {
  return new Uint8Array(32).fill(b);
}

function makeSigner(seed: number): IAuthorizedSigner {
  return {
    publicKey: makePk(seed),
    role: SignerRole.Admin,
    status: SignerStatus.Active,
    metadata: new Map(),
  };
}

function assetId(seed: number): string {
  return Buffer.from(fill32(seed)).toString('hex');
}

function assetIdBuf(seed: number): AssetIdBuffer {
  return fill32(seed) as unknown as AssetIdBuffer;
}

const NOW = 1_700_000_000_000;

function ctx(extra: Partial<ILedgerContext> = {}): ILedgerContext {
  return { now: NOW, signerPublicKeys: [makePk(1)], ...extra };
}

function makeSignerSet(seed = 1): AuthorizedSignerSet {
  return new AuthorizedSignerSet([makeSigner(seed)], {
    type: QuorumType.Threshold,
    threshold: 1,
  });
}

function stateWithBalance(
  balance: bigint,
  supplyPolicy: SupplyPolicy = 'mintable',
): IAssetProjectedState {
  const aid = assetId(1);
  return {
    ...emptyState(),
    assets: new Map([
      [
        aid,
        {
          symbol: 'TST',
          displayName: 'Test',
          decimals: 6,
          supplyPolicy,
          transferPolicy: 'open',
          freezable: false,
          burnable: true,
          brightTrustPolicy: { type: QuorumType.Threshold, threshold: 1 },
        },
      ],
    ]),
    issuedTotal: new Map([[aid, balance]]),
    burnedTotal: new Map([[aid, 0n]]),
    issuerSets: new Map([[aid, makeSignerSet()]]),
    balances: new Map([[aid, new Map([[makePkHex(2), balance]])]]),
    frozen: new Map([[aid, new Set<string>()]]),
    operatorFrozen: new Map([[aid, new Set<string>()]]),
    whitelist: new Map([[aid, new Set<string>()]]),
    nonces: new Map(),
    shardSettlement: new Map(),
    processKeys: new Map(),
    disputes: new Map(),
    lastSequence: 0n,
    retiredAssets: new Set(),
  };
}

// ── Duplicate nonce replay ────────────────────────────────────────────────────

describe('Adversarial: duplicate nonce replay', () => {
  it('replaying nonce 1 after it was used is always rejected', () => {
    let state = stateWithBalance(200n);
    const transfer: ITransferAction = {
      kind: ActionKind.Transfer,
      assetId: assetIdBuf(1) as ReturnType<typeof assetIdBuf> & {
        readonly __brand: true;
      },
      from: makePk(2),
      to: makePk(3),
      amount: 10n,
      nonce: 1n,
      expiry: null,
    };
    const v1 = AssetActionValidator.validate(
      transfer,
      state,
      ctx({ signerPublicKeys: [makePk(2)] }),
    );
    expect(v1.valid).toBe(true);
    state = AssetStateReducer.reduce(
      state,
      transfer,
      ctx({ signerPublicKeys: [makePk(2)] }),
    );

    // Replay the same nonce
    const v2 = AssetActionValidator.validate(
      transfer,
      state,
      ctx({ signerPublicKeys: [makePk(2)] }),
    );
    expect(v2.valid).toBe(false);
    expect((v2 as { code: AssetValidationErrorCode }).code).toBe(
      AssetValidationErrorCode.NonceMismatch,
    );
  });

  it('using nonce 0 (before nonce 1) is always rejected', () => {
    let state = stateWithBalance(200n);
    // First advance nonce to 1
    state = { ...state, nonces: new Map([[makePkHex(2), 1n]]) };

    const bad: ITransferAction = {
      kind: ActionKind.Transfer,
      assetId: assetIdBuf(1) as ReturnType<typeof assetIdBuf> & {
        readonly __brand: true;
      },
      from: makePk(2),
      to: makePk(3),
      amount: 10n,
      nonce: 0n,
      expiry: null,
    };
    const r = AssetActionValidator.validate(
      bad,
      state,
      ctx({ signerPublicKeys: [makePk(2)] }),
    );
    expect(r.valid).toBe(false);
  });

  it('skipping nonce (nonce=3 when expected 2) is rejected', () => {
    let state = stateWithBalance(200n);
    state = { ...state, nonces: new Map([[makePkHex(2), 1n]]) };

    const skip: ITransferAction = {
      kind: ActionKind.Transfer,
      assetId: assetIdBuf(1) as ReturnType<typeof assetIdBuf> & {
        readonly __brand: true;
      },
      from: makePk(2),
      to: makePk(3),
      amount: 10n,
      nonce: 3n,
      expiry: null,
    };
    const r = AssetActionValidator.validate(
      skip,
      state,
      ctx({ signerPublicKeys: [makePk(2)] }),
    );
    expect(r.valid).toBe(false);
    expect((r as { code: AssetValidationErrorCode }).code).toBe(
      AssetValidationErrorCode.NonceMismatch,
    );
  });
});

// ── Balance underflow ─────────────────────────────────────────────────────────

describe('Adversarial: balance underflow attempts', () => {
  it('transfer exceeding balance is rejected', () => {
    const state = stateWithBalance(50n);
    const t: ITransferAction = {
      kind: ActionKind.Transfer,
      assetId: assetIdBuf(1) as ReturnType<typeof assetIdBuf> & {
        readonly __brand: true;
      },
      from: makePk(2),
      to: makePk(3),
      amount: 51n,
      nonce: 1n,
      expiry: null,
    };
    const r = AssetActionValidator.validate(
      t,
      state,
      ctx({ signerPublicKeys: [makePk(2)] }),
    );
    expect(r.valid).toBe(false);
    expect((r as { code: AssetValidationErrorCode }).code).toBe(
      AssetValidationErrorCode.InsufficientBalance,
    );
  });

  it('burn exceeding balance is rejected', () => {
    const state = stateWithBalance(30n);
    const b: IBurnAction = {
      kind: ActionKind.Burn,
      assetId: assetIdBuf(1) as ReturnType<typeof assetIdBuf> & {
        readonly __brand: true;
      },
      from: makePk(2),
      amount: 31n,
      nonce: 1n,
    };
    const r = AssetActionValidator.validate(
      b,
      state,
      ctx({ signerPublicKeys: [makePk(2)] }),
    );
    expect(r.valid).toBe(false);
    expect((r as { code: AssetValidationErrorCode }).code).toBe(
      AssetValidationErrorCode.InsufficientBalance,
    );
  });

  it('transfer from zero-balance account is rejected', () => {
    const state = stateWithBalance(0n);
    const t: ITransferAction = {
      kind: ActionKind.Transfer,
      assetId: assetIdBuf(1) as ReturnType<typeof assetIdBuf> & {
        readonly __brand: true;
      },
      from: makePk(2),
      to: makePk(3),
      amount: 1n,
      nonce: 1n,
      expiry: null,
    };
    const r = AssetActionValidator.validate(
      t,
      state,
      ctx({ signerPublicKeys: [makePk(2)] }),
    );
    expect(r.valid).toBe(false);
  });
});

// ── Expired process key ───────────────────────────────────────────────────────

describe('Adversarial: expired process key', () => {
  it('BatchSettlement with expired process key is rejected', () => {
    const fp = Buffer.from(makePk(10)).toString('hex');
    const expiredKey: IProcessKeyRecord = {
      publicKey: makePk(10),
      notBefore: NOW - 10_000,
      notAfter: NOW - 1, // expired 1ms ago
      shardIds: [shardIdHex('shard-1')],
      revoked: false,
    };
    const shardState: IShardSettlementState = {
      nextExpectedSeq: 0n,
      lastSettledAt: 0,
      lastTipHash: fill32(0),
    };
    const state: IAssetProjectedState = {
      ...emptyState(),
      processKeys: new Map([[fp, expiredKey]]),
      shardSettlement: new Map([[shardIdHex('shard-1'), shardState]]),
    };

    const action: IBatchSettlementAction = {
      kind: ActionKind.BatchSettlement,
      shardId: shardIdFromString('shard-1'),
      fromSeq: 0n,
      toSeq: 5n,
      memberDeltas: [{ memberKey: makePk(2), delta: 100n }],
      tipHash: fill32(0xaa),
      itemsRoot: fill32(0xbb),
      processKeyFingerprint: makePk(10),
      signature: new Uint8Array(64),
    };

    const r = AssetActionValidator.validate(action, state, ctx());
    expect(r.valid).toBe(false);
    expect((r as { code: AssetValidationErrorCode }).code).toBe(
      AssetValidationErrorCode.ProcessKeyExpired,
    );
  });

  it('BatchSettlement with not-yet-valid process key is rejected', () => {
    const fp = Buffer.from(makePk(10)).toString('hex');
    const futureKey: IProcessKeyRecord = {
      publicKey: makePk(10),
      notBefore: NOW + 60_000, // starts in the future
      notAfter: NOW + 3_600_000,
      shardIds: [shardIdHex('shard-1')],
      revoked: false,
    };
    const shardState: IShardSettlementState = {
      nextExpectedSeq: 0n,
      lastSettledAt: 0,
      lastTipHash: fill32(0),
    };
    const state: IAssetProjectedState = {
      ...emptyState(),
      processKeys: new Map([[fp, futureKey]]),
      shardSettlement: new Map([[shardIdHex('shard-1'), shardState]]),
    };

    const action: IBatchSettlementAction = {
      kind: ActionKind.BatchSettlement,
      shardId: shardIdFromString('shard-1'),
      fromSeq: 0n,
      toSeq: 5n,
      memberDeltas: [{ memberKey: makePk(2), delta: 100n }],
      tipHash: fill32(0xaa),
      itemsRoot: fill32(0xbb),
      processKeyFingerprint: makePk(10),
      signature: new Uint8Array(64),
    };

    const r = AssetActionValidator.validate(action, state, ctx());
    expect(r.valid).toBe(false);
  });

  it('ProcessKeyCert window exactly at max is accepted', () => {
    const action: IProcessKeyCertAction = {
      kind: ActionKind.ProcessKeyCert,
      processPublicKey: makePk(10),
      notBefore: NOW,
      notAfter: NOW + PROCESS_KEY_MAX_VALIDITY_MS,
      shardIds: [shardIdHex('shard-1')],
    };
    const sysSet = makeSignerSet(1);
    const r = AssetActionValidator.validate(
      action,
      emptyState(),
      ctx({ systemSignerSet: sysSet }),
    );
    expect(r.valid).toBe(true);
  });

  it('ProcessKeyCert window one ms over max is rejected', () => {
    const action: IProcessKeyCertAction = {
      kind: ActionKind.ProcessKeyCert,
      processPublicKey: makePk(10),
      notBefore: NOW,
      notAfter: NOW + PROCESS_KEY_MAX_VALIDITY_MS + 1,
      shardIds: [shardIdHex('shard-1')],
    };
    const sysSet = makeSignerSet(1);
    const r = AssetActionValidator.validate(
      action,
      emptyState(),
      ctx({ systemSignerSet: sysSet }),
    );
    expect(r.valid).toBe(false);
    expect((r as { code: AssetValidationErrorCode }).code).toBe(
      AssetValidationErrorCode.ProcessKeyExpired,
    );
  });
});

// ── Duplicate dispute ─────────────────────────────────────────────────────────

describe('Adversarial: duplicate dispute', () => {
  it('BatchChallenge for already-disputed settlement is rejected', () => {
    const shardState: IShardSettlementState = {
      nextExpectedSeq: 10n,
      lastSettledAt: NOW - 1000,
      lastTipHash: fill32(0xaa),
    };

    const action: IBatchChallengeAction = {
      kind: ActionKind.BatchChallenge,
      shardId: shardIdFromString('shard-1'),
      settlementSeq: 9n,
      claimedTipHash: fill32(0xcc),
      challengerKey: makePk(7),
      signature: new Uint8Array(64),
    };

    const state: IAssetProjectedState = {
      ...emptyState(),
      shardSettlement: new Map([[shardIdHex('shard-1'), shardState]]),
      disputes: new Map([
        [
          `${shardIdHex('shard-1')}:9`,
          {
            shardId: shardIdHex('shard-1'),
            settlementSeq: 9n,
            challengeSeq: 5n,
            challengerKey: makePkHex(7),
            resolved: false,
          },
        ],
      ]),
    };

    const r = AssetActionValidator.validate(
      action,
      state,
      ctx({ disputeWindowMs: DEFAULT_DISPUTE_WINDOW_MS }),
    );
    expect(r.valid).toBe(false);
    expect((r as { code: AssetValidationErrorCode }).code).toBe(
      AssetValidationErrorCode.DisputeDuplicate,
    );
  });

  it('BatchChallenge outside dispute window is rejected', () => {
    const longAgo = NOW - DEFAULT_DISPUTE_WINDOW_MS - 1;
    const shardState: IShardSettlementState = {
      nextExpectedSeq: 10n,
      lastSettledAt: longAgo,
      lastTipHash: fill32(0xaa),
    };

    const action: IBatchChallengeAction = {
      kind: ActionKind.BatchChallenge,
      shardId: shardIdFromString('shard-1'),
      settlementSeq: 9n,
      claimedTipHash: fill32(0xcc),
      challengerKey: makePk(7),
      signature: new Uint8Array(64),
    };

    const state: IAssetProjectedState = {
      ...emptyState(),
      shardSettlement: new Map([[shardIdHex('shard-1'), shardState]]),
    };

    const r = AssetActionValidator.validate(
      action,
      state,
      ctx({ disputeWindowMs: DEFAULT_DISPUTE_WINDOW_MS }),
    );
    expect(r.valid).toBe(false);
    expect((r as { code: AssetValidationErrorCode }).code).toBe(
      AssetValidationErrorCode.DisputeWindowClosed,
    );
  });
});

// ── Retire already-retired ───────────────────────────────────────────────────

describe('Adversarial: double retire', () => {
  it('retiring an asset twice is rejected', () => {
    let state = {
      ...emptyState(),
      assets: new Map([
        [
          assetId(1),
          {
            symbol: 'X',
            displayName: 'X',
            decimals: 0,
            supplyPolicy: 'fixed' as const,
            transferPolicy: 'open' as const,
            freezable: false,
            burnable: false,
            brightTrustPolicy: { type: QuorumType.Threshold, threshold: 1 },
          },
        ],
      ]),
      issuedTotal: new Map([[assetId(1), 0n]]),
      burnedTotal: new Map([[assetId(1), 0n]]),
      issuerSets: new Map([[assetId(1), makeSignerSet()]]),
      balances: new Map([[assetId(1), new Map<string, bigint>()]]),
      frozen: new Map([[assetId(1), new Set<string>()]]),
      operatorFrozen: new Map([[assetId(1), new Set<string>()]]),
      whitelist: new Map([[assetId(1), new Set<string>()]]),
      nonces: new Map<string, bigint>(),
      shardSettlement: new Map(),
      processKeys: new Map(),
      disputes: new Map(),
      lastSequence: 0n,
      retiredAssets: new Set<string>(),
    } satisfies IAssetProjectedState;

    const retireAction: IRetireAssetAction = {
      kind: ActionKind.RetireAsset,
      assetId: assetIdBuf(1) as ReturnType<typeof assetIdBuf> & {
        readonly __brand: true;
      },
      reason: new Uint8Array(4),
    };

    const v1 = AssetActionValidator.validate(retireAction, state, ctx());
    expect(v1.valid).toBe(true);
    state = AssetStateReducer.reduce(
      state,
      retireAction,
      ctx(),
    ) as typeof state;

    const v2 = AssetActionValidator.validate(retireAction, state, ctx());
    expect(v2.valid).toBe(false);
    expect((v2 as { code: AssetValidationErrorCode }).code).toBe(
      AssetValidationErrorCode.AssetRetired,
    );
  });
});

// ── Mint on fixed supply ──────────────────────────────────────────────────────

describe('Adversarial: mint on fixed supply', () => {
  it('any mint attempt on fixed-supply asset is rejected', () => {
    const aid = assetId(1);
    const state: IAssetProjectedState = {
      ...emptyState(),
      assets: new Map([
        [
          aid,
          {
            symbol: 'FX',
            displayName: 'Fixed',
            decimals: 0,
            supplyPolicy: 'fixed',
            transferPolicy: 'open',
            freezable: false,
            burnable: false,
            brightTrustPolicy: { type: QuorumType.Threshold, threshold: 1 },
          },
        ],
      ]),
      issuedTotal: new Map([[aid, 1000n]]),
      burnedTotal: new Map([[aid, 0n]]),
      issuerSets: new Map([[aid, makeSignerSet()]]),
      balances: new Map([[aid, new Map([[makePkHex(2), 1000n]])]]),
      frozen: new Map([[aid, new Set<string>()]]),
      operatorFrozen: new Map([[aid, new Set<string>()]]),
      whitelist: new Map([[aid, new Set<string>()]]),
      nonces: new Map(),
      shardSettlement: new Map(),
      processKeys: new Map(),
      disputes: new Map(),
      lastSequence: 5n,
      retiredAssets: new Set(),
    };

    const mint: IMintAction = {
      kind: ActionKind.Mint,
      assetId: assetIdBuf(1) as ReturnType<typeof assetIdBuf> & {
        readonly __brand: true;
      },
      to: makePk(2),
      amount: 1n,
      nonce: 1n,
    };
    const r = AssetActionValidator.validate(mint, state, ctx());
    expect(r.valid).toBe(false);
    expect((r as { code: AssetValidationErrorCode }).code).toBe(
      AssetValidationErrorCode.SupplyPolicyViolation,
    );
  });
});

// ── Capped supply boundary ────────────────────────────────────────────────────

describe('Adversarial: capped supply boundary', () => {
  it('mint at exactly the cap is accepted', () => {
    const cap = 1000n;
    const aid = assetId(1);
    const state: IAssetProjectedState = {
      ...emptyState(),
      assets: new Map([
        [
          aid,
          {
            symbol: 'CAP',
            displayName: 'Capped',
            decimals: 0,
            supplyPolicy: { kind: 'capped', cap },
            transferPolicy: 'open',
            freezable: false,
            burnable: false,
            brightTrustPolicy: { type: QuorumType.Threshold, threshold: 1 },
          },
        ],
      ]),
      issuedTotal: new Map([[aid, 999n]]),
      burnedTotal: new Map([[aid, 0n]]),
      issuerSets: new Map([[aid, makeSignerSet()]]),
      balances: new Map([[aid, new Map([[makePkHex(2), 999n]])]]),
      frozen: new Map([[aid, new Set<string>()]]),
      operatorFrozen: new Map([[aid, new Set<string>()]]),
      whitelist: new Map([[aid, new Set<string>()]]),
      nonces: new Map(),
      shardSettlement: new Map(),
      processKeys: new Map(),
      disputes: new Map(),
      lastSequence: 0n,
      retiredAssets: new Set(),
    };

    const mint1n: IMintAction = {
      kind: ActionKind.Mint,
      assetId: assetIdBuf(1) as ReturnType<typeof assetIdBuf> & {
        readonly __brand: true;
      },
      to: makePk(2),
      amount: 1n,
      nonce: 1n,
    };
    const r1 = AssetActionValidator.validate(mint1n, state, ctx());
    expect(r1.valid).toBe(true);
  });

  it('mint one over the cap is rejected', () => {
    const cap = 1000n;
    const aid = assetId(1);
    const state: IAssetProjectedState = {
      ...emptyState(),
      assets: new Map([
        [
          aid,
          {
            symbol: 'CAP',
            displayName: 'Capped',
            decimals: 0,
            supplyPolicy: { kind: 'capped', cap },
            transferPolicy: 'open',
            freezable: false,
            burnable: false,
            brightTrustPolicy: { type: QuorumType.Threshold, threshold: 1 },
          },
        ],
      ]),
      issuedTotal: new Map([[aid, 1000n]]),
      burnedTotal: new Map([[aid, 0n]]),
      issuerSets: new Map([[aid, makeSignerSet()]]),
      balances: new Map([[aid, new Map([[makePkHex(2), 1000n]])]]),
      frozen: new Map([[aid, new Set<string>()]]),
      operatorFrozen: new Map([[aid, new Set<string>()]]),
      whitelist: new Map([[aid, new Set<string>()]]),
      nonces: new Map(),
      shardSettlement: new Map(),
      processKeys: new Map(),
      disputes: new Map(),
      lastSequence: 0n,
      retiredAssets: new Set(),
    };

    const mintOver: IMintAction = {
      kind: ActionKind.Mint,
      assetId: assetIdBuf(1) as ReturnType<typeof assetIdBuf> & {
        readonly __brand: true;
      },
      to: makePk(2),
      amount: 1n,
      nonce: 1n,
    };
    const r = AssetActionValidator.validate(mintOver, state, ctx());
    expect(r.valid).toBe(false);
    expect((r as { code: AssetValidationErrorCode }).code).toBe(
      AssetValidationErrorCode.SupplyPolicyViolation,
    );
  });
});

// ── BatchSettlement seq strict monotonicity ────────────────────────────────────

describe('Adversarial: BatchSettlement seq strict monotonicity', () => {
  function shardSetup(): IAssetProjectedState {
    const fp = Buffer.from(makePk(10)).toString('hex');
    const processKey: IProcessKeyRecord = {
      publicKey: makePk(10),
      notBefore: NOW - 1000,
      notAfter: NOW + 3_600_000,
      shardIds: [shardIdHex('shard-1')],
      revoked: false,
    };
    return {
      ...emptyState(),
      processKeys: new Map([[fp, processKey]]),
      shardSettlement: new Map([
        [
          shardIdHex('shard-1'),
          {
            nextExpectedSeq: 5n,
            lastSettledAt: NOW - 500,
            lastTipHash: fill32(0),
          },
        ],
      ]),
    };
  }

  it('fromSeq matching nextExpectedSeq is accepted', () => {
    const action: IBatchSettlementAction = {
      kind: ActionKind.BatchSettlement,
      shardId: shardIdFromString('shard-1'),
      fromSeq: 5n,
      toSeq: 9n,
      memberDeltas: [{ memberKey: makePk(2), delta: 10n }],
      tipHash: fill32(0xaa),
      itemsRoot: fill32(0xbb),
      processKeyFingerprint: makePk(10),
      signature: new Uint8Array(64),
    };
    const r = AssetActionValidator.validate(action, shardSetup(), ctx());
    expect(r.valid).toBe(true);
  });

  it('fromSeq below nextExpectedSeq is rejected as overlap', () => {
    const action: IBatchSettlementAction = {
      kind: ActionKind.BatchSettlement,
      shardId: shardIdFromString('shard-1'),
      fromSeq: 4n,
      toSeq: 9n,
      memberDeltas: [{ memberKey: makePk(2), delta: 10n }],
      tipHash: fill32(0xaa),
      itemsRoot: fill32(0xbb),
      processKeyFingerprint: makePk(10),
      signature: new Uint8Array(64),
    };
    const r = AssetActionValidator.validate(action, shardSetup(), ctx());
    expect(r.valid).toBe(false);
    expect((r as { code: AssetValidationErrorCode }).code).toBe(
      AssetValidationErrorCode.ShardSeqOverlap,
    );
  });

  it('fromSeq above nextExpectedSeq is rejected as gap', () => {
    const action: IBatchSettlementAction = {
      kind: ActionKind.BatchSettlement,
      shardId: shardIdFromString('shard-1'),
      fromSeq: 6n,
      toSeq: 9n,
      memberDeltas: [{ memberKey: makePk(2), delta: 10n }],
      tipHash: fill32(0xaa),
      itemsRoot: fill32(0xbb),
      processKeyFingerprint: makePk(10),
      signature: new Uint8Array(64),
    };
    const r = AssetActionValidator.validate(action, shardSetup(), ctx());
    expect(r.valid).toBe(false);
    expect((r as { code: AssetValidationErrorCode }).code).toBe(
      AssetValidationErrorCode.ShardSeqGap,
    );
  });
});

// ── Action on retired asset ────────────────────────────────────────────────────

describe('Adversarial: action on retired asset', () => {
  function retiredState(): IAssetProjectedState {
    const aid = assetId(1);
    return {
      ...emptyState(),
      assets: new Map([
        [
          aid,
          {
            symbol: 'R',
            displayName: 'Retired',
            decimals: 0,
            supplyPolicy: 'mintable',
            transferPolicy: 'open',
            freezable: false,
            burnable: false,
            brightTrustPolicy: { type: QuorumType.Threshold, threshold: 1 },
          },
        ],
      ]),
      issuedTotal: new Map([[aid, 0n]]),
      burnedTotal: new Map([[aid, 0n]]),
      issuerSets: new Map([[aid, makeSignerSet()]]),
      balances: new Map([[aid, new Map<string, bigint>()]]),
      frozen: new Map([[aid, new Set<string>()]]),
      operatorFrozen: new Map([[aid, new Set<string>()]]),
      whitelist: new Map([[aid, new Set<string>()]]),
      nonces: new Map(),
      shardSettlement: new Map(),
      processKeys: new Map(),
      disputes: new Map(),
      lastSequence: 1n,
      retiredAssets: new Set([aid]),
    };
  }

  it('mint on retired asset is rejected', () => {
    const mint: IMintAction = {
      kind: ActionKind.Mint,
      assetId: assetIdBuf(1) as ReturnType<typeof assetIdBuf> & {
        readonly __brand: true;
      },
      to: makePk(2),
      amount: 100n,
      nonce: 1n,
    };
    const r = AssetActionValidator.validate(mint, retiredState(), ctx());
    expect(r.valid).toBe(false);
    expect((r as { code: AssetValidationErrorCode }).code).toBe(
      AssetValidationErrorCode.AssetRetired,
    );
  });
});

// ── Revoked key used mid-batch (Phase 7.11) ───────────────────────────────────

describe('Adversarial: revoked process key rejected for new settlements', () => {
  function shardWithRevokedKey(): IAssetProjectedState {
    const fp = Buffer.from(makePk(10)).toString('hex');
    const processKey: IProcessKeyRecord = {
      publicKey: makePk(10),
      notBefore: NOW - 1000,
      notAfter: NOW + 3_600_000,
      shardIds: [shardIdHex('shard-revoked')],
      revoked: true,
    };
    return {
      ...emptyState(),
      processKeys: new Map([[fp, processKey]]),
      shardSettlement: new Map([
        [
          shardIdHex('shard-revoked'),
          {
            nextExpectedSeq: 0n,
            lastSettledAt: 0,
            lastTipHash: fill32(0),
          },
        ],
      ]),
    };
  }

  it('BatchSettlement signed by revoked key is rejected', () => {
    const action: IBatchSettlementAction = {
      kind: ActionKind.BatchSettlement,
      shardId: shardIdFromString('shard-revoked'),
      fromSeq: 0n,
      toSeq: 4n,
      memberDeltas: [{ memberKey: makePk(2), delta: 100n }],
      tipHash: fill32(0xaa),
      itemsRoot: fill32(0xbb),
      processKeyFingerprint: makePk(10),
      signature: new Uint8Array(64),
    };
    const r = AssetActionValidator.validate(
      action,
      shardWithRevokedKey(),
      ctx(),
    );
    expect(r.valid).toBe(false);
    expect((r as { code: AssetValidationErrorCode }).code).toBe(
      AssetValidationErrorCode.ProcessKeyRevoked,
    );
  });

  it('ProcessKeyRevoke with compromise reason marks key revoked', () => {
    const fp = Buffer.from(makePk(20)).toString('hex');
    const processKey: IProcessKeyRecord = {
      publicKey: makePk(20),
      notBefore: NOW - 1000,
      notAfter: NOW + 3_600_000,
      shardIds: [shardIdHex('shard-comp')],
      revoked: false,
    };
    let state: IAssetProjectedState = {
      ...emptyState(),
      processKeys: new Map([[fp, processKey]]),
      shardSettlement: new Map([
        [
          shardIdHex('shard-comp'),
          {
            nextExpectedSeq: 5n,
            lastSettledAt: NOW - 500,
            lastTipHash: fill32(0),
          },
        ],
      ]),
    };

    const revokeAction: IProcessKeyRevokeAction = {
      kind: ActionKind.ProcessKeyRevoke,
      processKeyFingerprint: makePk(20),
      reason: 'compromise',
      effectiveAtSeq: 3n,
    };

    const sysSet = makeSignerSet(1);
    const vr = AssetActionValidator.validate(
      revokeAction,
      state,
      ctx({ systemSignerSet: sysSet }),
    );
    expect(vr.valid).toBe(true);
    state = AssetStateReducer.reduce(
      state,
      revokeAction,
      ctx({ systemSignerSet: sysSet }),
    );

    const updatedKey = state.processKeys.get(fp);
    expect(updatedKey?.revoked).toBe(true);
    expect(updatedKey?.effectiveRevokedAtSeq).toBe(3n);
  });
});

// ── Cross-shard sequence isolation (Phase 7.11) ───────────────────────────────

describe('Adversarial: cross-shard sequence collision is impossible', () => {
  it('sequential progress in shard-A does not affect shard-B cursor', () => {
    const fp = Buffer.from(makePk(30)).toString('hex');
    const processKey: IProcessKeyRecord = {
      publicKey: makePk(30),
      notBefore: NOW - 1000,
      notAfter: NOW + 3_600_000,
      shardIds: [shardIdHex('shard-A'), shardIdHex('shard-B')],
      revoked: false,
    };
    let state: IAssetProjectedState = {
      ...emptyState(),
      processKeys: new Map([[fp, processKey]]),
      shardSettlement: new Map([
        [
          shardIdHex('shard-A'),
          { nextExpectedSeq: 0n, lastSettledAt: 0, lastTipHash: fill32(0) },
        ],
        [
          shardIdHex('shard-B'),
          { nextExpectedSeq: 0n, lastSettledAt: 0, lastTipHash: fill32(0) },
        ],
      ]),
    };

    // Submit 3 settlements to shard-A
    for (let i = 0; i < 3; i++) {
      const action: IBatchSettlementAction = {
        kind: ActionKind.BatchSettlement,
        shardId: shardIdFromString('shard-A'),
        fromSeq: BigInt(i),
        toSeq: BigInt(i),
        memberDeltas: [{ memberKey: makePk(2), delta: 10n }],
        tipHash: fill32(i),
        itemsRoot: fill32(i + 1),
        processKeyFingerprint: makePk(30),
        signature: new Uint8Array(64),
      };
      const v = AssetActionValidator.validate(action, state, ctx());
      expect(v.valid).toBe(true);
      state = AssetStateReducer.reduce(state, action, ctx());
    }

    // shard-A cursor should be at 3
    expect(
      state.shardSettlement.get(shardIdHex('shard-A'))?.nextExpectedSeq,
    ).toBe(3n);
    // shard-B cursor must remain at 0
    expect(
      state.shardSettlement.get(shardIdHex('shard-B'))?.nextExpectedSeq,
    ).toBe(0n);
  });

  it('shard-B settlement with seq that matches shard-A seq is accepted (no collision)', () => {
    const fp = Buffer.from(makePk(31)).toString('hex');
    const processKey: IProcessKeyRecord = {
      publicKey: makePk(31),
      notBefore: NOW - 1000,
      notAfter: NOW + 3_600_000,
      shardIds: [shardIdHex('shard-A2'), shardIdHex('shard-B2')],
      revoked: false,
    };
    // Shard-A2 already at seq 5, shard-B2 at seq 0
    const state: IAssetProjectedState = {
      ...emptyState(),
      processKeys: new Map([[fp, processKey]]),
      shardSettlement: new Map([
        [
          shardIdHex('shard-A2'),
          {
            nextExpectedSeq: 5n,
            lastSettledAt: NOW - 100,
            lastTipHash: fill32(0),
          },
        ],
        [
          shardIdHex('shard-B2'),
          { nextExpectedSeq: 0n, lastSettledAt: 0, lastTipHash: fill32(0) },
        ],
      ]),
    };

    // shard-B2 submitting fromSeq=0 should be fine (no conflict with shard-A2 seq=5)
    const action: IBatchSettlementAction = {
      kind: ActionKind.BatchSettlement,
      shardId: shardIdFromString('shard-B2'),
      fromSeq: 0n,
      toSeq: 4n,
      memberDeltas: [{ memberKey: makePk(2), delta: 50n }],
      tipHash: fill32(0xaa),
      itemsRoot: fill32(0xbb),
      processKeyFingerprint: makePk(31),
      signature: new Uint8Array(64),
    };
    const r = AssetActionValidator.validate(action, state, ctx());
    expect(r.valid).toBe(true);
  });
});
