/**
 * @fileoverview Joule asset — end-to-end integration fixture (Phase 8 — Req 11.1).
 *
 * The "Joule" asset models metered energy in µJ (micro-joule) units:
 *   - assetId: derived from issuer key (seed 0x01) and IssueAsset hash
 *   - symbol: 'J'
 *   - decimals: 6 (1 J = 1 000 000 µJ)
 *
 * Full scenario (in-memory ledger, no HTTP):
 *   1.  IssueAsset  — register the Joule asset class.
 *   2.  Mint        — credit meter address with 500 J (5×10⁸ µJ).
 *   3.  BatchSettlement (earn)  — shard earns 100 J for account A.
 *   4.  BatchSettlement (spend) — shard spends 20 J from account A.
 *   5.  Transfer    — account A sends 10 J to account B.
 *   6.  BatchChallenge (negative) — dispute outside window → rejected.
 *   7.  CSV export  — verify header and Joule-specific rows.
 *   8.  OperatorFreeze     — freeze account A.
 *   9.  UnfreezeAccount    — asset-level unfreeze of account A.
 */

import {
  AuthorizedSignerSet,
  QuorumType,
  SignerRole,
  SignerStatus,
  type ILedgerSigner,
} from '@brightchain/brightchain-lib';
import {
  ActionKind,
  AssetActionSerializer,
  type AssetIdBuffer,
  type IBatchChallengeAction,
  type IBatchSettlementAction,
  type IIssueAssetAction,
  type IMemberDelta,
  type IMintAction,
  type IOperatorFreezeAction,
  type IProcessKeyCertAction,
  type ITransferAction,
  type IUnfreezeAccountAction,
} from '@brightchain/brightledger-assets-lib';
import type { SignatureUint8Array } from '@digitaldefiance/ecies-lib';
import { Writable } from 'node:stream';

import { shardIdFromString, shardIdHex } from './shardIdFixture';

import {
  AssetActionValidator,
  BalanceProjectionService,
  MemorySnapshotStore,
  SnapshotService,
  SubmissionService,
} from '../assetsSubsystemPlugin';
import {
  AUDIT_CSV_COLUMNS,
  AuditExportService,
  IAssetLedgerReader,
  ILedgerRawEntry,
} from '../auditExportService';
import { IAssetLedgerWriter } from '../submissionService';
import { ILedgerContext } from '../validator';

// ── Constants ─────────────────────────────────────────────────────────────────

const LEDGER_ID = 'joule-e2e-ledger';
const NOW = 1_700_000_000_000;
// One week in ms; ensures settlement at NOW lands well inside dispute window (24h).
const FAR_FUTURE = NOW + 8 * 24 * 60 * 60 * 1000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePk(seed: number): Uint8Array {
  const k = new Uint8Array(33);
  k[0] = seed & 0xff;
  k[1] = (seed >> 8) & 0xff;
  return k;
}

function makePkHex(seed: number): string {
  return Buffer.from(makePk(seed)).toString('hex');
}

function fill32(v: number): Uint8Array {
  return new Uint8Array(32).fill(v & 0xff);
}

function makeAssetIdBuf(seed: number): AssetIdBuffer {
  const buf = new Uint8Array(32);
  buf[0] = seed & 0xff;
  return buf as unknown as AssetIdBuffer;
}

function assetHex(seed: number): string {
  return Buffer.from(makeAssetIdBuf(seed)).toString('hex');
}

// ── Mock ledger ───────────────────────────────────────────────────────────────

class MockLedger implements IAssetLedgerWriter {
  readonly rawEntries: ILedgerRawEntry[] = [];

  get length(): number {
    return this.rawEntries.length;
  }

  async append(
    payload: Uint8Array,
    _signer: ILedgerSigner,
  ): Promise<{ toUint8Array(): Uint8Array }> {
    const seq = this.rawEntries.length;
    const hash = fill32(seq & 0xff);
    this.rawEntries.push({
      sequenceNumber: BigInt(seq),
      entryHash: hash,
      payload: new Uint8Array(payload),
      acceptedAt: NOW + seq * 100,
    });
    return { toUint8Array: () => hash };
  }

  asReader(): IAssetLedgerReader {
    const entries = this.rawEntries;
    return {
      get length() {
        return entries.length;
      },
      entries() {
        return entries;
      },
    };
  }
}

// ── Mock signer ───────────────────────────────────────────────────────────────

