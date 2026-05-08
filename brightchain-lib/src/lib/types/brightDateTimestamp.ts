/**
 * BrightDate Timestamp Types for BrightChain
 *
 * Establishes `BrightDateValue` (decimal days since J2000.0) as the canonical
 * timestamp type for all Brightchain schemas.
 *
 * @module brightDateTimestamp
 */

import type { BrightDateValue } from '@brightchain/brightdate';

/**
 * The canonical timestamp type for all Brightchain schemas.
 * Decimal days since J2000.0 epoch (January 1, 2000, 12:00:00 UTC).
 *
 * This is a plain `number` (IEEE 754 float64), giving ~86 nanosecond precision
 * at current epoch values and a range of ±2^53 days (~24.6 million years).
 *
 * @example
 * ```typescript
 * // Current time as BrightDateTimestamp
 * import { brightDateNow } from '../utils/brightDateConversions';
 * const now: BrightDateTimestamp = brightDateNow();
 * ```
 */
export type BrightDateTimestamp = BrightDateValue;

/**
 * Generic timestamped interface. Defaults to BrightDateTimestamp.
 *
 * Parameterize with `string` for ISO 8601 DTOs or `Date` for legacy consumers.
 *
 * @typeParam TTimestamp - The timestamp type. Defaults to `BrightDateTimestamp`.
 *
 * @example
 * ```typescript
 * // Native BrightDate (default)
 * interface IMyRecord extends ITimestamped {
 *   id: string;
 * }
 *
 * // ISO 8601 DTO for external clients
 * interface IMyRecordDTO extends ITimestamped<string> {
 *   id: string;
 * }
 *
 * // Legacy Date consumer
 * interface IMyLegacyRecord extends ITimestamped<Date> {
 *   id: string;
 * }
 * ```
 */
export interface ITimestamped<TTimestamp = BrightDateTimestamp> {
  /** When the record was created. */
  createdAt: TTimestamp;
  /** When the record was last updated. */
  updatedAt: TTimestamp;
}
