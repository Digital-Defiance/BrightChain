/**
 * @fileoverview IRotateIssuerSetAction — payload for replacing the authorized-signer set.
 *
 * Atomically replaces the current issuer set and/or BrightTrust policy for an asset.
 * Requires a quorum from the outgoing set.
 *
 * @see Requirements 6.1–6.2
 */

import type {
  IAuthorizedSigner,
  IBrightTrustPolicy,
} from '@brightchain/brightchain-lib';
import { AssetIdBuffer } from '../assetId.js';
import { ActionKind } from './actionKind.js';

/** Payload that replaces the governance credentials for an asset class. */
export interface IRotateIssuerSetAction {
  readonly kind: ActionKind.RotateIssuerSet;
  /** The asset class whose governance is being rotated. */
  readonly assetId: AssetIdBuffer;
  /** New authorized-signer set (replaces the current set entirely). */
  readonly newIssuerSet: readonly IAuthorizedSigner[];
  /** New BrightTrust policy (replaces the current policy). */
  readonly newBrightTrustPolicy: IBrightTrustPolicy;
  /** Effective ledger sequence number (rotation is rejected if entry.seq < effectiveAtSeq). */
  readonly effectiveAtSeq: bigint;
}
