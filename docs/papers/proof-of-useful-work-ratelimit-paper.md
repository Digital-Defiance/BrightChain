---
layout: default
title: "Proof of Useful Work as a Rate Limiting Mechanism: Turning Abuse into Infrastructure"
parent: 'Papers'
---

# Proof of Useful Work as a Rate Limiting Mechanism: Turning Abuse into Infrastructure

**Authors:** Digital Defiance / BrightChain Project Contributors

**Date:** 2026

**Repository:** Open-source, released under Digital Defiance

---

## Abstract

Traditional rate limiting mechanisms either block requests outright or impose computational puzzles whose results are immediately discarded. Hashcash-style proof-of-work systems, while effective at throttling abuse, waste every CPU cycle the client expends — the computed hashes serve no purpose beyond proving effort. We present a **Proof of Useful Work (PoUW) rate limiting** system that replaces disposable puzzles with genuine infrastructure tasks. When a client exceeds its rate limit, the server issues a work unit drawn from a queue of real pending Merkle tree construction tasks that the BrightChain network needs for data integrity verification. The client computes SHA3-512 hashes for tree nodes, returns the result, and the server verifies and assembles the output into persistent, usable data structures consumed by BrightChain's Constituent Block List (CBL) infrastructure. Difficulty scales with abuse severity by assigning larger subtrees, meaning more abusive clients contribute proportionally more useful work. We describe the system architecture, formally define the challenge-response protocol, analyze its security properties against replay, pre-computation, and work-sharing attacks, and present a methodology for evaluating performance overhead. A comparison against hashcash, CAPTCHA, and token-bucket rate limiting demonstrates that PoUW uniquely eliminates computational waste while strengthening the platform it protects. The system is implemented as composable Express middleware in TypeScript and released as open-source software.

---

## 1. Introduction

Rate limiting is a fundamental defense mechanism for web APIs. Without it, a single client can monopolize server resources, degrade service for legitimate users, or mount denial-of-service attacks. The standard approaches fall into two categories: **passive** mechanisms that simply block or delay excess requests (token bucket, sliding window, fixed window), and **active** mechanisms that impose a computational cost on the requester before granting access (hashcash, proof-of-work CAPTCHAs).

Passive rate limiting is effective but blunt. A client that receives an HTTP 429 response can only wait. There is no path to immediate access, no graduated response, and no benefit to the platform from the client's idle time.

Active rate limiting through proof-of-work addresses the graduation problem — clients can earn access by demonstrating computational effort — but introduces a new one: **waste**. In hashcash [1] and its derivatives, the client searches for a nonce that produces a hash with a specific number of leading zeros. Once found and verified, the nonce and hash are discarded. The computation served no purpose beyond imposing a cost. Across millions of rate-limited requests, this represents a substantial aggregate expenditure of energy and CPU time that produces nothing of value.

This paper presents a system that eliminates this waste. When a client exceeds its rate limit on the BrightChain platform, the server does not generate an artificial puzzle. Instead, it draws a work unit from a queue of **real pending infrastructure tasks** — specifically, Merkle tree node computations that the network genuinely needs for data integrity verification. The client computes SHA3-512 hashes, returns the result, and the server verifies and integrates the output into persistent Merkle trees consumed by BrightChain's Constituent Block List (CBL) system.

The key insight is that Merkle tree construction is naturally decomposable into small, independent, quickly verifiable units of work — properties that make it well-suited for a challenge-response rate limiting protocol. Each leaf hash and each interior node hash can be computed independently, verified in constant time against a pre-computed answer, and assembled into a larger structure across multiple clients and multiple requests.

### Contributions

This paper makes the following contributions:

1. **A PoUW rate limiting protocol** where every computation performed by a rate-limited client produces a persistent, useful result for the platform's infrastructure.
2. **A work coordination architecture** that distributes real pending tasks from a backlog rather than generating artificial puzzles, with synthetic work as a fallback only when the backlog is empty.
3. **A Merkle tree assembly pipeline** that tracks partially-constructed trees across multiple clients and requests, assembling verified results into complete data structures for direct consumption by the block storage system.
4. **A dual-purpose difficulty scaling mechanism** where increased difficulty assigns larger subtrees from the real work backlog, making abusive clients contribute proportionally more useful infrastructure work.
5. **A security analysis** demonstrating resistance to replay, pre-computation, and work-sharing attacks through HMAC-signed challenge tokens with client binding and consumed-token tracking.
6. **An open-source reference implementation** as composable Express middleware in TypeScript, released under a non-profit organization.

---

## 2. Related Work

### 2.1 Hashcash and Proof-of-Work for Spam Prevention

Hashcash, introduced by Back [1], proposed requiring email senders to compute a partial hash collision before their message would be accepted. The sender must find a nonce such that `SHA-1(header || nonce)` has a specified number of leading zero bits. Verification is trivial (one hash computation), but finding the nonce requires brute-force search proportional to `2^k` where `k` is the required zero-bit count.

Hashcash demonstrated that computational puzzles could serve as an effective anti-abuse mechanism. However, the work is entirely wasted — the nonce and hash have no value beyond proving that effort was expended. Every CPU cycle spent searching for collisions is a cycle that could have performed useful computation.

### 2.2 CAPTCHA and Human-Verification Challenges

CAPTCHAs (Completely Automated Public Turing tests to tell Computers and Humans Apart) [2] take a different approach by requiring human cognitive effort rather than computational effort. reCAPTCHA notably attempted to extract useful work from this process by having users transcribe words from scanned books that optical character recognition had failed to read [3].

The reCAPTCHA model is an important precedent for our work: it demonstrated that access-control challenges could produce useful output. However, CAPTCHAs are fundamentally limited to tasks requiring human cognition, are increasingly solvable by machine learning systems, create accessibility barriers for users with disabilities, and introduce significant user experience friction. Our system operates entirely in the computational domain, requiring no human interaction beyond waiting for the computation to complete.