function makeSigner(seed: number): ILedgerSigner {
  return {
    publicKey: makePk(seed),
    sign: (_data: Uint8Array): SignatureUint8Array =>
      new Uint8Array(64) as SignatureUint8Array,
  };
}

const ISSUER_SIGNER = makeSigner(0x01);
const METER_KEY = makePk(0x10); // mint recipient
const ACCOUNT_A_KEY = makePk(0x20);
const ACCOUNT_B_KEY = makePk(0x30);
const PROCESS_KEY_SEED = 0x50;

// ── Service factory ───────────────────────────────────────────────────────────

function makeServices(): {
  ledger: MockLedger;
  projectionService: BalanceProjectionService;
  submissionService: SubmissionService;
} {
  const ledger = new MockLedger();
  const store = new MemorySnapshotStore();
  const snapshotService = new SnapshotService(store, 1000);
  const projectionService = new BalanceProjectionService(snapshotService);
  const validator = new AssetActionValidator();
  const submissionService = new SubmissionService(
    ledger,
    LEDGER_ID,
    projectionService,
    ISSUER_SIGNER,
    validator,
  );
  return { ledger, projectionService, submissionService };
}

// ── CSV helpers ───────────────────────────────────────────────────────────────

function collectWritable(): { writable: Writable; getText: () => string } {
  const chunks: Buffer[] = [];
  const writable = new Writable({
    write(chunk, _enc, cb) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      cb();
    },
  });
  return { writable, getText: () => Buffer.concat(chunks).toString('utf8') };
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n');
  if (lines.length === 0) return [];
  const headers = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const values = line.split(',');
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? '';
    });
    return row;
  });
}

// ── Action builders ───────────────────────────────────────────────────────────

const JOULE_ASSET_ID = makeAssetIdBuf(1);
const JOULE_HEX = assetHex(1);

const PROCESS_KEY_FP = fill32(PROCESS_KEY_SEED);

function ctx(overrides: Partial<ILedgerContext> = {}): ILedgerContext {
  return {
    signerPublicKeys: [ISSUER_SIGNER.publicKey],
    now: NOW,
    derivedAssetId: JOULE_HEX,
    ...overrides,
  };
}

function ctxFrom(senderKey: Uint8Array): ILedgerContext {
  return ctx({ signerPublicKeys: [senderKey] });
}

