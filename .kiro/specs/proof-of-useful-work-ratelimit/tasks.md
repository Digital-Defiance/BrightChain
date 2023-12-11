# Implementation Plan: Proof of Useful Work Rate Limiting

## Overview

This plan implements a Proof of Useful Work (PoUW) rate limiting system for BrightChain. Shared interfaces, enums, serialization, and the browser-safe `computeWorkUnit()` function go in `brightchain-lib`. Node.js-specific components (Express middleware, WorkCoordinator, WorkQueue, DifficultyAdjuster, TokenValidator, MerkleTreeAssembler, CircuitBreaker) go in `brightchain-api-lib`. The implementation language is TypeScript. Tests use Jest with fast-check for property-based testing. Property test files use the `.property.spec.ts` suffix.

## Tasks

- [x] 1. Define shared enums, interfaces, and serialization in brightchain-lib
  - [x] 1.1 Create the `DifficultyTier` enum and `DifficultyTierNodeCount` map
    - Create `brightchain-lib/src/lib/enumerations/difficultyTier.ts`
    - Define `DifficultyTier` enum with `Low`, `Medium`, `High` values
    - Define `DifficultyTierNodeCount` record mapping tiers to `{ min, max }` node counts
    - Export from the enumerations barrel (`index.ts`)
    - _Requirements: 5.2, 5.3_

  - [x] 1.2 Create the `WorkUnitOperation` enum and PoUW interfaces
    - Create `brightchain-lib/src/lib/interfaces/pouw/` directory
    - Create `workUnit.ts` with `WorkUnitOperation` enum and `IWorkUnit<TID>` interface
    - Create `workResult.ts` with `IWorkResult<TID>` interface
    - Create `challengeToken.ts` with `IChallengeToken<TID>` interface
    - Create `pouwConfig.ts` with `ClientIdentifierStrategy` enum, `RateLimiterFallback` enum, and `IPoUWConfig` interface
    - Create `pouwMetrics.ts` with `IPoUWMetrics` and `IWorkCoordinatorMetrics` interfaces
    - Create `index.ts` barrel exporting all PoUW interfaces and enums
    - All interfaces follow the `IBaseData<TID extends PlatformID>` generic pattern
    - Export from the interfaces barrel (`brightchain-lib/src/lib/interfaces/index.ts`)
    - _Requirements: 11.1, 11.5, 2.3, 3.1, 10.2, 12.1, 12.2_

  - [x] 1.3 Implement `WorkUnitSerializer` for JSON round-trip serialization
    - Create `brightchain-lib/src/lib/serializers/workUnitSerializer.ts`
    - Implement `serializeWorkUnit()` — converts `IWorkUnit` to JSON string, encoding binary fields as base64
    - Implement `parseWorkUnit()` — parses JSON string back to `IWorkUnit`, with descriptive errors for malformed input
    - Implement `serializeWorkResult()` — converts `IWorkResult` to JSON string
    - Implement `parseWorkResult()` — parses JSON string back to `IWorkResult`, with descriptive errors for malformed input
    - Validate all required fields on parse; return descriptive error indicating which field is invalid or missing
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

  - [x] 1.4 Write property tests for WorkUnitSerializer round-trip (Properties 10, 11, 12)
    - Create `brightchain-lib/src/lib/serializers/__tests__/workUnitSerializer.property.spec.ts`
    - **Property 10: Work Unit Serialization Round-Trip** — for any valid `IWorkUnit`, serialize then parse produces a deeply equal object
    - **Validates: Requirements 15.3**
    - **Property 11: Work Result Serialization Round-Trip** — for any valid `IWorkResult`, serialize then parse produces a deeply equal object
    - **Validates: Requirements 15.4**
    - **Property 12: Malformed JSON Error Reporting** — for any invalid/incomplete JSON, parser returns descriptive error and never returns a successfully parsed object
    - **Validates: Requirements 15.6**
    - Use fast-check generators for random valid `IWorkUnit` and `IWorkResult` objects, random strings, partial JSON, and missing-field JSON

  - [x] 1.5 Write unit tests for WorkUnitSerializer edge cases
    - Create `brightchain-lib/src/lib/serializers/__tests__/workUnitSerializer.spec.ts`
    - Test base64 encoding/decoding of binary fields
    - Test specific malformed input scenarios (empty string, null, missing individual fields)
    - Test that serialized output is valid JSON
    - _Requirements: 15.5, 15.6_

