import { BrightChainStrings } from '../enumerations';
import { translate } from '../i18n';
import {
  DEFAULT_RATE_LIMITS,
  RateLimitConfig,
  RateLimitResult,
} from './rateLimitTypes';
import { SecurityAuditLogger } from './securityAuditLogger';
import { SecurityEventSeverity, SecurityEventType } from './securityEvent';

/**
 * Token bucket for rate limiting
 */
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private maxTokens: number,
    private refillRate: number,
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  consume(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  remaining(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  resetTime(): number {
    const tokensNeeded = 1 - this.tokens;
    if (tokensNeeded <= 0) return 0;
    return Date.now() + tokensNeeded * this.refillRate;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = elapsed / this.refillRate;
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

/**
 * Rate limiter using token bucket algorithm
 */
export class RateLimiter {
  private static instance: RateLimiter;
  private buckets = new Map<string, TokenBucket>();
  private configs = new Map<string, RateLimitConfig>();

  private constructor() {
    // Initialize with default configs
    Object.entries(DEFAULT_RATE_LIMITS).forEach(([operation, config]) => {
      this.configs.set(operation, config);
    });
  }

  public static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  /**
   * Set rate limit configuration for an operation
   */
  public setLimit(operation: string, config: RateLimitConfig): void {
    this.configs.set(operation, config);
    this.buckets.delete(operation); // Reset bucket
  }

  /**
   * Check if operation is allowed
   */
  public checkLimit(operation: string, identifier?: string): RateLimitResult {
    const key = identifier ? `${operation}:${identifier}` : operation;
    const bucket = this.getBucket(key, operation);

    const allowed = bucket.consume();
    const remaining = bucket.remaining();
    const resetTime = bucket.resetTime();

    if (!allowed) {
      SecurityAuditLogger.getInstance().log(
        SecurityEventType.RateLimitExceeded,
        SecurityEventSeverity.Warning,
        translate(
          BrightChainStrings.Security_RateLimiter_RateLimitExceededErrorTemplate,
          { OPERATION: operation },
        ),
        { operation, identifier },
      );
    }

    return { allowed, remaining, resetTime };
  }

  /**
   * Reset rate limit for an operation
   */
  public reset(operation: string, identifier?: string): void {
    const key = identifier ? `${operation}:${identifier}` : operation;
    this.buckets.delete(key);
  }

  /**
   * Clear all rate limits
   */
  public clear(): void {
    this.buckets.clear();
  }

  private getBucket(key: string, operation: string): TokenBucket {
    let bucket = this.buckets.get(key);
    if (!bucket) {
      const config =
        this.configs.get(operation) || DEFAULT_RATE_LIMITS['blockCreation'];
      const refillRate = config.windowMs / config.maxRequests;
      bucket = new TokenBucket(config.maxRequests, refillRate);
      this.buckets.set(key, bucket);
    }
    return bucket;
  }
}
