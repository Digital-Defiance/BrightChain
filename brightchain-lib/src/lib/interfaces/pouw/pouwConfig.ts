import { DifficultyTier } from '../../enumerations/difficultyTier';

/**
 * Client identifier extraction strategy.
 */
export enum ClientIdentifierStrategy {
  IpAddress = 'ip',
  AuthenticatedUser = 'user',
  ApiKey = 'apikey',
  /** Try user ID first, fall back to IP */
  UserOrIp = 'user_or_ip',
}

/**
 * Fallback behavior when the rate limiter backing store is unavailable.
 */
export enum RateLimiterFallback {
  Allow = 'allow',
  Deny = 'deny',
  InMemory = 'in_memory',
}

/**
 * Configuration for the PoUW rate limiting middleware.
 * All fields have sensible defaults except `hmacSecret`.
 */
export interface IPoUWConfig {
  /** HMAC secret for signing challenge tokens (REQUIRED) */
  hmacSecret: string;
  /** Maximum requests per window before rate limiting (default: 100) */
  rateLimit: number;
  /** Sliding window duration in milliseconds (default: 60_000) */
  windowMs: number;
  /** Client identifier strategy (default: UserOrIp) */
  identifierStrategy: ClientIdentifierStrategy;
  /** Challenge token TTL in seconds (default: 60) */
  tokenTtlSeconds: number;
  /** Initial difficulty tier (default: Low) */
  defaultDifficulty: DifficultyTier;
  /** Maximum difficulty tier (default: High) */
  maxDifficulty: DifficultyTier;
  /** Consecutive failures before circuit breaker opens (default: 10) */
  circuitBreakerThreshold: number;
  /** Circuit breaker recovery probe interval in ms (default: 30_000) */
  circuitBreakerProbeIntervalMs: number;
  /** Minimum work units to keep in the queue (default: 100) */
  minQueueDepth: number;
  /** Maximum age for unassigned work units in ms (default: 3_600_000) */
  workUnitMaxAgeMs: number;
  /** Fallback behavior when backing store is unavailable */
  fallbackBehavior: RateLimiterFallback;
  /** Difficulty escalation window in ms (default: 300_000) */
  escalationWindowMs: number;
  /** Cool-down period before difficulty decreases in ms (default: 600_000) */
  coolDownMs: number;
  /** Consecutive verification failures before security alert (default: 5) */
  securityAlertThreshold: number;
  /** Per-route rate limit overrides */
  routeOverrides?: Record<string, { rateLimit: number; windowMs: number }>;

  /**
   * Optional callback to retrieve a client's reputation score (0.0 to 1.0).
   * 0.0 = unknown/no reputation, 1.0 = maximum reputation.
   * When provided, reputation influences the starting difficulty tier and escalation speed.
   * High-reputation clients start at a lower tier and escalate more slowly.
   */
  reputationProvider?: (clientId: string) => number | Promise<number>;

  /**
   * Reputation score threshold above which clients start at a reduced difficulty.
   * Clients with reputation >= this threshold start one tier lower than defaultDifficulty.
   * Default: 0.7
   */
  reputationDifficultyThreshold: number;

  /**
   * Reputation score threshold above which clients are exempt from PoUW challenges
   * and receive traditional rate limiting instead (429 + Retry-After).
   * Set to 1.1 (above max) to disable exemption. Default: 0.95
   */
  reputationExemptionThreshold: number;

  /**
   * Whether to award Joule credits for successfully completed work units.
   * Default: true
   */
  awardJouleCredits: boolean;

  /**
   * Micro-Joules (µJ) awarded per verified hash computation.
   * The total award for a work unit = this value × number of nodes computed.
   * Default: 100 (0.0001 Joules per hash)
   */
  microJoulesPerHash: number;
}
