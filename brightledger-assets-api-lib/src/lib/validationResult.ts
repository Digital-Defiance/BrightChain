/**
 * @fileoverview Validation result types for `AssetActionValidator`.
 *
 * @see Requirements 2.1
 * @see Design: Layer 3 — Programmable Asset Ledger § Validator
 */

/**
 * Canonical error codes returned by `AssetActionValidator`.
 *
 * Using a string enum so codes are self-documenting in logs/APIs.
 */
export enum AssetValidationErrorCode {
  /** An `IssueAssetAction` uses an asset_id already present in state. */
  AssetAlreadyRegistered = 'AssetAlreadyRegistered',
  /** The asset_id referenced by an action is not present in state. */
  AssetNotFound = 'AssetNotFound',
  /** A mint would exceed a capped supply, or a fixed-supply asset was minted. */
  SupplyPolicyViolation = 'SupplyPolicyViolation',
  /** The source account has insufficient balance. */
  InsufficientBalance = 'InsufficientBalance',
  /** The source or destination account is frozen for the specified asset. */
  AccountFrozen = 'AccountFrozen',
  /** The destination account is not on the asset's whitelist. */
  WhitelistViolation = 'WhitelistViolation',
  /** The nonce in the action does not equal the expected next nonce. */
  NonceMismatch = 'NonceMismatch',
  /** The action's expiry timestamp is in the past. */
  Expired = 'Expired',
  /** The signing quorum does not satisfy the asset's BrightTrust policy. */
  QuorumNotSatisfied = 'QuorumNotSatisfied',
  /** A state transition would violate the conservation invariant. */
  ConservationViolation = 'ConservationViolation',
  /** A BatchSettlement skipped one or more sequence numbers. */
  ShardSeqGap = 'ShardSeqGap',
  /** A BatchSettlement overlaps an already-accepted sequence range. */
  ShardSeqOverlap = 'ShardSeqOverlap',
  /** The ProcessKey has passed its `notAfter` deadline. */
  ProcessKeyExpired = 'ProcessKeyExpired',
  /** The ProcessKey has been revoked. */
  ProcessKeyRevoked = 'ProcessKeyRevoked',
  /** Delta entries in a BatchSettlement are not strictly ascending. */
  DeltaOrderViolation = 'DeltaOrderViolation',
  /** A BatchChallenge was raised after the dispute window closed. */
  DisputeWindowClosed = 'DisputeWindowClosed',
  /** A duplicate BatchChallenge was submitted for the same settlement. */
  DisputeDuplicate = 'DisputeDuplicate',
  /** The `decimals` field is outside the valid range [0, 18]. */
  InvalidDecimals = 'InvalidDecimals',
  /** The `memo` field exceeds the maximum allowed byte length. */
  MemoTooLong = 'MemoTooLong',
  /** The shard_id is not registered in the projected state. */
  ShardUnknown = 'ShardUnknown',
  /** An action targets a retired asset. */
  AssetRetired = 'AssetRetired',
  /** The system-quorum policy for an OperatorFreeze was not satisfied. */
  SystemPolicyNotSatisfied = 'SystemPolicyNotSatisfied',
  /** A burn was attempted on an asset that does not allow burning. */
  BurnNotAllowed = 'BurnNotAllowed',
  /** The `signer` field of a Transfer does not match the `from` field. */
  SignerMismatch = 'SignerMismatch',
  /** A ProcessKeyCertAction attempted to re-register an existing key. */
  ProcessKeyDuplicate = 'ProcessKeyDuplicate',
  /** A BatchSettlementResolution referenced a non-existent dispute. */
  DisputeNotFound = 'DisputeNotFound',
}

/** A successful validation result. */
export interface IValidationOk {
  readonly valid: true;
}

/** A failed validation result. */
export interface IValidationError {
  readonly valid: false;
  /** Machine-readable error code. */
  readonly code: AssetValidationErrorCode;
  /** Human-readable description of the violation. */
  readonly message: string;
}

/** Union type returned by `AssetActionValidator.validate`. */
export type ValidationResult = IValidationOk | IValidationError;

/** Construct a successful result. */
export function ok(): IValidationOk {
  return { valid: true };
}

/** Construct a failed result. */
export function fail(
  code: AssetValidationErrorCode,
  message: string,
): IValidationError {
  return { valid: false, code, message };
}
