/**
 * @fileoverview AssetActionValidator — pure, I/O-free validation of every
 * asset action kind against the current `IAssetProjectedState`.
 *
 * All methods are pure functions of `(action, state, context)`. No mutations
 * are made to the state or action arguments.
 *
 * @see Requirements 2.1–2.9
 * @see Design: Layer 3 — Programmable Asset Ledger § Validation
 */

import type { AuthorizedSignerSet } from '@brightchain/brightchain-lib';
import {
  ActionKind,
  DEFAULT_DISPUTE_WINDOW_MS,
  type IAssetAction,
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
  MAX_DISPUTE_WINDOW_MS,
  MIN_DISPUTE_WINDOW_MS,
  PROCESS_KEY_MAX_VALIDITY_MS,
} from '@brightchain/brightledger-assets-lib';
import type { IAssetProjectedState } from './projectedState.js';
import {
  AssetValidationErrorCode,
  fail,
  ok,
  type ValidationResult,
} from './validationResult.js';

export {
  DEFAULT_DISPUTE_WINDOW_MS,
  MAX_DISPUTE_WINDOW_MS,
  MIN_DISPUTE_WINDOW_MS,
  PROCESS_KEY_MAX_VALIDITY_MS,
};

/** Maximum byte length of memo fields. */
const MEMO_MAX_BYTES = 256;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a `Uint8Array` to a lower-case hex string for use as map key. */
function toHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

/** Encode a memo string to bytes and return its length. */
function memoBytes(memo: string | Uint8Array | undefined | null): number {
  if (!memo) return 0;
  if (typeof memo === 'string') return new TextEncoder().encode(memo).length;
  return memo.length;
}

/**
 * Environmental context provided to the validator for each call.
 *
 * The caller (typically the Submission_Service) populates this from the
 * enclosing ledger entry's signature context.
 */
export interface ILedgerContext {
  /**
   * Current wall-clock time in milliseconds since Unix epoch.
   * Used for expiry and process-key validity checks.
   */
  readonly now: number;

  /**
   * Public key(s) that have signed this action, used for quorum checks on
   * governance-class actions (Freeze, Unfreeze, Whitelist, Rotate, Retire, etc.)
   * If the action was signed by a single key, pass `[signerPublicKey]`.
   */
  readonly signerPublicKeys: readonly Uint8Array[];

  /**
   * Deployment-wide system signer set for `OperatorFreeze` validation.
   * If absent, `OperatorFreezeAction` is rejected with `SystemPolicyNotSatisfied`.
   */
  readonly systemSignerSet?: AuthorizedSignerSet;

  /**
   * Dispute window in milliseconds.
   * Clamped to [MIN_DISPUTE_WINDOW_MS, MAX_DISPUTE_WINDOW_MS].
   * Defaults to DEFAULT_DISPUTE_WINDOW_MS when absent.
   */
  readonly disputeWindowMs?: number;

  /**
   * For `IssueAssetAction` only: the pre-computed `Asset_Id` string.
   *
   * The derivation is `hex(SHA-256(issuerPublicKey || issuanceEntryHash))` and
   * must be computed by the caller, who has access to the entry hash and issuer key.
   * The validator uses this to check for duplicate registration.
   */
  readonly derivedAssetId?: string;
}

// ── Main validator ─────────────────────────────────────────────────────────

/**
 * Pure validator for `IAssetAction` objects.
 *
 * Usage:
 * ```typescript
 * const result = AssetActionValidator.validate(action, state, context);
 * if (!result.valid) { console.error(result.code, result.message); }
 * ```
 */