### 2.3 Traditional Rate Limiting

Standard rate limiting algorithms — token bucket [4], sliding window, fixed window, and leaky bucket — track request counts per client and reject excess requests with HTTP 429 (Too Many Requests) responses. These mechanisms are well-understood, lightweight, and effective at preventing resource exhaustion.

Their limitation is binary: a request is either allowed or denied. There is no mechanism for a rate-limited client to earn immediate access, no graduated response proportional to the severity of abuse, and no benefit to the platform from the enforcement action. The client simply waits until the rate limit window resets.

Our system preserves the sliding window detection mechanism but replaces the binary allow/deny response with a challenge-response protocol that provides a path to immediate access while generating useful work.

### 2.4 Proof of Useful Work in Blockchain Systems

The concept of redirecting proof-of-work computation toward useful tasks has been explored extensively in the blockchain consensus literature. Notable approaches include:

- **BOINC-based systems** that redirect mining computation toward scientific research tasks such as protein folding (Folding@Home) and astronomical data analysis (SETI@Home) [5]. These systems demonstrate the feasibility of useful work but operate at timescales (hours to days) incompatible with rate limiting (seconds).

- **Machine learning training as proof of work**, where miners perform gradient descent steps on shared models [6]. This approach produces genuinely useful computation but requires complex verification mechanisms and is difficult to decompose into small, independent units.

- **Matrix multiplication and linear algebra** as proof of useful work [7], which offers mathematical verifiability but requires specialized client-side computation capabilities.

These systems validate the principle that proof-of-work computation can be redirected toward useful ends. However, they are designed for blockchain consensus (long-running, high-value computations) rather than API rate limiting (short-duration, low-friction challenges). Our system adapts the PoUW concept specifically for the rate limiting use case, with work units designed to complete in seconds rather than hours.

### 2.5 API Protection via Browser-Side Proof of Work

Recent work has demonstrated browser-side proof-of-work for API protection using the Web Crypto API [8]. In this model, the server issues a hash puzzle, the browser computes the solution using Web Crypto or WebAssembly, and the server verifies the result before processing the API request.

This approach validates the user experience model we adopt: a brief computational delay (2-10 seconds) is acceptable to users when the alternative is being blocked entirely. However, like hashcash, the computation produces no useful output. Our system uses the same client-side computation model but replaces meaningless puzzles with real infrastructure tasks.

---

## 3. Differentiation from Prior Art

Existing proof-of-work access control systems — including patented approaches that use Merkle trees as computational puzzles — treat the work as a **disposable gate**. The client builds a tree or solves a hash puzzle, the server verifies it, and the result is discarded. The tree is ephemeral. The work exists solely to impose a cost on the requester.

Our system is fundamentally different in five respects:

### 3.1 The Work Has Independent, Persistent Value

Every hash computed by a rate-limited client is a real node in a Merkle tree that BrightChain's CBL (Constituent Block List) infrastructure actually needs. The trees are persisted and used for data integrity verification across the network. The `MerkleTreeAssembler` component tracks each tree's state, and when complete, the tree's node hashes are exported as `Checksum[]` arrays for direct consumption by `ConstituentBlockListBlock` — the core data structure in BrightChain's Owner Free Filesystem.

In prior art (including patented approaches to Merkle-tree-based access control), the tree is ephemeral — verified and thrown away. The distinction is not merely architectural but philosophical: our system treats the client's computation as a **contribution**, not a **punishment**.

### 3.2 The Server Is a Work Coordinator, Not a Puzzle Generator

The `WorkCoordinator` maintains a queue of real pending infrastructure tasks — Merkle tree nodes that need computing for actual block data. It does not generate artificial puzzles. It distributes genuine work from a backlog. The `WorkQueue` prioritizes work units that contribute to partially-completed trees (via the `isPartialTree` priority flag) over starting new trees, ensuring that distributed computation converges toward complete, usable data structures.

Synthetic work generation (via `generateSyntheticWork()`) is only a fallback for when the real work backlog is empty. The primary operating mode is real work distribution. This is the inverse of puzzle-based systems, where synthetic work is the only mode.

### 3.3 Results Are Assembled into Usable Data Structures

The `MerkleTreeAssembler` tracks partially-constructed trees across multiple clients and multiple requests. Each verified work result is inserted at its correct position in the tree (identified by `treeLevel` and `treeIndex`). When all nodes are filled, the assembler validates the parent-child hash consistency invariant — each interior node's hash must equal the SHA3-512 hash of the concatenation of its children's hashes — and exports the completed tree as a `Checksum[]` array for direct consumption by `ConstituentBlockListBlock`.

This assembly and integration pipeline has no analog in puzzle-based systems. In those systems, there is nothing to assemble — the puzzle result is verified and discarded in a single step.

### 3.4 Difficulty Scaling Serves Dual Purposes

The `DifficultyAdjuster` does not just make puzzles harder. It assigns larger subtrees from the real work backlog. At `DifficultyTier.Low`, a client computes a single leaf hash. At `DifficultyTier.Medium`, a subtree of 4-16 nodes. At `DifficultyTier.High`, a subtree of 16-64 nodes. More abusive clients contribute more useful infrastructure work. The punishment is productive.

This creates an economic model where abuse is not merely costly to the abuser but **beneficial to the platform**. The marginal cost of each additional request from an abusive client is converted into marginal infrastructure value.

### 3.5 Open Source, Non-Profit Implementation

This system is released as open-source software under Digital Defiance / BrightChain, a non-profit organization. The goal is to advance the state of the art in ethical rate limiting, not to gate access for commercial advantage. The implementation is available for inspection, modification, and adoption by any project that could benefit from converting rate limiting overhead into useful computation.

> **Legal note:** Implementors deploying this system commercially should obtain a freedom-to-operate opinion from a patent attorney regarding any patents in the proof-of-work access control space. This open-source project does not provide legal advice.

---

## 4. System Design

### 4.1 Architecture Overview

