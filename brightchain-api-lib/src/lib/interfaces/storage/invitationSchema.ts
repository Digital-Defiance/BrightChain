import type { CollectionSchema } from './document-types';

/** Well-known collection name for invitations. */
export const INVITATIONS_COLLECTION = 'invitations';

/**
 * Schema for the invitations collection.
 * Stores time-limited, single-use tokens for controlled onboarding.
 *
 * _Requirements: 10.3_
 */
export const INVITATION_SCHEMA: CollectionSchema = {
  name: 'invitation',
  properties: {
    _id: { type: 'string', required: true },
    token: { type: 'string', required: true },
    organizationId: { type: 'string', required: true },
    roleCode: { type: 'string', required: true },
    targetEmail: { type: 'string' },
    createdBy: { type: 'string', required: true },
    expiresAt: { type: 'string', required: true },
    usedBy: { type: 'string' },
    usedAt: { type: 'string' },
    createdAt: { type: 'string', required: true },
  },
  required: [
    '_id',
    'token',
    'organizationId',
    'roleCode',
    'createdBy',
    'expiresAt',
    'createdAt',
  ],
  additionalProperties: true,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    { fields: { token: 1 }, options: { unique: true } },
    { fields: { organizationId: 1 }, options: {} },
    { fields: { expiresAt: 1 }, options: {} },
  ],
};