export class AssetActionValidator {
  /**
   * Validate an `IAssetAction` against the current projected state.
   *
   * Returns `{ valid: true }` on success or `{ valid: false, code, message }`
   * on the first rule violation encountered.
   */
  static validate(
    action: IAssetAction,
    state: IAssetProjectedState,
    context: ILedgerContext,
  ): ValidationResult {
    switch (action.kind) {
      case ActionKind.IssueAsset:
        return AssetActionValidator.validateIssueAsset(action, state, context);
      case ActionKind.Mint:
        return AssetActionValidator.validateMint(action, state, context);
      case ActionKind.Burn:
        return AssetActionValidator.validateBurn(action, state, context);
      case ActionKind.Transfer:
        return AssetActionValidator.validateTransfer(action, state, context);
      case ActionKind.MultiTransfer:
        return AssetActionValidator.validateMultiTransfer(
          action,
          state,
          context,
        );
      case ActionKind.FreezeAccount:
        return AssetActionValidator.validateFreezeAccount(
          action,
          state,
          context,
        );
      case ActionKind.UnfreezeAccount:
        return AssetActionValidator.validateUnfreezeAccount(
          action,
          state,
          context,
        );
      case ActionKind.WhitelistAdd:
        return AssetActionValidator.validateWhitelistAdd(
          action,
          state,
          context,
        );
      case ActionKind.WhitelistRemove:
        return AssetActionValidator.validateWhitelistRemove(
          action,
          state,
          context,
        );
      case ActionKind.RotateIssuerSet:
        return AssetActionValidator.validateRotateIssuerSet(
          action,
          state,
          context,
        );
      case ActionKind.RetireAsset:
        return AssetActionValidator.validateRetireAsset(action, state, context);
      case ActionKind.Attestation:
        return AssetActionValidator.validateAttestation(action, state, context);
      case ActionKind.OperatorFreeze:
        return AssetActionValidator.validateOperatorFreeze(
          action,
          state,
          context,
        );
      case ActionKind.BatchSettlement:
        return AssetActionValidator.validateBatchSettlement(
          action,
          state,
          context,
        );
      case ActionKind.ProcessKeyCert:
        return AssetActionValidator.validateProcessKeyCert(
          action,
          state,
          context,
        );
      case ActionKind.ProcessKeyRevoke:
        return AssetActionValidator.validateProcessKeyRevoke(
          action,
          state,
          context,
        );
      case ActionKind.BatchChallenge:
        return AssetActionValidator.validateBatchChallenge(
          action,
          state,
          context,
        );
      case ActionKind.BatchSettlementResolution:
        return AssetActionValidator.validateBatchSettlementResolution(
          action,
          state,
          context,
        );
      default:
        throw new Error(`Unhandled action kind: ${action.kind}`);
    }
  }

  // ── IssueAsset ────────────────────────────────────────────────────────

  private static validateIssueAsset(
    action: IIssueAssetAction,
    state: IAssetProjectedState,
    context: ILedgerContext,
  ): ValidationResult {
    const assetId = context.derivedAssetId;
    if (assetId !== undefined && state.assets.has(assetId)) {
      return fail(
        AssetValidationErrorCode.AssetAlreadyRegistered,
        `Asset '${assetId}' is already registered`,
      );
    }
    if (action.decimals < 0 || action.decimals > 18) {
      return fail(
        AssetValidationErrorCode.InvalidDecimals,
        `decimals must be in [0, 18], got ${action.decimals}`,
      );
    }
    return ok();
  }

  // ── Mint ──────────────────────────────────────────────────────────────

  private static validateMint(
    action: IMintAction,
    state: IAssetProjectedState,
    context: ILedgerContext,
  ): ValidationResult {
    const assetId = toHex(action.assetId);
    const descriptor = state.assets.get(assetId);
    if (!descriptor) {
      return fail(
        AssetValidationErrorCode.AssetNotFound,
        `Asset '${assetId}' not found`,
      );
    }
    if (state.retiredAssets.has(assetId)) {
      return fail(
        AssetValidationErrorCode.AssetRetired,
        `Asset '${assetId}' is retired`,
      );
    }
    if (descriptor.supplyPolicy === 'fixed') {
      return fail(
        AssetValidationErrorCode.SupplyPolicyViolation,
        `Asset '${assetId}' has a fixed supply`,
      );
    }
    if (
      typeof descriptor.supplyPolicy === 'object' &&
      descriptor.supplyPolicy.kind === 'capped'
    ) {
      const issued = state.issuedTotal.get(assetId) ?? 0n;
      const burned = state.burnedTotal.get(assetId) ?? 0n;
      if (issued - burned + action.amount > descriptor.supplyPolicy.cap) {
        return fail(
          AssetValidationErrorCode.SupplyPolicyViolation,
          `Mint would exceed cap of ${descriptor.supplyPolicy.cap}`,
        );
      }
    }
    const signerSet = state.issuerSets.get(assetId);
    if (
      !signerSet ||
      !AssetActionValidator.checkQuorum(signerSet, context.signerPublicKeys)
    ) {
      return fail(
        AssetValidationErrorCode.QuorumNotSatisfied,
        `Mint quorum not satisfied for asset '${assetId}'`,
      );
    }
    const destHex = toHex(action.to);
    if (AssetActionValidator.isAccountFrozen(state, assetId, destHex)) {
      return fail(
        AssetValidationErrorCode.AccountFrozen,
        `Destination '${destHex}' is frozen for asset '${assetId}'`,
      );
    }
    return ok();
  }

