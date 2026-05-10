/**
 * @fileoverview AuditExportService — streams asset-ledger entries as a CSV audit trail.
 *
 * Key design constraints:
 *  - Iterates directly over raw ledger entries; NEVER reads from the projection.
 *  - Accepts an optional `assetId` (hex) to scope export to a single asset class;
 *    pass `null` to export every entry.
 *  - Output uses the canonical column order defined in `AUDIT_CSV_COLUMNS`.
 *  - Settlement entries include shard-level columns (shardId, fromSeq, toSeq,
 *    tipHash, itemsRoot, deltaCount).
 *  - Malformed entries are silently skipped (a real ledger should not contain
 *    these, but a durable reader must be defensive).
 *
 * @see Requirement 11.2
 */

import type { Writable } from 'node:stream';

import {
  ActionKind,
  AssetActionSerializer,
  type IAssetAction,
} from '@brightchain/brightledger-assets-lib';

// ── Public interfaces ─────────────────────────────────────────────────────────

/** A single raw entry as read from the underlying ledger storage. */
export interface ILedgerRawEntry {
  /** Zero-based sequence number of this entry in the ledger. */
  readonly sequenceNumber: bigint;
  /** 32-byte SHA-256 checksum that was returned by the ledger on write. */
  readonly entryHash: Uint8Array;
  /** Raw serialised payload bytes (ACTL wire format). */
  readonly payload: Uint8Array;
  /** Unix timestamp (ms) at which the entry was accepted by the ledger. */
  readonly acceptedAt: number;
}

/**
 * Minimum interface required by `AuditExportService` to iterate over a
 * ledger's raw entries.  Implementations may be synchronous or async.
 */
export interface IAssetLedgerReader {
  /** Total number of committed entries. */
  readonly length: number;
  /** Return all entries in sequence order. */
  entries(): Iterable<ILedgerRawEntry> | AsyncIterable<ILedgerRawEntry>;
}

// ── Canonical CSV column order (Req 11.2) ─────────────────────────────────────

/**
 * Canonical column ordering for the audit CSV.
 *
 * Settlement-only columns (shardId … deltaCount) are always present in the
 * header; non-settlement rows leave them blank.
 */
export const AUDIT_CSV_COLUMNS = [
  'seq',
  'entryHash',
  'kind',
  'assetId',
  'shardId',
  'fromSeq',
  'toSeq',
  'tipHash',
  'itemsRoot',
  'deltaCount',
  'from',
  'to',
  'amount',
  'acceptedAt',
] as const;

export type AuditCsvColumn = (typeof AUDIT_CSV_COLUMNS)[number];

// ── Internal helpers ──────────────────────────────────────────────────────────

function toHex(bytes: Uint8Array | undefined | null): string {
  if (bytes == null) return '';
  return Buffer.from(bytes).toString('hex');
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function rowToCsvLine(columns: string[]): string {
  return columns.map(escapeCsv).join(',') + '\n';
}

/**
 * Map a decoded `IAssetAction` and its raw entry into the canonical column set.
 *
 * Returns `null` when the entry should be excluded because it does not match
 * the caller-supplied `assetIdFilter`.
 */
function buildRow(
  entry: ILedgerRawEntry,
  action: IAssetAction,
  assetIdFilter: string | null,
): string[] | null {
  const seq = entry.sequenceNumber.toString();
  const entryHash = toHex(entry.entryHash);
  const kind = action.kind;
  const acceptedAt = entry.acceptedAt.toString();

  // Resolve the asset ID for this entry ('' for system-level actions).
  let entryAssetId = '';
  if ('assetId' in action && action.assetId instanceof Uint8Array) {
    entryAssetId = toHex(action.assetId as Uint8Array);
  }

  // Apply per-asset scope filter.
  if (assetIdFilter !== null && entryAssetId !== assetIdFilter) {
    return null;
  }

  // Settlement-specific columns.
  let shardId = '';
  let fromSeq = '';
  let toSeq = '';
  let tipHash = '';
  let itemsRoot = '';
  let deltaCount = '';

  if (action.kind === ActionKind.BatchSettlement) {
    shardId = toHex(action.shardId);
    fromSeq = action.fromSeq.toString();
    toSeq = action.toSeq.toString();
    tipHash = toHex(action.tipHash);
    itemsRoot = toHex(action.itemsRoot);
    deltaCount = action.memberDeltas.length.toString();
  }

  // Transfer / mint / burn columns.
  let from = '';
  let to = '';
  let amount = '';

  if (action.kind === ActionKind.Transfer) {
    from = toHex(action.from);
    to = toHex(action.to);
    amount = action.amount.toString();
  } else if (action.kind === ActionKind.Burn) {
    from = toHex(action.from);
    amount = action.amount.toString();
  } else if (action.kind === ActionKind.Mint) {
    to = toHex(action.to);
    amount = action.amount.toString();
  } else if (action.kind === ActionKind.MultiTransfer) {
    // MultiTransfer: encode as summarised counts; individual legs not inlined.
    amount = action.legs.length.toString();
  }

  return [
    seq,
    entryHash,
    kind,
    entryAssetId,
    shardId,
    fromSeq,
    toSeq,
    tipHash,
    itemsRoot,
    deltaCount,
    from,
    to,
    amount,
    acceptedAt,
  ];
}

// ── AuditExportService ────────────────────────────────────────────────────────

/**
 * Streams asset-ledger entries as a UTF-8 CSV audit trail.
 *
 * Instantiate once; call `streamCsv` for each export request.  The service
 * holds no mutable state between calls.
 *
 * @see Requirement 11.2
 */
export class AuditExportService {
  /**
   * Write a CSV audit trail to `writer`.
   *
   * @param reader     - Source of raw ledger entries.
   * @param assetId    - Hex asset ID to scope the export, or `null` for all.
   * @param writer     - Writable stream that receives the CSV bytes.
   */
  async streamCsv(
    reader: IAssetLedgerReader,
    assetId: string | null,
    writer: Writable,
  ): Promise<void> {
    // Header row.
    writer.write(rowToCsvLine([...AUDIT_CSV_COLUMNS]));

    const iterable = reader.entries();

    if (Symbol.asyncIterator in (iterable as object)) {
      for await (const entry of iterable as AsyncIterable<ILedgerRawEntry>) {
        this._writeEntry(entry, assetId, writer);
      }
    } else {
      for (const entry of iterable as Iterable<ILedgerRawEntry>) {
        this._writeEntry(entry, assetId, writer);
      }
    }
  }

  private _writeEntry(
    entry: ILedgerRawEntry,
    assetId: string | null,
    writer: Writable,
  ): void {
    let action: IAssetAction;
    try {
      action = AssetActionSerializer.deserialize(entry.payload);
    } catch {
      // Silently skip malformed entries.
      return;
    }

    const row = buildRow(entry, action, assetId);
    if (row !== null) {
      writer.write(rowToCsvLine(row));
    }
  }
}
