/**
 * Public key directory API response interfaces.
 *
 * These are the data-shape types that live in brightchain-lib so both
 * frontend and backend can consume them. The Express-specific wrappers
 * (extending Response) live in brightchain-api-lib.
 *
 * Requirements: 5.1-5.10
 */

import { IApiEnvelope } from '../communication';
import { IPublicProfile } from '../identity/publicProfile';

// ─── Search result shape ────────────────────────────────────────────────────

export interface IDirectorySearchResultItem<TId = string> {
  profile: IPublicProfile<TId>;
  relevanceScore: number;
}

// ─── Directory responses ────────────────────────────────────────────────────

export type ISearchDirectoryResponse<TId = string> = IApiEnvelope<{
  results: ReadonlyArray<IDirectorySearchResultItem<TId>>;
  totalCount: number;
  hasMore: boolean;
}>;

export type IGetProfileResponse<TId = string> = IApiEnvelope<
  IPublicProfile<TId>
>;

export type IUpdateProfileResponse<TId = string> = IApiEnvelope<
  IPublicProfile<TId>
>;

export type ITogglePrivacyResponse = IApiEnvelope<{
  privacyMode: boolean;
}>;
