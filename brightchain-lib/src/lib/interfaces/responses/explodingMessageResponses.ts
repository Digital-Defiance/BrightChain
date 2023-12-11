/**
 * Exploding message API response interfaces.
 *
 * These are the data-shape types that live in brightchain-lib so both
 * frontend and backend can consume them.
 *
 * Requirements: 8.1-8.9
 */

import { IApiEnvelope } from '../communication';

// ─── Exploding message responses ────────────────────────────────────────────

export type ISetExpirationResponse = IApiEnvelope<{
  messageId: string;
  expiresAt?: string;
  maxReads?: number;
}>;

export type IMarkReadResponse = IApiEnvelope<{
  messageId: string;
  readCount: number;
  shouldExplode: boolean;
}>;

export type IGetExpiredResponse = IApiEnvelope<{
  expired: ReadonlyArray<{
    messageId: string;
    reason: 'time_expired' | 'read_count_exceeded';
  }>;
  totalCount: number;
}>;

export type IExplodeMessageResponse = IApiEnvelope<{
  messageId: string;
  exploded: boolean;
  explodedAt: string;
}>;

export type IGetExpirationInfoResponse = IApiEnvelope<{
  messageId: string;
  isExploding: boolean;
  expiresAt?: string;
  maxReads?: number;
  readCount?: number;
  remainingTimeMs?: number | null;
  remainingReads?: number | null;
  exploded: boolean;
}>;
