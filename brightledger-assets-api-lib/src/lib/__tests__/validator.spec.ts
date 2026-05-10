/**
 * @fileoverview Unit tests for AssetActionValidator.
 *
 * Covers the happy-path and primary failure paths for every action kind.
 *
 * @see Requirements 2.1–2.9, 10.1–10.5, 11.1–11.4, 12.1–12.5
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
  type IAttestationAction,
  type IBatchChallengeAction,
  type IBatchSettlementAction,
  type IBatchSettlementResolutionAction,
  type IBurnAction,
  type IFreezeAccountAction,
  type IIssueAssetAction,
  type IMintAction,
  type IMultiTransferAction,
  type IOperatorFreezeAction,
  type IProcessKeyCertAction,
  type IProcessKeyRevokeAction,
  type IRetireAssetAction,
  type IRotateIssuerSetAction,
  type ITransferAction,
  type IUnfreezeAccountAction,
  type IWhitelistAddAction,
  type IWhitelistRemoveAction,
} from '@brightchain/brightledger-assets-lib';
import {
  emptyState,
  type IAssetProjectedState,
  type IProcessKeyRecord,
  type IShardSettlementState,
} from '../projectedState.js';
import { AssetStateReducer } from '../reducer.js';
import {
  AssetValidationErrorCode,
  type IValidationError,
  type ValidationResult,
} from '../validationResult.js';
import { AssetActionValidator, type ILedgerContext } from '../validator.js';
import { shardIdFromString, shardIdHex } from './shardIdFixture';

// ── Test helpers ─────────────────────────────────────────────────────────────

function makePk(seed: number): Uint8Array {
  const k = new Uint8Array(33);
  k[0] = seed;
  return k;
}

function makePkHex(seed: number): string {
  return Buffer.from(makePk(seed)).toString('hex');
}

function makeSigner(
  seed: number,
  role: SignerRole = SignerRole.Admin,
  status: SignerStatus = SignerStatus.Active,
): IAuthorizedSigner {
  return { publicKey: makePk(seed), role, status, metadata: new Map() };
}

function makeSignerSet(seed = 1): AuthorizedSignerSet {
  return new AuthorizedSignerSet([makeSigner(seed)], {
    type: QuorumType.Threshold,
    threshold: 1,
  });
}

/** A 32-byte buffer filled with the given byte. */
function fill32(b: number): Uint8Array {
  return new Uint8Array(32).fill(b);
}

const NOW = 1_700_000_000_000; // fixed wall-clock for tests

/** Minimal valid context with issuer at seed 1 satisfying threshold=1. */
function ctx(overrides: Partial<ILedgerContext> = {}): ILedgerContext {
  return {
    now: NOW,
    signerPublicKeys: [makePk(1)],
    ...overrides,
  };
}

/** Derive a deterministic hex assetId from a seed byte. */
function assetId(seed: number): string {
  return Buffer.from(fill32(seed)).toString('hex');
}

/** Build a state that already has asset `assetId(seed)` registered. */
function stateWithAsset(
  seed: number,
  overrides: {
    supplyPolicy?: 'fixed' | 'mintable' | { kind: 'capped'; cap: bigint };
    transferPolicy?: 'open' | 'whitelist';
    freezable?: boolean;
    burnable?: boolean;
    cap?: bigint;
    balance?: bigint;
    accountSeed?: number;
  } = {},
): IAssetProjectedState {
  const aid = assetId(seed);
  const {
    supplyPolicy = 'mintable',
    transferPolicy = 'open',
    freezable = true,
    burnable = true,
    balance,
    accountSeed = 2,
  } = overrides;

  const issuerSet = makeSignerSet(1);
  let state: IAssetProjectedState = {
    ...emptyState(),
    assets: new Map([
      [
        aid,
        {
          symbol: 'TST',
          displayName: 'Test',
          decimals: 6,
          supplyPolicy,
          transferPolicy,
          freezable,
          burnable,
          brightTrustPolicy: { type: QuorumType.Threshold, threshold: 1 },
        },
      ],
    ]),
    issuedTotal: new Map([[aid, 0n]]),
    burnedTotal: new Map([[aid, 0n]]),
    issuerSets: new Map([[aid, issuerSet]]),
    balances: new Map([[aid, new Map<string, bigint>()]]),
    frozen: new Map([[aid, new Set<string>()]]),
    operatorFrozen: new Map([[aid, new Set<string>()]]),
    whitelist: new Map([[aid, new Set<string>()]]),
    nonces: new Map(),
    shardSettlement: new Map(),
    processKeys: new Map(),
    disputes: new Map(),
    lastSequence: 1n,
    retiredAssets: new Set(),
  };

  if (balance !== undefined && balance > 0n) {
    const accountHex = makePkHex(accountSeed);
    state = {
      ...state,
      balances: new Map([[aid, new Map([[accountHex, balance]])]]),
      issuedTotal: new Map([[aid, balance]]),
    };
  }
  return state;
}

