# Requirements: Joule Resource Credits

## Introduction

This spec defines the user-facing **Joule** application: how members earn, spend, observe, and dispute resource credits denominated in **Joule (J, smallest unit µJ, decimals = 6)**, the canonical Pilot_Asset defined in `programmable-asset-ledger` Requirement 12.

This is the application layer that sits on top of the three reusable layers:

- **Layer 1** — `asset-account-store-generalization`: where Joule balances live operationally.
- **Layer 2** — `metering-log`: where every per-request resource event is captured and signed.
- **Layer 3** — `programmable-asset-ledger`: where Joule is issued, settled, and finalized.

This spec adds: rate-table governance, request-time capture middleware, debit-authorization (pre-auth + capture/release) for expensive operations, member-facing React components, and operator-facing rate transparency.

## Glossary

- **Joule (J)** — Canonical resource-credit asset. `assetId === 'joule'`. 1 J = 1 000 000 µJ.
- **Resource_Class** — Categorical bucket consumed at a per-class rate. v1 classes: `compute`, `storage`, `network`, `proofOfWork` (mirrors `OperationCost` in `brightchain-lib`).
- **Rate_Table** — Versioned, signed mapping `Resource_Class → µJ-per-unit` plus a unit definition per class. Updates require operator quorum.
- **Resource_Event** — A single observation `{memberId, resourceClass, units, timestamp, opId, context}` emitted by the API process and recorded in metering-log Layer 2.
- **Capture_Middleware** — The Express/Nest middleware that wraps incoming requests, accumulates `OperationCost` during processing, and emits one or more Resource_Events at response close.
- **Debit_Authorization** — Two-phase reservation against a member's operational balance: `authorize(maxAmount)` → `capture(actualAmount ≤ maxAmount)` or `release()`. Used for operations whose cost is bounded but not knowable until completion.
- **Earn_Source** — A whitelisted reason a member's Joule balance can increase: operator grant, refund (release of unused authorization), promotional credit, dispute resolution credit. **No earn path comes from peer-to-peer transfer in v1.**
- **Consumption_Window** — Reporting bucket (5 min, 1 h, 1 d, 30 d) used by member-facing dashboards.

## Scope discipline

- **In scope:** rate tables, capture pipeline, debit-authorization, earn-source plumbing, member dashboard components, rate transparency, dispute UX (read-only surface; mechanism is in Layer 3).
- **Out of scope (v1):** peer-to-peer Joule transfer between members, third-party Joule purchase, fiat on-ramp/off-ramp, secondary markets, hedging, derivative instruments, anything resembling a tradable token.
- **Vocabulary:** Same prohibited list as Layer 3. Allowed verbs: earn / spend / authorize / capture / release / refund / credit / debit / observe / dispute.

## Requirements

### Requirement 1 — Rate Table primitive

**User Story:** As an operator, I want a versioned, signed rate table so that I can publish how much µJ each unit of compute / storage / network / proof-of-work costs and update it under quorum without breaking historical accounting.

#### Acceptance Criteria

1. WHEN the system bootstraps THEN a `RateTable` record SHALL exist in the asset ledger with `version: 1`, `effectiveAt: <bootstrap-ts>`, `entries: { compute, storage, network, proofOfWork }` each with `{ unit: string, microJoulesPerUnit: bigint, description: string }`.
2. WHEN an operator quorum submits a `RateTableUpdateAction` THEN the new version SHALL be recorded with a strictly increasing `version` and a future-dated `effectiveAt`.
3. WHEN a Resource_Event references a `rateTableVersion` THEN it SHALL pin the rate that was in effect at the event's `timestamp`. Historical rates SHALL never be retro-applied.
4. WHEN a rate update is submitted with `effectiveAt` in the past THEN the system SHALL reject with `RATE_EFFECTIVE_AT_INVALID`.
5. WHEN reading the current rate table via the API THEN the response SHALL include version, effectiveAt, all entries, and the operator quorum signature set.
6. WHEN computing µJ for a Resource_Event THEN the formula SHALL be `microJoules = units * microJoulesPerUnit` performed in `bigint` arithmetic (no float).

### Requirement 2 — Capture Middleware

**User Story:** As a platform engineer, I want a request-scoped middleware that observes resource consumption during a request and emits Resource_Events without callers having to instrument every code path manually.

#### Acceptance Criteria

