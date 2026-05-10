/**
 * @fileoverview Burnbag vault deletion configuration validation.
 *
 * Validates the deletion-related configuration at application startup.
 * Controls the cool-down period for public vault deletion, certificate
 * retention duration, and the background job interval.
 *
 * Requirement 10 — configurable limits for cool-down and retention
 */

// ---------------------------------------------------------------------------
// Configuration interface
// ---------------------------------------------------------------------------

/** Validated Burnbag deletion configuration. */
export interface IBurnbagDeletionConfig {
  /** Cool-down period in days for public vault deletion. Default: 30 */
  cooldownDays: number;
  /** Certificate retention in days. Default: 3650 (10 years) */
  certificateRetentionDays: number;
  /** Cool-down expiry job interval in milliseconds. Default: 3600000 (1 hour) */
  cooldownJobIntervalMs: number;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validates and returns the deletion configuration from environment variables.
 * Uses sensible defaults when env vars are not set or contain non-numeric values.
 * Throws if values are out of range (< 1 for day-based values).
 *
 * Call this once at application startup.
 *
 * @throws {Error} CONFIG_INVALID_VALUE if cooldownDays < 1
 * @throws {Error} CONFIG_INVALID_VALUE if certificateRetentionDays < 1
 */
export function validateDeletionConfig(): IBurnbagDeletionConfig {
  const cooldownDays = parsePositiveIntOrDefault(
    'BURNBAG_PUBLIC_VAULT_COOLDOWN_DAYS',
    30,
  );
  const certificateRetentionDays = parsePositiveIntOrDefault(
    'BURNBAG_CERTIFICATE_RETENTION_DAYS',
    3650,
  );
  const cooldownJobIntervalMs = parsePositiveIntOrDefault(
    'BURNBAG_COOLDOWN_JOB_INTERVAL_MS',
    3_600_000,
  );

  if (cooldownDays < 1) {
    throw new Error(
      'CONFIG_INVALID_VALUE: BURNBAG_PUBLIC_VAULT_COOLDOWN_DAYS must be >= 1',
    );
  }
  if (certificateRetentionDays < 1) {
    throw new Error(
      'CONFIG_INVALID_VALUE: BURNBAG_CERTIFICATE_RETENTION_DAYS must be >= 1',
    );
  }

  return { cooldownDays, certificateRetentionDays, cooldownJobIntervalMs };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Parse an environment variable as a positive integer, returning the default
 * if the variable is not set or is not a valid integer.
 *
 * Returns the parsed integer if it is a valid integer (may be <= 0 — caller
 * is responsible for range checks). Returns the default if the variable is
 * absent, empty, or not parseable as an integer.
 */
function parsePositiveIntOrDefault(envVar: string, defaultValue: number): number {
  const raw = process.env[envVar];
  if (raw === undefined || raw === '') {
    return defaultValue;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    // Non-numeric or non-integer values fall back to default
    return defaultValue;
  }
  return n;
}