function assetIdBuf(seed: number): AssetIdBuffer {
  return fill32(seed) as unknown as AssetIdBuffer;
}

function assertOk(r: ValidationResult): void {
  if (!r.valid)
    throw new Error(
      `Expected ok but got error: ${(r as IValidationError).message}`,
    );
}

function assertFail(r: ValidationResult, code: AssetValidationErrorCode): void {
  if (r.valid) throw new Error(`Expected failure with code ${code} but got ok`);
  expect((r as IValidationError).code).toBe(code);
}

// ── IssueAsset ──────────────────────────────────────────────────────────────

describe('AssetActionValidator — IssueAsset', () => {
  const action: IIssueAssetAction = {
    kind: ActionKind.IssueAsset,
    symbol: 'J',
    displayName: 'Joule',
    decimals: 6,
    supplyPolicy: 'mintable',
    transferPolicy: 'open',
    freezable: true,
    burnable: true,
    initialIssuerSet: [makeSigner(1)],
    initialBrightTrustPolicy: { type: QuorumType.Threshold, threshold: 1 },
  };

  it('accepts a valid new asset', () => {
    const r = AssetActionValidator.validate(
      action,
      emptyState(),
      ctx({ derivedAssetId: assetId(0) }),
    );
    assertOk(r);
  });

  it('rejects duplicate assetId', () => {
    const state = stateWithAsset(0);
    const r = AssetActionValidator.validate(
      action,
      state,
      ctx({ derivedAssetId: assetId(0) }),
    );
    assertFail(r, AssetValidationErrorCode.AssetAlreadyRegistered);
  });

  it('rejects decimals > 18', () => {
    const bad: IIssueAssetAction = { ...action, decimals: 19 };
    const r = AssetActionValidator.validate(
      bad,
      emptyState(),
      ctx({ derivedAssetId: assetId(0) }),
    );
    assertFail(r, AssetValidationErrorCode.InvalidDecimals);
  });

  it('rejects negative decimals', () => {
    const bad: IIssueAssetAction = { ...action, decimals: -1 };
    const r = AssetActionValidator.validate(
      bad,
      emptyState(),
      ctx({ derivedAssetId: assetId(0) }),
    );
    assertFail(r, AssetValidationErrorCode.InvalidDecimals);
  });
});

// ── Mint ────────────────────────────────────────────────────────────────────

describe('AssetActionValidator — Mint', () => {
  const mintAction: IMintAction = {
    kind: ActionKind.Mint,
    assetId: assetIdBuf(1) as ReturnType<typeof assetIdBuf> & {
      readonly __brand: true;
    },
    to: makePk(2),
    amount: 1000n,
    nonce: 1n,
  };

  it('accepts mint on mintable asset', () => {
    const state = stateWithAsset(1, { supplyPolicy: 'mintable' });
    const r = AssetActionValidator.validate(mintAction, state, ctx());
    assertOk(r);
  });

  it('rejects mint on fixed supply', () => {
    const state = stateWithAsset(1, { supplyPolicy: 'fixed' });
    const r = AssetActionValidator.validate(mintAction, state, ctx());
    assertFail(r, AssetValidationErrorCode.SupplyPolicyViolation);
  });

  it('rejects mint on capped asset when cap reached', () => {
    const cap = 500n;
    let state = stateWithAsset(1, {
      supplyPolicy: { kind: 'capped', cap },
      balance: cap,
      accountSeed: 2,
    });
    // Set issuedTotal to cap
    state = { ...state, issuedTotal: new Map([[assetId(1), cap]]) };
    const r = AssetActionValidator.validate(mintAction, state, ctx());
    assertFail(r, AssetValidationErrorCode.SupplyPolicyViolation);
  });

  it('rejects mint when destination account is frozen', () => {
    let state = stateWithAsset(1, { supplyPolicy: 'mintable' });
    const toHex = makePkHex(2);
    state = {
      ...state,
      frozen: new Map([[assetId(1), new Set([toHex])]]),
    };
    const r = AssetActionValidator.validate(mintAction, state, ctx());
    assertFail(r, AssetValidationErrorCode.AccountFrozen);
  });

  it('rejects mint when quorum not satisfied', () => {
    const twoOfTwo = new AuthorizedSignerSet([makeSigner(1), makeSigner(3)], {
      type: QuorumType.Threshold,
      threshold: 2,
    });
    let state = stateWithAsset(1, { supplyPolicy: 'mintable' });
    state = { ...state, issuerSets: new Map([[assetId(1), twoOfTwo]]) };
    const r = AssetActionValidator.validate(
      mintAction,
      state,
      ctx({ signerPublicKeys: [makePk(1)] }),
    );
    assertFail(r, AssetValidationErrorCode.QuorumNotSatisfied);
  });
});

