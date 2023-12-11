/**
 * @fileoverview User-role relationship document interface for MongoDB collections.
 * Combines base document properties with user-role association fields.
 * @module documents/user-role
 */

import type { PlatformID } from '@digitaldefiance/ecies-lib';
import { IUserRoleBase } from '@digitaldefiance/suite-core-lib';
import { BaseDocument } from './base';

/**
 * Composite interface for user-role collection documents.
 * Extends base document with user-role relationship properties linking users to their assigned roles.
 * Supports many-to-many relationships between users and roles with timestamps.
 * @template TID Platform-specific ID type (Buffer, ObjectId, etc.)
 */
export type UserRoleDocument<TID extends PlatformID = Uint8Array> =
  BaseDocument<IUserRoleBase<TID, Date>, TID>;
