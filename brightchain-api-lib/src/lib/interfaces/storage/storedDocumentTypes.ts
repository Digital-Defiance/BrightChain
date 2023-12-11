/**
 * @fileoverview Serialized ("stored") document interfaces for BrightDB collections.
 *
 * These represent the actual shape of documents as they exist in the database:
 * all IDs are hex strings, all dates are ISO-8601 strings, and every interface
 * extends BsonDocument so it can be used directly as a collection generic.
 *
 * The typed in-memory counterparts (IRoleBase<TID>, IUserBase<TID>, etc.) use
 * GuidV4Buffer IDs and Date objects. Use the rehydration utilities in
 * ../rehydration.ts to convert stored → typed, and serializeForStorage() in
 * BrightChainMemberInitService to go typed → stored.
 */

import type { BsonDocument } from '@brightchain/brightchain-lib';
import type { IBackupCode } from '@digitaldefiance/suite-core-lib';

// ─── Shared optional soft-delete fields (stored as strings) ──────────────────

interface IStoredSoftDelete {
  deletedAt?: string;
  deletedBy?: string;
}

// ─── Roles ───────────────────────────────────────────────────────────────────

export interface IStoredRole extends BsonDocument, IStoredSoftDelete {
  _id: string;
  name: string;
  admin: boolean;
  member: boolean;
  child: boolean;
  system: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export interface IStoredUser extends BsonDocument, IStoredSoftDelete {
  _id: string;
  username: string;
  email: string;
  publicKey: string;
  passwordWrappedPrivateKey?: {
    salt: string;
    iv: string;
    authTag: string;
    ciphertext: string;
    iterations: number;
  };
  mnemonicRecovery: string;
  mnemonicId?: string;
  backupCodes: Array<IBackupCode>;
  accountStatus: string;
  emailVerified: boolean;
  directChallenge: boolean;
  timezone: string;
  siteLanguage: string;
  currency: string;
  darkMode: boolean;
  lastLogin?: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

// ─── User Roles ──────────────────────────────────────────────────────────────

export interface IStoredUserRole extends BsonDocument, IStoredSoftDelete {
  _id: string;
  userId: string;
  roleId: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Mnemonics ───────────────────────────────────────────────────────────────

export interface IStoredMnemonic extends BsonDocument {
  _id: string;
  hmac: string;
}