- [x] 2. Implement client-side `computeWorkUnit()` in brightchain-lib
  - [x] 2.1 Create the `computeWorkUnit()` function
    - Create `brightchain-lib/src/lib/pouw/computeWorkUnit.ts`
    - Implement async function accepting `IWorkUnit` and optional `ProgressCallback`
    - For `LeafHash` operation: decode base64 input data, compute SHA3-512 via `@noble/hashes/sha3`, return hex string result
    - For `InteriorHash` operation: decode base64 input data (concatenated child hashes), compute SHA3-512, return hex string result
    - Report progress via callback for multi-step computation
    - Return `IWorkResult` with `workUnitId`, `resultHash`, `challengeToken`, `computeTimeMs`, `completedAt`
    - Create barrel export at `brightchain-lib/src/lib/pouw/index.ts`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 2.2 Write property test for client-server hash compatibility (Property 9)
    - Create `brightchain-lib/src/lib/pouw/__tests__/computeWorkUnit.property.spec.ts`
    - **Property 9: Client-Server Hash Compatibility** — for any input data, `computeWorkUnit()` produces a SHA3-512 hash identical to `ChecksumService.calculateChecksum()` output
    - **Validates: Requirements 7.3, 7.4**
    - Use fast-check generators for random byte arrays (0–8192 bytes)

  - [x] 2.3 Write unit tests for `computeWorkUnit()`
    - Create `brightchain-lib/src/lib/pouw/__tests__/computeWorkUnit.spec.ts`
    - Test LeafHash operation with known input/output
    - Test InteriorHash operation with known child hashes
    - Test progress callback invocation
    - Test that result fields are correctly populated
    - _Requirements: 7.2, 7.3, 7.4, 7.5_

- [x] 3. Checkpoint — Verify shared interfaces and client library
  - Ensure `yarn nx build brightchain-lib` succeeds
  - Ensure all tests pass with `yarn nx test brightchain-lib --testPathPatterns="pouw|workUnitSerializer"`
  - Ask the user if questions arise.

- [x] 4. Implement SlidingWindowRateLimiter in brightchain-api-lib
  - [x] 4.1 Create the `SlidingWindowRateLimiter` class
    - Create `brightchain-api-lib/src/lib/pouw/rateLimiter.ts`
    - Extend the pattern from existing `AuditRateLimiter` with per-route support and rate limit status reporting
    - Implement `checkRate(clientId, routeKey?, overrideLimit?, overrideWindowMs?)` returning `{ allowed, limit, remaining, resetMs }`
    - Implement `clear()`, `startCleanup(windowMs)`, `stopCleanup()`
    - Support configurable per-route overrides
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 4.2 Write property test for sliding window rate limiting (Property 1)
    - Create `brightchain-api-lib/src/lib/pouw/__tests__/rateLimiter.property.spec.ts`
    - **Property 1: Sliding Window Rate Limiting** — for any sequence of request timestamps, the rate limiter reports rate-limited iff requests within the sliding window exceed the threshold
    - **Validates: Requirements 1.1, 1.2**
    - Use fast-check generators for random timestamp sequences, thresholds, and window sizes

- [x] 5. Implement TokenValidator in brightchain-api-lib
  - [x] 5.1 Create the `TokenValidator` class
    - Create `brightchain-api-lib/src/lib/pouw/tokenValidator.ts`
    - Implement `createToken(workUnitId, clientId)` — creates HMAC-SHA3-512 signed challenge token
    - Implement `encodeToken(token)` — serializes to base64 string
    - Implement `validateToken(encodedToken, clientId)` — checks HMAC, expiration, client binding, replay
    - Implement `consumeToken(workUnitId)` — marks token as consumed for replay prevention
    - Implement `cleanupConsumed()` — removes expired consumed-token entries
    - Use Node.js `crypto.createHmac('sha512', secret)` for HMAC signing (SHA3-512 via hmac)
    - Track consumed tokens in a `Map<string, IConsumedToken>` with periodic cleanup
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 5.2 Write property tests for token validation (Properties 2, 3, 4, 5)
    - Create `brightchain-api-lib/src/lib/pouw/__tests__/tokenValidator.property.spec.ts`
    - **Property 2: Challenge Token Expiration Rejection** — for any token with past expiration, validator rejects regardless of other fields
    - **Validates: Requirements 3.2**
    - **Property 3: Challenge Token HMAC Integrity** — for any token with modified HMAC (even single bit), validator rejects
    - **Validates: Requirements 3.3**
    - **Property 4: Challenge Token Client Binding** — for any token issued to client A, submitting from client B results in rejection
    - **Validates: Requirements 3.4**
    - **Property 5: Challenge Token Replay Prevention** — for any consumed token, resubmission results in rejection
    - **Validates: Requirements 3.6**
    - Use fast-check generators for random tokens, expiration times, bit flips, client ID pairs

