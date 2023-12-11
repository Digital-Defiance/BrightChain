import { RateLimiter } from './rateLimiter';
import { DEFAULT_RATE_LIMITS } from './rateLimitTypes';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = RateLimiter.getInstance();
    limiter.clear();
  });

  it('should allow requests within limit', () => {
    const result = limiter.checkLimit('blockCreation');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
  });

  it('should block requests exceeding limit', () => {
    const config = DEFAULT_RATE_LIMITS['blockCreation'];

    // Consume all tokens
    for (let i = 0; i < config.maxRequests; i++) {
      const result = limiter.checkLimit('blockCreation');
      expect(result.allowed).toBe(true);
    }

    // Next request should be blocked
    const result = limiter.checkLimit('blockCreation');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should track remaining requests', () => {
    const config = DEFAULT_RATE_LIMITS['blockCreation'];

    limiter.checkLimit('blockCreation');
    const result = limiter.checkLimit('blockCreation');

    expect(result.remaining).toBeLessThan(config.maxRequests);
  });

  it('should provide reset time when blocked', () => {
    const config = DEFAULT_RATE_LIMITS['blockCreation'];

    // Consume all tokens
    for (let i = 0; i < config.maxRequests; i++) {
      limiter.checkLimit('blockCreation');
    }

    const result = limiter.checkLimit('blockCreation');
    expect(result.resetTime).toBeGreaterThan(Date.now());
  });

  it('should support per-identifier limits', () => {
    limiter.checkLimit('blockCreation', 'user1');
    const result1 = limiter.checkLimit('blockCreation', 'user1');
    const result2 = limiter.checkLimit('blockCreation', 'user2');

    expect(result1.remaining).toBeLessThan(result2.remaining);
  });

  it('should allow custom rate limit configuration', () => {
    limiter.setLimit('customOp', { maxRequests: 5, windowMs: 1000 });

    for (let i = 0; i < 5; i++) {
      const result = limiter.checkLimit('customOp');
      expect(result.allowed).toBe(true);
    }

    const result = limiter.checkLimit('customOp');
    expect(result.allowed).toBe(false);
  });

  it('should reset limits for specific operation', () => {
    const config = DEFAULT_RATE_LIMITS['blockCreation'];

    // Consume all tokens
    for (let i = 0; i < config.maxRequests; i++) {
      limiter.checkLimit('blockCreation');
    }

    // Should be blocked
    expect(limiter.checkLimit('blockCreation').allowed).toBe(false);

    // Reset
    limiter.reset('blockCreation');

    // Should be allowed again
    expect(limiter.checkLimit('blockCreation').allowed).toBe(true);
  });

  it('should refill tokens over time', async () => {
    limiter.setLimit('testOp', { maxRequests: 2, windowMs: 100 });

    // Consume all tokens
    limiter.checkLimit('testOp');
    limiter.checkLimit('testOp');
    expect(limiter.checkLimit('testOp').allowed).toBe(false);

    // Wait for refill
    await new Promise((resolve) => setTimeout(resolve, 60));

    // Should have refilled at least one token
    const result = limiter.checkLimit('testOp');
    expect(result.allowed).toBe(true);
  });

  it('should handle different operations independently', () => {
    limiter.checkLimit('blockCreation');
    limiter.checkLimit('encryption');

    const result1 = limiter.checkLimit('blockCreation');
    const result2 = limiter.checkLimit('encryption');

    expect(result1.remaining).not.toBe(result2.remaining);
  });
});
