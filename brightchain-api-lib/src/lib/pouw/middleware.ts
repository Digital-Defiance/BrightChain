/**
 * @fileoverview PoUW (Proof of Useful Work) rate limiting Express middleware.
 *
 * Factory function that creates an Express middleware combining sliding-window
 * rate limiting with a challenge-response protocol. Rate-limited clients
 * perform genuinely useful Merkle tree hash computations instead of being
 * simply blocked.
 *
 * ## Lifecycle
 *
 * 1. **Check for work submission** — if `X-PoUW-Response` header is present,
 *    validate the challenge token and verify the work result.
 * 2. **Rate limit check** — check the client's request rate via
 *    `SlidingWindowRateLimiter`.
 * 3. **Under limit** — attach rate limit headers and call `next()`.
 * 4. **Over limit + circuit open** — traditional 429 + `Retry-After`.
 * 5. **Over limit + circuit closed** — issue work unit via `WorkCoordinator`,
 *    respond with 429 + work unit payload + `X-PoUW-Challenge` header.
 *
 * ## Events
 *
 * The singleton `pouwEvents` emitter fires structured events for observability.
 *
 * @see Requirements 1, 2, 3, 4, 5, 8, 10, 12, 13
 */

import { EventEmitter } from 'events';

import {
  BrightChainStrings,
  ChecksumService,
  ClientIdentifierStrategy,
  DifficultyTier,
  DifficultyTierNodeCount,
  IPoUWConfig,
  IPoUWMetrics,
  IWorkResult,
  IWorkUnit,
  RateLimiterFallback,
  translate,
} from '@brightchain/brightchain-lib';
import { NextFunction, Request, RequestHandler, Response } from 'express';

import { CircuitBreaker } from './circuitBreaker';
import { DifficultyAdjuster } from './difficultyAdjuster';
import { MerkleTreeAssembler } from './merkleTreeAssembler';
import { SlidingWindowRateLimiter } from './rateLimiter';
import { TokenValidator } from './tokenValidator';
import { WorkCoordinator } from './workCoordinator';
import { WorkQueue } from './workQueue';

// ---------------------------------------------------------------------------
// Default configuration
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: Omit<IPoUWConfig, 'hmacSecret'> = {
  rateLimit: 100,
  windowMs: 60_000,
  identifierStrategy: ClientIdentifierStrategy.UserOrIp,
  tokenTtlSeconds: 60,
  defaultDifficulty: DifficultyTier.Low,
  maxDifficulty: DifficultyTier.High,
  circuitBreakerThreshold: 10,
  circuitBreakerProbeIntervalMs: 30_000,
  minQueueDepth: 100,
  workUnitMaxAgeMs: 3_600_000,
  fallbackBehavior: RateLimiterFallback.InMemory,
  escalationWindowMs: 300_000,
  coolDownMs: 600_000,
  securityAlertThreshold: 5,
  reputationDifficultyThreshold: 0.7,
  reputationExemptionThreshold: 0.95,
  awardJouleCredits: true,
  microJoulesPerHash: 100,
};

// ---------------------------------------------------------------------------
// Event bus
// ---------------------------------------------------------------------------

/**
 * Singleton event emitter for PoUW middleware operational events.
 *
 * Consumers can listen to:
 * - `'rate-limited'`       — client exceeded rate limit
 * - `'work-issued'`        — work unit issued to client
 * - `'work-verified'`      — work result verified successfully
 * - `'work-failed'`        — work result failed verification
 * - `'circuit-opened'`     — circuit breaker opened
 * - `'circuit-closed'`     — circuit breaker closed
 * - `'security-alert'`     — repeated verification failures
 * - `'fallback-activated'` — degraded to traditional rate limiting
 * - `'joule-credit-awarded'` — Joule credits awarded for completed work
 *
 * @example
 * ```ts
 * pouwEvents.on('rate-limited', ({ clientId }) => {
 *   console.log(`Client ${clientId} rate-limited`);
 * });
 * ```
 */
export const pouwEvents = new EventEmitter();

// ---------------------------------------------------------------------------
// Module-level state (populated by the factory)
// ---------------------------------------------------------------------------

let rateLimiter: SlidingWindowRateLimiter | null = null;
let workCoordinator: WorkCoordinator | null = null;
let difficultyAdjuster: DifficultyAdjuster | null = null;
let tokenValidator: TokenValidator | null = null;
let circuitBreaker: CircuitBreaker | null = null;
let workQueue: WorkQueue | null = null;
let activeConfig: IPoUWConfig | null = null;