// ── Burn ────────────────────────────────────────────────────────────────────

describe('AssetActionValidator — Burn', () => {
  const burnAction: IBurnAction = {
    kind: ActionKind.Burn,
    assetId: assetIdBuf(1) as ReturnType<typeof assetIdBuf> & {
      readonly __brand: true;
    },
    from: makePk(2),
    amount: 100n,
    nonce: 1n,
  };

  it('accepts burn when balance sufficient', () => {
    const state = stateWithAsset(1, {
      burnable: true,
      balance: 200n,
      accountSeed: 2,
    });
    const r = AssetActionValidator.validate(
      burnAction,
      state,
      ctx({ signerPublicKeys: [makePk(2)] }),
    );
    assertOk(r);
  });

  it('rejects burn on non-burnable asset', () => {
    const state = stateWithAsset(1, {
      burnable: false,
      balance: 200n,
      accountSeed: 2,
    });
    const r = AssetActionValidator.validate(
      burnAction,
      state,
      ctx({ signerPublicKeys: [makePk(2)] }),
    );
    assertFail(r, AssetValidationErrorCode.BurnNotAllowed);
  });

  it('rejects burn when insufficient balance', () => {
    const state = stateWithAsset(1, {
      burnable: true,
      balance: 50n,
      accountSeed: 2,
    });
    const r = AssetActionValidator.validate(
      burnAction,
      state,
      ctx({ signerPublicKeys: [makePk(2)] }),
    );
    assertFail(r, AssetValidationErrorCode.InsufficientBalance);
  });
});

// ── Transfer ────────────────────────────────────────────────────────────────