The PoUW rate limiting system is implemented as composable Express middleware within the BrightChain monorepo. The architecture spans two packages:

- **`brightchain-lib`** — Shared interfaces (`IWorkUnit`, `IWorkResult`, `IChallengeToken`, `IPoUWConfig`), enumerations (`DifficultyTier`, `WorkUnitOperation`), serialization (`WorkUnitSerializer`), and the browser-safe client computation function (`computeWorkUnit()`).
- **`brightchain-api-lib`** — Node.js-specific components: the Express middleware factory (`createPoUWMiddleware()`), `WorkCoordinator`, `WorkQueue`, `DifficultyAdjuster`, `TokenValidator`, `MerkleTreeAssembler`, and `CircuitBreaker`.

This separation ensures that client-side code (browser or React applications) can import the shared interfaces and computation function without pulling in Node.js dependencies, while server-side code has access to the full coordination and verification infrastructure.

### 4.2 Component Interactions

The system comprises eight primary components:

1. **`createPoUWMiddleware()`** — Factory function that accepts a configuration object and returns a standard Express `RequestHandler`. Follows the existing `createJwtAuthMiddleware()` and `createCaptureMiddleware()` conventions in the codebase.

2. **`SlidingWindowRateLimiter`** — Tracks per-client request counts using a sliding window algorithm. Supports configurable per-route overrides and multiple client identifier strategies (IP address, authenticated user ID, API key).

3. **`WorkCoordinator`** — The central orchestrator. Maintains the work queue, decomposes Merkle tree construction tasks into independent work units, issues work units to rate-limited clients, verifies submitted results against pre-computed answers, and integrates verified results into the `MerkleTreeAssembler`.

4. **`WorkQueue`** — Priority queue for pending work units. Prioritizes units contributing to partially-completed Merkle trees over new trees. Handles expiration of stale units and reclamation of assigned-but-incomplete units whose challenge tokens have expired.

5. **`DifficultyAdjuster`** — Tracks per-client difficulty tiers. Escalates difficulty for clients that repeatedly exceed rate limits within a configurable escalation window. De-escalates after a cool-down period without violations. Enforces a maximum difficulty cap.

6. **`TokenValidator`** — Creates, signs, and validates HMAC-signed challenge tokens. Each token binds a work unit to a specific client and time window. Tracks consumed tokens to prevent replay attacks.

7. **`MerkleTreeAssembler`** — Tracks partially-constructed Merkle trees across multiple clients and requests. Inserts verified node hashes at their correct positions, validates the parent-child hash consistency invariant, and exports completed trees as `Checksum[]` arrays for CBL consumption.

8. **`CircuitBreaker`** — Monitors the health of the work coordination subsystem. After a configurable number of consecutive failures, the circuit opens and the middleware falls back to traditional HTTP 429 rate limiting. Periodic probes detect recovery.

### 4.3 Request Flow

The middleware processes each incoming HTTP request through the following decision tree:

**Normal request (under rate limit):**
1. Extract client identifier using the configured strategy.
2. Check rate via `SlidingWindowRateLimiter`.
3. Client is under the limit — attach `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers and call `next()`.

**Rate-limited request (no prior challenge):**
1. Client exceeds the rate limit.
2. Check circuit breaker state.
3. If circuit is open (degraded mode): respond with HTTP 429 and `Retry-After` header (traditional rate limiting).
4. If circuit is closed (normal mode): request a work unit from `WorkCoordinator` at the client's current difficulty tier. Respond with HTTP 429, the work unit payload in the response body, and the challenge token in the `X-PoUW-Challenge` header.

**Challenge response (client submitting work):**
1. Client includes the `X-PoUW-Response` header with the encoded challenge token and the `WorkResult` in the request body.
2. Validate the challenge token: check HMAC signature, expiration, client binding, and replay status.
3. Verify the work result via `WorkCoordinator` (constant-time comparison against pre-computed answer).
4. If correct: mark the token as consumed, integrate the result into the Merkle tree assembler, allow the original request through with `X-PoUW-Accepted: true`.
5. If incorrect: increase the client's difficulty tier and issue a new, harder work unit.

### 4.4 Data Flow: From Rate Limit to Merkle Tree

The end-to-end data flow illustrates how a rate-limited request produces a persistent infrastructure contribution:

1. The `WorkCoordinator` decomposes block data into leaf-level work units, pre-computing the expected SHA3-512 hash for each.
2. When a client is rate-limited, the coordinator dequeues a work unit and issues it with a signed challenge token.
3. The client's `computeWorkUnit()` function decodes the base64 input data, computes the SHA3-512 hash using `@noble/hashes/sha3`, and returns the result.
4. The server verifies the result against the pre-computed answer in constant time.
5. The verified hash is inserted into the `MerkleTreeAssembler` at the correct `(level, index)` position.
6. When all nodes of a tree are computed, the assembler validates the hash consistency invariant and exports the tree as a `Checksum[]` array.
7. The exported array is consumed by `ConstituentBlockListBlock` for data integrity verification in BrightChain's Owner Free Filesystem.

### 4.5 Reputation-Aware Difficulty

The system supports optional integration with a reputation layer that modulates the difficulty tier assigned to rate-limited clients. When a `reputationProvider` callback is configured, the middleware queries the client's reputation score (a value between 0.0 and 1.0) before issuing a work challenge.

Reputation influences the PoUW protocol at two thresholds:

1. **Difficulty reduction threshold** (default: 0.7). Clients with reputation at or above this threshold receive a difficulty tier one level lower than what the `DifficultyAdjuster` would normally assign. A client whose violations would place them at `Medium` difficulty instead receives `Low`, floored at the lowest tier. This reflects the principle that established, high-reputation users who occasionally burst above the rate limit are likely experiencing legitimate traffic spikes rather than mounting an attack.

2. **Exemption threshold** (default: 0.95). Clients with reputation at or above this threshold are exempt from PoUW challenges entirely and receive a traditional HTTP 429 with `Retry-After` header. These are the platform's most trusted participants — subjecting them to computational challenges would impose friction without meaningful security benefit.

The `getEffectiveDifficulty(clientId, reputationScore)` method on `DifficultyAdjuster` encapsulates this logic, returning both the adjusted tier and an exemption flag. The middleware calls this method only when a `reputationProvider` is configured, ensuring full backward compatibility — deployments without reputation integration behave identically to the base system.

This design separates the reputation query (application-specific) from the difficulty adjustment (protocol-level), allowing operators to plug in any reputation source: on-chain reputation scores, historical payment records, account age, or external trust services.

---

## 5. Protocol Specification

### 5.1 Challenge-Response Flow

We formally define the PoUW challenge-response protocol as follows.

**Notation:**
- `C` — Client
- `S` — Server (PoUW middleware)
- `H(x)` — SHA3-512 hash function
- `HMAC_k(m)` — HMAC-SHA-512 with key `k` over message `m`
- `W` — Work unit
- `T` — Challenge token
- `R` — Work result

**Protocol:**

```
1. C → S: HTTP Request
2. S: rate_check(client_id) → OVER_LIMIT
3. S: W ← WorkQueue.dequeue()
4. S: T ← {
     workUnitId: W.id,
     clientId: client_id,
     issuedAt: now(),
     expiresAt: now() + TTL,
     signature: HMAC_k(W.id || client_id || issuedAt || expiresAt)
   }
