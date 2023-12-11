/**
 * Joule resource-credit constants.
 *
 * Re-exports from the asset primitives module and adds the narrow `as const`
 * type forms required by the joule-resource-credits spec (Req 1.1).
 *
 * All internal arithmetic uses bigint microjoules; these constants are the
 * single source of truth for the Joule asset identity.
 */

export {
  JOULE_ASSET_ID,
  JOULE_DECIMALS,
  JOULE_MICROUNITS_PER_UNIT,
  JOULE_SYMBOL,
} from '../asset/jouleConstants';

/** Narrowly typed assetId literal — use for brand-checked comparisons. */
export type JouleAssetId = 'joule';