  // ── Burn ──────────────────────────────────────────────────────────────

  private static validateBurn(
    action: IBurnAction,
    state: IAssetProjectedState,
    _context: ILedgerContext,
  ): ValidationResult {
    const assetId = toHex(action.assetId);
    const descriptor = state.assets.get(assetId);
    if (!descriptor) {
      return fail(
        AssetValidationErrorCode.AssetNotFound,
        `Asset '${assetId}' not found`,
      );
    }
    if (state.retiredAssets.has(assetId)) {
      return fail(
        AssetValidationErrorCode.AssetRetired,
        `Asset '${assetId}' is retired`,
      );
    }
    if (!descriptor.burnable) {
      return fail(
        AssetValidationErrorCode.BurnNotAllowed,
        `Asset '${assetId}' is not burnable`,
      );
    }
    const fromHex = toHex(action.from);
    const balance = AssetActionValidator.getBalance(state, assetId, fromHex);
    if (balance < action.amount) {
      return fail(
        AssetValidationErrorCode.InsufficientBalance,
        `Insufficient balance: have ${balance}, need ${action.amount}`,
      );
    }
    return ok();
  }

  // ── Transfer ──────────────────────────────────────────────────────────

  private static validateTransfer(
    action: ITransferAction,
    state: IAssetProjectedState,
    context: ILedgerContext,
  ): ValidationResult {
    const assetId = toHex(action.assetId);
    const descriptor = state.assets.get(assetId);
    if (!descriptor) {
      return fail(
        AssetValidationErrorCode.AssetNotFound,
        `Asset '${assetId}' not found`,
      );
    }
    if (state.retiredAssets.has(assetId)) {
      return fail(
        AssetValidationErrorCode.AssetRetired,
        `Asset '${assetId}' is retired`,
      );
    }
    // Signer must be the source
    const fromHex = toHex(action.from);
    const signerHex = context.signerPublicKeys[0]
      ? toHex(context.signerPublicKeys[0])
      : '';
    if (!signerHex || signerHex !== fromHex) {
      return fail(
        AssetValidationErrorCode.SignerMismatch,
        `Signer '${signerHex}' must equal source '${fromHex}'`,
      );
    }
    if (action.amount <= 0n) {
      return fail(
        AssetValidationErrorCode.InsufficientBalance,
        `Transfer amount must be > 0`,
      );
    }
    // Nonce check
    const expectedNonce = (state.nonces.get(fromHex) ?? 0n) + 1n;
    if (action.nonce !== expectedNonce) {
      return fail(
        AssetValidationErrorCode.NonceMismatch,
        `Nonce mismatch: expected ${expectedNonce}, got ${action.nonce}`,
      );
    }
    // Expiry
    if (action.expiry !== null && action.expiry < context.now) {
      return fail(
        AssetValidationErrorCode.Expired,
        `Action expired at ${action.expiry}, now ${context.now}`,
      );
    }
    // Source frozen
    if (AssetActionValidator.isAccountFrozen(state, assetId, fromHex)) {
      return fail(
        AssetValidationErrorCode.AccountFrozen,
        `Source '${fromHex}' is frozen for asset '${assetId}'`,
      );
    }
    // Balance
    const balance = AssetActionValidator.getBalance(state, assetId, fromHex);
    if (balance < action.amount) {
      return fail(
        AssetValidationErrorCode.InsufficientBalance,
        `Insufficient balance: have ${balance}, need ${action.amount}`,
      );
    }
    // Whitelist
    if (descriptor.transferPolicy === 'whitelist') {
      const toHex_ = toHex(action.to);
      const wl = state.whitelist.get(assetId);
      if (!wl?.has(toHex_)) {
        return fail(
          AssetValidationErrorCode.WhitelistViolation,
          `Destination '${toHex_}' is not whitelisted for asset '${assetId}'`,
        );
      }
    }
    return ok();
  }

