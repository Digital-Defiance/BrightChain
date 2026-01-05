/* eslint-disable @typescript-eslint/no-explicit-any */
import { Role } from '@digitaldefiance/suite-core-lib';
import { CallbackWithoutResultAndOptionalError, Schema } from 'mongoose';
import { IRoleDocument } from '../documents/role';
import { ModelName } from '../enumerations/model-name';

/**
 * Schema for roles
 */
export const RoleSchema = new Schema<IRoleDocument>(
  {
    name: {
      type: String,
      enum: Object.values(Role),
      required: true,
      immutable: true,
    },
    admin: {
      type: Boolean,
      default: false,
      immutable: true,
    },
    member: {
      type: Boolean,
      default: false,
      immutable: true,
    },
    child: {
      type: Boolean,
      default: false,
      immutable: true,
    },
    system: {
      type: Boolean,
      default: false,
      immutable: true,
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
    /**
     * The date the role was deleted
     */
    deletedAt: {
      type: Date,
      optional: true,
      get: (v: Date) => v,
      set: (v: Date) => new Date(v.toUTCString()),
    },
    /**
     * The user who deleted the role
     */
    deletedBy: {
      type: Schema.Types.ObjectId as any,
      ref: ModelName.User,
      required: false,
      optional: true,
    },
  },
  { timestamps: true },
);

RoleSchema.index({ name: 1 }, { unique: true });

// Add pre-save middleware for custom validation
RoleSchema.pre('save', function (next: CallbackWithoutResultAndOptionalError) {
  if (this.admin && this.child) {
    return next(new Error('A child role cannot be an admin role'));
  }

  if (this.system && this.child) {
    return next(new Error('A child role cannot be a system role'));
  }
  next();
});
