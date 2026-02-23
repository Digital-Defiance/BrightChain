/**
 * Query engine – re-exports from @brightchain/brightchain-lib.
 *
 * The core query engine implementation has been relocated to brightchain-lib
 * for platform-agnostic usage. This file re-exports everything for backward
 * compatibility.
 */
export {
  applyProjection,
  compareValues,
  deepEquals,
  getTextSearchFields,
  matchesFilter,
  setTextSearchFields,
  sortDocuments,
  tokenize,
} from '@brightchain/brightchain-lib/lib/db/queryEngine';
