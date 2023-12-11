/**
 * @fileoverview Governance payload interface for the blockchain ledger.
 *
 * A governance payload contains one or more governance actions and
 * cosignatures from additional admins for BrightTrust satisfaction.
 *
 * @see Requirements 13.1, 14.4
 */

import { SignatureUint8Array } from '@digitaldefiance/ecies-lib';
import { IGovernanceAction } from './governanceAction';

export interface IGovernancePayload {
  readonly actions: readonly IGovernanceAction[];
  /** Additional admin signatures for BrightTrust (beyond the entry's primary signer). */
  readonly cosignatures: readonly {
    readonly signerPublicKey: Uint8Array;
    readonly signature: SignatureUint8Array;
  }[];
}
