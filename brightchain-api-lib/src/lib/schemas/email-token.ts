import { EmailTokenType, ModelName } from '@brightchain/brightchain-lib';
import { Schema } from 'mongoose';
import validator from 'validator';
import { IEmailTokenDocument } from '../documents/email-token';

/**
 * Schema for email tokens sent to users to verify their accounts or reset passwords
 */
export const EmailTokenSchema = new Schema<IEmailTokenDocument>(
  {
    /**
     * The user ID associated with the token
     */
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: ModelName.User,
      immutable: true,
    },
    /**
     * The type of email token, eg 'AccountVerification', 'PasswordReset'
     */
    type: {
      type: String,
      enum: Object.values(EmailTokenType),
      required: true,
      immutable: true,
    },
    /**
     * The token value
     */
    token: { type: String, required: true, immutable: true, unique: true },
    /**
     * The email address associated with the token
     */
    email: {
      type: String,
      required: true,
      immutable: true,
      validate: {
        validator: (v: string) => validator.isEmail(v),
        message: (props: { value: string }) =>
          `${props.value} is not a valid email address!`,
      },
    },
    /**
     * The date the token was last emailed to the user
     */
    lastSent: { type: Date, required: false },
    /**
     * The date the token expires
     */
    expiresAt: { type: Date, default: Date.now, index: { expires: '1d' } },
  },
  { timestamps: true },
);

EmailTokenSchema.index({ userId: 1, email: 1 }, { unique: true });
