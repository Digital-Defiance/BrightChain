/**
 * @fileoverview Serialization utility for converting typed RBAC documents
 * to their stored (all-string) representation for BrightDB.
 *
 * Converts GUID values (GuidV4Buffer / GuidUint8Array) to short hex strings,
 * BSON ObjectId values to hex strings, Date values to ISO strings, and plain
 * Buffers to hex strings.
 * This is the inverse of the rehydration functions in ./rehydration.ts.
 */

/**
 * Type guard: does this value have an `asShortHexGuid` string property?
 * Matches both GuidV4Buffer (Buffer subclass, node-ecies-lib) and
 * GuidUint8Array (Uint8Array subclass, ecies-lib browser build).
 */
function hasShortHexGuid(value: unknown): value is { asShortHexGuid: string } {
  return (
    value !== null &&
    typeof value === 'object' &&
    'asShortHexGuid' in value &&
    typeof (value as Record<string, unknown>)['asShortHexGuid'] === 'string'
  );
}

/**
 * Serialize a typed document for storage.
 *
 * Converts:
 *  - Date → ISO-8601 string
 *  - GuidV4Buffer / GuidUint8Array (has asShortHexGuid) → 32-char short hex GUID string
 *  - Plain Buffer → hex string
 *  - Object with toHexString() (e.g. BSON ObjectId) → hex string via toHexString()
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
    } else if (hasShortHexGuid(value)) {
      // GuidV4Buffer (Buffer subclass) or GuidUint8Array (Uint8Array subclass)
      // — use the 32-char no-dashes hex form the schema expects
      result[key] = value.asShortHexGuid;
    } else if (Buffer.isBuffer(value)) {
      // Plain Buffer (no GUID properties)
      result[key] = value.toString('hex');
    } else if (
      value !== null &&
      typeof value === 'object' &&
      typeof (value as Record<string, unknown>)['toHexString'] === 'function'
    ) {
      // BSON ObjectId (and any other ID type with toHexString())
      result[key] = (value as { toHexString: () => string }).toHexString();
    } else {
      result[key] = value;
    }
  }
  return result as TStored;
}
