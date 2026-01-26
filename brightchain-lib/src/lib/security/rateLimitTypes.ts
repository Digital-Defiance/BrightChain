/**
 * Rate limit configuration for different operations
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Default rate limits for operations
 */
export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  blockCreation: { maxRequests: 100, windowMs: 60000 }, // 100 per minute
  signatureValidation: { maxRequests: 1000, windowMs: 60000 }, // 1000 per minute
  encryption: { maxRequests: 50, windowMs: 60000 }, // 50 per minute
  decryption: { maxRequests: 50, windowMs: 60000 }, // 50 per minute
  storeRead: { maxRequests: 500, windowMs: 60000 }, // 500 per minute
  storeWrite: { maxRequests: 200, windowMs: 60000 }, // 200 per minute
};
