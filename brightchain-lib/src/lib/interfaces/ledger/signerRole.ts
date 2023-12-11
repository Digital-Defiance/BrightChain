/**
 * @fileoverview Signer role enum for the blockchain ledger governance system.
 *
 * Defines the three roles matching Azure Confidential Ledger's
 * Administrator/Contributor/Reader model.
 *
 * @see Requirements 12.1
 */

export enum SignerRole {
  Admin = 'admin',
  Writer = 'writer',
  Reader = 'reader',
}