function serialise(
  action: Parameters<typeof AssetActionSerializer.serialize>[0],
): Uint8Array {
  return AssetActionSerializer.serialize(action);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Joule asset — end-to-end integration', () => {
  let ledger: MockLedger;
  let projectionService: BalanceProjectionService;
  let submissionService: SubmissionService;

  // ── Sequence number tracking ──────────────────────────────────────────────

  let issueSeq: number;
  let mintSeq: number;
  let settlement1Seq: number;
  let settlement2Seq: number;

  beforeEach(async () => {
    const svc = makeServices();
    ledger = svc.ledger;
    projectionService = svc.projectionService;
    submissionService = svc.submissionService;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Step 1: IssueAsset
  // ─────────────────────────────────────────────────────────────────────────
  it('1. IssueAsset — registers the Joule asset class', async () => {
    const issueAction: IIssueAssetAction = {
      kind: ActionKind.IssueAsset,
      symbol: 'J',
      displayName: 'Joule',
      decimals: 6,
      supplyPolicy: 'mintable',
      transferPolicy: 'open',
      freezable: true,
      burnable: true,
      initialIssuerSet: [
        {
          publicKey: ISSUER_SIGNER.publicKey,
          role: SignerRole.Admin,
          status: SignerStatus.Active,
          metadata: new Map(),
        },
      ],
      initialBrightTrustPolicy: { type: QuorumType.Threshold, threshold: 1 },
    };

    const result = await submissionService.submit(
      serialise(issueAction),
      ctx(),
    );

    expect('rejected' in result).toBe(false);
    expect(ledger.length).toBe(1);

    const state = projectionService.state;
    expect(state.assets.has(JOULE_HEX)).toBe(true);
    const descriptor = state.assets.get(JOULE_HEX)!;
    expect(descriptor.symbol).toBe('J');
    expect(descriptor.decimals).toBe(6);
    expect(descriptor.supplyPolicy).toBe('mintable');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Step 2: Mint
  // ─────────────────────────────────────────────────────────────────────────
  it('2. Mint — credits the meter address with 500 J (5×10⁸ µJ)', async () => {
    // Need IssueAsset first
    const issueAction: IIssueAssetAction = {
      kind: ActionKind.IssueAsset,
      symbol: 'J',
      displayName: 'Joule',
      decimals: 6,
      supplyPolicy: 'mintable',
      transferPolicy: 'open',
      freezable: true,
      burnable: true,
      initialIssuerSet: [
        {
          publicKey: ISSUER_SIGNER.publicKey,
          role: SignerRole.Admin,
          status: SignerStatus.Active,
          metadata: new Map(),
        },
      ],
      initialBrightTrustPolicy: { type: QuorumType.Threshold, threshold: 1 },
    };
    await submissionService.submit(serialise(issueAction), ctx());

    const mintAction: IMintAction = {
      kind: ActionKind.Mint,
      assetId: JOULE_ASSET_ID,
      to: METER_KEY,
      amount: 500_000_000n, // 500 J in µJ
      nonce: 1n,
    };

    const result = await submissionService.submit(serialise(mintAction), ctx());

    expect('rejected' in result).toBe(false);

    const state = projectionService.state;
    const meterHex = Buffer.from(METER_KEY).toString('hex');
    const balance = state.balances.get(JOULE_HEX)?.get(meterHex);
    expect(balance).toBe(500_000_000n);
    expect(state.issuedTotal.get(JOULE_HEX)).toBe(500_000_000n);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Step 3 + 4: BatchSettlements (earn then spend)
  // ─────────────────────────────────────────────────────────────────────────
  it('3–4. BatchSettlement earn+spend — updates shard state', async () => {
    // Setup: IssueAsset + ProcessKeyCert
    const issueAction: IIssueAssetAction = {
      kind: ActionKind.IssueAsset,
      symbol: 'J',
      displayName: 'Joule',
      decimals: 6,
      supplyPolicy: 'mintable',
      transferPolicy: 'open',
      freezable: true,
      burnable: true,
      initialIssuerSet: [
        {
          publicKey: ISSUER_SIGNER.publicKey,
          role: SignerRole.Admin,
          status: SignerStatus.Active,
          metadata: new Map(),
        },
      ],
      initialBrightTrustPolicy: { type: QuorumType.Threshold, threshold: 1 },
    };
    await submissionService.submit(serialise(issueAction), ctx());

    // Register process key via ProcessKeyCert action
    const keyCert: IProcessKeyCertAction = {
      kind: ActionKind.ProcessKeyCert,
      processPublicKey: makePk(PROCESS_KEY_SEED),
      notBefore: NOW - 1000,
      notAfter: NOW + 6 * 24 * 60 * 60 * 1000,
      shardIds: [shardIdHex('energy-shard')],
    };

    const issuerSet = new AuthorizedSignerSet(
      [
        {
          publicKey: ISSUER_SIGNER.publicKey,
          role: SignerRole.Admin,
          status: SignerStatus.Active,
          metadata: new Map(),
        },
      ],
      { type: QuorumType.Threshold, threshold: 1 },
    );

    await submissionService.submit(
      serialise(keyCert),
      ctx({ systemSignerSet: issuerSet }),
    );

    const earnDeltas: IMemberDelta[] = [
      { memberKey: ACCOUNT_A_KEY, delta: 100_000_000n }, // +100 J
    ];

    const settlement1: IBatchSettlementAction = {
      kind: ActionKind.BatchSettlement,
      shardId: shardIdFromString('energy-shard'),
      fromSeq: 0n,
      toSeq: 9n,
      memberDeltas: earnDeltas,
      tipHash: fill32(0x11),
      itemsRoot: fill32(0x22),
      processKeyFingerprint: makePk(PROCESS_KEY_SEED),
      signature: new Uint8Array(64),
    };

    const r1 = await submissionService.submit(serialise(settlement1), ctx());
    expect('rejected' in r1).toBe(false);

    const state1 = projectionService.state;
    expect(state1.shardSettlement.has(shardIdHex('energy-shard'))).toBe(true);

    const spendDeltas: IMemberDelta[] = [
      { memberKey: ACCOUNT_A_KEY, delta: -20_000_000n }, // −20 J
    ];

    const settlement2: IBatchSettlementAction = {
      kind: ActionKind.BatchSettlement,
      shardId: shardIdFromString('energy-shard'),
      fromSeq: 10n,
      toSeq: 19n,
      memberDeltas: spendDeltas,
      tipHash: fill32(0x33),
      itemsRoot: fill32(0x44),
      processKeyFingerprint: makePk(PROCESS_KEY_SEED),
      signature: new Uint8Array(64),
    };

    const r2 = await submissionService.submit(serialise(settlement2), ctx());
    expect('rejected' in r2).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Step 5: Transfer
  // ─────────────────────────────────────────────────────────────────────────
  it('5. Transfer — account A sends 10 J to account B', async () => {
    // Setup: IssueAsset + Mint to account A
    const issueAction: IIssueAssetAction = {
      kind: ActionKind.IssueAsset,
      symbol: 'J',
      displayName: 'Joule',
      decimals: 6,
      supplyPolicy: 'mintable',
      transferPolicy: 'open',
      freezable: true,
      burnable: true,
      initialIssuerSet: [
        {
          publicKey: ISSUER_SIGNER.publicKey,
          role: SignerRole.Admin,
          status: SignerStatus.Active,
          metadata: new Map(),
        },
      ],
      initialBrightTrustPolicy: { type: QuorumType.Threshold, threshold: 1 },
    };
    await submissionService.submit(serialise(issueAction), ctx());

    const mintToA: IMintAction = {
      kind: ActionKind.Mint,
      assetId: JOULE_ASSET_ID,
      to: ACCOUNT_A_KEY,
      amount: 50_000_000n, // 50 J
      nonce: 1n,
    };
    await submissionService.submit(serialise(mintToA), ctx());

    const transfer: ITransferAction = {
      kind: ActionKind.Transfer,
      assetId: JOULE_ASSET_ID,
      from: ACCOUNT_A_KEY,
      to: ACCOUNT_B_KEY,
      amount: 10_000_000n, // 10 J
      nonce: 1n,
      expiry: null,
    };

    const result = await submissionService.submit(
      serialise(transfer),
      ctxFrom(ACCOUNT_A_KEY),
    );

    expect('rejected' in result).toBe(false);

    const state = projectionService.state;
    const aHex = Buffer.from(ACCOUNT_A_KEY).toString('hex');
    const bHex = Buffer.from(ACCOUNT_B_KEY).toString('hex');
    expect(state.balances.get(JOULE_HEX)?.get(aHex)).toBe(40_000_000n);
    expect(state.balances.get(JOULE_HEX)?.get(bHex)).toBe(10_000_000n);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Step 6: BatchChallenge (negative — outside window)
  // ─────────────────────────────────────────────────────────────────────────
  it('6. BatchChallenge outside dispute window is rejected', async () => {
    const challenge: IBatchChallengeAction = {
      kind: ActionKind.BatchChallenge,
      shardId: shardIdFromString('energy-shard'),
      settlementSeq: 0n, // settlement doesn't exist in this fresh ledger
      claimedTipHash: fill32(0xff),
      challengerKey: ACCOUNT_A_KEY,
      signature: new Uint8Array(64),
    };

    const result = await submissionService.submit(
      serialise(challenge),
      ctx({
        now: NOW + 8 * 24 * 60 * 60 * 1000,
        signerPublicKeys: [ACCOUNT_A_KEY],
      }),
    );

    expect('rejected' in result).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Step 7: CSV audit export
  // ─────────────────────────────────────────────────────────────────────────
  it('7. CSV export — contains correct header and Joule rows', async () => {
    // Setup: IssueAsset + Mint
    const issueAction: IIssueAssetAction = {
      kind: ActionKind.IssueAsset,
      symbol: 'J',
      displayName: 'Joule',
      decimals: 6,
      supplyPolicy: 'mintable',
      transferPolicy: 'open',
      freezable: true,
      burnable: true,
      initialIssuerSet: [
        {
          publicKey: ISSUER_SIGNER.publicKey,
          role: SignerRole.Admin,
          status: SignerStatus.Active,
          metadata: new Map(),
        },
      ],
      initialBrightTrustPolicy: { type: QuorumType.Threshold, threshold: 1 },
    };
    await submissionService.submit(serialise(issueAction), ctx());

    const mintAction: IMintAction = {
      kind: ActionKind.Mint,
      assetId: JOULE_ASSET_ID,
      to: METER_KEY,
      amount: 200_000_000n,
      nonce: 1n,
    };
    await submissionService.submit(serialise(mintAction), ctx());

    const auditSvc = new AuditExportService();
    const { writable, getText } = collectWritable();
    await auditSvc.streamCsv(ledger.asReader(), null, writable);

    const text = getText();
    const lines = text.trim().split('\n');

    // Header check
    expect(lines[0]).toBe(AUDIT_CSV_COLUMNS.join(','));

    // Must have at least two data rows (IssueAsset + Mint)
    expect(lines.length).toBeGreaterThanOrEqual(3);

    // Find Mint row
    const rows = parseCsv(text);
    const mintRow = rows.find((r) => r['kind'] === ActionKind.Mint);
    expect(mintRow).toBeDefined();
    expect(mintRow!['assetId']).toBe(JOULE_HEX);
    expect(mintRow!['amount']).toBe('200000000');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Step 8: OperatorFreeze
  // ─────────────────────────────────────────────────────────────────────────
  it('8. OperatorFreeze — suspends account A', async () => {
    // Need IssueAsset first
    const issueAction: IIssueAssetAction = {
      kind: ActionKind.IssueAsset,
      symbol: 'J',
      displayName: 'Joule',
      decimals: 6,
      supplyPolicy: 'mintable',
      transferPolicy: 'open',
      freezable: true,
      burnable: true,
      initialIssuerSet: [
        {
          publicKey: ISSUER_SIGNER.publicKey,
          role: SignerRole.Admin,
          status: SignerStatus.Active,
          metadata: new Map(),
        },
      ],
      initialBrightTrustPolicy: { type: QuorumType.Threshold, threshold: 1 },
    };
    await submissionService.submit(serialise(issueAction), ctx());

    const freeze: IOperatorFreezeAction = {
      kind: ActionKind.OperatorFreeze,
      account: ACCOUNT_A_KEY,
      frozen: true,
      reason: Buffer.from('Compliance hold'),
    };

    const issuerSet = new AuthorizedSignerSet(
      [
        {
          publicKey: ISSUER_SIGNER.publicKey,
          role: SignerRole.Admin,
          status: SignerStatus.Active,
          metadata: new Map(),
        },
      ],
      { type: QuorumType.Threshold, threshold: 1 },
    );

    const result = await submissionService.submit(
      serialise(freeze),
      ctx({ systemSignerSet: issuerSet }),
    );
    expect('rejected' in result).toBe(false);

    const state = projectionService.state;
    const aHex = makePkHex(0x20);
    // operatorFrozen is a global set keyed by account hex; check it across assets.
    const isGloballyFrozen = [...state.operatorFrozen.values()].some((s) =>
      s.has(aHex),
    );
    expect(isGloballyFrozen).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Step 9: UnfreezeAccount (asset-level)
  // ─────────────────────────────────────────────────────────────────────────
  it('9. UnfreezeAccount — removes asset-level freeze on account A', async () => {
    // Setup: IssueAsset + FreezeAccount
    const issueAction: IIssueAssetAction = {
      kind: ActionKind.IssueAsset,
      symbol: 'J',
      displayName: 'Joule',
      decimals: 6,
      supplyPolicy: 'mintable',
      transferPolicy: 'open',
      freezable: true,
      burnable: true,
      initialIssuerSet: [
        {
          publicKey: ISSUER_SIGNER.publicKey,
          role: SignerRole.Admin,
          status: SignerStatus.Active,
          metadata: new Map(),
        },
      ],
      initialBrightTrustPolicy: { type: QuorumType.Threshold, threshold: 1 },
    };
    await submissionService.submit(serialise(issueAction), ctx());

    const freeze = {
      kind: ActionKind.FreezeAccount,
      assetId: JOULE_ASSET_ID,
      account: ACCOUNT_A_KEY,
    };
    await submissionService.submit(
      serialise(freeze as Parameters<typeof serialise>[0]),
      ctx(),
    );

    const unfreeze: IUnfreezeAccountAction = {
      kind: ActionKind.UnfreezeAccount,
      assetId: JOULE_ASSET_ID,
      account: ACCOUNT_A_KEY,
      reason: new Uint8Array(0),
    };

    const result = await submissionService.submit(serialise(unfreeze), ctx());
    expect('rejected' in result).toBe(false);

    const state = projectionService.state;
    const aHex = makePkHex(0x20);
    const frozenForJoule = state.frozen.get(JOULE_HEX);
    expect(frozenForJoule?.has(aHex)).toBeFalsy();
  });
});
