/**
 * BrightChain Cross-Cutting Database Schemas
 *
 * This module exports all collection schemas shared across
 * all BrightChain dApps (using the `brightchain_` prefix).
 */

// Friends System
export {
  FRIEND_REQUESTS_COLLECTION,
  FRIEND_REQUESTS_SCHEMA,
  FRIEND_REQUEST_STATUS_VALUES,
  FRIENDSHIPS_COLLECTION,
  FRIENDSHIPS_SCHEMA,
} from './friends.schema';
