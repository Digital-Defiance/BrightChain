import type { CollectionSchema } from '@digitaldefiance/suite-core-lib';

/** Well-known collection name for user-role junction documents. */
export const USER_ROLES_COLLECTION = 'user_roles';

/**
 * Schema for the user-roles collection.
 * Mirrors the Mongoose user-role junction document structure:
 *   userId, roleId, createdBy, updatedBy, timestamps
 */
export const USER_ROLE_SCHEMA: CollectionSchema = {
  name: 'userRole',
  properties: {
    _id: { type: 'string', required: true },
    userId: { type: 'string', required: true },
    roleId: { type: 'string', required: true },
    createdBy: { type: 'string', required: true },
    updatedBy: { type: 'string', required: true },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true },
  },
  required: [
    '_id',
    'userId',
    'roleId',
    'createdBy',
    'updatedBy',
    'createdAt',
    'updatedAt',
  ],
  additionalProperties: true,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [{ fields: { userId: 1, roleId: 1 }, options: { unique: true } }],
};
