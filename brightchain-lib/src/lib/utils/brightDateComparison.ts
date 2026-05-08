/**
 * BrightDate Comparison Utilities for BrightChain
 *
 * Re-exports comparison primitives from `@brightchain/brightdate` under
 * brightchain-idiomatic names.
 *
 *  - `compareBrightDates` — re-export of `sortComparator` (returns `a - b`,
 *    the idiomatic JS sort comparator form)
 *  - `isInBrightDateRange` — re-export of `isInRange`
 *
 * All comparison math lives in `@brightchain/brightdate`. Do not add logic here.
 *
 * @module brightDateComparison
 */

export {
  isInRange as isInBrightDateRange,
  sortComparator as compareBrightDates,
} from '@brightchain/brightdate';
