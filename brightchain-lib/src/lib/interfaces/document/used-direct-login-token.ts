/**
 * @fileoverview Used direct login token document interface for MongoDB collections.
 * Tracks consumed direct login tokens to prevent reuse attacks.
 * @module documents/used-direct-login-token
 */

import type { PlatformID } from '@digitaldefiance/ecies-lib';
import { IUsedDirectLoginTokenBase } from '@digitaldefiance/suite-core-lib';
import { BaseDocument } from './base';

/**
 * Composite interface for used direct login token collection documents.
 * Extends base document with used token tracking properties to ensure one-time token usage.
 * Prevents replay attacks by recording consumed tokens with user ID and timestamp.
 * @template TID Platform-specific ID type (Buffer, ObjectId, etc.)
 */
export type UsedDirectLoginTokenDocument<TID extends PlatformID = Uint8Array> =
  BaseDocument<IUsedDirectLoginTokenBase<TID>, TID>;
