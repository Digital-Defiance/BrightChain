/**
 * @fileoverview AssetStateReducer — deterministic state transition function.
 *
 * Applies a validated `IAssetAction` to an `IAssetProjectedState`, returning a
 * new immutable state object.  Every call increments `lastSequence` by one.
 *
 * This module assumes the action has already been accepted by
 * `AssetActionValidator.validate`.  Passing an invalid action produces
 * undefined behaviour.
 *
 * For `BatchSettlementAction`, member deltas are applied to `balances` using the
 * `shardId` as the outer asset-key.  Callers should use a `shardId` that matches
 * the relevant `assetId` when cross-asset balance lookup is required.
 *
 * @see Requirements 3.1–3.6, 10.4, 11.1–11.4, 12.4–12.5
 * @see Design: Layer 3 — Programmable Asset Ledger § Balance Projection
 */

import { AuthorizedSignerSet } from '@brightchain/brightchain-lib';
import {
  ActionKind,
  type IAssetAction,
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
import type {
  IAssetDescriptor,
  IAssetProjectedState,
  IDisputeRecord,
  IProcessKeyRecord,
  IShardSettlementState,
} from './projectedState.js';
import type { ILedgerContext } from './validator.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function toHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

function nextSeq(state: IAssetProjectedState): bigint {
  return state.lastSequence + 1n;
}

/**
 * Return a new `Map` with `key` set to `value`, copying all existing entries.
 */
function mapSet<K, V>(map: ReadonlyMap<K, V>, key: K, value: V): Map<K, V> {
  const m = new Map(map);
  m.set(key, value);
  return m;
}

/**
 * Return a new `Set` containing all existing members plus `value`.
 */
function setAdd(
  base: ReadonlySet<string> | undefined,
  value: string,
): Set<string> {
  const s = new Set(base ?? []);
  s.add(value);
  return s;
}

/**
 * Return a new `Set` containing all existing members except `value`.
 */
function setRemove(
  base: ReadonlySet<string> | undefined,
  value: string,
): Set<string> {
  const s = new Set(base ?? []);
  s.delete(value);
  return s;
}

/**
 * Read a balance from the state, returning `0n` for absent entries.
 */
function getBalance(
  balances: ReadonlyMap<string, ReadonlyMap<string, bigint>>,
  assetId: string,
  accountHex: string,
): bigint {
  return balances.get(assetId)?.get(accountHex) ?? 0n;
}

/**
 * Return a new two-level balances map with `(assetId, accountHex)` set to
 * `newBalance`.  Entries with a zero balance are pruned to save memory.
 */
function updateBalance(
  balances: ReadonlyMap<string, ReadonlyMap<string, bigint>>,
  assetId: string,
  accountHex: string,
  newBalance: bigint,
): Map<string, Map<string, bigint>> {
  const outer = new Map([...balances].map(([k, v]) => [k, new Map(v)]));
  const inner = outer.get(assetId) ?? new Map<string, bigint>();
  if (newBalance === 0n) {
    inner.delete(accountHex);
  } else {
    inner.set(accountHex, newBalance);
  }
  outer.set(assetId, inner);
  return outer;
}

// ── Per-action reducers ───────────────────────────────────────────────────────

function reduceIssueAsset(
  action: IIssueAssetAction,
  state: IAssetProjectedState,
  context: ILedgerContext,
): IAssetProjectedState {
  const assetId = context.derivedAssetId!;
  const descriptor: IAssetDescriptor = {
    symbol: action.symbol,
    displayName: action.displayName,
    decimals: action.decimals,
    supplyPolicy: action.supplyPolicy,
    transferPolicy: action.transferPolicy,
    freezable: action.freezable,
    burnable: action.burnable,
    brightTrustPolicy: action.initialBrightTrustPolicy,
  };
  const issuerSet = new AuthorizedSignerSet(
    [...action.initialIssuerSet],
    action.initialBrightTrustPolicy,
  );
  return {
    ...state,
    lastSequence: nextSeq(state),
    assets: mapSet(state.assets, assetId, descriptor),
    balances: new Map([
      ...state.balances,
      [assetId, new Map<string, bigint>()],
    ]),
    frozen: new Map([...state.frozen, [assetId, new Set<string>()]]),
    operatorFrozen: new Map([
      ...state.operatorFrozen,
      [assetId, new Set<string>()],
    ]),
    whitelist: new Map([...state.whitelist, [assetId, new Set<string>()]]),
    issuedTotal: new Map([...state.issuedTotal, [assetId, 0n]]),
    burnedTotal: new Map([...state.burnedTotal, [assetId, 0n]]),
    issuerSets: mapSet(state.issuerSets, assetId, issuerSet),
  };
}

function reduceMint(
  action: IMintAction,
  state: IAssetProjectedState,
  _context: ILedgerContext,
): IAssetProjectedState {
  const assetId = toHex(action.assetId);
  const toHexKey = toHex(action.to);
  const current = getBalance(state.balances, assetId, toHexKey);
  const currentIssued = state.issuedTotal.get(assetId) ?? 0n;
  return {
    ...state,
    lastSequence: nextSeq(state),
    balances: updateBalance(
      state.balances,
      assetId,
      toHexKey,
      current + action.amount,
    ),
    issuedTotal: mapSet(
      state.issuedTotal,
      assetId,
      currentIssued + action.amount,
    ),
  };
}

function reduceBurn(
  action: IBurnAction,
  state: IAssetProjectedState,
  _context: ILedgerContext,
): IAssetProjectedState {
  const assetId = toHex(action.assetId);
  const fromHex = toHex(action.from);
  const current = getBalance(state.balances, assetId, fromHex);
  const currentBurned = state.burnedTotal.get(assetId) ?? 0n;
  return {
    ...state,
    lastSequence: nextSeq(state),
    balances: updateBalance(
      state.balances,
      assetId,
      fromHex,
      current - action.amount,
    ),
    burnedTotal: mapSet(
      state.burnedTotal,
      assetId,
      currentBurned + action.amount,
    ),
  };
}

function reduceTransfer(
  action: ITransferAction,
  state: IAssetProjectedState,
  _context: ILedgerContext,
): IAssetProjectedState {
  const assetId = toHex(action.assetId);
  const fromHex = toHex(action.from);
  const toHexKey = toHex(action.to);
  const fromBal = getBalance(state.balances, assetId, fromHex);
  const toBal = getBalance(state.balances, assetId, toHexKey);
  const currentNonce = state.nonces.get(fromHex) ?? 0n;
  let balances = updateBalance(
    state.balances,
    assetId,
    fromHex,
    fromBal - action.amount,
  );
  balances = updateBalance(balances, assetId, toHexKey, toBal + action.amount);
  return {
    ...state,
    lastSequence: nextSeq(state),
    balances,
    nonces: mapSet(state.nonces, fromHex, currentNonce + 1n),
  };
}

function reduceMultiTransfer(
  action: IMultiTransferAction,
  state: IAssetProjectedState,
  _context: ILedgerContext,
): IAssetProjectedState {
  // Apply each leg sequentially, accumulating balance and nonce changes.
  // The multi-transfer counts as a single sequence increment.
  let balances: Map<string, Map<string, bigint>> = new Map(
    [...state.balances].map(([k, v]) => [k, new Map(v)]),
  );
  const nonces: Map<string, bigint> = new Map(state.nonces);

  for (const leg of action.legs) {
    const assetId = toHex(leg.assetId);
    const fromHex = toHex(leg.from);
    const toHexKey = toHex(leg.to);
    const fromBal = balances.get(assetId)?.get(fromHex) ?? 0n;
    const toBal = balances.get(assetId)?.get(toHexKey) ?? 0n;
    const currentNonce = nonces.get(fromHex) ?? 0n;

    // Ensure inner map exists
    if (!balances.has(assetId)) {
      balances.set(assetId, new Map<string, bigint>());
    }
    const inner = balances.get(assetId)!;

    const newFrom = fromBal - leg.amount;
    const newTo = toBal + leg.amount;
    if (newFrom === 0n) inner.delete(fromHex);
    else inner.set(fromHex, newFrom);
    if (newTo === 0n) inner.delete(toHexKey);
    else inner.set(toHexKey, newTo);
    nonces.set(fromHex, currentNonce + 1n);
  }

  return {
    ...state,
    lastSequence: nextSeq(state),
    balances,
    nonces,
  };
}

function reduceFreezeAccount(
  action: IFreezeAccountAction,
  state: IAssetProjectedState,
  _context: ILedgerContext,
): IAssetProjectedState {
  const assetId = toHex(action.assetId);
  const accountHex = toHex(action.account);
  const existing = state.frozen.get(assetId);
  return {
    ...state,
    lastSequence: nextSeq(state),
    frozen: mapSet(state.frozen, assetId, setAdd(existing, accountHex)),
  };
}

function reduceUnfreezeAccount(
  action: IUnfreezeAccountAction,
  state: IAssetProjectedState,
  _context: ILedgerContext,
): IAssetProjectedState {
  const assetId = toHex(action.assetId);
  const accountHex = toHex(action.account);
  const existing = state.frozen.get(assetId);
  return {
    ...state,
    lastSequence: nextSeq(state),
    frozen: mapSet(state.frozen, assetId, setRemove(existing, accountHex)),
  };
}

function reduceWhitelistAdd(
  action: IWhitelistAddAction,
  state: IAssetProjectedState,
  _context: ILedgerContext,
): IAssetProjectedState {
  const assetId = toHex(action.assetId);
  const accountHex = toHex(action.account);
  const existing = state.whitelist.get(assetId);
  return {
    ...state,
    lastSequence: nextSeq(state),
    whitelist: mapSet(state.whitelist, assetId, setAdd(existing, accountHex)),
  };
}

function reduceWhitelistRemove(
  action: IWhitelistRemoveAction,
  state: IAssetProjectedState,
  _context: ILedgerContext,
): IAssetProjectedState {
  const assetId = toHex(action.assetId);
  const accountHex = toHex(action.account);
  const existing = state.whitelist.get(assetId);
  return {
    ...state,
    lastSequence: nextSeq(state),
    whitelist: mapSet(
      state.whitelist,
      assetId,
      setRemove(existing, accountHex),
    ),
  };
}

function reduceRotateIssuerSet(
  action: IRotateIssuerSetAction,
  state: IAssetProjectedState,
  _context: ILedgerContext,
): IAssetProjectedState {
  const assetId = toHex(action.assetId);
  const newIssuerSet = new AuthorizedSignerSet(
    [...action.newIssuerSet],
    action.newBrightTrustPolicy,
  );
  // Also update the brightTrustPolicy in the asset descriptor
  const existing = state.assets.get(assetId);
  const updatedDescriptor: IAssetDescriptor | undefined = existing
    ? { ...existing, brightTrustPolicy: action.newBrightTrustPolicy }
    : undefined;
  return {
    ...state,
    lastSequence: nextSeq(state),
    issuerSets: mapSet(state.issuerSets, assetId, newIssuerSet),
    assets: updatedDescriptor
      ? mapSet(state.assets, assetId, updatedDescriptor)
      : state.assets,
  };
}

function reduceRetireAsset(
  action: IRetireAssetAction,
  state: IAssetProjectedState,
  _context: ILedgerContext,
): IAssetProjectedState {
  const assetId = toHex(action.assetId);
  return {
    ...state,
    lastSequence: nextSeq(state),
    retiredAssets: setAdd(state.retiredAssets, assetId),
  };
}

function reduceAttestation(
  state: IAssetProjectedState,
  _context: ILedgerContext,
): IAssetProjectedState {
  // Attestation is informational only; advance sequence.
  return {
    ...state,
    lastSequence: nextSeq(state),
  };
}

function reduceOperatorFreeze(
  action: IOperatorFreezeAction,
  state: IAssetProjectedState,
  _context: ILedgerContext,
): IAssetProjectedState {
  const accountHex = toHex(action.account);
  // OperatorFreeze applies globally — affects ALL known assets.
  const operatorFrozen: Map<string, Set<string>> = new Map();
  for (const [assetId, existing] of state.operatorFrozen) {
    if (action.frozen) {
      operatorFrozen.set(assetId, setAdd(existing, accountHex));
    } else {
      operatorFrozen.set(assetId, setRemove(existing, accountHex));
    }
  }
  // Ensure any asset in assets map also has an entry
  for (const assetId of state.assets.keys()) {
    if (!operatorFrozen.has(assetId)) {
      const base = state.operatorFrozen.get(assetId);
      if (action.frozen) {
        operatorFrozen.set(assetId, setAdd(base, accountHex));
      } else {
        operatorFrozen.set(assetId, setRemove(base, accountHex));
      }
    }
  }
  return {
    ...state,
    lastSequence: nextSeq(state),
    operatorFrozen,
  };
}

function reduceBatchSettlement(
  action: IBatchSettlementAction,
  state: IAssetProjectedState,
  context: ILedgerContext,
): IAssetProjectedState {
  // Apply member deltas to balances keyed by shardId as the outer asset key.
  // Callers should align shardId with the corresponding assetId when needed.
  const shardKey = toHex(action.shardId);
  let balances: Map<string, Map<string, bigint>> = new Map(
    [...state.balances].map(([k, v]) => [k, new Map(v)]),
  );

  // Ensure the shard's balance namespace exists
  if (!balances.has(shardKey)) {
    balances.set(shardKey, new Map<string, bigint>());
  }
  const shardBalances = balances.get(shardKey)!;

  for (const delta of action.memberDeltas) {
    const memberHex = toHex(delta.memberKey);
    const current = shardBalances.get(memberHex) ?? 0n;
    const next = current + delta.delta;
    if (next === 0n) {
      shardBalances.delete(memberHex);
    } else {
      shardBalances.set(memberHex, next);
    }
  }

  const shardState: IShardSettlementState = {
    nextExpectedSeq: action.toSeq + 1n,
    lastSettledAt: context.now,
    lastTipHash: action.tipHash,
  };

  return {
    ...state,
    lastSequence: nextSeq(state),
    balances,
    shardSettlement: mapSet(state.shardSettlement, shardKey, shardState),
  };
}

function reduceProcessKeyCert(
  action: IProcessKeyCertAction,
  state: IAssetProjectedState,
  _context: ILedgerContext,
): IAssetProjectedState {
  const fingerprint = toHex(action.processPublicKey);
  const record: IProcessKeyRecord = {
    publicKey: action.processPublicKey,
    notBefore: action.notBefore,
    notAfter: action.notAfter,
    shardIds: action.shardIds,
    revoked: false,
  };

  // Pre-register any shards this key covers that are not yet tracked.
  // IProcessKeyCertAction.shardIds is `readonly string[]` where each entry
  // is already the hex representation of the shard's GuidV7 bytes — the
  // same format used as map keys by reduceBatchSettlement and
  // validateBatchSettlement (via `toHex(action.shardId)`).  Use the string
  // directly instead of re-encoding it through Buffer.from, which would
  // interpret the hex string as UTF-8 bytes and produce a different key.
  let shardSettlement = new Map(state.shardSettlement);
  for (const shardId of action.shardIds) {
    if (!shardSettlement.has(shardId)) {
      shardSettlement.set(shardId, {
        nextExpectedSeq: 0n,
        lastSettledAt: 0,
        lastTipHash: new Uint8Array(32),
      });
    }
  }

  return {
    ...state,
    lastSequence: nextSeq(state),
    processKeys: mapSet(state.processKeys, fingerprint, record),
    shardSettlement,
  };
}

function reduceProcessKeyRevoke(
  action: IProcessKeyRevokeAction,
  state: IAssetProjectedState,
  _context: ILedgerContext,
): IAssetProjectedState {
  const fpHex = toHex(action.processKeyFingerprint);
  const existing = state.processKeys.get(fpHex);
  if (!existing) {
    // Validator ensures this never happens; guard for safety.
    return { ...state, lastSequence: nextSeq(state) };
  }
  const updated: IProcessKeyRecord = {
    ...existing,
    revoked: true,
    effectiveRevokedAtSeq: action.effectiveAtSeq ?? nextSeq(state),
  };
  return {
    ...state,
    lastSequence: nextSeq(state),
    processKeys: mapSet(state.processKeys, fpHex, updated),
  };
}

function reduceBatchChallenge(
  action: IBatchChallengeAction,
  state: IAssetProjectedState,
  _context: ILedgerContext,
): IAssetProjectedState {
  const shardKey = toHex(action.shardId);
  const disputeKey = `${shardKey}:${action.settlementSeq}`;
  const record: IDisputeRecord = {
    shardId: shardKey,
    settlementSeq: action.settlementSeq,
    challengeSeq: nextSeq(state),
    challengerKey: toHex(action.challengerKey),
    resolved: false,
  };
  return {
    ...state,
    lastSequence: nextSeq(state),
    disputes: mapSet(state.disputes, disputeKey, record),
  };
}

function reduceBatchSettlementResolution(
  action: IBatchSettlementResolutionAction,
  state: IAssetProjectedState,
  _context: ILedgerContext,
): IAssetProjectedState {
  const shardKey = toHex(action.shardId);
  const disputeKey = `${shardKey}:${action.settlementSeq}`;
  const existing = state.disputes.get(disputeKey);
  if (!existing) {
    return { ...state, lastSequence: nextSeq(state) };
  }

  const resolved: IDisputeRecord = {
    ...existing,
    resolved: true,
    outcome: action.outcome,
  };

  let balances: Map<string, Map<string, bigint>> = new Map(
    [...state.balances].map(([k, v]) => [k, new Map(v)]),
  );

  if (action.outcome === 'rejected') {
    // The shardId-keyed balance namespace holds the original deltas.
    // We do not have access to the original deltas here, so we rely on
    // `correctedDeltas` to replace the net effect.  If correctedDeltas is
    // absent, only the dispute record is updated (the operator must issue
    // a corrective Mint/Burn separately).
    if (action.correctedDeltas && action.correctedDeltas.length > 0) {
      if (!balances.has(shardKey)) {
        balances.set(shardKey, new Map<string, bigint>());
      }
      const shardBalances = balances.get(shardKey)!;
      for (const delta of action.correctedDeltas) {
        const memberHex = toHex(delta.memberKey);
        const current = shardBalances.get(memberHex) ?? 0n;
        const next = current + delta.delta;
        if (next === 0n) {
          shardBalances.delete(memberHex);
        } else {
          shardBalances.set(memberHex, next);
        }
      }
    }
  }

  return {
    ...state,
    lastSequence: nextSeq(state),
    disputes: mapSet(state.disputes, disputeKey, resolved),
    balances,
  };
}

// ── Main dispatch ─────────────────────────────────────────────────────────────

/**
 * Deterministic state reducer for the programmable asset ledger.
 *
 * @param state   - Current projected state.
 * @param action  - Validated action to apply.
 * @param context - Environmental context (clock, signers, etc.).
 * @returns New projected state with `lastSequence` incremented by one.
 */
export class AssetStateReducer {
  static reduce(
    state: IAssetProjectedState,
    action: IAssetAction,
    context: ILedgerContext,
  ): IAssetProjectedState {
    switch (action.kind) {
      case ActionKind.IssueAsset:
        return reduceIssueAsset(action, state, context);
      case ActionKind.Mint:
        return reduceMint(action, state, context);
      case ActionKind.Burn:
        return reduceBurn(action, state, context);
      case ActionKind.Transfer:
        return reduceTransfer(action, state, context);
      case ActionKind.MultiTransfer:
        return reduceMultiTransfer(action, state, context);
      case ActionKind.FreezeAccount:
        return reduceFreezeAccount(action, state, context);
      case ActionKind.UnfreezeAccount:
        return reduceUnfreezeAccount(action, state, context);
      case ActionKind.WhitelistAdd:
        return reduceWhitelistAdd(action, state, context);
      case ActionKind.WhitelistRemove:
        return reduceWhitelistRemove(action, state, context);
      case ActionKind.RotateIssuerSet:
        return reduceRotateIssuerSet(action, state, context);
      case ActionKind.RetireAsset:
        return reduceRetireAsset(action, state, context);
      case ActionKind.Attestation:
        return reduceAttestation(state, context);
      case ActionKind.OperatorFreeze:
        return reduceOperatorFreeze(action, state, context);
      case ActionKind.BatchSettlement:
        return reduceBatchSettlement(action, state, context);
      case ActionKind.ProcessKeyCert:
        return reduceProcessKeyCert(action, state, context);
      case ActionKind.ProcessKeyRevoke:
        return reduceProcessKeyRevoke(action, state, context);
      case ActionKind.BatchChallenge:
        return reduceBatchChallenge(action, state, context);
      case ActionKind.BatchSettlementResolution:
        return reduceBatchSettlementResolution(action, state, context);
      default:
        throw new Error(`Unhandled action kind: ${action.kind}`);
    }
  }
}
