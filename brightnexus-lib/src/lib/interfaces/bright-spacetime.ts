import type { BslpPrivacyMode } from '../enumerations/bslp-privacy-mode';
import type { LocationLookupSource } from '../enumerations/location-lookup-source';

/** BSLP protocol identifier. */
export const BSLP_PROTOCOL = 'bright-spacetime';

/** Current BSLP manifest version. */
export const BSLP_VERSION = '1.0';

/** Default celestial reference frame for published vectors. */
export const BSLP_DEFAULT_EPOCH = 'J2000.0';

/**
 * 4D BrightSpacetime vector (spatial component; epoch is separate).
 */
export interface IBrightSpacetimeVector {
  lat: number;
  lon: number;
  /** Altitude in meters above the reference ellipsoid. */
  alt: number;
  epoch: string;
}

/**
 * Heisenberg / privacy metadata per BSLP §3.
 */
export interface IBrightSpacetimePrivacy {
  mode: BslpPrivacyMode;
  /** Declared injected delay in millidays (md). */
  injectedDelayMd: number;
  /** Target geographic uncertainty radius in kilometers. */
  fuzzRadiusKm: number;
}

/**
 * Request body for publishing coordinates for an IP address.
 */
export interface IBrightNexusLocationPublishRequest {
  ipAddress: string;
  vector: IBrightSpacetimeVector;
  privacy: IBrightSpacetimePrivacy;
  /** ECDSA signature (hex) over {@link canonicalBslpSignPayloadJson} bytes. */
  signature: string;
}

/**
 * Stored registry record (BrightDB document).
 */
export interface IBrightNexusLocationRecord extends IBrightNexusLocationPublishRequest {
  id: string;
  memberId: string;
  memberIdHex: string;
  updatedAt: string;
  createdAt: string;
  lookupSource: LocationLookupSource;
}

/**
 * Public lookup response for tools (bcurl, bping, Brightdate-rust).
 */
export interface IBrightNexusLocationLookupEntry {
  memberIdHex: string;
  ipAddress: string;
  vector: IBrightSpacetimeVector;
  privacy: IBrightSpacetimePrivacy;
  signature?: string;
  /** True when the stored signature verifies against the member's public key. */
  signatureVerified: boolean;
  updatedAt: string;
  lookupSource: LocationLookupSource;
}

export interface IBrightNexusLocationLookupResponse {
  ipAddress: string;
  entries: IBrightNexusLocationLookupEntry[];
}

/**
 * `.well-known/bright-spacetime.json` manifest shape (BSLP §1.B).
 */
export interface IBrightSpacetimeWellKnownManifest {
  protocol: typeof BSLP_PROTOCOL;
  version: typeof BSLP_VERSION;
  nodeId?: string;
  vector: IBrightSpacetimeVector;
  privacy: IBrightSpacetimePrivacy;
  signature?: string;
}
