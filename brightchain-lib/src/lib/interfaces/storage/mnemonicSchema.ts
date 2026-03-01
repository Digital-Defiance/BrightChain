import type { CollectionSchema } from '@digitaldefiance/suite-core-lib';

/** Well-known collection name for mnemonic hash documents. */
export const MNEMONICS_COLLECTION = 'mnemonics';

/**
 * Schema for the mnemonics collection.
 * Mirrors the Mongoose mnemonic document structure:
 *   hmac (non-reversible HMAC of the mnemonic for uniqueness checks)
 */
export const MNEMONIC_SCHEMA: CollectionSchema = {
  name: 'mnemonic',
  properties: {
    _id: { type: 'string', required: true },
    hmac: { type: 'string', required: true },
  },
  required: ['_id', 'hmac'],
  additionalProperties: true,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [{ fields: { hmac: 1 }, options: { unique: true } }],
};
