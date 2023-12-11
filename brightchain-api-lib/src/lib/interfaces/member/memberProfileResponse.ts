import {
  IMemberPrivateProfileData,
  IMemberProfileData,
  IMemberPublicProfileData,
} from '@brightchain/brightchain-lib';

/**
 * Public member profile data for API responses.
 *
 * Extends the platform-agnostic `IMemberPublicProfileData<string>` base from
 * brightchain-lib, following the IBaseData<TData> workspace convention.
 * The `[key: string]: unknown` index signature is required by the Express
 * response body typing in this layer.
 */
export interface IMemberPublicProfileResponse
  extends IMemberPublicProfileData<string> {
  [key: string]: unknown;
}

/**
 * Private member profile data for API responses (only for authorized users).
 *
 * Extends the platform-agnostic `IMemberPrivateProfileData<string>` base from
 * brightchain-lib.
 */
export interface IMemberPrivateProfileResponse
  extends IMemberPrivateProfileData<string> {
  [key: string]: unknown;
}

/**
 * Combined member profile response.
 *
 * Extends the platform-agnostic `IMemberProfileData<string>` base from
 * brightchain-lib, narrowing the profile types to the API response variants.
 */
export interface IMemberProfileResponse extends IMemberProfileData<string> {
  [key: string]: unknown;
  publicProfile: IMemberPublicProfileResponse;
  privateProfile?: IMemberPrivateProfileResponse;
}

/**
 * Request to update member profile settings
 */
export interface IMemberProfileUpdateRequest {
  settings?: Record<string, unknown>;
  addTrustedPeer?: string;
  removeTrustedPeer?: string;
  addBlockedPeer?: string;
  removeBlockedPeer?: string;
}
