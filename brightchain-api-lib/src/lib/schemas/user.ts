import { isValidTimezone, LanguageCodes } from '@digitaldefiance/i18n-lib';
import { AccountStatus } from '@digitaldefiance/suite-core-lib';
import validator from 'validator';
import { AppConstants } from '../appConstants';
import { ModelName } from '../enumerations/model-name';

// Datastore-agnostic schema metadata for users
export const UserSchema = {
  name: ModelName.User,
  fields: {
    username: {
      type: 'string',
      required: true,
      unique: true,
      validate: (v: string) => AppConstants.UsernameRegex.test(v),
    },
    email: {
      type: 'string',
      required: true,
      unique: true,
      validate: (v: string) => validator.isEmail(v),
    },
    expireMemoryMnemonicSeconds: {
      type: 'number',
      default: AppConstants.DefaultExpireMemoryMnemonicSeconds,
      min: 0,
    },
    expireMemoryWalletSeconds: {
      type: 'number',
      default: AppConstants.DefaultExpireMemoryWalletSeconds,
      min: 0,
    },
    publicKey: { type: 'string', required: true, unique: true },
    timezone: {
      type: 'string',
      required: true,
      default: 'UTC',
      validate: (v: string) => isValidTimezone(v),
    },
    siteLanguage: {
      type: 'string',
      enum: Object.values(LanguageCodes),
      default: 'en-US',
      required: true,
    },
    lastLogin: { type: 'date' },
    emailVerified: { type: 'boolean', default: false },
    accountStatus: {
      type: 'string',
      enum: Object.values(AccountStatus),
      default: AccountStatus.PendingEmailVerification,
    },
    createdBy: { type: 'id', ref: ModelName.User, required: true },
    updatedBy: { type: 'id', ref: ModelName.User },
    deletedAt: { type: 'date' },
    deletedBy: { type: 'id', ref: ModelName.User },
    mnemonicId: { type: 'id', ref: ModelName.Mnemonic },
    mnemonicRecovery: { type: 'string' },
    passwordWrappedPrivateKey: {
      type: 'object',
      fields: {
        salt: { type: 'string', required: true },
        iv: { type: 'string', required: true },
        authTag: { type: 'string', required: true },
        ciphertext: { type: 'string', required: true },
        iterations: { type: 'number', required: true },
      },
    },
    backupCodes: {
      type: 'array',
      default: [],
      itemShape: {
        version: { type: 'string', required: true },
        checksumSalt: { type: 'string', required: true },
        checksum: { type: 'string', required: true },
        encrypted: { type: 'string', required: true },
      },
    },
  },
};
