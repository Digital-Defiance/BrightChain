/**
 * @fileoverview Serialization utility for converting typed RBAC documents
 * to their stored (all-string) representation for BrightChainDb.
 *
 * Converts GuidV4Buffer values to hex strings and Date values to ISO strings.
 * This is the inverse of the rehydration functions in ./rehydration.ts.
 */

import type { GuidV4Buffer } from '@digitaldefiance/node-ecies-lib';

/**
 * Serialize a typed document for storage.
 *
 * Converts:
 *  - Date → ISO-8601 string
 *  - GuidV4Buffer → full hex GUID string
 *  - Buffer → hex string
 *  - Everything else passes through unchanged
 *
 * @template T - The input typed document
 * @template TStored - The expected stored output type (defaults to generic Record)
 */
export function serializeForStorage<
  T extends object,
  TStored extends Record<string, unknown> = Record<string, unknown>,
>(doc: T): TStored {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(doc)) {
    if (value instanceof Date) {
      result[key] = value.toISOString();
    } else if (Buffer.isBuffer(value) && 'asFullHexGuid' in value) {
      result[key] = (value as GuidV4Buffer).asFullHexGuid;
    } else if (Buffer.isBuffer(value)) {
      result[key] = value.toString('hex');
    } else {
      result[key] = value;
    }
  }
  return result as TStored;
}
