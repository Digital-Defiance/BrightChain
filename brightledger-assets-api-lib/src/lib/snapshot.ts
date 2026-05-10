/**
 * @fileoverview Snapshot subsystem for the programmable-asset-ledger projection layer.
 *
 * Provides `IAssetSnapshot`, `ISnapshotStore`, `MemorySnapshotStore`, `SnapshotService`,
 * and `computeStateHash` — the SHA-256 digest of a deterministic canonical JSON
 * representation of an `IAssetProjectedState`.
 *
 * @see Requirements 3.5, 3.6
 */

import { createHash } from 'node:crypto';

import type { AuthorizedSignerSet } from '@brightchain/brightchain-lib';
import type { IAssetProjectedState } from './projectedState.js';

// ── Canonical serialisation ───────────────────────────────────────────────────

/**
 * Recursively convert an `IAssetProjectedState` (or any sub-value) to a
 * plain JSON-serialisable tree using deterministic encoding:
 *
 * - `bigint`           → `"__bigint__:<n>"`
 * - `Uint8Array`       → `"__bytes__:<hex>"`
 * - `Map`              → `{ __map__: [[k,v], ...] }` sorted by key
 * - `Set`              → `{ __set__: [v, ...] }` sorted
 * - `AuthorizedSignerSet` → `{ __signerSet__: { signers, quorum } }`
 * - Plain object       → `{ [k]: recurse(v) }`
 * - Array              → `[recurse(v), ...]`
 */
function toCanonical(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return `__bigint__:${value.toString()}`;
  }

  if (value instanceof Uint8Array) {
    return `__bytes__:${Buffer.from(value).toString('hex')}`;
  }

  // Duck-type AuthorizedSignerSet before generic Map/object checks
  if (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as Record<string, unknown>)['getAllSigners'] === 'function' &&
    typeof (value as Record<string, unknown>)['brightTrustPolicy'] === 'object'
  ) {
    const signerSet = value as AuthorizedSignerSet;
    const signers = signerSet
      .getAllSigners()
      .map((s) => ({
        publicKey: Buffer.from(s.publicKey).toString('hex'),
        role: s.role,
        status: s.status,
      }))
      .sort((a, b) => a.publicKey.localeCompare(b.publicKey));
    return {
      __signerSet__: {
        signers,
        quorum: toCanonical(signerSet.brightTrustPolicy),
      },
    };
  }

  if (value instanceof Map) {
    const entries = [...value.entries()]
      .map(([k, v]) => [k, toCanonical(v)] as [unknown, unknown])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    return { __map__: entries };
  }

  if (value instanceof Set) {
    return { __set__: [...value].map(toCanonical).sort() };
  }

  if (Array.isArray(value)) {
    return value.map(toCanonical);
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = toCanonical(v);
    }
    return result;
  }

  return value;
}

/**
 * Compute a SHA-256 digest of the deterministic canonical JSON representation
 * of `state`.  Two states are semantically equal if and only if their digests
 * match (assuming no SHA-256 collision).
 */
export function computeStateHash(state: IAssetProjectedState): Uint8Array {
  const canonical = toCanonical(state as unknown);
  const json = JSON.stringify(canonical);
  return new Uint8Array(createHash('sha256').update(json, 'utf8').digest());
}

// ── IAssetSnapshot ────────────────────────────────────────────────────────────

/**
 * Snapshot envelope: the full projected state at a known sequence number,
 * together with a tamper-detecting hash.
 *
 * Keyed by `(ledgerId, sequenceNumber)`.
 */
export interface IAssetSnapshot {
  /** Identifier of the ledger this snapshot belongs to. */
  readonly ledgerId: string;
  /**
   * Value of `IAssetProjectedState.lastSequence` at the time the snapshot
   * was taken.  Equals the number of entries that have been applied.
   */
  readonly sequenceNumber: bigint;
  /** The full projected state. */
  readonly state: IAssetProjectedState;
  /** SHA-256 of the canonical JSON serialisation of `state`. */
  readonly stateHash: Uint8Array;
  /** Wall-clock time (ms since epoch) when the snapshot was written. */
  readonly createdAt: number;
}

// ── ISnapshotStore ────────────────────────────────────────────────────────────

/**
 * Minimal storage abstraction for `IAssetSnapshot` values.
 *
 * Implementations may back this with in-memory storage (tests), disk, a
 * block-store adapter, or a remote key-value service.
 */
export interface ISnapshotStore {
  /** Persist a snapshot.  Overwrites any existing entry at the same key. */
  save(snapshot: IAssetSnapshot): Promise<void>;
  /** Return the snapshot with the highest `sequenceNumber`, or `undefined`. */
  loadLatest(ledgerId: string): Promise<IAssetSnapshot | undefined>;
  /** Remove all snapshots for `ledgerId`. */
  deleteAll(ledgerId: string): Promise<void>;
}

// ── MemorySnapshotStore ───────────────────────────────────────────────────────

/**
 * In-memory `ISnapshotStore` implementation for use in tests and development.
 *
 * Snapshots are appended in insertion order; `loadLatest` returns the last one.
 */
export class MemorySnapshotStore implements ISnapshotStore {
  private readonly _snapshots = new Map<string, IAssetSnapshot[]>();

  async save(snapshot: IAssetSnapshot): Promise<void> {
    const list = this._snapshots.get(snapshot.ledgerId) ?? [];
    list.push(snapshot);
    this._snapshots.set(snapshot.ledgerId, list);
  }

  async loadLatest(ledgerId: string): Promise<IAssetSnapshot | undefined> {
    const list = this._snapshots.get(ledgerId);
    if (!list || list.length === 0) return undefined;
    return list[list.length - 1];
  }

  async deleteAll(ledgerId: string): Promise<void> {
    this._snapshots.delete(ledgerId);
  }
}

// ── SnapshotService ───────────────────────────────────────────────────────────

/**
 * Coordinates snapshot creation and retrieval for a given ledger.
 *
 * Callers (`BalanceProjectionService`) invoke `save` periodically and
 * `loadLatest` during warm-start recovery.
 */
export class SnapshotService {
  /**
   * Number of entries applied between automatic snapshots.
   * @default 1000
   */
  readonly snapshotIntervalEntries: number;

  constructor(
    private readonly store: ISnapshotStore,
    snapshotIntervalEntries = 1_000,
  ) {
    this.snapshotIntervalEntries = snapshotIntervalEntries;
  }

  /**
   * Persist a snapshot of `state` under `ledgerId`.
   *
   * @returns The `IAssetSnapshot` that was stored.
   */
  async save(
    ledgerId: string,
    state: IAssetProjectedState,
  ): Promise<IAssetSnapshot> {
    const snapshot: IAssetSnapshot = {
      ledgerId,
      sequenceNumber: state.lastSequence,
      state,
      stateHash: computeStateHash(state),
      createdAt: Date.now(),
    };
    await this.store.save(snapshot);
    return snapshot;
  }

  /**
   * Load the most recent snapshot for `ledgerId`, or `undefined` if none.
   */
  async loadLatest(ledgerId: string): Promise<IAssetSnapshot | undefined> {
    return this.store.loadLatest(ledgerId);
  }
}
