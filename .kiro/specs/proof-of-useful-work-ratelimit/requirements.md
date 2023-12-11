# Requirements Document

## Introduction

This document specifies the requirements for a **Proof of Useful Work (PoUW) Rate Limiting** system for the BrightChain platform. Unlike traditional rate limiting (which simply blocks requests) or hashcash-style proof-of-work (which wastes CPU on meaningless puzzles), this system requires rate-limited clients to perform computations that are genuinely useful to the BrightChain network — specifically, constructing Merkle trees and performing cryptographic operations that BrightChain itself needs.

The system operates as Express middleware. When a client exceeds its rate limit, the server issues a small, verifiable work unit drawn from a self-contained work queue. The client computes the result (via WebAssembly in the browser or a lightweight client-side library), returns it, and the server verifies the result before allowing the request to proceed. Rate-limited users literally build the platform's infrastructure as the cost of continued access.

The network itself acts as the distributed computing coordinator — no external services like BOINC or Folding@Home are involved. The server maintains a queue of useful computation tasks, breaks them into small verifiable chunks, and distributes them to clients as proof-of-work challenges.

This specification also includes a deliverable for an academic/research paper documenting the PoUW rate limiting approach.

## Glossary

- **PoUW_Middleware**: The Express middleware component that intercepts requests, checks rate limits, and issues or verifies work units.
- **Work_Coordinator**: The server-side component that maintains the queue of useful computation tasks, decomposes them into work units, and manages their lifecycle.
- **Work_Unit**: A small, independent, verifiable computation chunk issued to a rate-limited client. Each Work_Unit takes seconds (not hours) to complete and produces a result that is useful to BrightChain.
- **Work_Queue**: The server-side data structure holding pending Work_Units awaiting assignment to clients.
- **Work_Result**: The computed output returned by a client after completing a Work_Unit, including the result data and metadata needed for verification.
- **Rate_Limiter**: The component that tracks request rates per client and determines when a client has exceeded its allowed rate.
- **Client_Identifier**: A value (IP address, authenticated user ID, or API key) used to track per-client request rates.
- **Merkle_Tree**: A hash tree structure used by BrightChain for data integrity verification, where each leaf node is a hash of a data block and each non-leaf node is a hash of its children.
- **CBL**: Constituent Block List — BrightChain's existing Merkle tree implementation that stores block addresses and provides integrity verification via creator signatures.
- **Checksum**: A SHA3-512 digest (64 bytes) used throughout BrightChain for block and data integrity, represented by the existing `Checksum` class.
- **Block**: A fixed-size data unit in BrightChain's Owner Free Filesystem, available in sizes from 512 bytes (Message) to 256 MB (Huge).
- **Verification_Strategy**: The method used to confirm a Work_Result is correct — either comparison against a pre-computed answer or redundant computation across multiple clients.
- **Challenge_Token**: A cryptographically signed, time-limited token issued with a Work_Unit that binds the challenge to a specific client and request context.
- **Difficulty_Adjuster**: The component that scales work unit complexity based on the severity of rate limit violations and current system load.
- **Client_Library**: A lightweight JavaScript/WebAssembly library distributed to browser clients for computing Work_Units.
- **Research_Paper**: An academic/research paper documenting the PoUW rate limiting approach, its design, analysis, and evaluation.

## Requirements

### Requirement 1: Rate Limit Detection

**User Story:** As an API operator, I want the middleware to detect when a client exceeds its allowed request rate, so that abusive clients are identified and required to perform useful work.

#### Acceptance Criteria

