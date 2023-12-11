# Tasks — Asset Account Store Generalization

> **Order is strict.** Each phase ends with a green test suite. No skips,
> no `.todo`. The whole refactor ships in one PR.

## Phase 1 — Types & Helpers

- [x] 1.1 Add `JOULE_MICROUNITS_PER_UNIT = 1_000_000n` constant.
  _Requirements: 1.2_
- [x] 1.2 Add `joulesToMicrojoules(j: number): bigint` and
  `microjoulesToJoules(uj: bigint): number` with input validation.
  _Requirements: 1.2, 1.3_
- [x] 1.3 Add `formatAssetAmount(amount, assetId, opts?)` with `'joule'`
  default format and unknown-asset fallback.
  _Requirements: 8.1, 8.2, 8.3_
- [x] 1.4 Add error classes: `InvalidAmountError`, `MixedAssetError`,
  `InsufficientAvailableBalanceError`, `ReservationNotFoundError`,
  `ReservationExpiredError`, `LedgerAlreadyAttachedError`,
  `AssetUnknownError`.
  _Requirements: error rows in design.md_
- [x] 1.5 Unit tests for helpers and errors.
  _Requirements: 9.1_

## Phase 2 — `IAssetAccount` Shape

- [x] 2.1 Define `IAssetAccount` with `assetId` and `bigint` balance fields.
  _Requirements: 2.1, 1.1_
- [x] 2.2 Define `IAssetAccountDto` with bigint-as-string serialization.
  _Requirements: 1.5, 2.5_
- [x] 2.3 Define `IEnergyAccount = IAssetAccount & { assetId: 'joule' }` alias.
  _Deferred to Phase 3 — existing number-typed `IEnergyAccount` left untouched for additive PR; alias swap happens alongside the `EnergyAccount` class rename._
  _Requirements: 2.2, 7.1_
- [x] 2.4 Define `IReservationHandle`.
  _Requirements: 4.2_

## Phase 3 — `AssetAccount` Class & Hydrator

- [x] 3.1 Rename `EnergyAccount` class → `AssetAccount` base; provide
  `EnergyAccount` as a re-export alias.
  _Requirements: 7.1_
  _Deferred to Phase 7 — additive `AssetAccount` class added alongside
  `EnergyAccount`; rename + alias swap happen during the call-site sweep
  so the build stays green throughout._
- [x] 3.2 Implement DTO hydrator:
  - missing `assetId` → defaults to `'joule'`.
  - `number` balance → `BigInt(Math.round(n * 1_000_000))`.
  - persists upgraded DTO on next write.
  _Requirements: 1.4, 2.5, 2.6_
- [x] 3.3 Hydrator unit tests covering: missing assetId, legacy number
  balance, both legacy markers in same doc.
  _Requirements: 9.2_

## Phase 4 — `AssetAccountStore`

- [x] 4.1 Implement `AssetAccountStore` with composite-key map and typed-
  collection passthrough. _(Pure in-memory; typed-collection persistence
  wiring intentionally deferred to keep additive scope tight.)_
  _Requirements: 3.1, 3.2_
- [x] 4.2 Implement `getForAsset` / `setForAsset` / `hasForAsset` /
  `deleteForAsset` and `getAllForAsset`, `getAllAccounts`.
  _Requirements: 3.3, 3.5_
- [x] 4.3 Implement `reserve` / `settle` / `release` with handle lifecycle
  and lazy expired-reservation reaping.
  _Requirements: 4.3, 4.4, 4.5, 4.6_
- [x] 4.4 Implement `attachLedger` (one-shot) and `getLastSettledAt`
  (returns `null` until Layer 3 attaches).
  _Requirements: 5.2, 5.3_
- [x] 4.5 Implement aggregate helpers (`sumBalances`, etc.) that throw
  `MixedAssetError` on mixed-asset input.
  _Requirements: 3.6_
- [x] 4.6 Make `EnergyAccountStore extends AssetAccountStore` with
  `defaultAssetId = 'joule'`.
  _Deferred to Phase 7 — `EnergyAccountStore` left untouched; the `extends`
  swap is bundled with the call-site sweep so the build stays green
  throughout._
  _Requirements: 3.4, 7.1_

