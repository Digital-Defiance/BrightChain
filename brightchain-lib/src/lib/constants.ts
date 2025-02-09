/**
 * Number of bcrypt rounds to hash passwords
 */
export const BCRYPT_ROUNDS = 10;

export const EMAIL_FROM = 'noreply@brightchain.io';

/**
 * Algorithm to use for JWT
 */
export const JWT_ALGO:
  | 'HS256'
  | 'HS384'
  | 'HS512'
  | 'RS256'
  | 'RS384'
  | 'RS512'
  | 'ES256'
  | 'ES384'
  | 'ES512'
  | 'PS256'
  | 'PS384'
  | 'PS512' = 'HS256';

/**
 * The expiration time for a JWT token in seconds
 */
export const JWT_EXPIRATION_SEC = 86400;
export const RANDOM_BLOCKS_PER_TUPLE = 2;
export const SITE_DOMAIN = 'localhost:3000';
export const TUPLE_SIZE = 3;

export const CBL_OVERHEAD_SIZE = 102;
export const ECIES_OVERHEAD_SIZE = 97;

export const MIN_TUPLE_SIZE = 2;
export const MAX_TUPLE_SIZE = 10;

// Constants for OFFS whitener generation
export const OFFS_CACHE_PERCENTAGE = 0.7; // 70% from cache, 30% new random blocks

export default {
  BCRYPT_ROUNDS,
  EMAIL_FROM,
  JWT_ALGO,
  JWT_EXPIRATION_SEC,
  RANDOM_BLOCKS_PER_TUPLE,
  SITE_DOMAIN,
  TUPLE_SIZE,
  CBL_OVERHEAD_SIZE,
  ECIES_OVERHEAD_SIZE,
  MIN_TUPLE_SIZE,
  MAX_TUPLE_SIZE,
  OFFS_CACHE_PERCENTAGE,
};