1. THE PoUW_Middleware SHALL track request counts per Client_Identifier using a sliding window algorithm.
2. WHEN a client's request count exceeds the configured threshold within the sliding window period, THE Rate_Limiter SHALL mark the client as rate-limited.
3. THE PoUW_Middleware SHALL support configurable rate limit thresholds per route or route group.
4. THE PoUW_Middleware SHALL support multiple Client_Identifier strategies: IP address, authenticated user ID, and API key.
5. WHILE a client is not rate-limited, THE PoUW_Middleware SHALL pass the request through to the next middleware without delay.
6. IF the Rate_Limiter's backing store becomes unavailable, THEN THE PoUW_Middleware SHALL fall back to a configurable default behavior (allow, deny, or in-memory rate limiting).

### Requirement 2: Work Unit Generation

**User Story:** As the BrightChain network, I want rate-limited clients to receive useful computation tasks, so that their CPU cycles contribute to platform infrastructure rather than being wasted.

#### Acceptance Criteria

1. WHEN a client is rate-limited, THE Work_Coordinator SHALL select a pending Work_Unit from the Work_Queue and issue it to the client.
2. THE Work_Coordinator SHALL decompose Merkle tree construction tasks into independent Work_Units, where each Work_Unit computes the hash of one or more data blocks or intermediate tree nodes.
3. THE Work_Unit SHALL contain: a unique identifier, the input data (block contents or child hashes), the expected operation (leaf hash or interior node hash), a Challenge_Token, and a difficulty parameter.
4. THE Work_Coordinator SHALL use BrightChain's existing SHA3-512 Checksum algorithm for all Merkle tree hash computations within Work_Units.
5. WHEN the Work_Queue is empty, THE Work_Coordinator SHALL generate synthetic Merkle tree construction tasks from available block data or random data seeded by the server.
6. THE Work_Unit SHALL be completable by a client within a configurable time bound (default: 2-10 seconds of computation).

### Requirement 3: Challenge Token Security

**User Story:** As a security engineer, I want work challenges to be cryptographically bound to specific clients and time windows, so that clients cannot reuse, forge, or share completed work.

#### Acceptance Criteria

1. THE Challenge_Token SHALL contain: the Work_Unit identifier, the Client_Identifier, an issuance timestamp, an expiration timestamp, and a server-generated HMAC signature.
2. THE PoUW_Middleware SHALL reject any Work_Result whose Challenge_Token has expired.
3. THE PoUW_Middleware SHALL reject any Work_Result whose Challenge_Token HMAC signature is invalid.
4. THE PoUW_Middleware SHALL reject any Work_Result whose Challenge_Token Client_Identifier does not match the submitting client.
5. THE Challenge_Token SHALL have a configurable time-to-live (default: 60 seconds).
6. THE PoUW_Middleware SHALL prevent replay attacks by tracking consumed Challenge_Tokens and rejecting duplicates within the token TTL window.

### Requirement 4: Work Result Verification

**User Story:** As the BrightChain network, I want submitted work results to be verified quickly and reliably, so that only correct computations are accepted and credited.

#### Acceptance Criteria

1. WHEN a client submits a Work_Result, THE PoUW_Middleware SHALL verify the result before allowing the original request to proceed.
2. THE Work_Coordinator SHALL support two Verification_Strategies: pre-computed answer comparison and redundant computation across multiple clients.
3. WHEN using pre-computed answer comparison, THE Work_Coordinator SHALL compute and store the expected result at Work_Unit creation time, and verification SHALL consist of a constant-time comparison.
4. WHEN using redundant computation, THE Work_Coordinator SHALL issue the same Work_Unit to multiple clients and accept the result only when a configurable quorum of matching results is reached.
5. THE Work_Coordinator SHALL verify Work_Results within a bounded time (verification SHALL complete in under 50 milliseconds for pre-computed comparison).
6. IF a client submits an incorrect Work_Result, THEN THE PoUW_Middleware SHALL reject the request and issue a new Work_Unit with increased difficulty.

### Requirement 5: Difficulty Adjustment

**User Story:** As an API operator, I want the work difficulty to scale with the severity of abuse, so that persistent abusers face progressively harder challenges while occasional limit-hitters face minimal friction.