- [x] 6. Implement DifficultyAdjuster in brightchain-api-lib
  - [x] 6.1 Create the `DifficultyAdjuster` class
    - Create `brightchain-api-lib/src/lib/pouw/difficultyAdjuster.ts`
    - Implement `getDifficulty(clientId)` — returns current tier for a client
    - Implement `recordViolation(clientId)` — escalates difficulty within escalation window
    - Implement `recordCompletion(clientId)` — de-escalates after cool-down period
    - Implement `clear()` for testing
    - Track per-client `IDifficultyState` with `currentTier`, `violations[]`, `lastCompletion`
    - Enforce maximum difficulty cap and minimum default difficulty bounds
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 6.2 Write property test for difficulty adjustment (Property 6)
    - Create `brightchain-api-lib/src/lib/pouw/__tests__/difficultyAdjuster.property.spec.ts`
    - **Property 6: Difficulty Adjustment Monotonicity and Bounds** — difficulty is non-decreasing with consecutive violations, non-increasing after cool-down, never exceeds max or falls below default
    - **Validates: Requirements 5.1, 5.2, 5.4, 5.5**
    - Use fast-check generators for random violation/cool-down sequences

- [x] 7. Implement CircuitBreaker in brightchain-api-lib
  - [x] 7.1 Create the `CircuitBreaker` class
    - Create `brightchain-api-lib/src/lib/pouw/circuitBreaker.ts`
    - Implement `recordSuccess()` — resets failure count, closes circuit
    - Implement `recordFailure()` — increments failures, opens circuit at threshold
    - Implement `isOpen` getter — returns whether circuit is open
    - Implement `shouldProbe()` — returns true if enough time has elapsed for a recovery probe
    - Support Closed → Open → HalfOpen → Closed/Open state transitions
    - _Requirements: 13.3, 13.4_

  - [x] 7.2 Write property test for circuit breaker activation (Property 19)
    - Create `brightchain-api-lib/src/lib/pouw/__tests__/circuitBreaker.property.spec.ts`
    - **Property 19: Circuit Breaker Activation** — circuit opens iff consecutive failures meet or exceed threshold
    - **Validates: Requirements 13.3**
    - Use fast-check generators for random success/failure sequences with varying thresholds

- [x] 8. Checkpoint — Verify core components
  - Ensure `yarn nx build brightchain-api-lib` succeeds
  - Ensure all tests pass with `yarn nx test brightchain-api-lib --testPathPatterns="rateLimiter|tokenValidator|difficultyAdjuster|circuitBreaker"`
  - Ask the user if questions arise.

- [x] 9. Implement WorkQueue in brightchain-api-lib
  - [x] 9.1 Create the `WorkQueue` class
    - Create `brightchain-api-lib/src/lib/pouw/workQueue.ts`
    - Implement priority queue with `enqueue()`, `dequeue()`, `requeue()`
    - Implement `expireStale()` — removes work units older than `workUnitMaxAgeMs`
    - Implement `reclaimExpired()` — returns assigned-but-incomplete work units to the available pool
    - Implement `depth` getter and `needsReplenishment` getter (depth < `minQueueDepth`)
    - Prioritize work units contributing to partially-completed Merkle trees over new trees
    - Store `IWorkQueueEntry` with priority score, `isPartialTree` flag, `enqueuedAt`, `assignedUntil`, and `expectedResult`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x] 9.2 Write property tests for WorkQueue (Properties 13, 14, 15, 16)
    - Create `brightchain-api-lib/src/lib/pouw/__tests__/workQueue.property.spec.ts`
    - **Property 13: Work Queue Auto-Replenishment Invariant** — when queue depth falls below minimum, coordinator generates new work units to restore depth
    - **Validates: Requirements 9.1, 9.2**
    - **Property 14: Work Queue Expiration** — work units older than max age are removed during expiration sweep
    - **Validates: Requirements 9.3**
    - **Property 15: Work Queue Reclamation** — assigned work units with expired tokens are returned to available pool
    - **Validates: Requirements 9.4**
    - **Property 16: Work Queue Prioritization** — partial-tree work units are dequeued before new-tree work units
    - **Validates: Requirements 9.6**
    - Use fast-check generators for random dequeue sequences, work unit ages, token TTLs, mixed partial/new-tree units