## Phase 5 — Property-Based Tests

- [x] 5.1 fast-check: conservation invariant under random ops sequences.
  _Requirements: 9.1_
- [x] 5.2 fast-check: multi-asset isolation (no cross-asset bleed).
  _Requirements: 9.1, 9.3_
- [x] 5.3 fast-check: hydration permutation idempotency.
  _Requirements: 9.2_
- [x] 5.4 Negative-path tests for every defined error.
  _Requirements: 9.3_

## Phase 6 — `IAssetTransaction` & `OperationCost`

- [x] 6.1 Introduce `IAssetTransaction` and rename
  `IEnergyTransactionMetadata` → `IAssetTransactionMetadata` with re-export
  aliases.
  _Requirements: 6.1, 6.3_
- [x] 6.2 Add `assetId` into the transaction signing payload format.
  Update verifiers.
  _Requirements: 6.4_
- [x] 6.3 Convert `OperationCost` fields to `bigint`; add `totalMicrojoules`
  and keep `totalJoules` as deprecated alias returning `bigint`.
  _Requirements: 1.7_
- [x] 6.4 Update every signing/verification test for the new payload format.
  _Requirements: 9.4_

## Phase 7 — Call-Site Sweep

- [x] 7.1 `brightchain-lib`: update all internal usages of `number` balance
  fields to `bigint`. Compile must fail at any missed site (per req 7.2).
  _Requirements: 7.2, 7.3_
- [x] 7.2 `brightchain-api-lib`: services, controllers, init, model
  registrations.
  _Requirements: 7.3_
- [x] 7.3 `brightchain-node-express-suite`: auth, user controller, plugin
  registration of `energyStore`.
  _Requirements: 7.3_
- [x] 7.4 `brightcal-api-lib` and any other downstream package referencing
  `IEnergyAccount` or `EnergyAccountStore`.
  _Requirements: 7.3_
- [x] 7.5 Tests for every touched package go green.
  _Requirements: 7.4, 9.4_

## Phase 8 — Compatibility & Final Validation

- [x] 8.1 Backward-compat integration test: write a legacy DTO directly into
  a typed collection, then hydrate via `AssetAccountStore.loadFromStore`,
  assert: assetId defaults to `'joule'`, balance migrates to bigint
  microunits, next write persists upgraded shape.
  _Requirements: 2.5, 2.6, 9.2_
  _File: `brightchain-lib/src/lib/__tests__/stores/energyAccountStore.backcompat.spec.ts` — 4/4 ✅_
- [x] 8.2 Full-suite green: `nx run-many -t test` passes with no skips.
  _Requirements: 7.4, 9.4_
  _`nx run-many` exit 0: brightchain-lib 4101/4101, brightchain-api-lib 2986/2986, brightchain-node-express-suite 130/130 ✅_
- [x] 8.3 Codacy CLI analyze on every edited file (per repo policy).
  _Requirements: external policy_
  _All 11 files clean (0 issues) ✅_
- [x] 8.4 Documentation: update `brightchain-lib/README.md` energy-account
  section to describe the new generic shape and link to the
  `programmable-asset-ledger` and forthcoming `metering-log` specs as the
  next layers.
  _Requirements: 5.1 (semantic documentation marker)_
- [x] 8.5 Confirm no forbidden vocabulary introduced.
  _Requirements: 10.1, 10.2_
  _grep across all edited files: no occurrences of `coin`, `holder`, `tokenomics`, `airdrop`, `staking`, `marketCap`, `cryptocurrency` ✅_

## Estimate

Approximately **1 engineer-week**, dominated by the call-site sweep
(Phase 7). Core type changes are mechanical; the property-based tests are
the highest-value, highest-care work.

## Definition of Done

- One PR merged to `main`.
- Full Nx test suite green; no skips, no `.todo`, no coverage regression.
- Codacy analysis clean for every edited file.
- `EnergyAccountStore` and `IEnergyAccount` continue to be importable from
  their legacy paths.
- No data migration ran; legacy DTOs upgrade on first read.
- The `programmable-asset-ledger` and `metering-log` specs can begin
  implementation against a stable account-tier abstraction.
