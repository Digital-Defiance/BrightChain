/**
 * @fileoverview User document interface for Mongoose user model.
 * Combines base document with user-specific fields and account status.
 * @module documents/user
 */

import type { PlatformID } from '@digitaldefiance/ecies-lib';
import { AccountStatus, IUserBase } from '@digitaldefiance/suite-core-lib';
import type { BrightDateTimestamp } from '../../types/brightDateTimestamp';
import { BaseDocument } from './base';

/**
 * User document interface for MongoDB user collection.
 * @template TLanguage - String type for site language (defaults to string)
 * @template TID - Platform ID type (defaults to Buffer)
 * @typedef {BaseDocument<IUserBase<TID, BrightDateTimestamp, S, AccountStatus>, TID>} IUserDocument
 */
export type UserDocument<
  TLanguage extends string = string,
  TID extends PlatformID = Uint8Array,
> = BaseDocument<IUserBase<TID, BrightDateTimestamp, TLanguage, AccountStatus>, TID>;
