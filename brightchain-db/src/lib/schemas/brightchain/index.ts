/**
 * BrightChain Cross-Cutting Database Schemas
 *
 * This module exports all collection schemas shared across
 * all BrightChain dApps (using the `brightchain_` prefix).
 */

// Friends System
export {
  FRIENDSHIPS_COLLECTION,
  FRIENDSHIPS_SCHEMA,
  FRIEND_REQUESTS_COLLECTION,
  FRIEND_REQUESTS_SCHEMA,
  FRIEND_REQUEST_STATUS_VALUES,
} from './friends.schema';
