/**
 * @fileoverview Tests for the 256-byte memo / reason cap.
 *
 * The cap applies to new submissions only (AssetActionValidator). Replay goes
 * through the reducer and the codec, neither of which enforces the cap, so
 * entries already on the ledger must keep replaying.
 *
 * @see .kiro/specs/programmable-asset-ledger/requirements.md Req 1.3
 */
import {
  AuthorizedSignerSet,
  BOOTSTRAP_RATE_TABLE,
  QuorumType,
  SignerRole,
  SignerStatus,
  type ILedgerSigner,
} from '@brightchain/brightchain-lib';
import {
  ActionKind,
  AssetActionSerializer,
  MEMO_MAX_BYTES,
  type AssetIdBuffer,
  type IAssetAction,
  type IBatchSettlementResolutionAction,
  type IBurnAction,
  type IFreezeAccountAction,
  type IIssueAssetAction,
  type IMintAction,
  type IOperatorFreezeAction,
  type IRetireAssetAction,
  type ITransferAction,
  type IUnfreezeAccountAction,
} from '@brightchain/brightledger-assets-lib';
import type { SignatureUint8Array } from '@digitaldefiance/ecies-lib';
import express from 'express';
import request from 'supertest';
import { BalanceProjectionService } from '../balanceProjection.js';
import { createAssetsRouter } from '../controllers/assetsRouter.js';
import { emptyState, type IAssetProjectedState } from '../projectedState.js';
import { MemorySnapshotStore, SnapshotService } from '../snapshot.js';
import {
  SubmissionService,
  type IAssetLedgerWriter,
  type ISubmissionRejection,
} from '../submissionService.js';
import {
  AssetValidationErrorCode,
  type IValidationError,
} from '../validationResult.js';
import { AssetActionValidator, type ILedgerContext } from '../validator.js';
import { shardIdFromString, shardIdHex } from './shardIdFixture';

// ── Helpers ──────────────────────────────────────────────────────────────────

const NOW = 1_700_000_000_000;

function makePk(seed: number): Uint8Array {
  const k = new Uint8Array(33);
  k[0] = seed;
  return k;
}

function pkHex(seed: number): string {
  return Buffer.from(makePk(seed)).toString('hex');
}

function assetIdBuf(seed: number): AssetIdBuffer {
  return new Uint8Array(32).fill(seed) as AssetIdBuffer;
}

function assetHex(seed: number): string {
  return Buffer.from(assetIdBuf(seed)).toString('hex');
}

function makeSigner(seed: number) {
  return {
    publicKey: makePk(seed),
    role: SignerRole.Admin,
    status: SignerStatus.Active,
    metadata: new Map<string, string>(),
  };
}

function signerSet(seed: number): AuthorizedSignerSet {
  return new AuthorizedSignerSet([makeSigner(seed)], {
    type: QuorumType.Threshold,
    threshold: 1,
  });
}

function ctx(overrides: Partial<ILedgerContext> = {}): ILedgerContext {
  return { now: NOW, signerPublicKeys: [makePk(1)], ...overrides };
}

/** State with one mintable, freezable, burnable asset; account 2 holds 1000. */
function stateWithAsset(seed: number): IAssetProjectedState {
  const aid = assetHex(seed);
  return {
    ...emptyState(),
    assets: new Map([
      [
        aid,
        {
          symbol: 'TST',
          displayName: 'Test',
          decimals: 6,
          supplyPolicy: 'mintable',
          transferPolicy: 'open',
          freezable: true,
          burnable: true,
          brightTrustPolicy: { type: QuorumType.Threshold, threshold: 1 },
        },
      ],
    ]),
    issuedTotal: new Map([[aid, 1000n]]),
    burnedTotal: new Map([[aid, 0n]]),
    issuerSets: new Map([[aid, signerSet(1)]]),
    balances: new Map([[aid, new Map([[pkHex(2), 1000n]])]]),
    frozen: new Map([[aid, new Set<string>()]]),
    operatorFrozen: new Map([[aid, new Set<string>()]]),
    whitelist: new Map([[aid, new Set<string>()]]),
    lastSequence: 1n,
  };
}

/** Disputes map entry required by BatchSettlementResolution. */
function stateWithDispute(): IAssetProjectedState {
  return {
    ...stateWithAsset(1),
    disputes: new Map([
      [
        `${shardIdHex('shard-1')}:9`,
        {
          shardId: shardIdHex('shard-1'),
          settlementSeq: 9n,
          challengeSeq: 5n,
          challengerKey: pkHex(7),
          resolved: false,
        },
      ],
    ]),
  };
}

function bytes(n: number): Uint8Array {
  return new Uint8Array(n).fill(0x61);
}