describe('AssetActionValidator — Transfer', () => {
  const transferAction: ITransferAction = {
    kind: ActionKind.Transfer,
    assetId: assetIdBuf(1) as ReturnType<typeof assetIdBuf> & {
      readonly __brand: true;
    },
    from: makePk(2),
    to: makePk(3),
    amount: 50n,
    nonce: 1n,
    expiry: null,
  };

  it('accepts valid transfer', () => {
    const state = stateWithAsset(1, { balance: 100n, accountSeed: 2 });
    const r = AssetActionValidator.validate(
      transferAction,
      state,
      ctx({ signerPublicKeys: [makePk(2)] }),
    );
    assertOk(r);
  });

  it('rejects wrong signer', () => {
    const state = stateWithAsset(1, { balance: 100n, accountSeed: 2 });
    const r = AssetActionValidator.validate(
      transferAction,
      state,
      ctx({ signerPublicKeys: [makePk(99)] }),
    );
    assertFail(r, AssetValidationErrorCode.SignerMismatch);
  });

  it('rejects zero amount', () => {
    const bad: ITransferAction = { ...transferAction, amount: 0n };
    const state = stateWithAsset(1, { balance: 100n, accountSeed: 2 });
    const r = AssetActionValidator.validate(
      bad,
      state,
      ctx({ signerPublicKeys: [makePk(2)] }),
    );
    assertFail(r, AssetValidationErrorCode.InsufficientBalance);
  });

  it('rejects wrong nonce', () => {
    const bad: ITransferAction = { ...transferAction, nonce: 5n };
    const state = stateWithAsset(1, { balance: 100n, accountSeed: 2 });
    const r = AssetActionValidator.validate(
      bad,
      state,
      ctx({ signerPublicKeys: [makePk(2)] }),
    );
    assertFail(r, AssetValidationErrorCode.NonceMismatch);
  });

  it('rejects expired transfer', () => {
    const expired: ITransferAction = { ...transferAction, expiry: NOW - 1 };
    const state = stateWithAsset(1, { balance: 100n, accountSeed: 2 });
    const r = AssetActionValidator.validate(
      expired,
      state,
      ctx({ signerPublicKeys: [makePk(2)] }),
    );
    assertFail(r, AssetValidationErrorCode.Expired);
  });

  it('rejects frozen sender', () => {
    let state = stateWithAsset(1, { balance: 100n, accountSeed: 2 });
    const fromHex = makePkHex(2);
    state = { ...state, frozen: new Map([[assetId(1), new Set([fromHex])]]) };
    const r = AssetActionValidator.validate(
      transferAction,
      state,
      ctx({ signerPublicKeys: [makePk(2)] }),
    );
    assertFail(r, AssetValidationErrorCode.AccountFrozen);
  });

  it('rejects insufficient balance', () => {
    const state = stateWithAsset(1, { balance: 10n, accountSeed: 2 });
    const r = AssetActionValidator.validate(
      transferAction,
      state,
      ctx({ signerPublicKeys: [makePk(2)] }),
    );
    assertFail(r, AssetValidationErrorCode.InsufficientBalance);
  });

  it('rejects whitelist violation', () => {
    const state = stateWithAsset(1, {
      balance: 100n,
      accountSeed: 2,
      transferPolicy: 'whitelist',
    });
    const r = AssetActionValidator.validate(
      transferAction,
      state,
      ctx({ signerPublicKeys: [makePk(2)] }),
    );
    assertFail(r, AssetValidationErrorCode.WhitelistViolation);
  });
});

// ── MultiTransfer ───────────────────────────────────────────────────────────

describe('AssetActionValidator — MultiTransfer', () => {
  it('accepts valid multi-transfer', () => {
    const state = stateWithAsset(1, { balance: 200n, accountSeed: 2 });
    const action: IMultiTransferAction = {
      kind: ActionKind.MultiTransfer,
      legs: [
        {
          kind: ActionKind.Transfer,
          assetId: assetIdBuf(1) as ReturnType<typeof assetIdBuf> & {
            readonly __brand: true;
          },
          from: makePk(2),
          to: makePk(3),
          amount: 50n,
          nonce: 1n,
          expiry: null,
        },
        {
          kind: ActionKind.Transfer,
          assetId: assetIdBuf(1) as ReturnType<typeof assetIdBuf> & {
            readonly __brand: true;
          },
          from: makePk(2),
          to: makePk(4),
          amount: 50n,
          nonce: 2n,
          expiry: null,
        },
      ],
      signature: new Uint8Array(64),
    };
    const r = AssetActionValidator.validate(
      action,
      state,
      ctx({ signerPublicKeys: [makePk(2)] }),
    );
    assertOk(r);
  });
});

// ── FreezeAccount ───────────────────────────────────────────────────────────

describe('AssetActionValidator — FreezeAccount', () => {
  const freezeAction: IFreezeAccountAction = {
    kind: ActionKind.FreezeAccount,
    assetId: assetIdBuf(1) as ReturnType<typeof assetIdBuf> & {
      readonly __brand: true;
    },
    account: makePk(2),
    reason: new Uint8Array(4),
  };

  it('accepts freeze on freezable asset', () => {
    const state = stateWithAsset(1, { freezable: true });
    const r = AssetActionValidator.validate(freezeAction, state, ctx());
    assertOk(r);
  });

  it('rejects freeze on non-freezable asset', () => {
    const state = stateWithAsset(1, { freezable: false });
    const r = AssetActionValidator.validate(freezeAction, state, ctx());
    assertFail(r, AssetValidationErrorCode.SupplyPolicyViolation);
  });
});

// ── UnfreezeAccount ─────────────────────────────────────────────────────────