// Metrics counters
let totalRequests = 0;
let requestsRateLimited = 0;
let workUnitsIssued = 0;
let workUnitsCompleted = 0;
let workUnitsFailed = 0;
let verificationLatencySum = 0;
let verificationCount = 0;
let totalMicroJoulesAwarded = 0;

// Per-client consecutive verification failure tracking
const clientVerificationFailures = new Map<string, number>();

// Track whether circuit was previously open (for event emission)
let wasCircuitOpen = false;

// ---------------------------------------------------------------------------
// Client identifier extraction
// ---------------------------------------------------------------------------

/**
 * Extract a client identifier from the request based on the configured strategy.
 *
 * @param req - Express request
 * @param strategy - The identifier extraction strategy
 * @returns A string identifier for the client
 */
function extractClientId(
  req: Request,
  strategy: ClientIdentifierStrategy,
): string {
  switch (strategy) {
    case ClientIdentifierStrategy.AuthenticatedUser:
      return (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any).brightchainUser?.id ?? req.ip ?? 'unknown'
      );
    case ClientIdentifierStrategy.ApiKey:
      return (req.headers['x-api-key'] as string) ?? req.ip ?? 'unknown';
    case ClientIdentifierStrategy.UserOrIp:
      return (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any).brightchainUser?.id ?? req.ip ?? 'unknown'
      );
    case ClientIdentifierStrategy.IpAddress:
    default:
      return req.ip ?? 'unknown';
  }
}

// ---------------------------------------------------------------------------
// Rate limit header helpers
// ---------------------------------------------------------------------------

/**
 * Attach standard rate limit headers to the response.
 */
function setRateLimitHeaders(
  res: Response,
  limit: number,
  remaining: number,
  resetMs: number,
): void {
  res.setHeader('X-RateLimit-Limit', limit);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(resetMs / 1000));
}

// ---------------------------------------------------------------------------
// Fallback rate limiter (in-memory singleton for backing store failure)
// ---------------------------------------------------------------------------

let fallbackRateLimiter: SlidingWindowRateLimiter | null = null;