interface IFieldCase {
  readonly name: string;
  readonly build: (value: Uint8Array) => IAssetAction;
  readonly state: () => IAssetProjectedState;
  readonly context: ILedgerContext;
}

const mintBase: IMintAction = {
  kind: ActionKind.Mint,
  assetId: assetIdBuf(1),
  to: makePk(2),
  amount: 10n,
  nonce: 1n,
};
const burnBase: IBurnAction = {
  kind: ActionKind.Burn,
  assetId: assetIdBuf(1),
  from: makePk(2),
  amount: 10n,
  nonce: 1n,
};
const transferBase: ITransferAction = {
  kind: ActionKind.Transfer,
  assetId: assetIdBuf(1),
  from: makePk(2),
  to: makePk(3),
  amount: 10n,
  nonce: 1n,
  expiry: null,
};
const freezeBase: IFreezeAccountAction = {
  kind: ActionKind.FreezeAccount,
  assetId: assetIdBuf(1),
  account: makePk(2),
  reason: new Uint8Array(0),
};
const unfreezeBase: IUnfreezeAccountAction = {
  kind: ActionKind.UnfreezeAccount,
  assetId: assetIdBuf(1),
  account: makePk(2),
  reason: new Uint8Array(0),
};
const operatorFreezeBase: IOperatorFreezeAction = {
  kind: ActionKind.OperatorFreeze,
  account: makePk(2),
  frozen: true,
  reason: new Uint8Array(0),
};
const retireBase: IRetireAssetAction = {
  kind: ActionKind.RetireAsset,
  assetId: assetIdBuf(1),
  reason: new Uint8Array(0),
};
const resolutionBase: IBatchSettlementResolutionAction = {
  kind: ActionKind.BatchSettlementResolution,
  shardId: shardIdFromString('shard-1'),
  settlementSeq: 9n,
  challengeSeq: 5n,
  outcome: 'accepted',
  reason: new Uint8Array(0),
};

const systemCtx = ctx({ systemSignerSet: signerSet(1) });

const CASES: ReadonlyArray<IFieldCase> = [
  {
    name: 'Mint.memo',
    build: (memo) => ({ ...mintBase, memo }),
    state: () => stateWithAsset(1),
    context: ctx(),
  },
  {
    name: 'Burn.memo',
    build: (memo) => ({ ...burnBase, memo }),
    state: () => stateWithAsset(1),
    context: ctx({ signerPublicKeys: [makePk(2)] }),
  },
  {
    name: 'Transfer.memo',
    build: (memo) => ({ ...transferBase, memo }),
    state: () => stateWithAsset(1),
    context: ctx({ signerPublicKeys: [makePk(2)] }),
  },
  {
    name: 'FreezeAccount.reason',
    build: (reason) => ({ ...freezeBase, reason }),
    state: () => stateWithAsset(1),
    context: ctx(),
  },
  {
    name: 'UnfreezeAccount.reason',
    build: (reason) => ({ ...unfreezeBase, reason }),
    state: () => stateWithAsset(1),
    context: ctx(),
  },
  {
    name: 'OperatorFreeze.reason',
    build: (reason) => ({ ...operatorFreezeBase, reason }),
    state: () => emptyState(),
    context: systemCtx,
  },
  {
    name: 'RetireAsset.reason',
    build: (reason) => ({ ...retireBase, reason }),
    state: () => stateWithAsset(1),
    context: ctx(),
  },
  {
    name: 'BatchSettlementResolution.reason',
    build: (reason) => ({ ...resolutionBase, reason }),
    state: () => stateWithDispute(),
    context: systemCtx,
  },
];

type IOperatorGrantAction = Extract<
  IAssetAction,
  { kind: ActionKind.OperatorGrant }
>;
type IRateTableUpdateAction = Extract<
  IAssetAction,
  { kind: ActionKind.RateTableUpdate }
>;

const operatorGrantBase: IOperatorGrantAction = {
  kind: ActionKind.OperatorGrant,
  assetId: assetIdBuf(1),
  to: makePk(2),
  microJoules: 1n,
  reason: 'ok',
  quorumSignatures: [new Uint8Array(64)],
  nonce: 1n,
};
const rateTableUpdateBase: IRateTableUpdateAction = {
  kind: ActionKind.RateTableUpdate,
  assetId: assetIdBuf(1),
  rateTable: { ...BOOTSTRAP_RATE_TABLE, version: 2, effectiveAt: 2_000 },
  claimHash: new Uint8Array(32),
};

/** Kinds that the validator has no rule branch for; only the memo cap applies. */
const MEMO_ONLY_CASES: ReadonlyArray<{
  readonly name: string;
  readonly build: (value: Uint8Array) => IAssetAction;
}> = [
  {
    name: 'OperatorGrant.memo',
    build: (memo) => ({ ...operatorGrantBase, memo }),
  },
  {
    name: 'RateTableUpdate.memo',
    build: (memo) => ({ ...rateTableUpdateBase, memo }),
  },
];

