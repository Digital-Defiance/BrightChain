/* eslint-disable @typescript-eslint/no-explicit-any */
import { EmailTokenType } from '@digitaldefiance/suite-core-lib';
import validator from 'validator';
import { ModelName } from '../enumerations/model-name';

// Datastore-agnostic schema metadata for email tokens
export const EmailTokenSchema = {
  name: ModelName.EmailToken,
  fields: {
    userId: { type: 'id', ref: ModelName.User, required: true },
    type: {
      type: 'string',
      enum: Object.values(EmailTokenType),
      required: true,
    },
    token: { type: 'string', required: true, unique: true },
    email: {
      type: 'string',
      required: true,
      validate: (v: string) => validator.isEmail(v),
    },
    lastSent: { type: 'date' },
    expiresAt: { type: 'date', default: () => Date.now() },
  },
  indexes: [{ fields: { userId: 1, email: 1 }, options: { unique: true } }],
};