- [x] 10. Implement MerkleTreeAssembler in brightchain-api-lib
  - [x] 10.1 Create the `MerkleTreeAssembler` class
    - Create `brightchain-api-lib/src/lib/pouw/merkleTreeAssembler.ts`
    - Implement `createTree(treeId, leafCount)` — initializes `IMerkleTreeState` with correct level count
    - Implement `insertNode(treeId, level, index, hash)` — inserts verified node hash
    - Implement `isComplete(treeId)` — checks if all nodes are computed
    - Implement `getRootHash(treeId)` — returns root hash of completed tree
    - Implement `validateTree(treeId)` — verifies parent-child hash consistency: each interior node = SHA3-512(concat(children))
    - Implement `getPartialTreeIds()` and `getRemainingNodes(treeId)` for work unit generation
    - Implement `exportAddresses(treeId)` — exports completed tree as `Checksum[]` for CBL consumption
    - Use `ChecksumService` for all hash computations
    - Store tree state as `Map<string, Checksum>` keyed by `${level}:${index}`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 10.2 Write property tests for Merkle tree assembly (Properties 7, 8)
    - Create `brightchain-api-lib/src/lib/pouw/__tests__/merkleTreeAssembler.property.spec.ts`
    - **Property 7: Merkle Tree Decomposition and Assembly Round-Trip** — decomposing leaf data into work units, computing results, and assembling produces a valid tree whose leaf hashes match SHA3-512 of original data
    - **Validates: Requirements 2.2, 6.2**
    - **Property 8: Merkle Tree Hash Consistency Invariant** — every interior node's hash equals SHA3-512(concat(children hashes))
    - **Validates: Requirements 6.5**
    - Use fast-check generators for random leaf data arrays (1–64 leaves, 64–4096 bytes each)

- [x] 11. Implement WorkCoordinator in brightchain-api-lib
  - [x] 11.1 Create the `WorkCoordinator` class
    - Create `brightchain-api-lib/src/lib/pouw/workCoordinator.ts`
    - Implement `issueWorkUnit(clientId, difficulty)` — dequeues from WorkQueue, creates challenge token, returns `IWorkUnit`
    - Implement `verifyResult(result)` — constant-time comparison against pre-computed expected result
    - Implement `decomposeTree(leafData, treeId)` — breaks leaf data into independent work units with pre-computed answers
    - Implement `generateSyntheticWork(count)` — generates synthetic Merkle tree tasks when no real work is available
    - Implement `getMetrics()` — returns `IWorkCoordinatorMetrics`
    - Auto-replenish queue when depth falls below `minQueueDepth`
    - Support both pre-computed answer comparison and redundant computation verification strategies
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 11.2 Write property test for quorum verification (Property 17)
    - Create `brightchain-api-lib/src/lib/pouw/__tests__/workCoordinator.property.spec.ts`
    - **Property 17: Quorum Verification** — for work units issued to N clients under redundant verification, result is accepted iff at least Q (quorum) clients return matching results
    - **Validates: Requirements 4.4**
    - Use fast-check generators for random result sets with varying match counts and quorum thresholds

- [x] 12. Checkpoint — Verify queue, assembler, and coordinator
  - Ensure `yarn nx build brightchain-api-lib` succeeds
  - Ensure all tests pass with `yarn nx test brightchain-api-lib --testPathPatterns="workQueue|merkleTreeAssembler|workCoordinator"`
  - Ask the user if questions arise.