function code(r: ReturnType<typeof AssetActionValidator.validate>): string {
  if (r.valid) return 'ok';
  return (r as IValidationError).code;
}

// ── Validator boundary tests ─────────────────────────────────────────────────

describe('memo / reason cap — AssetActionValidator', () => {
  it('exports a 256-byte limit', () => {
    expect(MEMO_MAX_BYTES).toBe(256);
  });

  describe.each(CASES)('$name', ({ build, state, context }) => {
    it('accepts exactly 256 bytes', () => {
      const r = AssetActionValidator.validate(
        build(bytes(256)),
        state(),
        context,
      );
      expect(code(r)).toBe('ok');
    });

    it('rejects 257 bytes with MemoTooLong', () => {
      const r = AssetActionValidator.validate(
        build(bytes(257)),
        state(),
        context,
      );
      expect(code(r)).toBe(AssetValidationErrorCode.MemoTooLong);
    });

    it('counts bytes, not characters, for multi-byte UTF-8', () => {
      // 128 x U+00E9 (2 bytes each) = 256 bytes accepted; one extra byte rejected.
      const encoder = new TextEncoder();
      const atLimit = encoder.encode('\u00e9'.repeat(128));
      const overLimit = encoder.encode('\u00e9'.repeat(128) + 'a');
      expect(atLimit.length).toBe(256);
      expect(overLimit.length).toBe(257);
      expect(
        code(AssetActionValidator.validate(build(atLimit), state(), context)),
      ).toBe('ok');
      expect(
        code(AssetActionValidator.validate(build(overLimit), state(), context)),
      ).toBe(AssetValidationErrorCode.MemoTooLong);
    });
  });

  it('counts 3- and 4-byte UTF-8 sequences by bytes', () => {
    // 86 x U+20AC (3 bytes) = 258 bytes, only 86 characters.
    const euro = new TextEncoder().encode('\u20ac'.repeat(86));
    expect(euro.length).toBe(258);
    const r = AssetActionValidator.validate(
      { ...transferBase, memo: euro },
      stateWithAsset(1),
      ctx({ signerPublicKeys: [makePk(2)] }),
    );
    expect(code(r)).toBe(AssetValidationErrorCode.MemoTooLong);
  });

  describe.each(MEMO_ONLY_CASES)('$name', ({ build }) => {
    it('rejects 257 bytes with MemoTooLong', () => {
      const r = AssetActionValidator.validate(
        build(bytes(257)),
        emptyState(),
        ctx(),
      );
      expect(code(r)).toBe(AssetValidationErrorCode.MemoTooLong);
    });
  });

  it('rejects a memo that is neither bytes nor a string', () => {
    // The codec performs no field-type validation, so a decoded CBOR map can
    // reach the validator in a memo slot; the cast models that runtime input.
    const malformed = {
      ...transferBase,
      memo: new Map<string, number>([['a', 1]]),
    } as unknown as IAssetAction;
    const r = AssetActionValidator.validate(
      malformed,
      stateWithAsset(1),
      ctx({ signerPublicKeys: [makePk(2)] }),
    );
    expect(code(r)).toBe(AssetValidationErrorCode.MemoTooLong);
  });

  it('accepts actions with no memo', () => {
    const r = AssetActionValidator.validate(mintBase, stateWithAsset(1), ctx());
    expect(code(r)).toBe('ok');
  });
});

// ── Replay is unaffected ─────────────────────────────────────────────────────

