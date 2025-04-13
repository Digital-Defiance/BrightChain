import {
  AccountStatus,
  SuiteCoreStringKey,
  getSuiteCoreTranslation as translate,
} from '@digitaldefiance/suite-core-lib';
import { ModelName } from '../enumerations/model-name';
import { StringLanguage } from '../interfaces/request-user';
import { StringLanguages } from '@brightchain/brightchain-lib';
// import {
//   StringLanguage,
//   StringName,
//   translate,
// } from '@brightchain/brightchain-lib';
import { AppConstants } from '../appConstants';
import { isValidTimezone } from '@digitaldefiance/i18n-lib';
import { Schema } from 'mongoose';
import validator from 'validator';
import { IUserDocument } from '../documents/user';

/**
 * Schema for users
 */
export const UserSchema: Schema = new Schema<IUserDocument>(
  {
    /**
     * The unique identifier for the user
     */
    username: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: (v: string) => AppConstants.UsernameRegex.test(v),
        message: () =>
          translate(SuiteCoreStringKey.Validation_UsernameRegexErrorTemplate),
      },
    },
    /**
     * The email address for the user
     */
    email: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: (v: string) => validator.isEmail(v),
        message: (props: { value: string }) =>
          `${props.value} is not a valid email address`,
      },
    },
    expireMemoryMnemonicSeconds: {
      type: Number,
      required: false,
      min: 0,
      default: AppConstants.DefaultExpireMemoryMnemonicSeconds,
    },
    expireMemoryWalletSeconds: {
      type: Number,
      required: false,
      min: 0,
      default: AppConstants.DefaultExpireMemoryWalletSeconds,
    },
    /**
     * The user's public key, stored in hex format.
     */
    publicKey: {
      type: String,
      required: true,
      unique: true,
    },
    /**
     * The timezone for the user
     */
    timezone: {
      type: String,
      required: true,
      default: 'UTC',
      validate: {
        validator: function (v: string) {
          return isValidTimezone(v);
        },
        message: (props: { value: string }) =>
          translate(SuiteCoreStringKey.Common_NotValidTimeZoneTemplate).replace(
            '{timezone}',
            props.value,
          ),
      },
    },
    /**
     * The language of the site for the user
     */
    siteLanguage: {
      type: String,
      enum: Object.values(StringLanguages),
      default: 'en-US',
      required: true,
    },
    /**
     * The date the user last logged in
     */
    lastLogin: { type: Date, required: false },
    /**
     * Whether the user has verified their email address
     */
    emailVerified: { type: Boolean, default: false },
    /**
     * The status of the user's account
     */
    accountStatus: {
      type: String,
      enum: Object.values(AccountStatus),
      default: AccountStatus.PendingEmailVerification,
    },
    /**
     * The user who created the user.
     */
    createdBy: {
      type: Schema.Types.ObjectId as any,
      ref: ModelName.User,
      required: true,
      immutable: true,
    },
    /**
     * The user who last updated the user.
     */
    updatedBy: {
      type: Schema.Types.ObjectId as any,
      ref: ModelName.User,
      optional: true,
    },
    /**
     * The date/time the user was deleted.
     */
    deletedAt: { type: Date, optional: true },
    /**
     * The user who deleted the user.
     */
    deletedBy: {
      type: Schema.Types.ObjectId as any,
      ref: ModelName.User,
      optional: true,
    },
    /**
     * Reference to the mnemonic document
     */
    mnemonicId: {
      type: Schema.Types.ObjectId as any,
      ref: ModelName.Mnemonic,
      required: false,
    },
    /**
     * Copy of the mnemonic encrypted with the user's public key
     */
    mnemonicRecovery: {
      type: String,
      required: false,
    },
    /**
     * Password-wrapped ECIES private key (Option B)
     */
    passwordWrappedPrivateKey: {
      type: {
        salt: { type: String, required: true },
        iv: { type: String, required: true },
        authTag: { type: String, required: true },
        ciphertext: { type: String, required: true },
        iterations: { type: Number, required: true },
      },
      required: false,
    },
    /**
     * Array of backup codes to recover mnemonic/private key
     */
    backupCodes: {
      type: [
        {
          version: { type: String, required: true },
          checksumSalt: { type: String, required: true },
          checksum: { type: String, required: true },
          encrypted: { type: String, required: true },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);
