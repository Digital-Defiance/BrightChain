/* eslint-disable @typescript-eslint/no-explicit-any */
import { Role } from '@digitaldefiance/suite-core-lib';
import { ModelName } from '../enumerations/model-name';

type FieldShape = Record<string, any>;

// Datastore-agnostic role schema metadata
export const RoleSchema = {
  name: ModelName.Role,
  fields: {
    name: {
      type: 'string',
      enum: Object.values(Role),
      required: true,
      immutable: true,
    },
    admin: { type: 'boolean', default: false, immutable: true },
    member: { type: 'boolean', default: false, immutable: true },
    child: { type: 'boolean', default: false, immutable: true },
    system: { type: 'boolean', default: false, immutable: true },
    createdBy: { type: 'id', ref: ModelName.User, required: true },
    updatedBy: { type: 'id', ref: ModelName.User, required: true },
    deletedAt: { type: 'date', optional: true },
    deletedBy: { type: 'id', ref: ModelName.User, optional: true },
  } as Record<keyof FieldShape, any>,
  indexes: [{ fields: { name: 1 }, options: { unique: true } }],
  validate: (doc: { admin?: boolean; child?: boolean; system?: boolean }) => {
    if (doc.admin && doc.child) {
      throw new Error('A child role cannot be an admin role');
    }
    if (doc.system && doc.child) {
      throw new Error('A child role cannot be a system role');
    }
  },
};
