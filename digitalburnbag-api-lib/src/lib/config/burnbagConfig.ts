/**
 * @fileoverview Burnbag Joule feature flag + startup configuration validation.
 *
 * All Joule-economy code paths MUST be guarded with `isBurnbagJouleEnabled()`.
 * When the flag is false the system behaves exactly as it did before the Joule
 * spec was implemented — no Joule checks, no upload escrow, no contract creation.
 *
 * Requirement 9.1 — feature flag gating
 * Requirement 9.2 — graceful degradation when disabled
 * Requirement 9.3 — env-var validation on startup
 * Requirement 9.4 — share-fraction sum assertion
 */

// ---------------------------------------------------------------------------
// Feature flag
// ---------------------------------------------------------------------------

/**
 * Returns `true` when the Joule storage economy is active.
 *
 * The env-var is read lazily (every call) so that tests can override it
 * by setting `process.env.BURNBAG_JOULE_ENABLED` before the call.
 */
export function isBurnbagJouleEnabled(): boolean {
  return process.env['BURNBAG_JOULE_ENABLED'] === 'true';
}

// ---------------------------------------------------------------------------
// Required env-vars when Joule is enabled
// ---------------------------------------------------------------------------

const REQUIRED_ENV_VARS = [
  'BURNBAG_SETTLEMENT_INTERVAL_MS',
  'BURNBAG_QUOTE_TTL_MS',
  'BURNBAG_PROVIDER_SHARE_FRACTION',
  'BURNBAG_OWNER_SHARE_FRACTION',
  'BURNBAG_NETWORK_SHARE_FRACTION',
  'BURNBAG_PROTOCOL_SHARE_FRACTION',
] as const;

/** Validated Burnbag Joule configuration (share fractions are integers × 100). */
export interface IBurnbagJouleConfig {
  settlementIntervalMs: number;
  quoteTtlMs: number;
  providerShareFraction: number;
  ownerShareFraction: number;
  networkShareFraction: number;
  protocolShareFraction: number;
}

/**
 * Validates and returns the Joule configuration from environment variables.
 * Throws if any required var is missing or malformed, or if share fractions
 * do not sum to 100.
 *
 * Call this once at application startup when `isBurnbagJouleEnabled()` is true.
 *
 * @throws {Error} CONFIG_MISSING_VAR if a required env-var is absent
 * @throws {Error} CONFIG_INVALID_VALUE if a value is not a positive finite number
 * @throws {Error} CONFIG_SHARE_SUM if fractions do not sum to exactly 100
 */
export function validateBurnbagConfig(): IBurnbagJouleConfig {
  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      throw new Error(
        `CONFIG_MISSING_VAR: required env var '${varName}' is not set (BURNBAG_JOULE_ENABLED=true)`,
      );
    }
  }

  const settlementIntervalMs = parsePositiveInt(
    'BURNBAG_SETTLEMENT_INTERVAL_MS',
    process.env['BURNBAG_SETTLEMENT_INTERVAL_MS'],
  );
  const quoteTtlMs = parsePositiveInt(
    'BURNBAG_QUOTE_TTL_MS',
    process.env['BURNBAG_QUOTE_TTL_MS'],
  );
  const providerShareFraction = parsePositiveInt(
    'BURNBAG_PROVIDER_SHARE_FRACTION',
    process.env['BURNBAG_PROVIDER_SHARE_FRACTION'],
  );
  const ownerShareFraction = parsePositiveInt(
    'BURNBAG_OWNER_SHARE_FRACTION',
    process.env['BURNBAG_OWNER_SHARE_FRACTION'],
  );
  const networkShareFraction = parsePositiveInt(
    'BURNBAG_NETWORK_SHARE_FRACTION',
    process.env['BURNBAG_NETWORK_SHARE_FRACTION'],
  );
  const protocolShareFraction = parsePositiveInt(
    'BURNBAG_PROTOCOL_SHARE_FRACTION',
    process.env['BURNBAG_PROTOCOL_SHARE_FRACTION'],
  );

  const sum =
    providerShareFraction +
    ownerShareFraction +
    networkShareFraction +
    protocolShareFraction;

  if (sum !== 100) {
    throw new Error(
      `CONFIG_SHARE_SUM: BURNBAG_*_SHARE_FRACTION values must sum to 100, got ${sum} ` +
        `(provider=${providerShareFraction}, owner=${ownerShareFraction}, ` +
        `network=${networkShareFraction}, protocol=${protocolShareFraction})`,
    );
  }

  return {
    settlementIntervalMs,
    quoteTtlMs,
    providerShareFraction,
    ownerShareFraction,
    networkShareFraction,
    protocolShareFraction,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function parsePositiveInt(name: string, raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(
      `CONFIG_INVALID_VALUE: '${name}' must be a positive integer, got '${raw}'`,
    );
  }
  return n;
}