describe('AssetActionValidator — UnfreezeAccount', () => {
  it('accepts unfreeze on known asset', () => {
    const state = stateWithAsset(1, { freezable: true });
    const action: IUnfreezeAccountAction = {
      kind: ActionKind.UnfreezeAccount,
      assetId: assetIdBuf(1) as ReturnType<typeof assetIdBuf> & {
        readonly __brand: true;
      },
      account: makePk(2),
      reason: new Uint8Array(4),
    };
    const r = AssetActionValidator.validate(action, state, ctx());
    assertOk(r);
  });

  it('rejects unfreeze on unknown asset', () => {
    const action: IUnfreezeAccountAction = {
      kind: ActionKind.UnfreezeAccount,
      assetId: assetIdBuf(99) as ReturnType<typeof assetIdBuf> & {
        readonly __brand: true;
      },
      account: makePk(2),
      reason: new Uint8Array(4),
    };
    const r = AssetActionValidator.validate(action, emptyState(), ctx());
    assertFail(r, AssetValidationErrorCode.AssetNotFound);
  });
});

// ── WhitelistAdd ─────────────────────────────────────────────────────────────

describe('AssetActionValidator — WhitelistAdd', () => {
  it('accepts whitelist add on known asset', () => {
    const state = stateWithAsset(1);
    const action: IWhitelistAddAction = {
      kind: ActionKind.WhitelistAdd,
      assetId: assetIdBuf(1) as ReturnType<typeof assetIdBuf> & {
        readonly __brand: true;
      },
      account: makePk(5),
    };
    const r = AssetActionValidator.validate(action, state, ctx());
    assertOk(r);
  });
});

// ── WhitelistRemove ──────────────────────────────────────────────────────────

describe('AssetActionValidator — WhitelistRemove', () => {
  it('accepts whitelist remove on known asset', () => {
    const state = stateWithAsset(1);
    const action: IWhitelistRemoveAction = {
      kind: ActionKind.WhitelistRemove,
      assetId: assetIdBuf(1) as ReturnType<typeof assetIdBuf> & {
        readonly __brand: true;
      },
      account: makePk(5),
    };
    const r = AssetActionValidator.validate(action, state, ctx());
    assertOk(r);
  });
});

// ── RotateIssuerSet ──────────────────────────────────────────────────────────

describe('AssetActionValidator — RotateIssuerSet', () => {
  it('accepts rotation on known asset with quorum', () => {
    const state = stateWithAsset(1);
    const action: IRotateIssuerSetAction = {
      kind: ActionKind.RotateIssuerSet,
      assetId: assetIdBuf(1) as ReturnType<typeof assetIdBuf> & {
        readonly __brand: true;
      },
      newIssuerSet: [makeSigner(9)],
      newBrightTrustPolicy: { type: QuorumType.Threshold, threshold: 1 },
      effectiveAtSeq: 0n,
    };
    const r = AssetActionValidator.validate(action, state, ctx());
    assertOk(r);
  });
});

// ── RetireAsset ──────────────────────────────────────────────────────────────

describe('AssetActionValidator — RetireAsset', () => {
  const retireAction: IRetireAssetAction = {
    kind: ActionKind.RetireAsset,
    assetId: assetIdBuf(1) as ReturnType<typeof assetIdBuf> & {
      readonly __brand: true;
    },
    reason: new Uint8Array(4),
  };

  it('accepts retire on live asset', () => {
    const state = stateWithAsset(1);
    const r = AssetActionValidator.validate(retireAction, state, ctx());
    assertOk(r);
  });

  it('rejects retire on already-retired asset', () => {
    let state = stateWithAsset(1);
    state = { ...state, retiredAssets: new Set([assetId(1)]) };
    const r = AssetActionValidator.validate(retireAction, state, ctx());
    assertFail(r, AssetValidationErrorCode.AssetRetired);
  });
});

// ── Attestation ──────────────────────────────────────────────────────────────

describe('AssetActionValidator — Attestation', () => {
  it('accepts attestation on known asset', () => {
    const state = stateWithAsset(1);
    const action: IAttestationAction = {
      kind: ActionKind.Attestation,
      assetId: assetIdBuf(1) as ReturnType<typeof assetIdBuf> & {
        readonly __brand: true;
      },
      subject: null,
      claimHash: fill32(0xab),
      expiresAt: null,
    };
    const r = AssetActionValidator.validate(action, state, ctx());
    assertOk(r);
  });
});

// ── OperatorFreeze ───────────────────────────────────────────────────────────