  // ── MultiTransfer ─────────────────────────────────────────────────────

  private static validateMultiTransfer(
    action: IMultiTransferAction,
    state: IAssetProjectedState,
    context: ILedgerContext,
  ): ValidationResult {
    // Validate each leg speculatively; earlier leg changes are visible to later legs
    const speculativeBalances = new Map<string, Map<string, bigint>>();
    const speculativeNonces = new Map<string, bigint>(state.nonces);

    for (const leg of action.legs) {
      const assetId = toHex(leg.assetId);
      const descriptor = state.assets.get(assetId);
      if (!descriptor) {
        return fail(
          AssetValidationErrorCode.AssetNotFound,
          `Asset '${assetId}' not found`,
        );
      }
      if (state.retiredAssets.has(assetId)) {
        return fail(
          AssetValidationErrorCode.AssetRetired,
          `Asset '${assetId}' is retired`,
        );
      }
      const fromHex = toHex(leg.from);
      const signerHex = context.signerPublicKeys[0]
        ? toHex(context.signerPublicKeys[0])
        : '';
      if (!signerHex || signerHex !== fromHex) {
        return fail(
          AssetValidationErrorCode.SignerMismatch,
          `Leg signer '${signerHex}' must equal source '${fromHex}'`,
        );
      }
      if (leg.amount <= 0n) {
        return fail(
          AssetValidationErrorCode.InsufficientBalance,
          `Leg transfer amount must be > 0`,
        );
      }
      const expectedNonce = (speculativeNonces.get(fromHex) ?? 0n) + 1n;
      if (leg.nonce !== expectedNonce) {
        return fail(
          AssetValidationErrorCode.NonceMismatch,
          `Leg nonce mismatch for '${fromHex}': expected ${expectedNonce}, got ${leg.nonce}`,
        );
      }
      if (leg.expiry !== null && leg.expiry < context.now) {
        return fail(
          AssetValidationErrorCode.Expired,
          `Leg expired at ${leg.expiry}`,
        );
      }
      if (AssetActionValidator.isAccountFrozen(state, assetId, fromHex)) {
        return fail(
          AssetValidationErrorCode.AccountFrozen,
          `Leg source '${fromHex}' is frozen for asset '${assetId}'`,
        );
      }
      // Speculative balance
      const baseBal =
        speculativeBalances.get(assetId)?.get(fromHex) ??
        AssetActionValidator.getBalance(state, assetId, fromHex);
      if (baseBal < leg.amount) {
        return fail(
          AssetValidationErrorCode.InsufficientBalance,
          `Leg insufficient balance for '${fromHex}' on '${assetId}': have ${baseBal}, need ${leg.amount}`,
        );
      }
      if (descriptor.transferPolicy === 'whitelist') {
        const toHex_ = toHex(leg.to);
        const wl = state.whitelist.get(assetId);
        if (!wl?.has(toHex_)) {
          return fail(
            AssetValidationErrorCode.WhitelistViolation,
            `Leg destination '${toHex_}' is not whitelisted for asset '${assetId}'`,
          );
        }
      }
      // Apply speculatively
      if (!speculativeBalances.has(assetId)) {
        speculativeBalances.set(assetId, new Map());
      }
      const assetBals = speculativeBalances.get(assetId) as Map<string, bigint>;
      const toHex_ = toHex(leg.to);
      assetBals.set(fromHex, baseBal - leg.amount);
      assetBals.set(
        toHex_,
        (assetBals.get(toHex_) ??
          AssetActionValidator.getBalance(state, assetId, toHex_)) + leg.amount,
      );
      speculativeNonces.set(fromHex, leg.nonce);
    }
    return ok();
  }

  // ── FreezeAccount ─────────────────────────────────────────────────────

  private static validateFreezeAccount(
    action: IFreezeAccountAction,
    state: IAssetProjectedState,
    context: ILedgerContext,
  ): ValidationResult {
    const assetId = toHex(action.assetId);
    const descriptor = state.assets.get(assetId);
    if (!descriptor) {
      return fail(
        AssetValidationErrorCode.AssetNotFound,
        `Asset '${assetId}' not found`,
      );
    }
    if (!descriptor.freezable) {
      return fail(
        AssetValidationErrorCode.SupplyPolicyViolation,
        `Asset '${assetId}' is not freezable`,
      );
    }
    const signerSet = state.issuerSets.get(assetId);
    if (
      !signerSet ||
      !AssetActionValidator.checkQuorum(signerSet, context.signerPublicKeys)
    ) {
      return fail(
        AssetValidationErrorCode.QuorumNotSatisfied,
        `Freeze quorum not satisfied for asset '${assetId}'`,
      );
    }
    return ok();
  }

