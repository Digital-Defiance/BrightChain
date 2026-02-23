/**
 * Schema validation for brightchain-db collections.
 *
 * This module re-exports the canonical implementation from
 * @brightchain/brightchain-lib. All logic now lives in brightchain-lib
 * to keep the core engine platform-agnostic.
 */
export {
  applyDefaults,
  validateDocument,
} from '@brightchain/brightchain-lib/lib/db/schemaValidation';

export type {
  CollectionSchema,
  FieldSchema,
  SchemaType,
} from '@brightchain/brightchain-lib/lib/db/schemaValidation';