describe('AssetActionValidator — OperatorFreeze', () => {
  const action: IOperatorFreezeAction = {
    kind: ActionKind.OperatorFreeze,
    account: makePk(2),
    frozen: true,
    reason: new Uint8Array(4),
  };

  it('accepts with system signer set satisfied', () => {
    const sysSet = makeSignerSet(1);
    const r = AssetActionValidator.validate(
      action,
      emptyState(),
      ctx({ systemSignerSet: sysSet }),
    );
    assertOk(r);
  });

  it('rejects without system signer set', () => {
    const r = AssetActionValidator.validate(
      action,
      emptyState(),
      ctx({ systemSignerSet: undefined }),
    );
    assertFail(r, AssetValidationErrorCode.SystemPolicyNotSatisfied);
  });
});

// ── ProcessKeyCert ───────────────────────────────────────────────────────────

describe('AssetActionValidator — ProcessKeyCert', () => {
  const action: IProcessKeyCertAction = {
    kind: ActionKind.ProcessKeyCert,
    processPublicKey: makePk(10),
    notBefore: NOW,
    notAfter: NOW + 24 * 3600 * 1000,
    shardIds: [shardIdHex('shard-1')],
  };

  it('accepts valid cert with system quorum', () => {
    const sysSet = makeSignerSet(1);
    const r = AssetActionValidator.validate(
      action,
      emptyState(),
      ctx({ systemSignerSet: sysSet }),
    );
    assertOk(r);
  });

  it('rejects when notAfter <= notBefore', () => {
    const bad: IProcessKeyCertAction = { ...action, notAfter: NOW };
    const sysSet = makeSignerSet(1);
    const r = AssetActionValidator.validate(
      bad,
      emptyState(),
      ctx({ systemSignerSet: sysSet }),
    );
    assertFail(r, AssetValidationErrorCode.ProcessKeyExpired);
  });

  it('rejects when window exceeds max', () => {
    const bad: IProcessKeyCertAction = {
      ...action,
      notAfter: NOW + PROCESS_KEY_MAX_VALIDITY_MS + 1,
    };
    const sysSet = makeSignerSet(1);
    const r = AssetActionValidator.validate(
      bad,
      emptyState(),
      ctx({ systemSignerSet: sysSet }),
    );
    assertFail(r, AssetValidationErrorCode.ProcessKeyExpired);
  });

  it('rejects duplicate process key', () => {
    const fp = Buffer.from(makePk(10)).toString('hex');
    const existing: IProcessKeyRecord = {
      publicKey: makePk(10),
      notBefore: NOW,
      notAfter: NOW + 3600_000,
      shardIds: [shardIdHex('shard-1')],
      revoked: false,
    };
    const state = {
      ...emptyState(),
      processKeys: new Map([[fp, existing]]),
    };
    const sysSet = makeSignerSet(1);
    const r = AssetActionValidator.validate(
      action,
      state,
      ctx({ systemSignerSet: sysSet }),
    );
    assertFail(r, AssetValidationErrorCode.ProcessKeyDuplicate);
  });
});

// ── ProcessKeyRevoke ─────────────────────────────────────────────────────────

describe('AssetActionValidator — ProcessKeyRevoke', () => {
  const fp = Buffer.from(makePk(10)).toString('hex');
  const existing: IProcessKeyRecord = {
    publicKey: makePk(10),
    notBefore: NOW,
    notAfter: NOW + 3600_000,
    shardIds: [shardIdHex('shard-1')],
    revoked: false,
  };

  const action: IProcessKeyRevokeAction = {
    kind: ActionKind.ProcessKeyRevoke,
    processKeyFingerprint: makePk(10),
    reason: 'rotation',
  };

  it('accepts revocation of live key with system quorum', () => {
    const state = { ...emptyState(), processKeys: new Map([[fp, existing]]) };
    const sysSet = makeSignerSet(1);
    const r = AssetActionValidator.validate(
      action,
      state,
      ctx({ systemSignerSet: sysSet }),
    );
    assertOk(r);
  });

  it('rejects when key not found', () => {
    const sysSet = makeSignerSet(1);
    const r = AssetActionValidator.validate(
      action,
      emptyState(),
      ctx({ systemSignerSet: sysSet }),
    );
    assertFail(r, AssetValidationErrorCode.ProcessKeyExpired);
  });

  it('rejects double revocation', () => {
    const revoked: IProcessKeyRecord = { ...existing, revoked: true };
    const state = { ...emptyState(), processKeys: new Map([[fp, revoked]]) };
    const sysSet = makeSignerSet(1);
    const r = AssetActionValidator.validate(
      action,
      state,
      ctx({ systemSignerSet: sysSet }),
    );
    assertFail(r, AssetValidationErrorCode.ProcessKeyRevoked);
  });
});