5. S → C: HTTP 429 {
     body: W,
     headers: {
       X-PoUW-Challenge: base64(T),
       Retry-After: TTL,
       X-RateLimit-Limit: limit,
       X-RateLimit-Remaining: 0,
       X-RateLimit-Reset: reset_time
     }
   }
6. C: result_hash ← H(W.inputData)  // or H(child1 || child2) for interior nodes
7. C → S: HTTP Request {
     body: { ...original_payload, workResult: R },
     headers: {
       X-PoUW-Response: base64(T)
     }
   }
8. S: validate(T) — check HMAC, expiration, client binding, replay
9. S: verify(R.resultHash == W.expectedResult)  // constant-time comparison
10. S: if valid → consume(T), integrate(R), next()
        if invalid → escalate_difficulty(client_id), goto step 3
```

### 5.2 Verification Strategies

The system supports two verification strategies:

**Pre-computed answer comparison** (default): At work unit creation time, the `WorkCoordinator` computes and stores the expected result hash. Verification consists of a constant-time byte comparison between the submitted result and the stored answer. This strategy provides verification latency under 50 milliseconds and is suitable for all work units where the server has access to the input data.

**Redundant computation**: The same work unit is issued to multiple clients. The result is accepted when a configurable quorum of matching results is reached. This strategy is useful when the server cannot pre-compute the answer (e.g., when input data is streamed) or as an additional integrity check for high-value computations.

### 5.3 Difficulty Adjustment Algorithm

The `DifficultyAdjuster` maintains per-client state consisting of the current difficulty tier, a list of violation timestamps within the escalation window, and the timestamp of the last successful completion.

```
function getDifficulty(clientId):
  state ← clientStates[clientId] or DEFAULT_STATE
  prune violations older than escalationWindow
  return state.currentTier

function recordViolation(clientId):
  state ← clientStates[clientId] or DEFAULT_STATE
  state.violations.push(now())
  prune violations older than escalationWindow
  if |state.violations| >= threshold_for_next_tier:
    state.currentTier ← min(nextTier(state.currentTier), maxDifficulty)
  return state.currentTier

function recordCompletion(clientId):
  state ← clientStates[clientId]
  if state is null: return
  state.lastCompletion ← now()
  if now() - lastViolation > coolDownPeriod:
    state.currentTier ← max(previousTier(state.currentTier), defaultDifficulty)
```

The three difficulty tiers map to concrete work unit sizes:

| Tier | Node Count | Estimated Client Time | Work Produced |
|------|-----------|----------------------|---------------|
| Low | 1 node (single leaf hash) | 1-2 seconds | 1 Merkle tree node |
| Medium | 4-16 nodes (subtree) | 3-5 seconds | Partial subtree |
| High | 16-64 nodes (large subtree) | 5-10 seconds | Significant subtree |

Critically, higher difficulty does not merely impose more cost — it assigns larger subtrees from the real work backlog. An abusive client at the High tier contributes up to 64 verified Merkle tree nodes per request, accelerating the platform's infrastructure construction.

#### 5.3.1 Reputation-Based Modifiers

When a `reputationProvider` is configured, the difficulty adjustment algorithm is extended with a reputation-aware wrapper:

```
function getEffectiveDifficulty(clientId, reputationScore):
  baseTier ← getDifficulty(clientId)
  if reputationScore is undefined:
    return { tier: baseTier, exempt: false }
  if reputationScore >= exemptionThreshold:
    return { tier: baseTier, exempt: true }
  if reputationScore >= difficultyThreshold:
    reducedTier ← max(previousTier(baseTier), Low)
    return { tier: reducedTier, exempt: false }
  return { tier: baseTier, exempt: false }
