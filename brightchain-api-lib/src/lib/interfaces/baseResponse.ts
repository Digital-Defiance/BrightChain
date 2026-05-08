import type { BrightDateTimestamp } from '@brightchain/brightchain-lib';

/**
 * Generic base response with parameterized timestamp type.
 * Default: BrightDateTimestamp (number, decimal days since J2000.0).
 * For clients needing ISO strings: IBaseResponse<string>.
 */
export interface IBaseResponse<TTimestamp = BrightDateTimestamp> {
  createdAt: TTimestamp;
  updatedAt: TTimestamp;
}

/**
 * Enriched response that includes both BrightDate and ISO representations.
 * Used when the API serves clients that need traditional dates alongside
 * the native BrightDateValue.
 */
export interface IEnrichedTimestampResponse {
  createdAt: BrightDateTimestamp;
  updatedAt: BrightDateTimestamp;
  /** Derived ISO 8601 string for createdAt */
  createdAtISO: string;
  /** Derived ISO 8601 string for updatedAt */
  updatedAtISO: string;
}