// ── BatchSettlement ──────────────────────────────────────────────────────────

describe('AssetActionValidator — BatchSettlement', () => {
  const fp = Buffer.from(makePk(10)).toString('hex');
  const processKey: IProcessKeyRecord = {
    publicKey: makePk(10),
    notBefore: NOW - 1000,
    notAfter: NOW + 3600_000,
    shardIds: [shardIdHex('shard-1')],
    revoked: false,
  };
  const shardState: IShardSettlementState = {
    nextExpectedSeq: 0n,
    lastSettledAt: 0,
    lastTipHash: fill32(0),
  };

  function stateWithShard(): IAssetProjectedState {
    return {
      ...emptyState(),
      processKeys: new Map([[fp, processKey]]),
      shardSettlement: new Map([[shardIdHex('shard-1'), shardState]]),
    };
  }

  const action: IBatchSettlementAction = {
    kind: ActionKind.BatchSettlement,
    shardId: shardIdFromString('shard-1'),
    fromSeq: 0n,
    toSeq: 9n,
    memberDeltas: [{ memberKey: makePk(2), delta: 500n }],
    tipHash: fill32(0xaa),
    itemsRoot: fill32(0xbb),
    processKeyFingerprint: makePk(10),
    signature: new Uint8Array(64),
  };

  it('accepts valid settlement', () => {
    const r = AssetActionValidator.validate(action, stateWithShard(), ctx());
    assertOk(r);
  });

  it('rejects unknown shard', () => {
    const r = AssetActionValidator.validate(action, emptyState(), ctx());
    assertFail(r, AssetValidationErrorCode.ShardUnknown);
  });

  it('rejects seq gap', () => {
    const state = {
      ...stateWithShard(),
      shardSettlement: new Map([
        [shardIdHex('shard-1'), { ...shardState, nextExpectedSeq: 5n }],
      ]),
    };
    const r = AssetActionValidator.validate(
      { ...action, fromSeq: 10n },
      state,
      ctx(),
    );
    assertFail(r, AssetValidationErrorCode.ShardSeqGap);
  });

  it('rejects seq overlap', () => {
    const state = {
      ...stateWithShard(),
      shardSettlement: new Map([
        [shardIdHex('shard-1'), { ...shardState, nextExpectedSeq: 3n }],
      ]),
    };
    const r = AssetActionValidator.validate(
      { ...action, fromSeq: 2n },
      state,
      ctx(),
    );
    assertFail(r, AssetValidationErrorCode.ShardSeqOverlap);
  });

  it('rejects delta order violation', () => {
    const bad: IBatchSettlementAction = {
      ...action,
      memberDeltas: [
        { memberKey: makePk(5), delta: 100n },
        { memberKey: makePk(2), delta: 100n },
      ],
    };
    const r = AssetActionValidator.validate(bad, stateWithShard(), ctx());
    assertFail(r, AssetValidationErrorCode.DeltaOrderViolation);
  });
});

// ── BatchChallenge ───────────────────────────────────────────────────────────

