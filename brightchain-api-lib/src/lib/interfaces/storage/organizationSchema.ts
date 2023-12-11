import type { CollectionSchema } from './document-types';

/** Well-known collection name for organizations. */
export const ORGANIZATIONS_COLLECTION = 'organizations';

/**
 * Schema for the organizations collection.
 * Stores FHIR Organization resources with enrollment settings.
 *
 * _Requirements: 10.1, 1.4_
 */
export const ORGANIZATION_SCHEMA: CollectionSchema = {
  name: 'organization',
  properties: {
    _id: { type: 'string', required: true },
    name: { type: 'string', required: true },
    type: { type: 'object' },
    telecom: { type: 'array' },
    address: { type: 'array' },
    active: { type: 'boolean', required: true },
    enrollmentMode: {
      type: 'string',
      required: true,
      enum: ['open', 'invite-only'],
    },
    createdBy: { type: 'string', required: true },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true },
  },
  required: [
    '_id',
    'name',
    'active',
    'enrollmentMode',
    'createdBy',
    'createdAt',
    'updatedAt',
  ],
  additionalProperties: true,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    { fields: { name: 1 }, options: {} },
    { fields: { active: 1 }, options: {} },
  ],
};
