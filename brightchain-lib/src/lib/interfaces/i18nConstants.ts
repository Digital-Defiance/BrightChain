/**
 * Type-safe i18n constants for the BrightChain component.
 *
 * Extends ISuiteCoreI18nConstants with BrightChain-specific constant keys
 * referenced in BrightChain translation templates.
 *
 * The II18nConstants index signature (`[key: string]: unknown`) allows
 * the full CONSTANTS object (which includes nested objects like CBL, TUPLE, etc.)
 * to satisfy this interface. Only string/number values are used in template
 * replacement; other types are silently ignored by the i18n engine.
 */
import type { II18nConstants } from '@digitaldefiance/i18n-lib';

/**
 * BrightChain i18n constants interface.
 *
 * This extends II18nConstants directly rather than ISuiteCoreI18nConstants
 * because the BrightChain CONSTANTS object has a different shape (nested
 * sub-objects like SITE, CBL, TUPLE, etc.) from the flat SuiteCore constants.
 *
 * The SuiteCore constants (Site, SiteTagline, etc.) are provided separately
 * via CoreConstants and registered through createSuiteCoreComponentPackage().
 */
export interface IBrightChainI18nConstants extends II18nConstants {
  /** OFFS cache percentage for whitener generation */
  readonly OFFS_CACHE_PERCENTAGE: number;
}