describe('AssetActionValidator — BatchChallenge', () => {
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

  it('accepts valid challenge within dispute window', () => {
    const state = {
      ...emptyState(),
      shardSettlement: new Map([[shardIdHex('shard-1'), shardState]]),
    };
    const r = AssetActionValidator.validate(
      action,
      state,
      ctx({ disputeWindowMs: DEFAULT_DISPUTE_WINDOW_MS }),
    );
    assertOk(r);
  });

  it('rejects challenge on unknown shard', () => {
    const r = AssetActionValidator.validate(action, emptyState(), ctx());
    assertFail(r, AssetValidationErrorCode.ShardUnknown);
  });

  it('rejects duplicate challenge', () => {
    const state = {
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
    const r = AssetActionValidator.validate(action, state, ctx());
    assertFail(r, AssetValidationErrorCode.DisputeDuplicate);
  });
});

// ── BatchSettlementResolution ─────────────────────────────────────────────────

describe('AssetActionValidator — BatchSettlementResolution', () => {
  const action: IBatchSettlementResolutionAction = {
    kind: ActionKind.BatchSettlementResolution,
    shardId: shardIdFromString('shard-1'),
    settlementSeq: 9n,
    challengeSeq: 5n,
    outcome: 'accepted',
    reason: new Uint8Array(4),
  };

  it('accepts resolution with system quorum', () => {
    const state = {
      ...emptyState(),
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
    const sysSet = makeSignerSet(1);
    const r = AssetActionValidator.validate(
      action,
      state,
      ctx({ systemSignerSet: sysSet }),
    );
    assertOk(r);
  });

  it('rejects when dispute not found', () => {
    const sysSet = makeSignerSet(1);
    const r = AssetActionValidator.validate(
      action,
      emptyState(),
      ctx({ systemSignerSet: sysSet }),
    );
    assertFail(r, AssetValidationErrorCode.DisputeNotFound);
  });
});

// ── AssetStateReducer integration round-trips ─────────────────────────────────

describe('AssetStateReducer — basic round-trips', () => {
  it('IssueAsset increases asset count', () => {
    const action: IIssueAssetAction = {
      kind: ActionKind.IssueAsset,
      symbol: 'J',
      displayName: 'Joule',
      decimals: 6,
      supplyPolicy: 'mintable',
      transferPolicy: 'open',
      freezable: true,
      burnable: true,
      initialIssuerSet: [makeSigner(1)],
      initialBrightTrustPolicy: { type: QuorumType.Threshold, threshold: 1 },
    };
    const s1 = AssetStateReducer.reduce(
      emptyState(),
      action,
      ctx({ derivedAssetId: assetId(0) }),
    );
    expect(s1.assets.size).toBe(1);
    expect(s1.lastSequence).toBe(1n);
  });

  it('Mint increases balance and issuedTotal', () => {
    const state = stateWithAsset(1, { supplyPolicy: 'mintable' });
    const mint: IMintAction = {
      kind: ActionKind.Mint,
      assetId: assetIdBuf(1) as ReturnType<typeof assetIdBuf> & {
        readonly __brand: true;
      },
      to: makePk(2),
      amount: 500n,
      nonce: 1n,
    };
    const s1 = AssetStateReducer.reduce(state, mint, ctx());
    const bal = s1.balances.get(assetId(1))?.get(makePkHex(2));
    expect(bal).toBe(500n);
    expect(s1.issuedTotal.get(assetId(1))).toBe(500n);
  });

  it('Transfer moves balance and increments nonce', () => {
    const state = stateWithAsset(1, { balance: 100n, accountSeed: 2 });
    const transfer: ITransferAction = {
      kind: ActionKind.Transfer,
      assetId: assetIdBuf(1) as ReturnType<typeof assetIdBuf> & {
        readonly __brand: true;
      },
      from: makePk(2),
      to: makePk(3),
      amount: 40n,
      nonce: 1n,
      expiry: null,
    };
    const s1 = AssetStateReducer.reduce(
      state,
      transfer,
      ctx({ signerPublicKeys: [makePk(2)] }),
    );
    const fromBal = s1.balances.get(assetId(1))?.get(makePkHex(2));
    const toBal = s1.balances.get(assetId(1))?.get(makePkHex(3));
    expect(fromBal).toBe(60n);
    expect(toBal).toBe(40n);
    expect(s1.nonces.get(makePkHex(2))).toBe(1n);
  });

  it('Burn decreases balance and increases burnedTotal', () => {
    const state = stateWithAsset(1, {
      burnable: true,
      balance: 200n,
      accountSeed: 2,
    });
    const burn: IBurnAction = {
      kind: ActionKind.Burn,
      assetId: assetIdBuf(1) as ReturnType<typeof assetIdBuf> & {
        readonly __brand: true;
      },
      from: makePk(2),
      amount: 80n,
      nonce: 1n,
    };
    const s1 = AssetStateReducer.reduce(
      state,
      burn,
      ctx({ signerPublicKeys: [makePk(2)] }),
    );
    const bal = s1.balances.get(assetId(1))?.get(makePkHex(2));
    expect(bal).toBe(120n);
    expect(s1.burnedTotal.get(assetId(1))).toBe(80n);
  });
});
