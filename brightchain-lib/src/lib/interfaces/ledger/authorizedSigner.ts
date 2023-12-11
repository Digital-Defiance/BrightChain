/**
 * @fileoverview Authorized signer interface for the blockchain ledger.
 *
 * Represents a signer in the authorized signer set with their
 * public key, role, lifecycle status, and optional metadata.
 *
 * @see Requirements 12.1, 17.1, 18.1
 */

import { SignerRole } from './signerRole';
import { SignerStatus } from './signerStatus';

export interface IAuthorizedSigner {
  readonly publicKey: Uint8Array;
  readonly role: SignerRole;
  readonly status: SignerStatus;
  readonly metadata: ReadonlyMap<string, string>;
}