function getFallbackRateLimiter(config: IPoUWConfig): SlidingWindowRateLimiter {
  if (!fallbackRateLimiter) {
    fallbackRateLimiter = new SlidingWindowRateLimiter(
      config.rateLimit,
      config.windowMs,
    );
  }
  return fallbackRateLimiter;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Factory function that creates the PoUW rate limiting middleware.
 *
 * Follows the same pattern as `createJwtAuthMiddleware()` and
 * `createCaptureMiddleware()`: accepts a config object and returns
 * a standard Express `RequestHandler`.
 *
 * @param config - Partial configuration; only `hmacSecret` is required.
 *   All other fields have sensible defaults.
 * @returns Express RequestHandler
 *
 * @see Requirements 10.1, 10.2, 10.3
 */
export function createPoUWMiddleware(
  config: Partial<IPoUWConfig> & Pick<IPoUWConfig, 'hmacSecret'>,
): RequestHandler {
  // Merge with defaults
  const fullConfig: IPoUWConfig = { ...DEFAULT_CONFIG, ...config };
  activeConfig = fullConfig;

  // Reset metrics
  totalRequests = 0;
  requestsRateLimited = 0;
  workUnitsIssued = 0;
  workUnitsCompleted = 0;
  workUnitsFailed = 0;
  verificationLatencySum = 0;
  verificationCount = 0;
  totalMicroJoulesAwarded = 0;
  clientVerificationFailures.clear();
  wasCircuitOpen = false;
  fallbackRateLimiter = null;

  // Create component instances
  rateLimiter = new SlidingWindowRateLimiter(
    fullConfig.rateLimit,
    fullConfig.windowMs,
  );
  rateLimiter.startCleanup(fullConfig.windowMs);

  tokenValidator = new TokenValidator(
    fullConfig.hmacSecret,
    fullConfig.tokenTtlSeconds,
  );

  difficultyAdjuster = new DifficultyAdjuster({
    defaultDifficulty: fullConfig.defaultDifficulty,
    maxDifficulty: fullConfig.maxDifficulty,
    escalationWindowMs: fullConfig.escalationWindowMs,
    coolDownMs: fullConfig.coolDownMs,
    reputationDifficultyThreshold: fullConfig.reputationDifficultyThreshold,
    reputationExemptionThreshold: fullConfig.reputationExemptionThreshold,
  });

  circuitBreaker = new CircuitBreaker(
    fullConfig.circuitBreakerThreshold,
    fullConfig.circuitBreakerProbeIntervalMs,
  );

  workQueue = new WorkQueue({
    minQueueDepth: fullConfig.minQueueDepth,
    workUnitMaxAgeMs: fullConfig.workUnitMaxAgeMs,
  });

  const checksumService = new ChecksumService();
  const assembler = new MerkleTreeAssembler(checksumService);

  workCoordinator = new WorkCoordinator(
    checksumService,
    workQueue,
    assembler,
    tokenValidator,
    {
      minQueueDepth: fullConfig.minQueueDepth,
      workUnitMaxAgeMs: fullConfig.workUnitMaxAgeMs,
    },
  );

  // Capture references for the closure
  const rl = rateLimiter;
  const tv = tokenValidator;
  const da = difficultyAdjuster;
  const cb = circuitBreaker;
  const wc = workCoordinator;
  const cfg = fullConfig;

  // ------------------------------------------------------------------
  // The middleware itself
  // ------------------------------------------------------------------
  return function pouwMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    totalRequests++;

    const clientId = extractClientId(req, cfg.identifierStrategy);

    // Determine per-route overrides
    const routePath = req.route?.path ?? req.path;
    const routeOverride = cfg.routeOverrides?.[routePath];

    // ── Step 1: Check for work result submission ──────────────────
    const pouwResponse = req.headers['x-pouw-response'] as string | undefined;
    if (pouwResponse) {
      handleWorkSubmission(
        req,
        res,
        next,
        clientId,
        pouwResponse,
        tv,
        wc,
        da,
        cb,
        cfg,
      );
      return;
    }

    // ── Step 2: Rate limit check ─────────────────────────────────
    let rateResult;
    try {
      rateResult = rl.checkRate(
        clientId,
        routeOverride ? routePath : undefined,
        routeOverride?.rateLimit,
        routeOverride?.windowMs,
      );
    } catch {
      // Backing store failure — apply fallback behavior
      handleBackingStoreFailure(req, res, next, clientId, cfg);
      return;
    }

    // Attach rate limit headers to ALL responses
    setRateLimitHeaders(
      res,
      rateResult.limit,
      rateResult.remaining,
      rateResult.resetMs,
    );

    // ── Step 3: Under limit — pass through ───────────────────────
    if (rateResult.allowed) {
      next();
      return;
    }

    // ── Step 4: Over limit ───────────────────────────────────────
    requestsRateLimited++;
    da.recordViolation(clientId);

    pouwEvents.emit('rate-limited', {
      clientId,
      limit: rateResult.limit,
      remaining: rateResult.remaining,
      resetMs: rateResult.resetMs,
    });

    // Check circuit breaker state
    const circuitIsOpen = cb.isOpen;

    // Emit circuit state change events
    if (circuitIsOpen && !wasCircuitOpen) {
      wasCircuitOpen = true;
      pouwEvents.emit('circuit-opened', { timestamp: Date.now() });
    }

    // If circuit is open, check if we should probe
    if (circuitIsOpen) {
      if (cb.shouldProbe()) {
        // Half-open: issue a single probe work unit
        try {
          const difficulty = da.getDifficulty(clientId);
          const workUnit = wc.issueWorkUnit(clientId, difficulty);
          workUnitsIssued++;

          pouwEvents.emit('work-issued', {
            clientId,
            workUnitId: workUnit.id,
            difficulty,
            isProbe: true,
          });

          respondWithWorkChallenge(
            res,
            workUnit,
            cfg.tokenTtlSeconds,
            rateResult,
          );
          return;
        } catch {
          // Probe failed — record failure and fall back
          cb.recordFailure();
          respondWithTraditional429(res, rateResult, cfg);
          return;
        }
      }

      // Circuit is open and not probing — traditional 429
      pouwEvents.emit('fallback-activated', {
        clientId,
        reason: 'circuit-open',
      });
      respondWithTraditional429(res, rateResult, cfg);
      return;
    }

    // ── Step 5: Reputation check (if provider configured) ────────
    if (cfg.reputationProvider) {
      // Resolve reputation (may be sync or async)
      const reputationResult = cfg.reputationProvider(clientId);
      if (reputationResult instanceof Promise) {
        reputationResult
          .then((score) => {
            handleRateLimitedWithReputation(
              res,
              clientId,
              score,
              da,
              wc,
              cb,
              cfg,
              rateResult,
            );
          })
          .catch(() => {
            // Reputation lookup failed — proceed without reputation
            handleRateLimitedNoReputation(
              res,
              clientId,
              da,
              wc,
              cb,
              cfg,
              rateResult,
            );
          });
        return;
      }
      // Synchronous reputation
      handleRateLimitedWithReputation(
        res,
        clientId,
        reputationResult,
        da,
        wc,
        cb,
        cfg,
        rateResult,
      );
      return;
    }

    // ── Step 6: Circuit closed, no reputation — issue work unit ──
    handleRateLimitedNoReputation(res, clientId, da, wc, cb, cfg, rateResult);
  };
}

