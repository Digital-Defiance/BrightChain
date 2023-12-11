/**
 * Joule resource-credit constants.
 *
 * Joule is BrightChain's first-class metered asset. All ledger and
 * operational-tier arithmetic is performed in microjoules (`bigint`) to
 * eliminate floating-point rounding from charge / credit paths.
 *
 * @see asset-account-store-generalization spec, Requirement 1.2
 */

/** Microjoules per joule. 1 J = 1_000_000 µJ. */
export const JOULE_MICROUNITS_PER_UNIT = 1_000_000n;

/**
 * Number of fractional decimal digits a joule amount renders with by default.
 * Tied to {@link JOULE_MICROUNITS_PER_UNIT}: 10^6 microunits => 6 decimals.
 */
export const JOULE_DECIMALS = 6;

/** Display symbol for the joule asset. */
export const JOULE_SYMBOL = 'J';

/** Canonical assetId string for the joule asset. */
export const JOULE_ASSET_ID = 'joule';
