/* eslint-disable @typescript-eslint/no-explicit-any */
import { Schema } from 'mongoose';
import { IUserRoleDocument } from '../documents/user-role';
import { ModelName } from '../enumerations/model-name';

/**
 * Schema for user-role relationships
 */
export const UserRoleSchema = new Schema<IUserRoleDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId as any,
      ref: ModelName.User,
      required: true,
    },
    roleId: {
      type: Schema.Types.ObjectId as any,
      ref: ModelName.Role,
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId as any,
      ref: ModelName.User,
      required: true,
      immutable: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId as any,
      ref: ModelName.User,
      required: true,
    },
    deletedAt: {
      type: Date,
      optional: true,
    },
    deletedBy: {
      type: Schema.Types.ObjectId as any,
      ref: ModelName.User,
      required: false,
      optional: true,
    },
  },
  { timestamps: true },
);

// Compound index for efficient queries
UserRoleSchema.index({ userId: 1, roleId: 1 }, { unique: true });
UserRoleSchema.index({ userId: 1 });
UserRoleSchema.index({ roleId: 1 });