#### Acceptance Criteria

1. THE Difficulty_Adjuster SHALL increase Work_Unit complexity for clients that repeatedly exceed rate limits within a configurable escalation window.
2. THE Difficulty_Adjuster SHALL scale difficulty by increasing the number of hash operations required per Work_Unit (more blocks to hash, deeper tree levels).
3. THE Difficulty_Adjuster SHALL define at least three difficulty tiers: low (single leaf hash), medium (subtree of 4-16 nodes), and high (subtree of 16-64 nodes).
4. WHEN a client completes work and does not trigger rate limiting again within a configurable cool-down period, THE Difficulty_Adjuster SHALL reduce the client's difficulty tier by one level.
5. THE Difficulty_Adjuster SHALL enforce a maximum difficulty cap to prevent denial-of-service against legitimate clients on slow hardware.

### Requirement 6: Merkle Tree Work Integration

**User Story:** As the BrightChain platform, I want the work performed by rate-limited clients to produce Merkle tree structures that are directly usable by the network, so that no computation is wasted.

#### Acceptance Criteria

1. THE Work_Coordinator SHALL generate Work_Units that compute SHA3-512 hashes of BrightChain block data, producing valid Checksum values compatible with the existing `Checksum` class.
2. THE Work_Coordinator SHALL assemble verified Work_Results into complete or partial Merkle trees that can be consumed by BrightChain's CBL (Constituent Block List) infrastructure.
3. THE Work_Coordinator SHALL track the progress of partially-constructed Merkle trees and assign remaining nodes as new Work_Units become needed.
4. WHEN a complete Merkle tree is assembled from verified Work_Results, THE Work_Coordinator SHALL persist the tree and make it available to the BrightChain block storage system.
5. THE Work_Coordinator SHALL validate that assembled Merkle tree structures maintain the parent-child hash consistency invariant: each interior node's hash equals the SHA3-512 hash of the concatenation of its children's hashes.

### Requirement 7: Client-Side Computation Library

**User Story:** As a frontend developer, I want a lightweight client-side library that can compute work units in the browser, so that rate-limited users can complete challenges without installing additional software.

#### Acceptance Criteria

1. THE Client_Library SHALL be distributable as a standalone JavaScript module with an optional WebAssembly acceleration module for SHA3-512 computation.
2. THE Client_Library SHALL expose an async function that accepts a Work_Unit payload and returns a Work_Result payload.
3. THE Client_Library SHALL compute SHA3-512 hashes compatible with BrightChain's existing Checksum format (64-byte digest, lowercase hex string encoding).
4. THE Client_Library SHALL support Merkle tree node computation: hashing leaf data and concatenating-then-hashing child node pairs.
5. THE Client_Library SHALL report progress during computation so that the hosting application can display a progress indicator to the user.
6. IF the Client_Library detects that WebAssembly is unavailable, THEN THE Client_Library SHALL fall back to a pure JavaScript SHA3-512 implementation.

### Requirement 8: HTTP Protocol Integration

**User Story:** As an API consumer, I want the rate limiting and work challenge flow to use standard HTTP semantics, so that existing HTTP clients can integrate with minimal changes.

#### Acceptance Criteria

1. WHEN a client is rate-limited and has not yet completed a work challenge, THE PoUW_Middleware SHALL respond with HTTP 429 (Too Many Requests) and include the Work_Unit payload in the response body.
2. THE 429 response SHALL include a `Retry-After` header indicating the Challenge_Token TTL in seconds.
3. THE 429 response SHALL include a custom `X-PoUW-Challenge` header containing the Challenge_Token.
4. WHEN a client submits a Work_Result, THE client SHALL include the Challenge_Token in an `X-PoUW-Response` header and the Work_Result in the request body alongside the original request payload.
5. WHEN a Work_Result is verified successfully, THE PoUW_Middleware SHALL allow the original request to proceed to the next middleware and include an `X-PoUW-Accepted: true` header in the response.
6. THE PoUW_Middleware SHALL include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers on all responses to inform clients of their current rate limit status.

