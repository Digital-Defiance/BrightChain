/**
 * @fileoverview Tests for AuditExportService (Phase 8 — Req 11.2).
 *
 * Tests:
 *  1.  Header row contains all canonical columns in the right order.
 *  2.  A Mint entry appears with the correct seq, kind, assetId, to, amount.
 *  3.  A Burn entry appears with from, amount.
 *  4.  A Transfer entry appears with from, to, amount.
 *  5.  A BatchSettlement entry includes shardId, fromSeq, toSeq, tipHash, itemsRoot, deltaCount.
 *  6.  assetId filter excludes entries for other asset IDs.
 *  7.  assetId filter = null includes entries for all assets.
 *  8.  Malformed entries (corrupt payload) are silently skipped.
 *  9.  IssueAsset entry rows have no amount, from, or to.
 * 10.  Async iterable reader is fully consumed.
 */

import { Writable } from 'node:stream';

import { shardIdFromString, shardIdHex } from './shardIdFixture';

import {
  QuorumType,
  SignerRole,
  SignerStatus,
} from '@brightchain/brightchain-lib';
import {
  ActionKind,
  AssetActionSerializer,
  type AssetIdBuffer,
  type IBatchSettlementAction,
  type IBurnAction,
  type IIssueAssetAction,
  type IMemberDelta,
  type IMintAction,
  type ITransferAction,
} from '@brightchain/brightledger-assets-lib';

import {
  AUDIT_CSV_COLUMNS,
  AuditExportService,
  type IAssetLedgerReader,
  type ILedgerRawEntry,
} from '../auditExportService.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeAssetId(seed: number): AssetIdBuffer {
  const buf = new Uint8Array(32);
  buf[0] = seed & 0xff;
  return buf as unknown as AssetIdBuffer;
}

function assetHex(seed: number): string {
  return Buffer.from(makeAssetId(seed)).toString('hex');
}

function makePk(seed: number): Uint8Array {
  const k = new Uint8Array(33);
  k[0] = seed & 0xff;
  return k;
}

function makeHash(seed: number): Uint8Array {
  const h = new Uint8Array(32);
  h.fill(seed & 0xff);
  return h;
}

/** Collect all bytes written to a Writable into a single string. */
function collectWritable(): { writable: Writable; getText: () => string } {
  const chunks: Buffer[] = [];
  const writable = new Writable({
    write(chunk, _enc, cb) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      cb();
    },
  });
  return {
    writable,
    getText: () => Buffer.concat(chunks).toString('utf8'),
  };
}

/** Parse a CSV string into an array of Record<column, value> objects. */
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

/** Build a minimal sync IAssetLedgerReader from raw entries. */
function makeReader(entries: ILedgerRawEntry[]): IAssetLedgerReader {
  return {
    get length() {
      return entries.length;
    },
    entries() {
      return entries;
    },
  };
}