```

The reputation modifier is applied after the base difficulty calculation, ensuring that the escalation and de-escalation mechanics remain intact. A high-reputation client who repeatedly violates rate limits will still see their base tier escalate — but the effective tier they experience is reduced by one level. This provides a softer landing for legitimate users while preserving the escalation pressure that deters sustained abuse.

---

## 6. Merkle Tree Work Integration

### 6.1 Why Merkle Tree Construction Is Well-Suited for Rate Limiting

Merkle tree construction possesses four properties that make it uniquely suitable as a proof-of-useful-work primitive for rate limiting:

**Decomposability.** A Merkle tree with `n` leaves requires `2n - 1` hash computations (n leaf hashes and n-1 interior node hashes). Each computation is independent at the leaf level, and interior nodes depend only on their immediate children. This allows the tree to be decomposed into small work units that can be distributed across multiple clients and multiple requests.

**Independent verifiability.** Each work unit can be verified independently. A leaf hash is correct if it equals `H(leaf_data)`. An interior node hash is correct if it equals `H(left_child || right_child)`. Verification requires a single hash computation (or a constant-time comparison against a pre-computed answer), regardless of the tree's total size.

**Quick verification.** Pre-computed answer comparison completes in constant time — a byte-level comparison of two 64-byte SHA3-512 digests. Even recomputation-based verification requires only a single SHA3-512 operation, which completes in microseconds. This ensures that verification overhead does not become a bottleneck.

**Genuine usefulness.** BrightChain's CBL infrastructure requires Merkle trees for data integrity verification across its Owner Free Filesystem. Every tree constructed through the PoUW system is a tree that the network would otherwise need to compute using its own server resources. The work is not merely "useful in principle" — it is work that is actively needed and directly consumed.

### 6.2 Tree Assembly Across Clients and Requests

The `MerkleTreeAssembler` maintains the state of each in-progress tree as a map from `(level, index)` positions to `Checksum` values. As verified work results arrive from different clients across different requests, the assembler inserts each hash at its designated position.

The assembly process handles several coordination challenges:

- **Partial tree tracking.** The `getPartialTreeIds()` and `getRemainingNodes()` methods allow the `WorkCoordinator` to identify which trees have uncomputed nodes and generate work units for those specific positions.
- **Priority scheduling.** The `WorkQueue` assigns higher priority to work units that contribute to partially-completed trees, ensuring that distributed computation converges toward complete trees rather than starting many trees in parallel.
- **Integrity validation.** When a tree is complete, `validateTree()` verifies the parent-child hash consistency invariant across all levels: for every interior node at position `(l, i)`, the node's hash must equal `H(node(l+1, 2i) || node(l+1, 2i+1))`.
- **Export for CBL consumption.** Completed trees are exported via `exportAddresses()` as `Checksum[]` arrays that can be directly consumed by `ConstituentBlockListBlock`, BrightChain's core block list data structure.

### 6.3 Hash Algorithm: SHA3-512

All hash computations use SHA3-512 (FIPS 202), producing 64-byte (512-bit) digests. This is consistent with BrightChain's existing `ChecksumService` and `Checksum` class, which use the `@noble/hashes/sha3` library. The choice of SHA3-512 provides:

- **Collision resistance** — 256-bit security level against collision attacks.
- **Pre-image resistance** — 512-bit security level against pre-image attacks.
- **Cross-platform consistency** — The `@noble/hashes` library produces identical output in Node.js and browser environments, ensuring that client-computed hashes match server-side verification.
- **Existing infrastructure compatibility** — All hashes are represented as `Checksum` instances, maintaining type safety and compatibility with the rest of the BrightChain codebase.

---

## 7. Threat Model

### 7.1 Adversary Capabilities

We consider an adversary with the following capabilities:

- **Network access.** The adversary can send arbitrary HTTP requests to the API server, including crafted headers and payloads.
- **Computational resources.** The adversary has access to commodity hardware capable of computing SHA3-512 hashes. We do not assume the adversary has access to specialized hardware (ASICs, FPGAs) for SHA3, though the security analysis considers this possibility.
- **Multiple identities.** The adversary may control multiple IP addresses, user accounts, or API keys to distribute requests across identities.
- **Protocol knowledge.** The adversary has full knowledge of the PoUW protocol, including the challenge-response flow, token format, and verification mechanism. The system's security does not rely on obscurity.
- **Source code access.** The system is open-source; the adversary has access to the complete implementation.

### 7.2 Attack Surfaces

| Attack Surface | Description | Relevant Component |
|---|---|---|
| Token forgery | Adversary creates valid-looking challenge tokens without performing work | `TokenValidator` |
| Token replay | Adversary resubmits a previously accepted token/result pair | `TokenValidator` (consumed token tracking) |
| Token sharing | Adversary distributes work across colluding clients | Challenge token client binding |
| Pre-computation | Adversary pre-computes results for anticipated challenges | Server-generated challenges with HMAC binding |
| Result fabrication | Adversary submits random hashes hoping for a match | SHA3-512 collision resistance |
| Identity rotation | Adversary rotates client identifiers to avoid difficulty escalation | `SlidingWindowRateLimiter`, `DifficultyAdjuster` |
| Denial of service | Adversary overwhelms the work coordination subsystem | `CircuitBreaker`, graceful degradation |

---

## 8. Security Analysis

### 8.1 Resistance to Replay Attacks

**Mechanism:** Each challenge token includes a unique `workUnitId`, and the `TokenValidator` maintains a set of consumed tokens. When a work result is verified successfully, the token's `workUnitId` is added to the consumed set. Any subsequent submission of the same token is rejected.

**Analysis:** An adversary who captures a valid token-result pair cannot reuse it. The consumed token set is checked before verification, and entries are retained for the duration of the token TTL (default: 60 seconds). After the TTL expires, the token would also fail the expiration check, providing defense in depth.

**Formal property (Property 5):** For any challenge token that has been successfully consumed, resubmitting the same token results in rejection.

### 8.2 Resistance to Pre-Computation Attacks

**Mechanism:** Challenge tokens are generated server-side and bound to specific work units via HMAC signature. The adversary cannot predict which work unit will be assigned because work units are drawn from a dynamic queue of real infrastructure tasks.

**Analysis:** Even if the adversary pre-computes hashes for all possible input data, they cannot construct a valid challenge token for a work unit that has not yet been issued. The HMAC signature over `(workUnitId, clientId, issuedAt, expiresAt)` ensures that the token cannot be forged without knowledge of the server's HMAC secret. The work unit's `inputData` is only revealed when the challenge is issued, preventing pre-computation of the specific result.

**Formal property (Property 3):** For any challenge token whose HMAC signature has been modified (even by a single bit), the token validator rejects the token.

### 8.3 Resistance to Work-Sharing Attacks

**Mechanism:** Each challenge token is bound to a specific `clientId`. The `TokenValidator` checks that the submitting client's identifier matches the `clientId` in the token.

**Analysis:** An adversary who distributes work units to colluding clients (e.g., a botnet) cannot submit results from a different client than the one that received the challenge. Each colluding client would need to independently trigger rate limiting and receive its own challenge token, which means each client performs its own useful work — the attack degrades to simply having more clients, each contributing useful computation.

**Formal property (Property 4):** For any challenge token issued to client A, submitting that token from client B (where A ≠ B) results in rejection.

### 8.4 Token Expiration and Time-Bounding

**Mechanism:** Each challenge token includes `issuedAt` and `expiresAt` timestamps. The default TTL is 60 seconds. The `TokenValidator` rejects any token whose `expiresAt` is in the past.

**Analysis:** Time-bounding limits the window during which a captured token is useful. Combined with the consumed-token tracking, this ensures that tokens cannot be stockpiled for later use.

**Formal property (Property 2):** For any challenge token whose expiration timestamp is in the past, the token validator rejects the token regardless of all other fields being valid.

### 8.5 Economic Incentive Model

The PoUW system creates an unusual economic dynamic: **abuse is costly to the abuser but beneficial to the platform.**

In traditional rate limiting, the platform bears the cost of enforcement (tracking state, returning 429 responses) while the abuser bears only the cost of waiting. In hashcash-style PoW, the abuser bears a computational cost, but the platform gains nothing from it.

In PoUW rate limiting:
- The abuser's computational cost is converted into useful infrastructure work.
- Higher abuse severity (more frequent rate limit violations) triggers higher difficulty tiers, which assign larger subtrees — producing more useful work per request.
- The platform's Merkle tree construction backlog is reduced by the aggregate computation of all rate-limited clients.
- There is no economic incentive for the platform to artificially inflate rate limiting, because the work queue is drawn from genuine infrastructure needs.

This model aligns incentives: the platform benefits from enforcement, and the cost imposed on abusers is not wasted but recycled into platform value.

### 8.6 Result Fabrication Resistance

An adversary who submits random SHA3-512 hashes has a probability of `2^{-512}` of matching the expected result for any given work unit. This is negligible — no practical number of attempts can produce a collision. The constant-time comparison in the verification step prevents timing side-channel attacks that might leak information about the expected result.

### 8.7 Reputation-Based Difficulty and Sybil Resistance

The reputation-aware difficulty system introduces a new attack surface: an adversary might attempt to build reputation on one identity to receive reduced difficulty, then abuse that identity at scale. Several properties of the design mitigate this:

**Reputation is read-only from the middleware's perspective.** The PoUW system does not grant or modify reputation — it only queries an external `reputationProvider`. The reputation system itself is responsible for Sybil resistance, and the PoUW middleware inherits whatever guarantees the reputation layer provides.

**Exemption is not immunity.** Exempt clients (reputation >= 0.95) still receive HTTP 429 responses with `Retry-After` headers. They are exempt from computational challenges, not from rate limiting. A high-reputation client that sustains abusive request rates will still be throttled — they simply avoid the PoUW work requirement.

**Difficulty reduction is bounded.** The reputation modifier reduces the effective tier by at most one level. A client at `High` difficulty drops to `Medium`, not to `Low`. The base difficulty continues to escalate with violations regardless of reputation, so sustained abuse still results in increasing friction.

**Threshold configuration.** Operators can tune the `reputationDifficultyThreshold` and `reputationExemptionThreshold` values to match their trust model. Setting `reputationExemptionThreshold` to 1.1 (above the maximum score of 1.0) effectively disables exemption, requiring all clients to complete PoUW challenges regardless of reputation.

**Graceful degradation.** If the `reputationProvider` callback fails (throws or rejects), the middleware falls back to the standard difficulty assignment with no reputation adjustment. This ensures that reputation system outages do not create a bypass.

### 8.8 Joule Credit Compensation Model

When a client successfully completes a PoUW work unit, the system awards micro-Joule (µJ) credits proportional to the number of hash computations performed. This transforms the rate limiting interaction from purely punitive into a positive-sum economic exchange:

**Platform benefit.** The platform receives verified Merkle tree node hashes that contribute to its infrastructure. Each hash is a genuine computation that would otherwise consume server resources.

**Client compensation.** The client receives Joule credits that can offset future resource consumption on the platform. The award is calculated as `microJoulesPerHash × averageNodeCount`, where `averageNodeCount` is derived from the `DifficultyTierNodeCount` map for the client's current difficulty tier.

**Honest completion incentive.** Clients who submit correct work results earn credits. Clients who submit incorrect results earn nothing and face escalated difficulty. This creates a direct economic incentive for honest computation — even for clients who are intentionally triggering rate limits, completing the work honestly is more profitable than submitting garbage.

**Proportional compensation.** Higher difficulty tiers assign more nodes, which means more computation but also more credits. An abusive client at `High` difficulty contributes more useful work and earns proportionally more credits. The punishment scales, but so does the compensation.

**Event-driven accounting.** The middleware emits a `'joule-credit-awarded'` event with `{ clientId, workUnitId, microJoules, difficulty }` rather than directly modifying account balances. This follows the existing `captureEvents` pattern where the middleware emits events and consumers handle the actual accounting. The `X-PoUW-Joule-Award` response header informs the client of the credit amount.

The default award rate of 100 µJ per hash (0.0001 Joules) is intentionally conservative. At `Low` difficulty (1 node), a client earns 100 µJ per completed challenge. At `High` difficulty (average 40 nodes), a client earns 4,000 µJ. Operators can adjust `microJoulesPerHash` to match their platform's economic model.

---

## 9. Performance Evaluation Methodology

We describe the methodology for evaluating the PoUW system's performance characteristics. The metrics below can be measured through benchmarking the reference implementation.

### 9.1 Verification Latency

**Metric:** Time from receiving a work result to completing verification.

**Target:** < 50 milliseconds for pre-computed answer comparison.

**Method:** Measure the wall-clock time of the `verifyResult()` method in `WorkCoordinator` across 10,000 verification operations. Pre-computed comparison should be dominated by the constant-time byte comparison of two 64-byte digests, with overhead from token validation and consumed-token set lookup.

### 9.2 Useful Work Throughput

**Metric:** Number of verified Merkle tree node hashes produced per second across all rate-limited clients.

**Method:** Under simulated load with varying numbers of concurrent rate-limited clients, measure the rate at which verified work results are integrated into the `MerkleTreeAssembler`. This metric captures the system's ability to convert rate limiting overhead into infrastructure value.

### 9.3 Client Computation Time

**Metric:** Wall-clock time for a client to compute a work unit at each difficulty tier.

**Target ranges:**
| Tier | Target Range |
|------|-------------|
| Low (1 node) | 1-2 seconds |
| Medium (4-16 nodes) | 3-5 seconds |
| High (16-64 nodes) | 5-10 seconds |

**Method:** Measure `computeWorkUnit()` execution time in both Node.js and browser (Chrome, Firefox) environments across 1,000 work units per tier. The `computeTimeMs` field in `IWorkResult` provides client-reported timing for production monitoring.

### 9.4 Overhead vs. Traditional Rate Limiting

**Metric:** Additional latency and memory overhead introduced by the PoUW system compared to a simple sliding-window rate limiter that returns HTTP 429.

**Method:** Compare request processing time for:
1. Requests under the rate limit (should be negligible overhead — one `checkRate()` call plus header attachment).
2. Rate-limited requests without PoUW (baseline 429 response).
3. Rate-limited requests with PoUW challenge issuance (work unit generation + token signing).
4. Challenge response verification (token validation + result comparison + tree integration).

### 9.5 Comparison Table

| Dimension | Hashcash PoW | CAPTCHA | Token Bucket | **PoUW (This System)** |
|---|---|---|---|---|
| **Computational waste** | 100% — all work discarded | N/A (human effort) | None (no computation) | **~0% — all work persisted** |
| **User experience** | Invisible delay (seconds) | Visible, interactive, frustrating | Binary block (no recourse) | **Invisible delay (seconds), path to access** |
| **Security strength** | Adjustable difficulty | Decreasing (ML solvers) | Fixed threshold | **Adjustable difficulty + HMAC binding** |
| **Platform benefit** | None | None (post-reCAPTCHA) | None | **Direct infrastructure contribution** |
| **Verification cost** | One hash computation | ML model inference | Counter comparison | **Constant-time byte comparison** |
| **Accessibility** | Good (no human input) | Poor (visual/cognitive) | Good (transparent) | **Good (no human input)** |
| **Graduated response** | Yes (difficulty scaling) | No (pass/fail) | No (allow/deny) | **Yes (difficulty = more useful work)** |
| **Degradation mode** | N/A | N/A | N/A | **Falls back to traditional 429** |
| **Reputation awareness** | None | None | None | **Reputation-based difficulty scaling and exemption** |

---

## 10. Discussion

### 10.1 Limitations

**Work queue dependency.** The system's usefulness depends on having a backlog of real Merkle tree construction tasks. When the backlog is empty, the system falls back to synthetic work generation, which — while still verifiable — does not produce infrastructure value. In practice, a growing BrightChain network should maintain a steady stream of real work, but new or low-traffic deployments may operate primarily in synthetic mode.

**Client-side computation requirement.** Rate-limited clients must execute JavaScript or WebAssembly to compute work units. Clients that cannot execute code (simple HTTP clients, curl, automated scripts) cannot complete challenges and are effectively blocked. This is mitigated by the circuit breaker's fallback to traditional rate limiting, but it means the PoUW benefit is primarily realized for browser-based and programmable clients.

**Single-server coordination.** The current implementation coordinates work distribution and tree assembly within a single server process. In a horizontally scaled deployment, multiple servers would need to share work queue state and tree assembly state, requiring a persistent backing store (Redis, database) and coordination protocol. The `WorkQueue` interface supports pluggable backing stores, but the distributed coordination logic is not yet implemented.

**Verification strategy trade-offs.** Pre-computed answer comparison requires the server to compute and store the expected result at work unit creation time, doubling the server's hash computation for each work unit. Redundant computation avoids this but requires issuing the same work unit to multiple clients, reducing throughput. The optimal strategy depends on the deployment's ratio of server compute capacity to client compute capacity.

### 10.2 Future Work

**Persistent backing stores.** Implementing Redis and database-backed `WorkQueue` and `MerkleTreeAssembler` to support horizontally scaled deployments. The interfaces are designed for this extension — the `WorkQueue` accepts a configurable backing store, and the `MerkleTreeAssembler`'s state is serializable.

**Distributed work coordination.** A protocol for multiple server instances to coordinate work distribution and tree assembly without duplicating effort. This could use a leader-election mechanism for tree assignment or a shared work queue with optimistic locking.

**WebAssembly acceleration benchmarks.** The `computeWorkUnit()` function supports optional WebAssembly acceleration for SHA3-512 computation. Benchmarking the performance difference between pure JavaScript and WASM implementations across browsers and devices would inform the difficulty tier calibration.

**Adaptive difficulty calibration.** Using the `computeTimeMs` field reported by clients to dynamically calibrate difficulty tiers based on observed client hardware capabilities, rather than using fixed node count ranges.

**Integration with additional useful work types.** While Merkle tree construction is well-suited for rate limiting, other BrightChain infrastructure tasks (block encryption, erasure coding) could potentially be decomposed into work units. The `WorkUnitOperation` enum is designed to be extensible for this purpose.

**Formal verification.** The correctness properties defined in the design document (19 properties covering rate limiting, token security, difficulty adjustment, tree assembly, serialization, queue management, and circuit breaking) are currently validated through property-based testing with fast-check. Formal verification using a proof assistant (e.g., TLA+, Coq) would provide stronger guarantees.

### 10.3 Ethical Considerations

Rate limiting systems inherently make decisions about who gets access to resources and under what conditions. The PoUW system introduces additional ethical dimensions:

**Computational equity.** Clients on slower hardware (older phones, low-power devices) take longer to complete work units at the same difficulty tier. The difficulty cap (`maxDifficulty`) and the configurable time bounds (2-10 seconds) mitigate this, but do not eliminate the disparity. Operators should consider their user base's hardware profile when configuring difficulty tiers.

**Energy consumption.** While the PoUW system eliminates wasted computation (every hash contributes to infrastructure), it still requires clients to expend energy. The ethical justification is that this energy produces lasting value rather than being discarded, and that the alternative (being blocked entirely) provides no path to access. Furthermore, the Joule credit compensation model directly addresses this concern: clients are awarded micro-Joule credits for the energy they expend on completed work units, creating a tangible economic return on their computational investment. This transforms the energy expenditure from a pure cost into a compensated contribution.

**Transparency.** The system is open-source, and the challenge-response protocol is fully documented. Clients can verify that the work they are asked to perform is genuine (the input data corresponds to real block data) and that their contributions are integrated into the platform. This transparency is essential for maintaining trust.

**Non-discriminatory application.** The rate limiting mechanism applies uniformly based on request frequency, not on client identity or content. The `ClientIdentifierStrategy` options (IP, user ID, API key) are standard rate limiting identifiers. The system does not profile or discriminate based on user characteristics.

---

## 11. Conclusion

We have presented a Proof of Useful Work rate limiting system that fundamentally redefines the relationship between API abuse prevention and computational expenditure. Where traditional proof-of-work systems treat client computation as a disposable cost — verified and discarded — our system treats it as a contribution to the platform's infrastructure.

The key architectural innovations are:

1. **Real work distribution.** The `WorkCoordinator` draws from a queue of genuine pending Merkle tree construction tasks, distributing real infrastructure work rather than generating artificial puzzles. Synthetic work is a fallback, not the primary mode.

2. **Persistent assembly.** The `MerkleTreeAssembler` tracks partially-constructed trees across multiple clients and requests, assembling verified results into complete data structures exported as `Checksum[]` arrays for direct consumption by `ConstituentBlockListBlock`.

3. **Productive punishment.** The `DifficultyAdjuster` assigns larger subtrees at higher difficulty tiers, converting increased abuse severity into increased infrastructure contribution. The marginal cost of abuse is recycled into marginal platform value.

4. **Robust security.** HMAC-signed challenge tokens with client binding, expiration, and consumed-token tracking provide resistance to replay, pre-computation, and work-sharing attacks. The circuit breaker ensures graceful degradation when the work coordination subsystem fails.

5. **Reputation-aware difficulty.** The system integrates with external reputation providers to modulate challenge difficulty. High-reputation clients face reduced friction when they occasionally exceed rate limits, while the platform's most trusted participants can be exempted from computational challenges entirely. This creates a graduated trust model that rewards good behavior without compromising security for unknown clients.

6. **Joule credit compensation.** Clients who successfully complete PoUW work units earn micro-Joule credits proportional to their computational contribution. This transforms rate limiting from a purely punitive mechanism into a positive-sum economic exchange where the platform receives useful work and the client receives tangible compensation. The incentive structure rewards honest computation and scales proportionally with difficulty.

The system is implemented as composable Express middleware in TypeScript, following existing patterns in the BrightChain codebase (`createJwtAuthMiddleware()`, `createCaptureMiddleware()`). It is released as open-source software under Digital Defiance, a non-profit organization, with the goal of advancing ethical rate limiting practices.

Every rate-limited request becomes an opportunity. Every abusive client becomes an unwitting contributor. The computation is not wasted — it builds the platform.

---

## References

[1] A. Back, "Hashcash — A Denial of Service Counter-Measure," 2002. Available: http://hashcash.org/docs/hashcash.html

[2] L. von Ahn, M. Blum, N. Hopper, and J. Langford, "CAPTCHA: Using Hard AI Problems for Security," in *Advances in Cryptology — EUROCRYPT 2003*, Springer, 2003, pp. 294-311.

[3] L. von Ahn, B. Maurer, C. McMillen, D. Abraham, and M. Blum, "reCAPTCHA: Human-Based Character Recognition via Web Security Measures," *Science*, vol. 321, no. 5895, pp. 1465-1468, 2008.

[4] J. Turner, "New Directions in Communications (or Which Way to the Information Age?)," *IEEE Communications Magazine*, vol. 24, no. 10, pp. 8-15, 1986.

[5] D. P. Anderson, "BOINC: A System for Public-Resource Computing and Storage," in *Proceedings of the 5th IEEE/ACM International Workshop on Grid Computing*, 2004, pp. 4-10.

[6] "Proof of Useful Work for AI/ML Training in Blockchain Systems," arXiv:2504.07540v2, 2025. Available: https://arxiv.org/html/2504.07540v2

[7] "Matrix Multiplication as Proof of Useful Work," arXiv:2504.09971v1, 2025. Available: https://arxiv.org/html/2504.09971v1

[8] "API Protection with Web Crypto Proof of Work," loke.dev, 2024. Available: https://loke.dev/blog/api-protection-web-crypto-proof-of-work

[9] National Institute of Standards and Technology, "SHA-3 Standard: Permutation-Based Hash and Extendable-Output Functions," FIPS PUB 202, 2015.

[10] R. C. Merkle, "A Digital Signature Based on a Conventional Encryption Function," in *Advances in Cryptology — CRYPTO '87*, Springer, 1988, pp. 369-378.

---

*This paper describes the design and analysis of the Proof of Useful Work rate limiting system implemented in the BrightChain platform. The system is open-source software released under Digital Defiance. For implementation details, see the source code in the `brightchain-lib` and `brightchain-api-lib` packages.*

*Defiance by Design.*
