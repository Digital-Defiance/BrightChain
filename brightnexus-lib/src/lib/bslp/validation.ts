import { BslpPrivacyMode } from '../enumerations/bslp-privacy-mode';
import type {
  IBrightNexusLocationPublishRequest,
  IBrightSpacetimePrivacy,
  IBrightSpacetimeVector,
} from '../interfaces/bright-spacetime';
import { BSLP_DEFAULT_EPOCH } from '../interfaces/bright-spacetime';

export interface IBslpValidationResult {
  valid: boolean;
  errors: string[];
}

const LAT_MIN = -90;
const LAT_MAX = 90;
const LON_MIN = -180;
const LON_MAX = 180;
const ALT_MIN = -500;
const ALT_MAX = 100_000;

const IPV4_REGEX =
  /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

/** Simplified IPv6 validation (full RFC 5952 normalization is out of scope for v1). */
const IPV6_REGEX =
  /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;

export function isValidIpAddress(ip: string): boolean {
  const trimmed = ip.trim();
  return IPV4_REGEX.test(trimmed) || IPV6_REGEX.test(trimmed);
}

function validateVector(vector: IBrightSpacetimeVector | undefined): string[] {
  const errors: string[] = [];
  if (!vector || typeof vector !== 'object') {
    errors.push('vector is required');
    return errors;
  }
  if (typeof vector.lat !== 'number' || vector.lat < LAT_MIN || vector.lat > LAT_MAX) {
    errors.push(`lat must be a number between ${LAT_MIN} and ${LAT_MAX}`);
  }
  if (typeof vector.lon !== 'number' || vector.lon < LON_MIN || vector.lon > LON_MAX) {
    errors.push(`lon must be a number between ${LON_MIN} and ${LON_MAX}`);
  }
  if (typeof vector.alt !== 'number' || vector.alt < ALT_MIN || vector.alt > ALT_MAX) {
    errors.push(`alt must be a number between ${ALT_MIN} and ${ALT_MAX} meters`);
  }
  if (typeof vector.epoch !== 'string' || vector.epoch.trim().length === 0) {
    errors.push('epoch must be a non-empty string');
  }
  return errors;
}

function validatePrivacy(privacy: IBrightSpacetimePrivacy | undefined): string[] {
  const errors: string[] = [];
  if (!privacy || typeof privacy !== 'object') {
    errors.push('privacy is required');
    return errors;
  }
  if (
    privacy.mode !== BslpPrivacyMode.Exact &&
    privacy.mode !== BslpPrivacyMode.Heisenberg
  ) {
    errors.push(`privacy.mode must be "${BslpPrivacyMode.Exact}" or "${BslpPrivacyMode.Heisenberg}"`);
  }
  if (
    typeof privacy.injectedDelayMd !== 'number' ||
    privacy.injectedDelayMd < 0 ||
    !Number.isFinite(privacy.injectedDelayMd)
  ) {
    errors.push('privacy.injectedDelayMd must be a non-negative finite number');
  }
  if (
    typeof privacy.fuzzRadiusKm !== 'number' ||
    privacy.fuzzRadiusKm < 0 ||
    !Number.isFinite(privacy.fuzzRadiusKm)
  ) {
    errors.push('privacy.fuzzRadiusKm must be a non-negative finite number');
  }
  if (privacy.mode === BslpPrivacyMode.Exact) {
    if (privacy.injectedDelayMd > 0 || privacy.fuzzRadiusKm > 0) {
      errors.push(
        'privacy.mode "exact" requires injectedDelayMd and fuzzRadiusKm to be 0',
      );
    }
  }
  if (privacy.mode === BslpPrivacyMode.Heisenberg && privacy.fuzzRadiusKm <= 0) {
    errors.push('privacy.mode "heisenberg" requires fuzzRadiusKm > 0');
  }
  return errors;
}

/**
 * Validate a location publish payload per BSLP constraints.
 */
export function validateLocationPublishRequest(
  body: Partial<IBrightNexusLocationPublishRequest> | undefined,
): IBslpValidationResult {
  const errors: string[] = [];
  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['request body is required'] };
  }
  if (typeof body.ipAddress !== 'string' || !isValidIpAddress(body.ipAddress)) {
    errors.push('ipAddress must be a valid IPv4 or IPv6 address');
  }
  errors.push(...validateVector(body.vector));
  errors.push(...validatePrivacy(body.privacy));
  if (typeof body.signature !== 'string' || body.signature.trim().length === 0) {
    errors.push('signature is required (hex ECDSA over canonical BSLP payload)');
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Validate publish fields except signature (for signing-payload preview).
 */
export function validateLocationPublishPayload(
  body: Partial<IBrightNexusLocationPublishRequest> | undefined,
): IBslpValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['request body is required'] };
  }
  const errors: string[] = [];
  if (typeof body.ipAddress !== 'string' || !isValidIpAddress(body.ipAddress)) {
    errors.push('ipAddress must be a valid IPv4 or IPv6 address');
  }
  errors.push(...validateVector(body.vector));
  errors.push(...validatePrivacy(body.privacy));
  return { valid: errors.length === 0, errors };
}

/**
 * Apply defaults for optional vector fields before persistence.
 */
export function normalizeBrightSpacetimeVector(
  vector: IBrightSpacetimeVector,
): IBrightSpacetimeVector {
  return {
    lat: vector.lat,
    lon: vector.lon,
    alt: vector.alt,
    epoch: vector.epoch?.trim() || BSLP_DEFAULT_EPOCH,
  };
}

/**
 * Default privacy for exact-mode publications.
 */
export function defaultExactPrivacy(): IBrightSpacetimePrivacy {
  return {
    mode: BslpPrivacyMode.Exact,
    injectedDelayMd: 0,
    fuzzRadiusKm: 0,
  };
}
