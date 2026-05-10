/**
 * @fileoverview WCAP configuration validation.
 *
 * Validates the WCAP signing configuration at application startup.
 * Logs a warning if the configured algorithm suite is not the expected
 * `dd-ecies-secp256k1-sha256` value.
 *
 * Requirement 4.3 — algorithm suite validation at startup
 */

import { IWcapConfig } from '@brightchain/digitalburnbag-lib';

/**
 * Validates the WCAP configuration and logs a warning if the algorithm suite
 * is not the expected `dd-ecies-secp256k1-sha256`.
 *
 * Call this once at application startup when WCAP signing is enabled.
 *
 * @param config - The WCAP configuration to validate
 * @param logger - Optional logger; falls back to `console` if not provided
 */
export function validateWcapConfig(
  config: IWcapConfig,
  logger?: { warn: (msg: string) => void },
): void {
  const log = logger ?? console;

  if (config.algorithmSuite !== 'dd-ecies-secp256k1-sha256') {
    log.warn(
      `[WCAP] Warning: unsupported algorithm suite '${config.algorithmSuite}'`,
    );
  }
}
