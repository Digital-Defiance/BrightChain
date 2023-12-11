import { ModelName } from '../enumerations/model-name';

// Datastore-agnostic schema metadata for used direct login tokens
export const UsedDirectLoginTokenSchema = {
  name: ModelName.UsedDirectLoginToken,
  fields: {
    userId: { type: 'id', ref: ModelName.User, required: true },
    token: { type: 'string', required: true },
  },
  indexes: [{ fields: { userId: 1, token: 1 }, options: { unique: true } }],
};
