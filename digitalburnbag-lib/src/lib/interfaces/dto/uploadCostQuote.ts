import type { BurnbagStorageTier } from '../../joule/burnbagDurability';

/**
 * Response DTO returned by the `POST /uploads/:id/quote` endpoint.
 *
 * All Joule amounts are returned as decimal strings (serialised bigint)
 * to remain safe across JSON (JSON doesn't support bigint natively).
 *
 * The client must commit or discard within `BURNBAG_QUOTE_TTL_MS` (15 min).
 */
export interface IUploadCostQuoteDTO {
  /** Session ID the quote was generated for. */
  sessionId: string;
  /** The tier that will be used after hasBurnDate check. */
  effectiveTier: BurnbagStorageTier;
  /** Block-aligned, AES-GCM-encrypted byte count used for costing. */
  blockAlignedBytes: number;
  /** RS data shards (k). */
  rsK: number;
  /** RS parity shards (m). */
  rsM: number;
  /** Human-readable overhead factor, e.g. "1.50×". */
  overheadDisplay: string;
  /** Total upfront charge in µJ (decimal string). */
  upfrontMicroJoules: string;
  /** Daily recurring charge in µJ (decimal string). */
  dailyMicroJoules: string;
  /** Committed duration in days. */
  durationDays: number;
  /** ISO timestamp when the quote was generated. */
  quotedAt: string;
  /** ISO timestamp when this quote expires (quotedAt + BURNBAG_QUOTE_TTL_MS). */
  quoteExpiresAt: string;
}
