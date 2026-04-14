import type { CollectionSchema } from './document-types';

/** Well-known collection name for healthcare roles. */
export const HEALTHCARE_ROLES_COLLECTION = 'healthcare_roles';

/**
 * Schema for the healthcare_roles collection.
 * Links BrightChain members to organizations with SNOMED CT role codes.
 *
 * _Requirements: 10.2_
 */
export const HEALTHCARE_ROLE_SCHEMA: CollectionSchema = {
  name: 'healthcareRole',
  properties: {
    _id: { type: 'string', required: true },
    memberId: { type: 'string', required: true },
    roleCode: { type: 'string', required: true },
    roleDisplay: { type: 'string', required: true },
    specialty: { type: 'object' },
    organizationId: { type: 'string', required: true },
    practitionerRef: { type: 'string' },
    patientRef: { type: 'string' },
    period: { type: 'object', required: true },
    createdBy: { type: 'string', required: true },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true },
  },
  required: [
    '_id',
    'memberId',
    'roleCode',
    'roleDisplay',
    'organizationId',
    'period',
    'createdBy',
    'createdAt',
    'updatedAt',
  ],
  additionalProperties: true,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    { fields: { memberId: 1 }, options: {} },
    { fields: { organizationId: 1 }, options: {} },
    {
      fields: { memberId: 1, roleCode: 1, organizationId: 1 },
      options: { unique: true },
    },
  ],
};
