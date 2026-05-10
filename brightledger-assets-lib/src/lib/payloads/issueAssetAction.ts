/**
 * @fileoverview IIssueAssetAction — payload for creating a new asset class.
 *
 * @see Requirements 1.1–1.7
 * @see Design: Layer 3 — Programmable Asset Ledger § IssueAsset
 */

import type {
  IAuthorizedSigner,
  IBrightTrustPolicy,
} from '@brightchain/brightchain-lib';
import { ActionKind } from './actionKind.js';
import { SupplyPolicy, TransferPolicy } from './policies.js';

/** Payload that defines and registers a new asset class on the ledger. */
export interface IIssueAssetAction {
  readonly kind: ActionKind.IssueAsset;
  /** Short ticker symbol, e.g. `'J'` for Joule.  1–12 ASCII alphanumeric chars. */
  readonly symbol: string;
  /** Human-readable display name. */
  readonly displayName: string;
  /**
   * Decimal places (0–18 inclusive).
   * A value of `6` means 1 unit = 1,000,000 µ-units.
   */
  readonly decimals: number;
  /** Whether and how additional units may be created after issuance. */
  readonly supplyPolicy: SupplyPolicy;
  /** Who is allowed to receive this asset. */
  readonly transferPolicy: TransferPolicy;
  /** When `true`, accounts holding this asset may be frozen by the operator. */
  readonly freezable: boolean;
  /** When `true`, the asset owner or issuer may destroy units. */
  readonly burnable: boolean;
  /** Initial authorized-signer set for the asset's governance. */
  readonly initialIssuerSet: readonly IAuthorizedSigner[];
  /** BrightTrust policy governing multi-sig approval thresholds. */
  readonly initialBrightTrustPolicy: IBrightTrustPolicy;
  /**
   * Optional opaque metadata references (e.g., content-addressed document hashes).
   * Each entry must be exactly 32 bytes.
   */
  readonly metadataRefs?: readonly Uint8Array[];
}
