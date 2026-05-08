/**
 * BrightDate JSON Serialization Utilities for BrightChain
 *
 * Provides a JSON replacer and reviver pair that annotates BrightDateValue
 * fields during serialization and reconstructs them during deserialization.
 *
 * The replacer wraps known timestamp fields as `{ __bd__: value }` so that
 * the reviver can distinguish BrightDateValue numbers from other numeric
 * fields when deserializing mixed JSON payloads.
 *
 * Usage:
 * ```typescript
 * const json = JSON.stringify(record, brightDateReplacer);
 * const record = JSON.parse(json, brightDateReviver);
 * ```
 *
 * @module brightDateJson
 */

import type { BrightDateValue } from '@brightchain/brightdate';

/**
 * The set of all known timestamp field names in the Brightchain ecosystem.
 *
 * When a key in this set holds a numeric value during JSON serialization,
 * the `brightDateReplacer` wraps it as `{ __bd__: value }` so the
 * `brightDateReviver` can reconstruct it as a `BrightDateValue`.
 */
export const BRIGHT_DATE_FIELDS: ReadonlySet<string> = new Set<string>([
  'createdAt',
  'updatedAt',
  'deletedAt',
  'expiresAt',
  'lastAccessedAt',
  'dateCreated',
  'timestamp',
  'sentAt',
  'deliveredAt',
  'lastLogin',
  'lastActive',
  'lastSeen',
  'registeredAt',
  'deactivatedAt',
  'queuedAt',
  'readAt',
  'joinedAt',
  'dateUpdated',
  'failedAt',
  'enqueuedAt',
  'nextAttemptAt',
  'lastAttemptAt',
  'receivedAt',
  'vaultCreatedAt',
  'vaultModifiedAt',
  'validFrom',
  'validTo',
  'creationDate',
  'modificationDate',
  'readDate',
  'resentDate',
  'startDate',
  'endDate',
  'generatedAt',
  'locationUpdatedAt',
  'lastSyncTimestamp',
  'last_run',
]);

/**
 * JSON replacer that annotates BrightDateValue fields for type-safe
 * deserialization when mixed with other numeric fields.
 *
 * When the key is a known timestamp field (present in `BRIGHT_DATE_FIELDS`)
 * and the value is a number, the value is wrapped as `{ __bd__: value }`.
 * All other values are returned unchanged.
 *
 * @param key - The JSON key being serialized.
 * @param value - The value being serialized.
 * @returns The annotated value for timestamp fields, or the original value.
 *
 * @example
 * ```typescript
 * const json = JSON.stringify({ createdAt: 8765.5, name: 'Alice' }, brightDateReplacer);
 * // '{"createdAt":{"__bd__":8765.5},"name":"Alice"}'
 * ```
 */
export function brightDateReplacer(key: string, value: unknown): unknown {
  if (BRIGHT_DATE_FIELDS.has(key) && typeof value === 'number') {
    return { __bd__: value };
  }
  return value;
}

/**
 * JSON reviver that reconstructs BrightDateValue fields from annotated JSON.
 *
 * When the value is a non-null object with a `__bd__` property, the property's
 * value is returned as a `BrightDateValue`. All other values are returned
 * unchanged.
 *
 * @param key - The JSON key being deserialized.
 * @param value - The value being deserialized.
 * @returns The unwrapped `BrightDateValue` for annotated fields, or the
 *   original value.
 *
 * @example
 * ```typescript
 * const record = JSON.parse('{"createdAt":{"__bd__":8765.5}}', brightDateReviver);
 * // { createdAt: 8765.5 }
 * ```
 */
export function brightDateReviver(key: string, value: unknown): unknown {
  if (
    value !== null &&
    typeof value === 'object' &&
    '__bd__' in (value as object)
  ) {
    return (value as { __bd__: BrightDateValue }).__bd__;
  }
  return value;
}