  // ── UnfreezeAccount ───────────────────────────────────────────────────

  private static validateUnfreezeAccount(
    action: IUnfreezeAccountAction,
    state: IAssetProjectedState,
    context: ILedgerContext,
  ): ValidationResult {
    const assetId = toHex(action.assetId);
    if (!state.assets.has(assetId)) {
      return fail(
        AssetValidationErrorCode.AssetNotFound,
        `Asset '${assetId}' not found`,
      );
    }
    const signerSet = state.issuerSets.get(assetId);
    if (
      !signerSet ||
      !AssetActionValidator.checkQuorum(signerSet, context.signerPublicKeys)
    ) {
      return fail(
        AssetValidationErrorCode.QuorumNotSatisfied,
        `Unfreeze quorum not satisfied for asset '${assetId}'`,
      );
    }
    return ok();
  }

  // ── WhitelistAdd ──────────────────────────────────────────────────────

  private static validateWhitelistAdd(
    action: IWhitelistAddAction,
    state: IAssetProjectedState,
    context: ILedgerContext,
  ): ValidationResult {
    const assetId = toHex(action.assetId);
    if (!state.assets.has(assetId)) {
      return fail(
        AssetValidationErrorCode.AssetNotFound,
        `Asset '${assetId}' not found`,
      );
    }
    const signerSet = state.issuerSets.get(assetId);
    if (
      !signerSet ||
      !AssetActionValidator.checkQuorum(signerSet, context.signerPublicKeys)
    ) {
      return fail(
        AssetValidationErrorCode.QuorumNotSatisfied,
        `WhitelistAdd quorum not satisfied for asset '${assetId}'`,
      );
    }
    return ok();
  }

  // ── WhitelistRemove ───────────────────────────────────────────────────

  private static validateWhitelistRemove(
    action: IWhitelistRemoveAction,
    state: IAssetProjectedState,
    context: ILedgerContext,
  ): ValidationResult {
    const assetId = toHex(action.assetId);
    if (!state.assets.has(assetId)) {
      return fail(
        AssetValidationErrorCode.AssetNotFound,
        `Asset '${assetId}' not found`,
      );
    }
    const signerSet = state.issuerSets.get(assetId);
    if (
      !signerSet ||
      !AssetActionValidator.checkQuorum(signerSet, context.signerPublicKeys)
    ) {
      return fail(
        AssetValidationErrorCode.QuorumNotSatisfied,
        `WhitelistRemove quorum not satisfied for asset '${assetId}'`,
      );
    }
    return ok();
  }

  // ── RotateIssuerSet ───────────────────────────────────────────────────

  private static validateRotateIssuerSet(
    action: IRotateIssuerSetAction,
    state: IAssetProjectedState,
    context: ILedgerContext,
  ): ValidationResult {
    const assetId = toHex(action.assetId);
    if (!state.assets.has(assetId)) {
      return fail(
        AssetValidationErrorCode.AssetNotFound,
        `Asset '${assetId}' not found`,
      );
    }
    const signerSet = state.issuerSets.get(assetId);
    if (
      !signerSet ||
      !AssetActionValidator.checkQuorum(signerSet, context.signerPublicKeys)
    ) {
      return fail(
        AssetValidationErrorCode.QuorumNotSatisfied,
        `RotateIssuerSet quorum not satisfied for asset '${assetId}'`,
      );
    }
    return ok();
  }

  // ── RetireAsset ───────────────────────────────────────────────────────