### Requirement 9: Work Queue Management

**User Story:** As a system administrator, I want the work queue to be self-managing and resilient, so that the system always has useful work available for rate-limited clients without manual intervention.

#### Acceptance Criteria

1. THE Work_Queue SHALL maintain a configurable minimum number of pre-generated Work_Units (default: 100) ready for immediate assignment.
2. WHEN the Work_Queue depth falls below the minimum threshold, THE Work_Coordinator SHALL automatically generate new Work_Units from available BrightChain block data.
3. THE Work_Queue SHALL expire unassigned Work_Units after a configurable maximum age (default: 1 hour) to prevent stale data from being computed.
4. THE Work_Queue SHALL track assigned-but-incomplete Work_Units and return them to the queue after the Challenge_Token TTL expires.
5. THE Work_Queue SHALL support persistence to survive server restarts, using a configurable backing store (in-memory for development, Redis or database for production).
6. THE Work_Coordinator SHALL prioritize Work_Units that contribute to partially-completed Merkle trees over starting new trees.

### Requirement 10: Express Middleware Configuration

**User Story:** As a developer integrating this middleware, I want a clean, composable Express middleware API with sensible defaults, so that I can add PoUW rate limiting with minimal configuration.

#### Acceptance Criteria

1. THE PoUW_Middleware SHALL export a factory function that accepts a configuration object and returns a standard Express middleware function `(req, res, next) => void`.
2. THE configuration object SHALL support the following options: rate limit threshold, sliding window duration, Client_Identifier strategy, difficulty tiers, Work_Queue backing store, Challenge_Token TTL, and HMAC signing secret.
3. THE PoUW_Middleware SHALL provide sensible defaults for all configuration options so that the middleware is functional with only the HMAC signing secret provided.
4. THE PoUW_Middleware SHALL be composable with existing Express middleware (helmet, cors, body parsers) without conflicts.
5. THE PoUW_Middleware SHALL support route-level application via `app.use('/api', pouwMiddleware())` and per-route application via `router.get('/endpoint', pouwMiddleware(), handler)`.
6. THE PoUW_Middleware SHALL emit structured log events for rate limit triggers, work unit issuance, verification success, and verification failure.

### Requirement 11: Shared Interfaces and Type Safety

**User Story:** As a developer working in the BrightChain monorepo, I want shared interfaces in brightchain-lib and Node.js-specific implementations in brightchain-api-lib, so that both frontend and backend consumers have type-safe access to PoUW data structures.

#### Acceptance Criteria

1. THE shared interfaces for Work_Unit, Work_Result, Challenge_Token, and PoUW configuration SHALL be defined in brightchain-lib following the `IBaseData<TData>` generic pattern used across the monorepo.
2. THE Node.js-specific Express middleware, Work_Coordinator, and Work_Queue implementations SHALL reside in brightchain-api-lib or a dedicated `@digitaldefiance/pouw-ratelimit` library.
3. THE Client_Library types and browser-compatible implementations SHALL reside in brightchain-lib (browser-safe) or brightchain-react (React-specific components).
4. THE API response types for PoUW challenge and verification responses SHALL extend Express `Response` in brightchain-api-lib while their base data interfaces reside in brightchain-lib.
5. THE Work_Unit interface SHALL be generic over the platform ID type `TID extends PlatformID` to maintain consistency with BrightChain's existing generic patterns.

### Requirement 12: Monitoring and Observability

**User Story:** As a system operator, I want visibility into the PoUW system's behavior, so that I can monitor its effectiveness and tune its configuration.

#### Acceptance Criteria

