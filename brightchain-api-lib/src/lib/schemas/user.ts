import {
  AccountStatus,
  AppConstants,
  CanaryStatus,
  DefaultLanguage,
  isValidTimezone,
  ModelName,
  StringLanguage,
  StringName,
  translate,
} from '@brightchain/brightchain-lib';
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
          translate(StringName.Validation_UsernameRegexErrorTemplate),
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
     * Crypted mnemonics/passwords that trigger a duress protocol
     */
    duressPasswords: {
      type: [String],
      default: [],
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
          translate(StringName.Common_NotValidTimeZoneTemplate).replace(
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
      enum: Object.values(StringLanguage),
      default: DefaultLanguage,
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
     * Overall status for the user
     */
    overallCanaryStatus: {
      type: String,
      enum: Object.values(CanaryStatus),
      default: CanaryStatus.Alive,
      required: true,
    },
    /**
     * The user who created the user.
     */
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: ModelName.User,
      required: true,
      immutable: true,
    },
    /**
     * The user who last updated the user.
     */
    updatedBy: {
      type: Schema.Types.ObjectId,
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
      type: Schema.Types.ObjectId,
      ref: ModelName.User,
      optional: true,
    },
    /**
     * Reference to the mnemonic document
     */
    mnemonicId: {
      type: Schema.Types.ObjectId,
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