  private static validateRetireAsset(
    action: IRetireAssetAction,
    state: IAssetProjectedState,
    context: ILedgerContext,
  ): ValidationResult {
    const assetId = toHex(action.assetId);
    if (!state.assets.has(assetId)) {
      return fail(
        AssetValidationErrorCode.AssetNotFound,
        `Asset '${assetId}' not found`,
      );
    }
    if (state.retiredAssets.has(assetId)) {
      return fail(
        AssetValidationErrorCode.AssetRetired,
        `Asset '${assetId}' is already retired`,
      );
    }
    const signerSet = state.issuerSets.get(assetId);
    if (
      !signerSet ||
      !AssetActionValidator.checkQuorum(signerSet, context.signerPublicKeys)
    ) {
      return fail(
        AssetValidationErrorCode.QuorumNotSatisfied,
        `RetireAsset quorum not satisfied for asset '${assetId}'`,
      );
    }
    return ok();
  }

  // ── Attestation ───────────────────────────────────────────────────────

  private static validateAttestation(
    action: IAttestationAction,
    state: IAssetProjectedState,
    _context: ILedgerContext,
  ): ValidationResult {
    const assetId = toHex(action.assetId);
    if (!state.assets.has(assetId)) {
      return fail(
        AssetValidationErrorCode.AssetNotFound,
        `Asset '${assetId}' not found`,
      );
    }
    return ok();
  }

  // ── OperatorFreeze ────────────────────────────────────────────────────

  private static validateOperatorFreeze(
    _action: IOperatorFreezeAction,
    _state: IAssetProjectedState,
    context: ILedgerContext,
  ): ValidationResult {
    if (!context.systemSignerSet) {
      return fail(
        AssetValidationErrorCode.SystemPolicyNotSatisfied,
        'No system signer set configured for OperatorFreeze',
      );
    }
    if (
      !AssetActionValidator.checkQuorum(
        context.systemSignerSet,
        context.signerPublicKeys,
      )
    ) {
      return fail(
        AssetValidationErrorCode.SystemPolicyNotSatisfied,
        'System signer quorum not satisfied for OperatorFreeze',
      );
    }
    return ok();
  }

  // ── BatchSettlement ───────────────────────────────────────────────────

  private static validateBatchSettlement(
    action: IBatchSettlementAction,
    state: IAssetProjectedState,
    context: ILedgerContext,
  ): ValidationResult {
    const shardKey = toHex(action.shardId);
    const shardState = state.shardSettlement.get(shardKey);
    if (!shardState) {
      return fail(
        AssetValidationErrorCode.ShardUnknown,
        `Unknown shard '${shardKey}'`,
      );
    }
    // Strict contiguous sequence
    if (action.fromSeq < shardState.nextExpectedSeq) {
      return fail(
        AssetValidationErrorCode.ShardSeqOverlap,
        `Shard '${shardKey}' seq overlap: expected ${shardState.nextExpectedSeq}, got ${action.fromSeq}`,
      );
    }
    if (action.fromSeq > shardState.nextExpectedSeq) {
      return fail(
        AssetValidationErrorCode.ShardSeqGap,
        `Shard '${shardKey}' seq gap: expected ${shardState.nextExpectedSeq}, got ${action.fromSeq}`,
      );
    }
    // Process key lookup by fingerprint
    const fpHex = toHex(action.processKeyFingerprint);
    const procKey = state.processKeys.get(fpHex);
    if (!procKey) {
      return fail(
        AssetValidationErrorCode.ProcessKeyExpired,
        `Process key '${fpHex}' not found`,
      );
    }
    if (procKey.revoked) {
      if (
        procKey.effectiveRevokedAtSeq === undefined ||
        action.fromSeq >= procKey.effectiveRevokedAtSeq
      ) {
        return fail(
          AssetValidationErrorCode.ProcessKeyRevoked,
          `Process key '${fpHex}' has been revoked`,
        );
      }
    }
    if (context.now > procKey.notAfter) {
      return fail(
        AssetValidationErrorCode.ProcessKeyExpired,
        `Process key '${fpHex}' expired at ${procKey.notAfter}`,
      );
    }
    if (context.now < procKey.notBefore) {
      return fail(
        AssetValidationErrorCode.ProcessKeyExpired,
        `Process key '${fpHex}' not yet valid (notBefore=${procKey.notBefore})`,
      );
    }
    // Delta order: memberKey must be strictly ascending within the delta list
    const keys = action.memberDeltas.map((d) => toHex(d.memberKey));
    for (let i = 1; i < keys.length; i++) {
      if (keys[i - 1] >= keys[i]) {
        return fail(
          AssetValidationErrorCode.DeltaOrderViolation,
          `memberDeltas not in strictly ascending memberKey order`,
        );
      }
    }
    // Balance underflow check for negative deltas
    for (const delta of action.memberDeltas) {
      if (delta.delta < 0n) {
        // Check against each asset's balance for this member
        // (the shard is tied to multiple assets; we check the aggregate)
        const memberHex = toHex(delta.memberKey);
        // We cannot know which asset a given delta applies to without asset_id context.
        // A delta < 0 and sum of all positive balances >= |delta| is required.
        // For now we verify that the member has sufficient total balance across
        // all shard-associated assets. This check is best-effort here; the reducer
        // has asset-level granularity.
        let totalBal = 0n;
        for (const [, balMap] of state.balances) {
          totalBal += balMap.get(memberHex) ?? 0n;
        }
        if (totalBal + delta.delta < 0n) {
          return fail(
            AssetValidationErrorCode.InsufficientBalance,
            `Balance underflow for member '${memberHex}' with delta ${delta.delta}`,
          );
        }
      }
    }
    return ok();
  }

