/**
 * @fileoverview No-op factory functions for upstream Application compatibility.
 * BrightChain uses DocumentStore/BlockDocumentStore instead of mongoose,
 * so these stubs satisfy the upstream Application constructor's mongoose-related
 * parameters with minimal, type-safe implementations.
 * @module upstream-stubs
 */

import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  type IFailableResult,
  type SchemaMap,
} from '@digitaldefiance/node-express-suite';
import type { IBaseDocument } from '@digitaldefiance/node-express-suite/src/documents/base';
import type { IBrightChainInitResult } from './interfaces/brightchain-init-result';

/**
 * No-op schema map factory that returns an empty schema map.
 * Satisfies the upstream Application constructor's `schemaMapFactory` parameter.
 * BrightChain has no mongoose models, so the schema map is always empty.
 *
 * @returns An empty object satisfying SchemaMap for an empty TModelDocs
 */
export function noOpSchemaMapFactory<
  TID extends PlatformID,
  TModelDocs extends Record<string, IBaseDocument<unknown, TID>> = Record<
    string,
    never
  >,
>(): SchemaMap<TID, TModelDocs> {
  return {} as SchemaMap<TID, TModelDocs>;
}

/**
 * No-op database init function that resolves with a successful result.
 * Satisfies the upstream Application constructor's `databaseInitFunction` parameter.
 * BrightChain skips mongoose initialization entirely.
 *
 * @returns A resolved promise with `{ success: true }`
 */
export async function noOpDatabaseInitFunction<
  TID extends PlatformID,
>(): Promise<IFailableResult<IBrightChainInitResult<TID>>> {
  return { success: true };
}

/**
 * No-op init result hash function that returns a fixed string.
 * Satisfies the upstream Application constructor's `initResultHashFunction` parameter.
 * Since BrightChain doesn't use mongoose init results, no meaningful hash is needed.
 *
 * @returns The string `'no-mongoose'`
 */
export function noOpInitResultHashFunction(): string {
  return 'no-mongoose';
}