// ---------------------------------------------------------------------------
// Reputation-aware rate limiting helpers
// ---------------------------------------------------------------------------

/**
 * Handle a rate-limited request with a known reputation score.
 * If the client is exempt, respond with traditional 429.
 * Otherwise, use the reputation-adjusted difficulty tier.
 */
function handleRateLimitedWithReputation(
  res: Response,
  clientId: string,
  reputationScore: number,
  da: DifficultyAdjuster,
  wc: WorkCoordinator,
  cb: CircuitBreaker,
  cfg: IPoUWConfig,
  rateResult: { limit: number; remaining: number; resetMs: number },
): void {
  const { tier, exempt } = da.getEffectiveDifficulty(clientId, reputationScore);

  if (exempt) {
    // High-reputation client — traditional 429, no PoUW challenge
    pouwEvents.emit('fallback-activated', {
      clientId,
      reason: 'reputation-exempt',
      reputationScore,
    });
    respondWithTraditional429(res, rateResult, cfg);
    return;
  }

  // Issue work at the reputation-adjusted difficulty
  try {
    const workUnit = wc.issueWorkUnit(clientId, tier);
    workUnitsIssued++;

    pouwEvents.emit('work-issued', {
      clientId,
      workUnitId: workUnit.id,
      difficulty: tier,
      isProbe: false,
    });

    respondWithWorkChallenge(res, workUnit, cfg.tokenTtlSeconds, rateResult);
  } catch {
    cb.recordFailure();

    if (cb.isOpen && !wasCircuitOpen) {
      wasCircuitOpen = true;
      pouwEvents.emit('circuit-opened', { timestamp: Date.now() });
    }

    pouwEvents.emit('fallback-activated', {
      clientId,
      reason: 'work-coordinator-failure',
    });
    respondWithTraditional429(res, rateResult, cfg);
  }
}

/**
 * Handle a rate-limited request without reputation information.
 * Uses the standard difficulty tier from the DifficultyAdjuster.
 */
function handleRateLimitedNoReputation(
  res: Response,
  clientId: string,
  da: DifficultyAdjuster,
  wc: WorkCoordinator,
  cb: CircuitBreaker,
  cfg: IPoUWConfig,
  rateResult: { limit: number; remaining: number; resetMs: number },
): void {
  try {
    const difficulty = da.getDifficulty(clientId);
    const workUnit = wc.issueWorkUnit(clientId, difficulty);
    workUnitsIssued++;

    pouwEvents.emit('work-issued', {
      clientId,
      workUnitId: workUnit.id,
      difficulty,
      isProbe: false,
    });

    respondWithWorkChallenge(res, workUnit, cfg.tokenTtlSeconds, rateResult);
  } catch {
    // WorkCoordinator failure — record in circuit breaker
    cb.recordFailure();

    // Check if circuit just opened
    if (cb.isOpen && !wasCircuitOpen) {
      wasCircuitOpen = true;
      pouwEvents.emit('circuit-opened', { timestamp: Date.now() });
    }

    pouwEvents.emit('fallback-activated', {
      clientId,
      reason: 'work-coordinator-failure',
    });
    respondWithTraditional429(res, rateResult, cfg);
  }
}

// ---------------------------------------------------------------------------
// Work submission handler
// ---------------------------------------------------------------------------

/**
 * Handle a request that includes an `X-PoUW-Response` header (work result submission).
 *
 * Flow:
 * 1. Validate the challenge token
 * 2. Parse the work result from the request body
 * 3. Verify the work result via WorkCoordinator
 * 4. On success: allow the request through with `X-PoUW-Accepted: true`
 * 5. On failure: issue harder work
 */