  // ── ProcessKeyCert ────────────────────────────────────────────────────

  private static validateProcessKeyCert(
    action: IProcessKeyCertAction,
    state: IAssetProjectedState,
    context: ILedgerContext,
  ): ValidationResult {
    if (action.notAfter <= action.notBefore) {
      return fail(
        AssetValidationErrorCode.ProcessKeyExpired,
        `ProcessKeyCert: notAfter must be > notBefore`,
      );
    }
    if (action.notAfter - action.notBefore > PROCESS_KEY_MAX_VALIDITY_MS) {
      return fail(
        AssetValidationErrorCode.ProcessKeyExpired,
        `ProcessKeyCert validity window exceeds maximum of ${PROCESS_KEY_MAX_VALIDITY_MS} ms`,
      );
    }
    const fingerprint = toHex(action.processPublicKey);
    if (state.processKeys.has(fingerprint)) {
      return fail(
        AssetValidationErrorCode.ProcessKeyDuplicate,
        `Process key '${fingerprint}' is already registered`,
      );
    }
    // Quorum: the issuer quorum for all affected shards' assets
    // We require the signer set to satisfy quorum (deployment-wide, use systemSignerSet)
    if (!context.systemSignerSet) {
      return fail(
        AssetValidationErrorCode.SystemPolicyNotSatisfied,
        'No system signer set configured for ProcessKeyCert',
      );
    }
    if (
      !AssetActionValidator.checkQuorum(
        context.systemSignerSet,
        context.signerPublicKeys,
      )
    ) {
      return fail(
        AssetValidationErrorCode.QuorumNotSatisfied,
        `ProcessKeyCert quorum not satisfied`,
      );
    }
    return ok();
  }

  // ── ProcessKeyRevoke ──────────────────────────────────────────────────

  private static validateProcessKeyRevoke(
    action: IProcessKeyRevokeAction,
    state: IAssetProjectedState,
    context: ILedgerContext,
  ): ValidationResult {
    const fpHex = toHex(action.processKeyFingerprint);
    const procKey = state.processKeys.get(fpHex);
    if (!procKey) {
      return fail(
        AssetValidationErrorCode.ProcessKeyExpired,
        `Process key '${fpHex}' not found`,
      );
    }
    if (procKey.revoked) {
      return fail(
        AssetValidationErrorCode.ProcessKeyRevoked,
        `Process key '${fpHex}' is already revoked`,
      );
    }
    if (!context.systemSignerSet) {
      return fail(
        AssetValidationErrorCode.SystemPolicyNotSatisfied,
        'No system signer set configured for ProcessKeyRevoke',
      );
    }
    if (
      !AssetActionValidator.checkQuorum(
        context.systemSignerSet,
        context.signerPublicKeys,
      )
    ) {
      return fail(
        AssetValidationErrorCode.QuorumNotSatisfied,
        `ProcessKeyRevoke quorum not satisfied`,
      );
    }
    return ok();
  }

  // ── BatchChallenge ────────────────────────────────────────────────────

