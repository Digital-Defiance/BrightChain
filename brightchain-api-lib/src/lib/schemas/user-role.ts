/* eslint-disable @typescript-eslint/no-explicit-any */
import { ModelName } from '../enumerations/model-name';

// Datastore-agnostic schema metadata for user-role relationships
export const UserRoleSchema = {
  name: ModelName.UserRole,
  fields: {
    userId: { type: 'id', ref: ModelName.User, required: true },
    roleId: { type: 'id', ref: ModelName.Role, required: true },
    createdBy: { type: 'id', ref: ModelName.User, required: true },
    updatedBy: { type: 'id', ref: ModelName.User, required: true },
    deletedAt: { type: 'date' },
    deletedBy: { type: 'id', ref: ModelName.User },
  },
  indexes: [
    { fields: { userId: 1, roleId: 1 }, options: { unique: true } },
    { fields: { userId: 1 } },
    { fields: { roleId: 1 } },
  ],
};
