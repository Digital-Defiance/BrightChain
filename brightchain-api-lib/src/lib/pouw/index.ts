/**
 * @fileoverview Barrel export for the PoUW (Proof of Useful Work) rate limiting
 * server-side components in brightchain-api-lib.
 *
 * Exports the Express middleware factory, event emitter, health/metrics helpers,
 * and all supporting classes used by the middleware.
 */

// Middleware factory, event emitter, health, and metrics
export {
  createPoUWMiddleware,
  getHealthStatus,
  getPoUWMetrics,
  pouwEvents,
} from './middleware';
export type { IComponentHealth, IPoUWHealthStatus } from './middleware';

// Sliding window rate limiter
export { SlidingWindowRateLimiter } from './rateLimiter';
export type { RateLimitResult } from './rateLimiter';

// Work coordinator
export { WorkCoordinator } from './workCoordinator';

// Work queue
export { WorkQueue } from './workQueue';
export type { IWorkQueueEntry } from './workQueue';

// Difficulty adjuster
export { DifficultyAdjuster } from './difficultyAdjuster';
export type { IEffectiveDifficulty } from './difficultyAdjuster';

// Token validator
export { TokenValidator } from './tokenValidator';
export type { TokenValidationResult } from './tokenValidator';

// Merkle tree assembler
export { MerkleTreeAssembler } from './merkleTreeAssembler';

// Circuit breaker
export { CircuitBreaker } from './circuitBreaker';