function handleWorkSubmission(
  req: Request,
  res: Response,
  next: NextFunction,
  clientId: string,
  encodedToken: string,
  tv: TokenValidator,
  wc: WorkCoordinator,
  da: DifficultyAdjuster,
  cb: CircuitBreaker,
  cfg: IPoUWConfig,
): void {
  // Validate the challenge token
  const tokenResult = tv.validateToken(encodedToken, clientId);
  if (!tokenResult.valid) {
    pouwEvents.emit('work-failed', {
      clientId,
      reason: tokenResult.reason,
    });

    // Still attach rate limit headers if we have a limiter
    if (rateLimiter) {
      const routePath = req.route?.path ?? req.path;
      const routeOverride = cfg.routeOverrides?.[routePath];
      const rateResult = rateLimiter.checkRate(
        clientId,
        routeOverride ? routePath : undefined,
        routeOverride?.rateLimit,
        routeOverride?.windowMs,
      );
      setRateLimitHeaders(
        res,
        rateResult.limit,
        rateResult.remaining,
        rateResult.resetMs,
      );
    }

    res.status(403).json({
      statusCode: 403,
      error: 'Forbidden',
      message: translate(
        BrightChainStrings.Error_PoUW_Middleware_InvalidChallengeToken,
      ),
    });
    return;
  }

  // Parse the work result from the request body
  const body = req.body;
  if (!body || !body.workResult) {
    if (rateLimiter) {
      const routePath = req.route?.path ?? req.path;
      const routeOverride = cfg.routeOverrides?.[routePath];
      const rateResult = rateLimiter.checkRate(
        clientId,
        routeOverride ? routePath : undefined,
        routeOverride?.rateLimit,
        routeOverride?.windowMs,
      );
      setRateLimitHeaders(
        res,
        rateResult.limit,
        rateResult.remaining,
        rateResult.resetMs,
      );
    }

    res.status(400).json({
      statusCode: 400,
      error: 'Bad Request',
      message: translate(
        BrightChainStrings.Error_PoUW_Middleware_MissingWorkResult,
      ),
    });
    return;
  }

  let workResult: IWorkResult;
  try {
    // Accept either a pre-parsed object or a JSON string
    if (typeof body.workResult === 'string') {
      workResult = JSON.parse(body.workResult) as IWorkResult;
    } else {
      workResult = body.workResult as IWorkResult;
    }
  } catch {
    res.status(400).json({
      statusCode: 400,
      error: 'Bad Request',
      message: translate(
        BrightChainStrings.Error_PoUW_Middleware_MissingWorkResult,
      ),
    });
    return;
  }

  // Verify the work result
  const verifyStart = Date.now();
  const isCorrect = wc.verifyResult(workResult);
  const verifyLatency = Date.now() - verifyStart;

  verificationLatencySum += verifyLatency;
  verificationCount++;

  // Consume the token to prevent replay
  tv.consumeToken(workResult.workUnitId);

  // Get rate limit info for headers
  let rateLimit = cfg.rateLimit;
  let rateRemaining = 0;
  let rateResetMs = cfg.windowMs;
  if (rateLimiter) {
    const routePath = req.route?.path ?? req.path;
    const routeOverride = cfg.routeOverrides?.[routePath];
    const rateResult = rateLimiter.checkRate(
      clientId,
      routeOverride ? routePath : undefined,
      routeOverride?.rateLimit,
      routeOverride?.windowMs,
    );
    rateLimit = rateResult.limit;
    rateRemaining = rateResult.remaining;
    rateResetMs = rateResult.resetMs;
  }
  setRateLimitHeaders(res, rateLimit, rateRemaining, rateResetMs);

  if (isCorrect) {
    // Success — allow the request through
    workUnitsCompleted++;
    da.recordCompletion(clientId);
    cb.recordSuccess();

    // Clear consecutive failure tracking
    clientVerificationFailures.delete(clientId);

    // Check if circuit just closed
    if (wasCircuitOpen && !cb.isOpen) {
      wasCircuitOpen = false;
      pouwEvents.emit('circuit-closed', { timestamp: Date.now() });
    }

    pouwEvents.emit('work-verified', {
      clientId,
      workUnitId: workResult.workUnitId,
      verificationLatencyMs: verifyLatency,
    });

    // Award Joule credits for completed work
    if (cfg.awardJouleCredits) {
      const difficulty = da.getDifficulty(clientId);
      const nodeCount = DifficultyTierNodeCount[difficulty];
      // Use the average of min and max node count for the award calculation
      const avgNodes = Math.ceil((nodeCount.min + nodeCount.max) / 2);
      const microJoules = avgNodes * cfg.microJoulesPerHash;

      totalMicroJoulesAwarded += microJoules;

      pouwEvents.emit('joule-credit-awarded', {
        clientId,
        workUnitId: workResult.workUnitId,
        microJoules,
        difficulty,
      });

      res.setHeader('X-PoUW-Joule-Award', String(microJoules));
    }

    res.setHeader('X-PoUW-Accepted', 'true');
    next();
  } else {
    // Failure — issue harder work
    workUnitsFailed++;

    // Track consecutive failures for security alerts
    const failures = (clientVerificationFailures.get(clientId) ?? 0) + 1;
    clientVerificationFailures.set(clientId, failures);

    if (failures >= cfg.securityAlertThreshold) {
      pouwEvents.emit('security-alert', {
        clientId,
        consecutiveFailures: failures,
        threshold: cfg.securityAlertThreshold,
      });
    }

    pouwEvents.emit('work-failed', {
      clientId,
      workUnitId: workResult.workUnitId,
      reason: 'incorrect-result',
    });

    // Escalate difficulty and issue new work
    da.recordViolation(clientId);
    const newDifficulty = da.getDifficulty(clientId);

    try {
      const newWorkUnit = wc.issueWorkUnit(clientId, newDifficulty);
      workUnitsIssued++;

      pouwEvents.emit('work-issued', {
        clientId,
        workUnitId: newWorkUnit.id,
        difficulty: newDifficulty,
        isProbe: false,
      });

      respondWithWorkChallenge(res, newWorkUnit, cfg.tokenTtlSeconds, {
        limit: rateLimit,
        remaining: rateRemaining,
        resetMs: rateResetMs,
      });
    } catch {
      cb.recordFailure();
      respondWithTraditional429(
        res,
        {
          limit: rateLimit,
          remaining: rateRemaining,
          resetMs: rateResetMs,
        },
        cfg,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

/**
 * Respond with a 429 containing a PoUW work challenge.
 */
function respondWithWorkChallenge(
  res: Response,
  workUnit: IWorkUnit,
  tokenTtlSeconds: number,
  rateResult: { limit: number; remaining: number; resetMs: number },
): void {
  setRateLimitHeaders(
    res,
    rateResult.limit,
    rateResult.remaining,
    rateResult.resetMs,
  );
  res.setHeader('Retry-After', String(tokenTtlSeconds));
  res.setHeader('X-PoUW-Challenge', workUnit.challengeToken);

  res.status(429).json({
    statusCode: 429,
    error: 'Too Many Requests',
    message: translate(
      BrightChainStrings.Error_PoUW_Middleware_RateLimitedWithWork,
    ),
    workUnit,
  });
}

/**
 * Respond with a traditional 429 (no work challenge).
 */
function respondWithTraditional429(
  res: Response,
  rateResult: { limit: number; remaining: number; resetMs: number },
  _cfg: IPoUWConfig,
): void {
  setRateLimitHeaders(
    res,
    rateResult.limit,
    rateResult.remaining,
    rateResult.resetMs,
  );
  const retryAfterSeconds = Math.ceil(rateResult.resetMs / 1000);
  res.setHeader('Retry-After', String(retryAfterSeconds));

  res.status(429).json({
    statusCode: 429,
    error: 'Too Many Requests',
    message: translate(BrightChainStrings.Error_PoUW_Middleware_RateLimited),
  });
}

// ---------------------------------------------------------------------------
// Backing store failure handler
// ---------------------------------------------------------------------------

/**
 * Handle rate limiter backing store unavailability.
 *
 * Behavior depends on `fallbackBehavior` config:
 * - `Allow`: let the request through
 * - `Deny`: respond with 503
 * - `InMemory`: use an in-memory fallback rate limiter
 */
function handleBackingStoreFailure(
  req: Request,
  res: Response,
  next: NextFunction,
  clientId: string,
  cfg: IPoUWConfig,
): void {
  pouwEvents.emit('fallback-activated', {
    clientId,
    reason: 'backing-store-unavailable',
    fallbackBehavior: cfg.fallbackBehavior,
  });

  switch (cfg.fallbackBehavior) {
    case RateLimiterFallback.Allow:
      // Let the request through
      next();
      return;

    case RateLimiterFallback.Deny:
      res.status(503).json({
        statusCode: 503,
        error: 'Service Unavailable',
        message: translate(
          BrightChainStrings.Error_PoUW_Middleware_RateLimitDenied,
        ),
      });
      return;

    case RateLimiterFallback.InMemory:
    default: {
      // Use in-memory fallback
      const fallback = getFallbackRateLimiter(cfg);
      const rateResult = fallback.checkRate(clientId);
      setRateLimitHeaders(
        res,
        rateResult.limit,
        rateResult.remaining,
        rateResult.resetMs,
      );

      if (rateResult.allowed) {
        next();
      } else {
        requestsRateLimited++;
        const retryAfterSeconds = Math.ceil(rateResult.resetMs / 1000);
        res.setHeader('Retry-After', String(retryAfterSeconds));
        res.status(429).json({
          statusCode: 429,
          error: 'Too Many Requests',
          message: translate(
            BrightChainStrings.Error_PoUW_Middleware_RateLimited,
          ),
        });
      }
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Health check and metrics (Task 13.4)
// ---------------------------------------------------------------------------

/**
 * Health status for a single PoUW subsystem component.
 */
export interface IComponentHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unavailable';
  details?: string;
}

/**
 * Overall health status of the PoUW middleware.
 */
export interface IPoUWHealthStatus {
  status: 'healthy' | 'degraded' | 'unavailable';
  components: IComponentHealth[];
}

/**
 * Get the health status of the PoUW middleware subsystems.
 *
 * Reports the state of:
 * - Rate_Limiter: whether the rate limiter is initialized
 * - Work_Queue: whether the work queue has available work units
 * - Work_Coordinator: whether the coordinator can issue work (circuit breaker state)
 *
 * @returns Health status object
 * @see Requirement 12.3
 */
export function getHealthStatus(): IPoUWHealthStatus {
  const components: IComponentHealth[] = [];

  // Rate Limiter health
  if (rateLimiter) {
    components.push({
      name: 'Rate_Limiter',
      status: 'healthy',
    });
  } else {
    components.push({
      name: 'Rate_Limiter',
      status: 'unavailable',
      details: 'Rate limiter not initialized',
    });
  }

  // Work Queue health
  if (workQueue) {
    const depth = workQueue.depth;
    const minDepth =
      activeConfig?.minQueueDepth ?? DEFAULT_CONFIG.minQueueDepth;
    if (depth >= minDepth) {
      components.push({
        name: 'Work_Queue',
        status: 'healthy',
        details: `depth=${depth}`,
      });
    } else {
      components.push({
        name: 'Work_Queue',
        status: 'degraded',
        details: `depth=${depth}, below minimum=${minDepth}`,
      });
    }
  } else {
    components.push({
      name: 'Work_Queue',
      status: 'unavailable',
      details: 'Work queue not initialized',
    });
  }

  // Work Coordinator health (based on circuit breaker state)
  if (circuitBreaker) {
    if (circuitBreaker.isOpen) {
      components.push({
        name: 'Work_Coordinator',
        status: 'degraded',
        details: 'Circuit breaker is open — using traditional rate limiting',
      });
    } else {
      components.push({
        name: 'Work_Coordinator',
        status: 'healthy',
      });
    }
  } else {
    components.push({
      name: 'Work_Coordinator',
      status: 'unavailable',
      details: 'Work coordinator not initialized',
    });
  }

  // Overall status: worst of all components
  const statuses = components.map((c) => c.status);
  let overall: 'healthy' | 'degraded' | 'unavailable';
  if (statuses.includes('unavailable')) {
    overall = 'unavailable';
  } else if (statuses.includes('degraded')) {
    overall = 'degraded';
  } else {
    overall = 'healthy';
  }

  return { status: overall, components };
}

/**
 * Get current PoUW middleware metrics.
 *
 * @returns Metrics snapshot conforming to `IPoUWMetrics`
 * @see Requirements 12.1, 12.2
 */
export function getPoUWMetrics(): IPoUWMetrics {
  return {
    totalRequests,
    requestsRateLimited,
    workUnitsIssued,
    workUnitsCompleted,
    workUnitsFailed,
    averageVerificationLatencyMs:
      verificationCount > 0 ? verificationLatencySum / verificationCount : 0,
    totalMicroJoulesAwarded,
  };
}