1. THE PoUW_Middleware SHALL expose metrics for: total requests processed, requests rate-limited, work units issued, work units completed successfully, work units failed verification, and average verification latency.
2. THE Work_Coordinator SHALL expose metrics for: Work_Queue depth, Merkle trees in progress, Merkle trees completed, and useful work throughput (hashes computed per second via client contributions).
3. THE PoUW_Middleware SHALL provide a health check endpoint or function that reports the current state of the Rate_Limiter, Work_Queue, and Work_Coordinator.
4. WHEN a client repeatedly fails work verification (configurable threshold, default: 5 consecutive failures), THE PoUW_Middleware SHALL log a security alert indicating a potential attack or malfunctioning client.

### Requirement 13: Graceful Degradation

**User Story:** As a system operator, I want the PoUW system to degrade gracefully under failure conditions, so that the API remains available even when the work coordination system has issues.

#### Acceptance Criteria

1. IF the Work_Queue backing store becomes unavailable, THEN THE PoUW_Middleware SHALL fall back to traditional rate limiting (HTTP 429 with Retry-After) until the backing store recovers.
2. IF the Work_Coordinator cannot generate new Work_Units, THEN THE PoUW_Middleware SHALL fall back to traditional rate limiting and log a warning.
3. THE PoUW_Middleware SHALL implement a circuit breaker pattern: after a configurable number of consecutive Work_Coordinator failures (default: 10), THE PoUW_Middleware SHALL bypass PoUW challenges entirely and use traditional rate limiting until the circuit resets.
4. WHEN the circuit breaker is open, THE PoUW_Middleware SHALL periodically attempt to issue a test Work_Unit (configurable interval, default: 30 seconds) to detect recovery.

### Requirement 14: Research Paper

**User Story:** As a researcher and platform author, I want an academic paper documenting the Proof of Useful Work rate limiting approach, so that the concept can be peer-reviewed, cited, and adopted by the broader community.

#### Acceptance Criteria

1. THE Research_Paper SHALL be authored as a Markdown document located at `docs/proof-of-useful-work-ratelimit-paper.md`.
2. THE Research_Paper SHALL contain the following sections: Abstract, Introduction, Related Work (hashcash, CAPTCHA, traditional rate limiting, existing proof-of-useful-work systems), System Design, Threat Model, Security Analysis, Performance Evaluation methodology, Discussion, and Conclusion.
3. THE Research_Paper SHALL formally define the PoUW rate limiting protocol including the challenge-response flow, verification strategies, and difficulty adjustment algorithm.
4. THE Research_Paper SHALL analyze the security properties of the system: resistance to replay attacks, resistance to pre-computation attacks, resistance to work-sharing attacks, and the economic incentive model.
5. THE Research_Paper SHALL describe the Merkle tree work integration and argue why this specific useful work is well-suited for rate limiting (decomposable, independently verifiable, quick to verify, genuinely useful).
6. THE Research_Paper SHALL include a comparison table contrasting PoUW rate limiting against hashcash, CAPTCHA, and traditional token-bucket rate limiting across dimensions of: computational waste, user experience, security strength, and platform benefit.

### Requirement 15: Work Unit Serialization and Round-Trip

**User Story:** As a developer, I want Work_Unit and Work_Result payloads to be serializable to JSON and back without data loss, so that they can be transmitted over HTTP reliably.

#### Acceptance Criteria

1. THE Work_Unit serializer SHALL convert a Work_Unit object to a JSON string representation.
2. THE Work_Unit parser SHALL convert a JSON string back into a Work_Unit object.
3. FOR ALL valid Work_Unit objects, serializing then parsing SHALL produce an object that is deeply equal to the original (round-trip property).
4. FOR ALL valid Work_Result objects, serializing then parsing SHALL produce an object that is deeply equal to the original (round-trip property).
5. THE serializer SHALL encode binary data fields (block contents, hashes) as base64 strings in the JSON representation.
6. IF the parser receives malformed or incomplete JSON, THEN THE parser SHALL return a descriptive error indicating which field is invalid or missing.