  private static validateBatchChallenge(
    action: IBatchChallengeAction,
    state: IAssetProjectedState,
    context: ILedgerContext,
  ): ValidationResult {
    const shardKey = toHex(action.shardId);
    const shardState = state.shardSettlement.get(shardKey);
    if (!shardState) {
      return fail(
        AssetValidationErrorCode.ShardUnknown,
        `Unknown shard '${shardKey}'`,
      );
    }
    const disputeWindowMs = resolveDisputeWindow(context.disputeWindowMs);
    if (context.now > shardState.lastSettledAt + disputeWindowMs) {
      return fail(
        AssetValidationErrorCode.DisputeWindowClosed,
        `Dispute window for shard '${shardKey}' closed at ${shardState.lastSettledAt + disputeWindowMs}`,
      );
    }
    const disputeKey = `${shardKey}:${action.settlementSeq}`;
    if (state.disputes.has(disputeKey)) {
      return fail(
        AssetValidationErrorCode.DisputeDuplicate,
        `Dispute '${disputeKey}' already exists`,
      );
    }
    return ok();
  }

  // ── BatchSettlementResolution ─────────────────────────────────────────

  private static validateBatchSettlementResolution(
    action: IBatchSettlementResolutionAction,
    state: IAssetProjectedState,
    context: ILedgerContext,
  ): ValidationResult {
    const shardKey = toHex(action.shardId);
    const disputeKey = `${shardKey}:${action.settlementSeq}`;
    if (!state.disputes.has(disputeKey)) {
      return fail(
        AssetValidationErrorCode.DisputeNotFound,
        `No active dispute for '${disputeKey}'`,
      );
    }
    if (!context.systemSignerSet) {
      return fail(
        AssetValidationErrorCode.SystemPolicyNotSatisfied,
        'No system signer set configured for BatchSettlementResolution',
      );
    }
    if (
      !AssetActionValidator.checkQuorum(
        context.systemSignerSet,
        context.signerPublicKeys,
      )
    ) {
      return fail(
        AssetValidationErrorCode.QuorumNotSatisfied,
        `BatchSettlementResolution quorum not satisfied`,
      );
    }
    return ok();
  }

  // ── Public helpers ────────────────────────────────────────────────────

  /** Get the current balance of `accountKey` (hex) for `assetId` (hex). */
  static getBalance(
    state: IAssetProjectedState,
    assetId: string,
    accountKey: string,
  ): bigint {
    return state.balances.get(assetId)?.get(accountKey) ?? 0n;
  }

  /**
   * Return `true` if `accountKey` (hex) is frozen (asset-level or operator-level)
   * for `assetId` (hex).
   */
  static isAccountFrozen(
    state: IAssetProjectedState,
    assetId: string,
    accountKey: string,
  ): boolean {
    return (
      (state.frozen.get(assetId)?.has(accountKey) ?? false) ||
      (state.operatorFrozen.get(assetId)?.has(accountKey) ?? false)
    );
  }

  /**
   * Verify that `sum(balances[assetId]) === issuedTotal - burnedTotal`.
   * Exposed for testing; the reducer calls this after every transition.
   */
  static checkConservation(
    state: IAssetProjectedState,
    assetId: string,
  ): ValidationResult {
    const issued = state.issuedTotal.get(assetId) ?? 0n;
    const burned = state.burnedTotal.get(assetId) ?? 0n;
    const expected = issued - burned;
    let actual = 0n;
    const balMap = state.balances.get(assetId);
    if (balMap) {
      for (const bal of balMap.values()) {
        actual += bal;
      }
    }
    if (actual !== expected) {
      return fail(
        AssetValidationErrorCode.ConservationViolation,
        `Conservation violated for asset '${assetId}': actual ${actual} !== issued ${issued} - burned ${burned}`,
      );
    }
    return ok();
  }

  // ── Private helpers ───────────────────────────────────────────────────

  private static checkQuorum(
    signerSet: AuthorizedSignerSet,
    signerPublicKeys: readonly Uint8Array[],
  ): boolean {
    return signerSet.verifyQuorum(signerPublicKeys as Uint8Array[]);
  }
}

// ── Module-private helpers ────────────────────────────────────────────────

function resolveDisputeWindow(disputeWindowMs: number | undefined): number {
  if (disputeWindowMs === undefined) return DEFAULT_DISPUTE_WINDOW_MS;
  return Math.max(
    MIN_DISPUTE_WINDOW_MS,
    Math.min(MAX_DISPUTE_WINDOW_MS, disputeWindowMs),
  );
}

// Suppress unused variable lint for the memoBytes helper (used by future
// actions that carry a memo field in the interface).
void memoBytes;
