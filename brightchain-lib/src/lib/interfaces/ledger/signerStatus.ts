/**
 * @fileoverview Signer lifecycle status enum for the blockchain ledger.
 *
 * Inspired by CCF's member lifecycle: active signers can operate,
 * suspended signers are temporarily disabled (reversible),
 * retired signers are permanently removed.
 *
 * @see Requirements 17.1
 */

export enum SignerStatus {
  Active = 'active',
  Suspended = 'suspended',
  Retired = 'retired',
}