/** Build a minimal async IAssetLedgerReader from raw entries. */
function makeAsyncReader(entries: ILedgerRawEntry[]): IAssetLedgerReader {
  return {
    get length() {
      return entries.length;
    },
    entries(): AsyncIterable<ILedgerRawEntry> {
      return {
        [Symbol.asyncIterator]: async function* () {
          for (const e of entries) {
            yield e;
          }
        },
      };
    },
  };
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ISSUER_KEY = makePk(0x01);
const FROM_KEY = makePk(0x02);
const TO_KEY = makePk(0x03);

const ASSET_SEED = 1;
const ASSET_ID = makeAssetId(ASSET_SEED);

const issueAction: IIssueAssetAction = {
  kind: ActionKind.IssueAsset,
  symbol: 'TST',
  displayName: 'Test Asset',
  decimals: 6,
  supplyPolicy: 'mintable',
  transferPolicy: 'open',
  freezable: false,
  burnable: false,
  initialIssuerSet: [
    {
      publicKey: ISSUER_KEY,
      role: SignerRole.Admin,
      status: SignerStatus.Active,
      metadata: new Map(),
    },
  ],
  initialBrightTrustPolicy: { type: QuorumType.Threshold, threshold: 1 },
};

const mintAction: IMintAction = {
  kind: ActionKind.Mint,
  assetId: ASSET_ID,
  to: TO_KEY,
  amount: 1_000_000n,
  nonce: 1n,
};

const burnAction: IBurnAction = {
  kind: ActionKind.Burn,
  assetId: ASSET_ID,
  from: FROM_KEY,
  amount: 500n,
  nonce: 2n,
};

const transferAction: ITransferAction = {
  kind: ActionKind.Transfer,
  assetId: ASSET_ID,
  from: FROM_KEY,
  to: TO_KEY,
  amount: 250n,
  nonce: 3n,
  expiry: null,
};

const memberDeltas: IMemberDelta[] = [
  { memberKey: FROM_KEY, delta: -100n },
  { memberKey: TO_KEY, delta: 100n },
];

const settlementAction: IBatchSettlementAction = {
  kind: ActionKind.BatchSettlement,
  shardId: shardIdFromString('shard-1'),
  fromSeq: 0n,
  toSeq: 9n,
  memberDeltas,
  tipHash: makeHash(0xaa),
  itemsRoot: makeHash(0xbb),
  processKeyFingerprint: makeHash(0xcc),
  signature: new Uint8Array(64),
};

function toEntry(
  action: Parameters<typeof AssetActionSerializer.serialize>[0],
  seq: number,
): ILedgerRawEntry {
  return {
    sequenceNumber: BigInt(seq),
    entryHash: makeHash(seq),
    payload: AssetActionSerializer.serialize(action),
    acceptedAt: 1_700_000_000_000 + seq * 1000,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AuditExportService', () => {
  const svc = new AuditExportService();

  // 1. Header row
  it('writes a header row with all canonical columns in order', async () => {
    const reader = makeReader([]);
    const { writable, getText } = collectWritable();
    await svc.streamCsv(reader, null, writable);

    const headerLine = getText().split('\n')[0];
    expect(headerLine).toBe(AUDIT_CSV_COLUMNS.join(','));
  });

  // 2. Mint entry
  it('writes a Mint row with seq, kind, assetId, to, amount', async () => {
    const reader = makeReader([toEntry(mintAction, 0)]);
    const { writable, getText } = collectWritable();
    await svc.streamCsv(reader, null, writable);

    const rows = parseCsv(getText());
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row['seq']).toBe('0');
    expect(row['kind']).toBe(ActionKind.Mint);
    expect(row['assetId']).toBe(assetHex(ASSET_SEED));
    expect(row['to']).toBe(Buffer.from(TO_KEY).toString('hex'));
    expect(row['amount']).toBe('1000000');
  });

  // 3. Burn entry
  it('writes a Burn row with from, amount', async () => {
    const reader = makeReader([toEntry(burnAction, 1)]);
    const { writable, getText } = collectWritable();
    await svc.streamCsv(reader, null, writable);

    const rows = parseCsv(getText());
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row['kind']).toBe(ActionKind.Burn);
    expect(row['from']).toBe(Buffer.from(FROM_KEY).toString('hex'));
    expect(row['amount']).toBe('500');
    expect(row['to']).toBe('');
  });

  // 4. Transfer entry
  it('writes a Transfer row with from, to, amount', async () => {
    const reader = makeReader([toEntry(transferAction, 2)]);
    const { writable, getText } = collectWritable();
    await svc.streamCsv(reader, null, writable);

    const rows = parseCsv(getText());
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row['kind']).toBe(ActionKind.Transfer);
    expect(row['from']).toBe(Buffer.from(FROM_KEY).toString('hex'));
    expect(row['to']).toBe(Buffer.from(TO_KEY).toString('hex'));
    expect(row['amount']).toBe('250');
  });

  // 5. BatchSettlement entry
  it('writes BatchSettlement rows with shard columns', async () => {
    const reader = makeReader([toEntry(settlementAction, 3)]);
    const { writable, getText } = collectWritable();
    await svc.streamCsv(reader, null, writable);

    const rows = parseCsv(getText());
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row['kind']).toBe(ActionKind.BatchSettlement);
    expect(row['shardId']).toBe(shardIdHex('shard-1'));
    expect(row['fromSeq']).toBe('0');
    expect(row['toSeq']).toBe('9');
    expect(row['tipHash']).toBe(Buffer.from(makeHash(0xaa)).toString('hex'));
    expect(row['itemsRoot']).toBe(Buffer.from(makeHash(0xbb)).toString('hex'));
    expect(row['deltaCount']).toBe('2');
  });

  // 6. assetId filter — excludes other assets
  it('filters to only the specified assetId', async () => {
    const otherAsset = makeAssetId(99);
    const otherMint: IMintAction = { ...mintAction, assetId: otherAsset };
    const reader = makeReader([toEntry(mintAction, 0), toEntry(otherMint, 1)]);
    const { writable, getText } = collectWritable();
    await svc.streamCsv(reader, assetHex(ASSET_SEED), writable);

    const rows = parseCsv(getText());
    expect(rows).toHaveLength(1);
    expect(rows[0]['assetId']).toBe(assetHex(ASSET_SEED));
  });

  // 7. assetId = null includes all
  it('includes all entries when assetId is null', async () => {
    const otherAsset = makeAssetId(99);
    const otherMint: IMintAction = { ...mintAction, assetId: otherAsset };
    const reader = makeReader([toEntry(mintAction, 0), toEntry(otherMint, 1)]);
    const { writable, getText } = collectWritable();
    await svc.streamCsv(reader, null, writable);

    const rows = parseCsv(getText());
    expect(rows).toHaveLength(2);
  });

  // 8. Malformed entries are skipped
  it('silently skips malformed (corrupt payload) entries', async () => {
    const corrupt: ILedgerRawEntry = {
      sequenceNumber: 99n,
      entryHash: makeHash(99),
      payload: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
      acceptedAt: 0,
    };
    const reader = makeReader([toEntry(mintAction, 0), corrupt]);
    const { writable, getText } = collectWritable();
    await svc.streamCsv(reader, null, writable);

    const rows = parseCsv(getText());
    // Only the valid mint entry appears.
    expect(rows).toHaveLength(1);
    expect(rows[0]['kind']).toBe(ActionKind.Mint);
  });

  // 9. IssueAsset entry — no amount/from/to
  it('writes an IssueAsset row with empty amount, from, to', async () => {
    const reader = makeReader([toEntry(issueAction, 10)]);
    const { writable, getText } = collectWritable();
    await svc.streamCsv(reader, null, writable);

    const rows = parseCsv(getText());
    expect(rows).toHaveLength(1);
    expect(rows[0]['kind']).toBe(ActionKind.IssueAsset);
    expect(rows[0]['amount']).toBe('');
    expect(rows[0]['from']).toBe('');
    expect(rows[0]['to']).toBe('');
  });

  // 10. Async iterable reader
  it('fully consumes an async iterable reader', async () => {
    const entries = [
      toEntry(mintAction, 0),
      toEntry(transferAction, 1),
      toEntry(burnAction, 2),
    ];
    const reader = makeAsyncReader(entries);
    const { writable, getText } = collectWritable();
    await svc.streamCsv(reader, null, writable);

    const rows = parseCsv(getText());
    expect(rows).toHaveLength(3);
  });
});