describe('memo / reason cap — replay of existing entries', () => {
  const overLimit: ITransferAction = { ...transferBase, memo: bytes(300) };

  it('codec round-trips an over-limit memo (no decode-time rejection)', () => {
    const decoded = AssetActionSerializer.deserialize(
      AssetActionSerializer.serialize(overLimit),
    );
    expect(decoded.kind).toBe(ActionKind.Transfer);
    expect((decoded as ITransferAction).memo?.length).toBe(300);
  });

  it('the validator would reject the entry as a new submission', () => {
    const r = AssetActionValidator.validate(
      overLimit,
      stateWithAsset(1),
      ctx({ signerPublicKeys: [makePk(2)] }),
    );
    expect(code(r)).toBe(AssetValidationErrorCode.MemoTooLong);
  });

  it('replayAll applies an over-limit entry already in the ledger', () => {
    const decoded = AssetActionSerializer.deserialize(
      AssetActionSerializer.serialize(overLimit),
    );
    const state = BalanceProjectionService.replayAll(
      [{ action: decoded, context: ctx({ signerPublicKeys: [makePk(2)] }) }],
      stateWithAsset(1),
    );
    expect(state.balances.get(assetHex(1))?.get(pkHex(2))).toBe(990n);
    expect(state.balances.get(assetHex(1))?.get(pkHex(3))).toBe(10n);
  });

  it('start() rebuilds the projection from entries with an over-limit memo', async () => {
    const issue: IIssueAssetAction = {
      kind: ActionKind.IssueAsset,
      symbol: 'TST',
      displayName: 'Test',
      decimals: 6,
      supplyPolicy: 'mintable',
      transferPolicy: 'open',
      freezable: false,
      burnable: false,
      initialIssuerSet: [makeSigner(1)],
      initialBrightTrustPolicy: { type: QuorumType.Threshold, threshold: 1 },
    };
    const mint: IMintAction = {
      ...mintBase,
      assetId: assetIdBuf(1),
      memo: bytes(1000),
    };
    const projection = new BalanceProjectionService(
      new SnapshotService(new MemorySnapshotStore(), 1000),
    );
    await projection.start('ledger-replay', [
      { action: issue, context: ctx({ derivedAssetId: assetHex(1) }) },
      { action: mint, context: ctx({ derivedAssetId: assetHex(1) }) },
    ]);
    expect(projection.state.balances.get(assetHex(1))?.get(pkHex(2))).toBe(10n);
  });
});

// ── HTTP: 413 ────────────────────────────────────────────────────────────────

describe('memo / reason cap — HTTP', () => {
  class MockLedger implements IAssetLedgerWriter {
    private _count = 0;
    get length(): number {
      return this._count;
    }
    async append(
      _payload: Uint8Array,
      _signer: ILedgerSigner,
    ): Promise<{ toUint8Array(): Uint8Array }> {
      const hash = new Uint8Array(32).fill(this._count & 0xff);
      this._count += 1;
      return { toUint8Array: () => hash };
    }
  }

  const signer: ILedgerSigner = {
    publicKey: makePk(1),
    sign: (_data: Uint8Array): SignatureUint8Array =>
      new Uint8Array(64) as SignatureUint8Array,
  };

  async function buildApp() {
    const ledger = new MockLedger();
    const projectionService = new BalanceProjectionService(
      new SnapshotService(new MemorySnapshotStore(), 1000),
    );
    const submissionService = new SubmissionService(
      ledger,
      'memo-ledger',
      projectionService,
      signer,
      new AssetActionValidator(),
    );
    const issue: IIssueAssetAction = {
      kind: ActionKind.IssueAsset,
      symbol: 'TST',
      displayName: 'Test',
      decimals: 6,
      supplyPolicy: 'mintable',
      transferPolicy: 'open',
      freezable: false,
      burnable: false,
      initialIssuerSet: [makeSigner(1)],
      initialBrightTrustPolicy: { type: QuorumType.Threshold, threshold: 1 },
    };
    await submissionService.submit(AssetActionSerializer.serialize(issue), {
      now: NOW,
      signerPublicKeys: [makePk(1)],
      derivedAssetId: assetHex(1),
    });
    const app = express();
    app.use(express.json());
    app.use(
      '/v1/assets',
      createAssetsRouter(
        {
          projectionService,
          submissionService,
          ledger,
          ledgerId: 'memo-ledger',
        },
        '',
      ),
    );
    return app;
  }

  function submit(app: express.Express, memo: Uint8Array, nonce: bigint) {
    return submitAction(app, { ...mintBase, nonce, memo });
  }

  function submitAction(app: express.Express, action: IAssetAction) {
    const payload = AssetActionSerializer.serialize(action);
    return request(app)
      .post('/v1/assets/submit')
      .set('Content-Type', 'application/json')
      .set('X-Signer-Public-Key', pkHex(1))
      .set('X-Asset-Id', assetHex(1))
      .send({ payload: Buffer.from(payload).toString('hex') });
  }

  it('POST /submit returns 202 for a 256-byte memo', async () => {
    const app = await buildApp();
    const res = await submit(app, bytes(256), 1n);
    expect(res.status).toBe(202);
  });

  it('POST /submit returns 413 MemoTooLong for a 257-byte memo', async () => {
    const app = await buildApp();
    const res = await submit(app, bytes(257), 1n);
    expect(res.status).toBe(413);
    expect((res.body as ISubmissionRejection).code).toBe(
      AssetValidationErrorCode.MemoTooLong,
    );
  });

  it.each(MEMO_ONLY_CASES)(
    'POST /submit returns 413 MemoTooLong for a 257-byte $name',
    async ({ build }) => {
      const app = await buildApp();
      const res = await submitAction(app, build(bytes(257)));
      expect(res.status).toBe(413);
      expect((res.body as ISubmissionRejection).code).toBe(
        AssetValidationErrorCode.MemoTooLong,
      );
    },
  );
});