- [x] 13. Implement `createPoUWMiddleware` factory and HTTP integration
  - [x] 13.1 Create the `pouwEvents` EventEmitter and middleware factory
    - Create `brightchain-api-lib/src/lib/pouw/middleware.ts`
    - Create singleton `pouwEvents` EventEmitter following the `captureEvents` pattern from `captureMiddleware.ts`
    - Emit events: `rate-limited`, `work-issued`, `work-verified`, `work-failed`, `circuit-opened`, `circuit-closed`, `security-alert`, `fallback-activated`
    - Implement `createPoUWMiddleware(config)` factory function accepting `Partial<IPoUWConfig> & Pick<IPoUWConfig, 'hmacSecret'>`
    - Return standard Express `RequestHandler` following `createJwtAuthMiddleware()` and `createCaptureMiddleware()` patterns
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [x] 13.2 Implement the middleware request flow
    - Extract client identifier using configured strategy (IP, user ID, API key, user-or-IP fallback)
    - Check rate limit via `SlidingWindowRateLimiter`
    - If under limit: call `next()`, attach rate limit headers
    - If over limit and circuit breaker open: respond with traditional 429 + `Retry-After`
    - If over limit and circuit breaker closed: issue work unit via `WorkCoordinator`, respond with 429 + work unit payload + `X-PoUW-Challenge` header
    - If request includes `X-PoUW-Response` header: validate challenge token, verify work result, allow request on success or issue harder work on failure
    - Include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers on all responses
    - Include `X-PoUW-Accepted: true` header on successful verification
    - _Requirements: 1.4, 1.5, 1.6, 4.1, 4.6, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 13.3 Implement graceful degradation and fallback logic
    - Integrate `CircuitBreaker` — open after consecutive `WorkCoordinator` failures
    - When circuit is open: fall back to traditional HTTP 429 + `Retry-After`
    - When circuit is half-open: issue a single probe work unit
    - Handle backing store unavailability per `RateLimiterFallback` config (allow, deny, in-memory)
    - Log security alerts when consecutive verification failures exceed `securityAlertThreshold`
    - _Requirements: 1.6, 13.1, 13.2, 13.3, 13.4, 12.4_

  - [x] 13.4 Implement health check and metrics reporting
    - Expose `getHealthStatus()` function reporting state of Rate_Limiter, Work_Queue, and Work_Coordinator
    - Expose `getMetrics()` function returning `IPoUWMetrics` (total requests, rate-limited, work units issued/completed/failed, avg verification latency)
    - Emit structured log events for rate limit triggers, work unit issuance, verification success/failure
    - _Requirements: 12.1, 12.2, 12.3_

  - [x] 13.5 Write property test for rate limit headers (Property 18)
    - Create `brightchain-api-lib/src/lib/pouw/__tests__/middleware.property.spec.ts`
    - **Property 18: Rate Limit Headers Presence** — for any HTTP response, the middleware includes `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers with correct numeric values
    - **Validates: Requirements 8.6**
    - Use fast-check generators for random request sequences through mock Express request/response objects

  - [x] 13.6 Write unit tests for middleware integration
    - Create `brightchain-api-lib/src/lib/pouw/__tests__/middleware.spec.ts`
    - Test 429 response format with work unit payload
    - Test `X-PoUW-Challenge` and `X-PoUW-Accepted` headers
    - Test `next()` call behavior for under-limit requests
    - Test client identifier extraction strategies (IP, user, API key)
    - Test route-level rate limit overrides
    - Test default configuration (hmac-only)
    - Test `pouwEvents` emits correct events with correct payloads
    - Test fallback behaviors (allow, deny, in-memory)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 10.3, 10.4, 10.5, 10.6, 12.4_

- [x] 14. Create barrel exports and wire everything together
  - [x] 14.1 Create brightchain-api-lib PoUW barrel export
    - Create `brightchain-api-lib/src/lib/pouw/index.ts` exporting all PoUW components
    - Export `createPoUWMiddleware`, `pouwEvents`, `SlidingWindowRateLimiter`, `WorkCoordinator`, `WorkQueue`, `DifficultyAdjuster`, `TokenValidator`, `MerkleTreeAssembler`, `CircuitBreaker`
    - Update `brightchain-api-lib` main barrel to include PoUW exports
    - _Requirements: 11.2_

  - [x] 14.2 Update brightchain-lib barrel exports for PoUW
    - Export all PoUW interfaces, enums, `WorkUnitSerializer`, and `computeWorkUnit` from brightchain-lib main barrel
    - Ensure `DifficultyTier` enum is exported from enumerations barrel
    - _Requirements: 11.1, 11.3_

  - [x] 14.3 Write integration tests for full challenge-response flow
    - Create `brightchain-api-lib/src/lib/pouw/__tests__/integration/fullFlow.spec.ts`
    - Test complete flow: rate limit → receive work unit → compute with `computeWorkUnit()` → submit result → verify → request proceeds
    - Test incorrect result → harder work unit reissued
    - Test expired token → rejection
    - Test circuit breaker activation and recovery
    - Test Express middleware composition with mock helmet, cors, body-parser
    - _Requirements: 4.1, 4.6, 8.1, 8.4, 8.5, 13.3, 10.4_

- [x] 15. Checkpoint — Verify middleware and integration
  - Ensure `yarn nx build brightchain-api-lib` succeeds
  - Ensure `yarn nx build brightchain-lib` succeeds
  - Ensure all PoUW tests pass with `yarn nx test brightchain-api-lib --testPathPatterns="pouw"`
  - Ensure all PoUW tests pass with `yarn nx test brightchain-lib --testPathPatterns="pouw|workUnitSerializer"`
  - Ask the user if questions arise.

- [x] 16. Write the research paper
  - [x] 16.1 Create the research paper document
    - Create `docs/proof-of-useful-work-ratelimit-paper.md`
    - Write **Abstract** — summarize the PoUW rate limiting concept, key contributions, and results
    - Write **Introduction** — motivate the problem (wasted computation in traditional PoW rate limiting), state the contribution (useful work for BrightChain infrastructure)
    - Write **Related Work** section covering: hashcash, CAPTCHA, traditional rate limiting (token bucket, sliding window), existing proof-of-useful-work systems (BOINC, Folding@Home, blockchain PoUW for ML training)
    - _Requirements: 14.1, 14.2_

  - [x] 16.2 Write the System Design and Protocol sections
    - Write **System Design** — describe architecture, component interactions, data flow (reference the design document's mermaid diagrams in prose)
    - Write **Protocol Specification** — formally define the challenge-response flow, verification strategies (pre-computed and redundant), difficulty adjustment algorithm
    - Write **Merkle Tree Work Integration** — argue why Merkle tree construction is well-suited for rate limiting: decomposable, independently verifiable, quick to verify, genuinely useful to BrightChain's CBL infrastructure
    - _Requirements: 14.3, 14.5_

  - [x] 16.3 Write the Security Analysis and Evaluation sections
    - Write **Threat Model** — define adversary capabilities and attack surfaces
    - Write **Security Analysis** — analyze resistance to: replay attacks (HMAC + consumed token tracking), pre-computation attacks (server-generated challenges with HMAC binding), work-sharing attacks (client binding in challenge tokens), economic incentive model
    - Write **Performance Evaluation Methodology** — describe how to measure: verification latency (<50ms for pre-computed), useful work throughput, client computation time per difficulty tier, overhead vs traditional rate limiting
    - Write **Comparison Table** contrasting PoUW against hashcash, CAPTCHA, and token-bucket rate limiting across: computational waste, user experience, security strength, platform benefit
    - _Requirements: 14.4, 14.6_

  - [x] 16.4 Write the Discussion and Conclusion sections
    - Write **Discussion** — limitations, future work (persistent backing stores, distributed work coordination, WebAssembly acceleration benchmarks), ethical considerations
    - Write **Conclusion** — summarize contributions and impact
    - Write **References** section with proper citations
    - _Requirements: 14.2_

- [x] 17. Final checkpoint — Ensure all tests pass
  - Ensure `yarn nx build brightchain-lib` succeeds
  - Ensure `yarn nx build brightchain-api-lib` succeeds
  - Ensure all tests pass with `yarn nx test brightchain-lib --testPathPatterns="pouw|workUnitSerializer"`
  - Ensure all tests pass with `yarn nx test brightchain-api-lib --testPathPatterns="pouw"`
  - Verify the research paper exists at `docs/proof-of-useful-work-ratelimit-paper.md` with all required sections
  - Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (19 properties total)
- Unit tests validate specific examples and edge cases
- All shared interfaces use the `IBaseData<TID extends PlatformID>` generic pattern for frontend/backend compatibility
- The `computeWorkUnit()` client library uses `@noble/hashes/sha3` (already a project dependency) for browser-safe SHA3-512
- The middleware factory follows existing patterns: `createJwtAuthMiddleware()`, `createCaptureMiddleware()`
- The `pouwEvents` EventEmitter follows the existing `captureEvents` singleton pattern
