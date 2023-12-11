import type { CollectionSchema } from './document-types';

/** Well-known collection name for roles. */
export const ROLES_COLLECTION = 'roles';

/**
 * Schema for the roles collection.
 * Mirrors the Mongoose role document structure:
 *   name, admin, member, child, system, createdBy, updatedBy, timestamps
 */
export const ROLE_SCHEMA: CollectionSchema = {
  name: 'role',
  properties: {
    _id: { type: 'string', required: true },
    name: {
      type: 'string',
      required: true,
      enum: ['System', 'Admin', 'Member'],
    },
    admin: { type: 'boolean', required: true },
    member: { type: 'boolean', required: true },
    child: { type: 'boolean', required: true },
    system: { type: 'boolean', required: true },
    createdBy: { type: 'string', required: true },
    updatedBy: { type: 'string', required: true },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true },
  },
  required: [
    '_id',
    'name',
    'admin',
    'member',
    'child',
    'system',
    'createdBy',
    'updatedBy',
    'createdAt',
    'updatedAt',
  ],
  additionalProperties: true,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [{ fields: { name: 1 }, options: { unique: true } }],
};
