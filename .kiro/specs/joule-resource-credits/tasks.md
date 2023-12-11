# Tasks: Joule Resource Credits

## Overview

Application-layer build on top of Layers 1–3. Five phases:

1. Joule primitives + rate table (browser-safe).
2. Capture middleware + cost-category decorator.
3. Debit authorization + earn-source plumbing.
4. REST surface + React component pack + brand lint.
5. End-to-end pilot, observability, runbook.

All property tests use `fast-check`. Components live in the existing `brightchain-react-components`. Server code lives in `brightchain-api-lib` and is consumed by `brightchain-api`.

## Tasks

- [x] 1. Joule primitives and Rate Table
  - [x] 1.1 Create `brightchain-lib/src/lib/joule/` with `jouleConstants.ts`, `resourceClass.ts`, `rateTable.ts`, `formatJoule.ts`
    - All bigint, no float, browser-safe
    - `JOULE_ASSET_ID`, `JOULE_MICROUNITS_PER_UNIT`, `JOULE_DECIMALS`, `JOULE_SYMBOL`
    - `priceMicroJoules(rate, cls, units): bigint`
    - _Requirements: 1.1, 1.6_
  - [x] 1.2 Implement `formatJoule` with J / mJ / µJ scale-aware output
    - Property test: round-trip `parseJoule(formatJoule(x)) === x` for all 1024 generated bigints
    - _Requirements: 7.7_
  - [x] 1.3 Implement `RateTableUpdateAction` payload (thin wrapper, lives under Layer 3 payloads dir)
    - Schema: `{ kind: 'rate_table_update', version, effectiveAt, entries }`
    - Validator: `version` strictly increasing, `effectiveAt` strictly future, all four classes present
    - _Requirements: 1.2, 1.4_
  - [x] 1.4 Implement `RateTableCache` in `brightchain-api-lib/src/lib/joule/rateTableCache.ts`
    - Subscribes to ledger projection updates
    - `getRateAt(ts)`, `getCurrentRate()`, `rate-changed` event
    - Bootstrap default rate table at first run
    - _Requirements: 1.1, 1.3, 1.5_
  - [x] 1.5 Public REST: `GET /joule/rate-table` and `GET /joule/rate-table/history`
    - Unauthenticated, cached at edge
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 2. Capture middleware and cost-category decorator
  - [x] 2.1 Implement `RequestCostAccumulator` in `brightchain-api-lib/src/lib/joule/requestCostAccumulator.ts`
    - bigint per-class accrual, snapshot, reset
    - _Requirements: 2.2_
  - [x] 2.2 Implement `CaptureMiddleware`
    - Attaches accumulator at request start; pins `rateTableVersion`
    - On response close: emits one Resource_Event per non-zero class to metering-log shard
    - On metering-log failure: queues to durable retry buffer; alarms over `JOULE_RETRY_BUFFER_MAX`
    - Skips emit when `memberId` absent
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6_
  - [x] 2.3 Implement `@Cost(category, opts?)` route decorator
    - `'free' | 'metered' | 'authorized'`
    - Stores estimator + safety multiplier on route metadata
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - [x] 2.4 CI guard: AST scan that fails build if any controller handler lacks `@Cost`
    - Lives in `tools/joule-lint/`
    - Wired into `nx run brightchain-api:lint`
    - _Requirements: 9.5_
  - [x] 2.5 Property test (capture determinism)
    - **For any sequence of `(member, class, units)` events, replaying through middleware → metering-log → batch settlement produces identical balances and identical metering-log content.**
    - _Requirements: 10.1_

- [x] 3. Debit authorization and earn sources
  - [x] 3.1 Implement `DebitAuthorization` service
    - `authorize / capture / release` over Layer 1 `AssetAccountStore`
    - Capture emits Resource_Event with actual amount; release does not
    - Throws `CAPTURE_EXCEEDS_AUTH`, `RESERVATION_NOT_FOUND`, `RESERVATION_EXPIRED`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x] 3.2 Implement reservation reaper
    - Cron / interval; releases stale reservations per `JOULE_RESERVATION_TTL_MS`
    - _Requirements: 3.5_
  - [x] 3.3 Wire `@Cost('authorized', { estimator, safety })` into request lifecycle
    - Pre-handler: estimate × safety multiplier → authorize
    - Post-success: capture(actual)
    - Post-failure / cancellation: release
    - _Requirements: 3.6_
  - [x] 3.4 Implement `JouleEarnService`
    - `grant(memberId, microJoules, reason, quorumSig)` → `OperatorGrantAction` (Layer 3)
    - Reason field stored on-ledger; required, non-empty, max 256 chars
    - _Requirements: 4.1, 4.4_
  - [x] 3.5 Gateway guard: reject member-originated `TransferAction` for `assetId === 'joule'`
    - Returns `JOULE_TRANSFER_FORBIDDEN` 403
    - _Requirements: 4.5, 4.6_
  - [x] 3.6 Confirm reservations are operational-only (no Layer 3 entry generated)
    - Test: assert ledger sequence does not advance during `authorize` / `release` cycles
    - _Requirements: 3.7_
  - [x] 3.7 Property test (authorization conservation)
    - **`pre - actual === post` after capture; `pre === post` after release; double-capture rejected; capture > max rejected; capture after release rejected.**
    - _Requirements: 10.2, 10.3_

