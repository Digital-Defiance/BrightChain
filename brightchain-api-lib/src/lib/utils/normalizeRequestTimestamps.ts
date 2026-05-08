import { normalizeToBrightDate } from '@brightchain/brightchain-lib';
import type { BrightDateTimestamp } from '@brightchain/brightchain-lib';

/**
 * Normalize timestamp fields in a request body from Date/string to BrightDateTimestamp.
 * Use at API boundaries where external data may arrive as ISO strings or Date objects.
 *
 * @param body - The request body object to normalize
 * @param fields - The list of field names to normalize
 * @returns A shallow copy of the body with the specified fields normalized to BrightDateTimestamp
 *
 * @example
 * ```typescript
 * const normalized = normalizeRequestTimestamps(req.body, ['createdAt', 'expiresAt']);
 * ```
 */
export function normalizeRequestTimestamps<T extends Record<string, unknown>>(
  body: T,
  fields: (keyof T)[],
): T {
  const result = { ...body };
  for (const field of fields) {
    const value = result[field];
    if (value !== undefined && value !== null) {
      (result as Record<string, unknown>)[field as string] =
        normalizeToBrightDate(
          value as BrightDateTimestamp | Date | string,
        );
    }
  }
  return result;
}
