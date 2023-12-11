import type { CollectionSchema } from './document-types';

/** Well-known collection name for users. */
export const USERS_COLLECTION = 'users';

/**
 * Schema for the users collection.
 * Mirrors the Mongoose user document structure:
 *   username, email, publicKey, passwordWrappedPrivateKey, mnemonicRecovery,
 *   mnemonicId, backupCodes, accountStatus, emailVerified, directChallenge,
 *   timezone, siteLanguage, currency, darkMode, timestamps, owners
 */
export const USER_SCHEMA: CollectionSchema = {
  name: 'user',
  properties: {
    _id: { type: 'string', required: true },
    username: { type: 'string', required: true },
    email: { type: 'string', required: true },
    publicKey: { type: 'string', required: true },
    passwordWrappedPrivateKey: { type: 'object' },
    mnemonicRecovery: { type: 'string', required: true },
    mnemonicId: { type: 'string' },
    backupCodes: { type: 'array', required: true },
    accountStatus: {
      type: 'string',
      required: true,
      enum: ['PendingEmailVerification', 'Active', 'AdminLock'],
    },
    emailVerified: { type: 'boolean', required: true },
    directChallenge: { type: 'boolean', required: true },
    timezone: { type: 'string', required: true },
    siteLanguage: { type: 'string', required: true },
    currency: { type: 'string' },
    darkMode: { type: 'boolean', required: true },
    createdBy: { type: 'string', required: true },
    updatedBy: { type: 'string', required: true },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true },
  },
  required: [
    '_id',
    'username',
    'email',
    'publicKey',
    'mnemonicRecovery',
    'backupCodes',
    'accountStatus',
    'emailVerified',
    'directChallenge',
    'timezone',
    'siteLanguage',
    'darkMode',
    'createdBy',
    'updatedBy',
    'createdAt',
    'updatedAt',
  ],
  additionalProperties: true,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    { fields: { username: 1 }, options: { unique: true } },
    { fields: { email: 1 }, options: { unique: true } },
  ],
};