- [x] 4. Member REST surface, React components, brand lint
  - [x] 4.1 Implement `/me/joule/*` controllers
    - `balance`, `consumption?window=...`, `events`, `reservations`, `disputes`
    - All amount fields stringified bigint; never `number`
    - 403 cross-member; operator scope `joule:read` allowed
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  - [x] 4.2 Implement operator REST: `POST /operator/joule/grant`, `POST /operator/joule/rate-table`
    - Both require operator quorum signature; both return 202 with txId
    - _Requirements: 4.1, 1.2_
  - [x] 4.3 Build component pack at `brightchain-react-components/src/joule/`
    - `JouleBalance`, `JouleConsumptionChart`, `JouleEventLog`, `RateTransparency`, `DisputeNotice`
    - SWR-style hooks: `useJouleBalance`, `useJouleConsumption`, `useRateTable`
    - bigint props throughout; `formatJoule` shared
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.7_
  - [x] 4.4 Brand-vocabulary lint
    - ESLint `no-restricted-syntax` rule over `brightchain-react-components/src/lib/joule/**`: fails on `coin|holder|airdrop|staking|marketCap|tokenomics|hodl|whale`
    - _Requirements: 7.6, 10.5_
  - [x] 4.5 `<DisputeNotice />` integration with Layer 3 disputes projection
    - States: `DISPUTED → RESOLVED_FINAL → RESOLVED_REPLACED`
    - No member-side submission UI in v1
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - [x] 4.6 Component tests (Jest + Testing Library)
    - Render with various bigint sizes (0, 1, 999, 1_000_000n, MAX_SAFE_INTEGER + 1, 10n**18n)
    - Assert no `NaN`, no `Infinity`, no scientific notation in output — 40/40 passing
    - _Requirements: 7.7_

- [x] 5. End-to-end pilot, observability, runbook
  - [x] 5.1 E2E fixture under `brightchain-api-e2e/src/joule/`
    - Bootstrap rate table → operator grant → metered request × N → batch settlement → balance read → authorized op (success and failure paths) → consumption query → rate-table update → historical event reads correct rate
    - Fast-forwarded clock for batch window
    - _Requirements: 10.4_
  - [x] 5.2 Observability metrics
    - `joule_capture_emits_total{class}`, `joule_authorize_failures_total{reason}`, `joule_reservation_age_seconds{quantile}`, `joule_retry_buffer_depth`, `joule_rate_table_version`
    - Reuses existing metrics infra
  - [x] 5.3 Operator runbook in `docs/operations/joule.md`
    - Granting credits, scheduling rate updates, responding to retry-buffer alarm, dispute escalation, vocabulary discipline reminder
    - Section: "What Joule is NOT" — explicit guard against framing as a tradable asset
  - [x] 5.4 Capability flag default
    - `JOULE_ENABLED=false` in every checked-in env file; pilot environments opt in explicitly
  - [x] 5.5 Final integration check
    - Run full suite (Layer 1 + 2 + 3 + this layer) under sustained 1k req/s × 10 min
    - Assert: zero conservation violations, zero unbounded retry buffer growth, p99 balance-reflection ≤ 1 batch window
    - _Requirements: 10.4_

## Estimated effort

- Phase 1 (primitives + rate table): ~0.5 wk
- Phase 2 (capture + decorator + lint): ~1 wk
- Phase 3 (authorization + earn): ~1 wk
- Phase 4 (REST + React + lint): ~1 wk
- Phase 5 (E2E + observability + runbook): ~0.5 wk

**Total: ~3.5–4 engineer-weeks** assuming Layers 1–3 are landed. This is intentionally thin: the heavy mechanism lives in the reusable lower layers; this spec is mostly wiring, UX, and policy.