1. WHEN a request enters the API THEN the middleware SHALL attach a `RequestCostAccumulator` to the request context.
2. WHEN application code calls `ctx.cost.add(operationCost)` (with units denominated in the rate table's units, NOT µJ) THEN the accumulator SHALL accrue per-class units.
3. WHEN the response is sent (success or error) THEN the middleware SHALL emit one Resource_Event per non-zero resource class to the metering-log shard assigned to this API process, with the rate-table version current at request start.
4. WHEN the request is anonymous (no `memberId`) THEN no Resource_Event SHALL be emitted; metrics SHALL still record consumption for capacity planning.
5. WHEN the metering-log emit fails (disk, lock, signing key unavailable) THEN the request SHALL still succeed for the user, AND the failure SHALL be queued to a durable retry buffer with a hard alarm if the buffer exceeds operator-configured depth.
6. WHEN computing total µJ for a request THEN the middleware SHALL never block the response on settlement; settlement is asynchronous via Layer 3.

### Requirement 3 — Debit Authorization

**User Story:** As a member, I want operations whose cost can vary (e.g., bulk uploads, long-running queries) to pre-authorize against my balance so the API can reject up front if I cannot afford the maximum, but only debit me for what I actually consume.

#### Acceptance Criteria

1. WHEN the API begins an operation declared `costCategory: 'authorized'` THEN it SHALL call `AssetAccountStore.reserve(memberId, 'joule', maxMicroJoules, opId)` BEFORE doing the work.
2. WHEN reservation succeeds THEN the operation SHALL proceed; WHEN it fails with `INSUFFICIENT_FUNDS` THEN the operation SHALL be rejected with HTTP 402 `INSUFFICIENT_JOULE` and no work performed.
3. WHEN the operation completes successfully THEN the API SHALL call `capture(opId, actualMicroJoules)` where `actualMicroJoules ≤ maxMicroJoules`, AND emit a Resource_Event for `actualMicroJoules`.
4. WHEN the operation fails OR is cancelled THEN the API SHALL call `release(opId)`, AND no Resource_Event SHALL be emitted.
5. WHEN a reservation older than `RESERVATION_TTL` (default 5 min, configurable) is observed by the reaper THEN it SHALL be released automatically.
6. WHEN computing `maxMicroJoules` for an authorized op THEN the API SHALL use a rate-table-aware estimator that applies a configurable safety multiplier (default 1.25×) over the typical cost.
7. Reservations SHALL be operational only (Layer 1); they SHALL NOT appear in the Layer 3 ledger (Requirement 7 of `asset-account-store-generalization`).

### Requirement 4 — Earn Sources

**User Story:** As a member, I want my Joule balance to be increased only through transparent, auditable, non-tradable channels so that the resource-credit nature of Joule remains intact.

#### Acceptance Criteria

1. WHEN an operator quorum issues an `OperatorGrantAction(memberId, microJoules, reason)` THEN it SHALL credit Joule to the member via Layer 3 `MintAction` against the operator-controlled supply.
2. WHEN a Debit_Authorization is `release`d THEN the operational balance SHALL be restored locally (Layer 1) without any ledger entry; this is a no-op refund, not a mint.
3. WHEN a member is awarded a refund as a result of a successful `BatchChallenge` resolution (Layer 3 Requirement 13.9) THEN the resolution itself SHALL credit the member; this spec adds no extra mint path.
4. WHEN a promotional credit campaign is configured THEN it SHALL execute as a batched `OperatorGrantAction` with an audit-friendly `reason` field.
5. THE system SHALL NOT expose any peer-to-peer Joule transfer endpoint in v1.
6. THE system SHALL NOT expose any fiat on-ramp, off-ramp, or trade endpoint at any tier in v1.

### Requirement 5 — Member Wallet API

**User Story:** As a member, I want REST endpoints to read my balance, my reservations, my recent consumption, and my open disputes so that I can build trust in the meter.

#### Acceptance Criteria

1. `GET /me/joule/balance` SHALL return `{ available: bigint, reserved: bigint, total: bigint }` in µJ, plus a JSON-safe stringified copy.
2. `GET /me/joule/consumption?window=5m|1h|1d|30d` SHALL return per-class units and µJ totals for the window.
3. `GET /me/joule/events?after=<seq>&limit=<n>` SHALL stream the member's own Resource_Events with their rate-table version and µJ amount; `limit` SHALL be capped at 1000.
4. `GET /me/joule/reservations` SHALL return open reservations with `opId`, `maxMicroJoules`, `createdAt`, expected expiry.
5. `GET /me/joule/disputes` SHALL return any open disputes that affect this member, sourced from the Layer 3 `disputes` projection.
6. WHEN the requesting user is not the `memberId` in scope THEN 403 SHALL be returned; operators with `joule:read` scope MAY read other members.

### Requirement 6 — Rate Transparency UI

**User Story:** As a prospective or current member, I want to see the current rate table and its history without authentication so that I can audit how Joule cost is computed.

#### Acceptance Criteria

1. `GET /joule/rate-table` SHALL be public (no auth) AND return the current rate table.
2. `GET /joule/rate-table/history` SHALL be public AND return all rate-table versions with `version`, `effectiveAt`, and `entries`, plus operator quorum fingerprints.
3. WHEN a rate change is scheduled (future `effectiveAt`) THEN it SHALL appear in the history endpoint with a `scheduled` flag.
4. The React rate-transparency component SHALL render rates in J / (descriptive unit), e.g., "0.000045 J per request" or "12.34 mJ per MB stored per day".

### Requirement 7 — React component pack

**User Story:** As a UI engineer, I want pre-built React components that render Joule balances, consumption charts, and reservation status so that every product surface uses the same vocabulary and the same correctness guarantees.

#### Acceptance Criteria

1. `<JouleBalance />` SHALL render available / reserved / total with an accessible tooltip explaining each.
2. `<JouleConsumptionChart window="1d|30d|..." />` SHALL render per-class stacked-area consumption sourced from `GET /me/joule/consumption`.
3. `<JouleEventLog limit={n} />` SHALL render a paginated event list with `(timestamp, resourceClass, units, µJ, opId)`.
4. `<RateTransparency />` SHALL render the current rate table and a "view history" affordance.
5. `<DisputeNotice disputeId="..." />` SHALL render any open dispute affecting the member with the resolution status.
6. Components SHALL live in `brightchain-react-components/src/joule/` and SHALL pass the brand-vocabulary lint (no `coin`, `holder`, `airdrop`, `staking`, `marketCap`, `tokenomics`).
7. Components SHALL accept `bigint` µJ inputs and SHALL format using a single shared formatter (`formatJoule`) that supports J / mJ / µJ scale-aware output.

### Requirement 8 — Dispute UX (read-only at this layer)

**User Story:** As a member, I want to see when a settlement that affects my balance is under dispute so that I am not blindsided by a corrected balance later.

#### Acceptance Criteria

1. WHEN a settlement that included this member's deltas enters `DISPUTED` state (Layer 3 Requirement 13.8) THEN `<DisputeNotice />` SHALL surface a notice with the affected µJ amount and the dispute window status.
2. WHEN the dispute resolves `RESOLVED_FINAL` THEN the notice SHALL update to "settled as originally recorded".
3. WHEN the dispute resolves `RESOLVED_REPLACED` THEN the notice SHALL display the corrected delta and a "view audit" link.
4. **No member-initiated dispute submission UI ships in v1.** Disputes are issued by operator quorum (per Layer 3 design). v2 may add a member-initiated path; this is explicitly out of scope.

### Requirement 9 — Cost-category declarations

**User Story:** As a backend engineer, I want every API route to declare its Joule cost category so that the platform can enforce capture and authorization policy at the framework level rather than relying on ad-hoc instrumentation.

#### Acceptance Criteria

1. EVERY route SHALL declare `costCategory: 'free' | 'metered' | 'authorized'` in route metadata.
2. WHEN a route is `free` THEN no Resource_Event SHALL be emitted regardless of accumulator state.
3. WHEN a route is `metered` THEN the accumulator SHALL emit on response close.
4. WHEN a route is `authorized` THEN Requirement 3 SHALL apply.
5. CI SHALL fail the build if any route lacks a `costCategory` declaration.

### Requirement 10 — Test discipline

**User Story:** As an architect, I want strong test discipline so the meter cannot silently drift.

#### Acceptance Criteria

1. **Property test (capture):** For any sequence of `(member, resourceClass, units)` events, replaying through the capture middleware produces identical metering-log output, identical µJ totals, and identical operational balance changes after settlement.
2. **Property test (authorization):** For any reservation `(member, max)` followed by capture `(actual ≤ max)`, the post-capture balance equals `pre - actual`. For any reservation followed by `release()`, the post-release balance equals `pre`.
3. **Adversarial:** double-capture against the same `opId`, capture exceeding `max`, capture after `release`, capture using an expired rate-table version — all SHALL be rejected with named error codes.
4. **Integration:** end-to-end `request → middleware → metering-log → batch settlement → balance update` test under fast-forwarded clock verifies eventual consistency within one batch window.
5. **No-money lint:** Codacy custom rule fails on prohibited brand vocabulary in `brightchain-react-components/src/joule/**`.

## Non-Goals

- Peer-to-peer Joule transfer.
- Joule-denominated invoicing of third parties.
- Any form of fiat conversion at any layer.
- Member-initiated dispute submission (deferred to v2).
- Rate-table A/B testing (single global table per environment in v1).
