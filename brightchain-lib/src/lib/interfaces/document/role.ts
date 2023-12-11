/**
 * @fileoverview Role document interface for Mongoose role model.
 * Combines base document with role-specific fields and permissions.
 * @module documents/role
 */

import type { PlatformID } from '@digitaldefiance/ecies-lib';
import { IRoleBase } from '@digitaldefiance/suite-core-lib';
import { BaseDocument } from './base';

/**
 * Role document interface for MongoDB role collection.
 * @template TID - Platform ID type (defaults to Buffer)
 * @typedef {BaseDocument<IRoleBase<TID, Date>, TID>} IRoleDocument
 */
export type RoleDocument<TID extends PlatformID = Uint8Array> = BaseDocument<
  IRoleBase<TID, Date>,
  TID
>;
