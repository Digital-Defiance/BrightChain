# Requirements — Asset Account Store Generalization (Precursor Refactor)

## Introduction

This spec is a **precursor refactor** that generalizes the existing single-asset
energy/Joule infrastructure (`IEnergyAccount`, `EnergyAccount`, `EnergyAccountStore`,
`EnergyTransaction`, `OperationCost`) into an asset-agnostic shape so that:

1. **Joule** can remain the canonical first-class asset with no behavioral change.
2. The forthcoming `programmable-asset-ledger` (Layer 3) and `metering-log`
   (Layer 2) specs can attach to the same account-tier abstraction without a
   second round of refactoring.
3. A future second metered asset (e.g. BrightMail postage, BrightHub credits)
   can ship by registering an `assetId`, **not** by forking another store.

The refactor is **mechanical and isolated**: no new infrastructure, no behavior
changes for callers that don't opt in, and no schema migration of persisted
data on disk (a backward-compatible field default supplies the missing
`assetId` for legacy documents).

This spec must complete and ship green before work begins on
`programmable-asset-ledger` Phase 1 implementation.

## Glossary

- **Asset**: A unit-of-account on a BrightChain ledger. Joule is the first.
  Asset is identified by an `assetId` string symbol (Joule's is `'joule'`),
  with a future binding to the `AssetId` (SHA-256 hash) defined by the
  programmable-asset-ledger spec.
- **AssetAccount**: Per-(member, asset) accounting record holding `balance`,
  `earned`, `spent`, `reserved` (operational-tier reservations), and an
  optional `reputation` signal.
- **Microunits**: The smallest indivisible representation of an asset balance.
  For Joule, microjoules (1 J = 1_000_000 µJ). Stored as `bigint`.
- **Operational tier**: The hot-path account store that supports admission
  control and reservations. Eventually consistent with the asset ledger.
- **Settlement tier**: The asset ledger; authoritative record of net
  earn/spend after batch flush.
- **Capability_Flag** (reused term): Boolean configuration flag enabling a
  feature; defaults to OFF unless preserving prior behavior.

## Requirement 1 — BigInt Microunits Migration

**User Story:** As a platform engineer, I need balance arithmetic to be exact
so that no charge or credit ever silently rounds, and so that the operational
store and the asset ledger can use a single canonical representation.

**Acceptance Criteria:**

- 1.1 The system SHALL replace every `number`-typed balance, earned, spent, and
  reserved field on `IEnergyAccount` / `EnergyAccount` and related DTOs with
  `bigint` microunits.
- 1.2 The system SHALL define a constant `JOULE_MICROUNITS_PER_UNIT = 1_000_000n`
  (microjoules per joule) and SHALL expose helpers `joulesToMicrojoules(j: number): bigint`
  and `microjoulesToJoules(uj: bigint): number` for display-only conversions.
- 1.3 The system SHALL forbid storing fractional microunits; all internal arithmetic
  SHALL be `bigint`.
- 1.4 When a legacy `number`-typed balance is encountered during DTO hydration,
  the hydrator SHALL multiply by `JOULE_MICROUNITS_PER_UNIT` and persist the
  upgraded `bigint`-as-string on the next write.
- 1.5 The system SHALL serialize `bigint` microunits as decimal strings in DTOs
  (no scientific notation, no leading zeros) so BrightDB / JSON round-trip is lossless.
- 1.6 No public API SHALL expose `number` balances except via the explicit
  display-helper functions in 1.2.
- 1.7 `OperationCost` fields (`computation`, `storage`, `network`, `proofOfWork`)
  SHALL also be `bigint` microunits, with `totalJoules` returning `bigint`.

## Requirement 2 — Generic AssetAccount Shape

**User Story:** As a platform engineer, I need the account record to carry an
`assetId` so that a single member can own balances in more than one asset
without parallel storage.

**Acceptance Criteria:**

- 2.1 The system SHALL define `IAssetAccount` extending the previous
  `IEnergyAccount` shape with an `assetId: string` field.
- 2.2 The system SHALL define `IEnergyAccount = IAssetAccount & { assetId: 'joule' }`
  as a type alias preserving the legacy name as a Joule-specific narrowing.
- 2.3 The composite identity of an account record SHALL be `(memberId, assetId)`.
  No two records SHALL coexist with the same composite key.
- 2.4 The reputation field SHALL remain on `IAssetAccount`. (Documented as a
  per-asset signal; Joule is currently the only asset that uses it.)
- 2.5 DTOs persisted before this spec lacked an `assetId` field. The hydrator
  SHALL default the missing `assetId` to `'joule'` and SHALL persist the
  filled-in field on next write.
- 2.6 The system SHALL NOT introduce a database migration step. Backward
  compatibility is achieved exclusively through the default-on-read mechanism
  in 2.5.

## Requirement 3 — AssetAccountStore (Generic Store)

**User Story:** As a platform engineer, I need a single store class that
handles every asset, so that I never have to fork a new store per asset.

**Acceptance Criteria:**

- 3.1 The system SHALL define `AssetAccountStore` whose API mirrors the
  current `EnergyAccountStore` but keys entries by `(memberId, assetId)`.
- 3.2 The system SHALL provide a constructor parameter
  `defaultAssetId: string = 'joule'` that controls the assetId used by
  single-arity convenience methods (`get(memberId)`, `set(memberId, account)`).
- 3.3 The system SHALL provide explicit two-arity methods
  `getForAsset(memberId, assetId)`, `setForAsset(memberId, assetId, account)`,
  `hasForAsset(memberId, assetId)`, `deleteForAsset(memberId, assetId)`.
- 3.4 `EnergyAccountStore` SHALL be retained as a thin subclass of
  `AssetAccountStore` with `defaultAssetId = 'joule'` so that all existing
  call sites compile and behave identically without modification.
- 3.5 The system SHALL provide `getAllForAsset(assetId): IAssetAccount[]` and
  `getAllAccounts(): IAssetAccount[]` (returns every asset).
- 3.6 The system SHALL forbid silently mixing assets in arithmetic: any
  helper that sums balances SHALL accept exactly one `assetId` and SHALL
  throw `MixedAssetError` if records of differing `assetId` are encountered.

## Requirement 4 — Reservations Stay Operational, With Stable Shape

**User Story:** As an architect, I need reservations to remain in the
account store (not the ledger) but with a shape that survives the future
ledger integration without renaming.

**Acceptance Criteria:**

- 4.1 The system SHALL retain the `reserved` field on `IAssetAccount` as
  a `bigint` microunit value local to the operational tier.
- 4.2 The system SHALL define an `IReservationHandle { reservationId: string;
  amount: bigint; expiresAt: Date }` shape produced by `reserve()` and
  consumed by `settle()` / `release()`.
- 4.3 `reserve(memberId, assetId, amount, ttlMs)` SHALL atomically deduct from
  the available balance (`balance - reserved >= amount`) and increment
  `reserved`. It SHALL return an `IReservationHandle` or throw
  `InsufficientAvailableBalanceError`.
- 4.4 `settle(handle, actualAmount)` SHALL move `actualAmount` from `reserved`
  to `spent`, return any remainder to `balance`, and emit no ledger entry
  (ledger emission is a Layer-2 concern, deliberately out of scope here).
- 4.5 `release(handle)` SHALL return the full reserved amount to the available
  balance with no spend recorded.
- 4.6 An expired reservation SHALL be reaped lazily on next read or actively
  by a sweeper process; both behaviors SHALL produce the same final state
  (idempotent reap).

## Requirement 5 — OperationalSemantics Documentation Marker

**User Story:** As a future maintainer integrating the asset ledger, I need
the operational tier to declare its eventual-consistency contract explicitly
so that I do not later mistake it for the system of record.

**Acceptance Criteria:**

- 5.1 The system SHALL expose a documented type `OperationalSemantics` on
  `AssetAccountStore` describing it as "operational projection cache; may lag
  the asset ledger by up to one batch window once Layer 3 is enabled."
- 5.2 The store SHALL expose a `getLastSettledAt(assetId): Date | null` accessor
  that returns `null` until Layer 3 wires it. The accessor SHALL never throw.
- 5.3 The store SHALL expose a no-op `attachLedger(ledger: ILedgerWriter)`
  hook that future Layer 3 work SHALL replace with an active writer. The
  hook SHALL be a single-call setter; calling it twice SHALL throw
  `LedgerAlreadyAttachedError`.

## Requirement 6 — Energy Transaction Generalization

**User Story:** As a platform engineer, I need `EnergyTransaction` to be
replaced by an asset-agnostic shape so that future metered assets reuse
the same record type.

**Acceptance Criteria:**

- 6.1 The system SHALL introduce `IAssetTransaction` extending the prior
  `EnergyTransaction` shape with `assetId: string` and `amount: bigint`
  (microunits).
- 6.2 `EnergyTransaction` SHALL remain as a type alias narrowing
  `IAssetTransaction` to `assetId: 'joule'`, preserving call sites.
- 6.3 `IEnergyTransactionMetadata` SHALL be renamed `IAssetTransactionMetadata`
  with `IEnergyTransactionMetadata` re-exported as an alias.
- 6.4 The signature payload SHALL include `assetId` so that a transaction
  signed for one asset cannot be replayed against another.

## Requirement 7 — Backward-Compatible Surface

**User Story:** As a maintainer of every existing call site, I need this
refactor to be a no-touch upgrade for code that doesn't opt in to multi-asset
features.

**Acceptance Criteria:**

- 7.1 Every existing public symbol (`IEnergyAccount`, `EnergyAccount`,
  `EnergyAccountStore`, `EnergyTransaction`, `IEnergyTransactionMetadata`,
  `OperationCost`) SHALL remain importable from its current path.
- 7.2 Existing call sites that pass `number` balances SHALL fail to compile
  (TypeScript error) so that migration is exhaustive and no silent rounding
  is introduced. This is a deliberate failure-loud requirement.
- 7.3 The migration PR SHALL update every existing call site in this monorepo
  in the same PR. There SHALL be no transitional period during which both
  representations coexist in committed code.
- 7.4 Tests covering every existing call site SHALL pass green at the end
  of the refactor PR with no skips and no `.todo`.

## Requirement 8 — Display & Formatting

**User Story:** As a UI/CLI developer, I need a single canonical formatter so
that joule values appear consistently across surfaces.

**Acceptance Criteria:**

- 8.1 The system SHALL provide `formatAssetAmount(amount: bigint, assetId:
  string, opts?: { precision?: number; locale?: string }): string`.
- 8.2 For `assetId === 'joule'`, the default format SHALL be `'1.234567 J'`
  (six fractional digits unless `precision` overrides).
- 8.3 The formatter SHALL never throw; unknown assetIds SHALL fall back to
  `'<bigint> <assetId>'` raw.
- 8.4 No business logic SHALL parse formatted strings back into amounts.
  Parsing SHALL only occur on validated DTO inputs.

## Requirement 9 — Test Coverage

**User Story:** As a reviewer, I need confidence that arithmetic is exact and
that backward compatibility holds.

**Acceptance Criteria:**

- 9.1 `AssetAccountStore` SHALL have property-based tests (fast-check) covering:
  conservation of `balance + reserved + spent == initial + earned` invariant
  across random sequences of `earn`/`reserve`/`settle`/`release`.
- 9.2 The DTO hydrator SHALL have tests for:
  - Legacy DTO without `assetId` → defaults to `'joule'`.
  - Legacy DTO with `number` balance → migrates to `bigint` microunits.
  - Legacy DTO with both legacy fields → both upgrades applied in one read.
- 9.3 Tests SHALL verify that mixing assetIds in any sum helper throws
  `MixedAssetError`.
- 9.4 The full BrightChain test suite SHALL pass green (no new skips, no
  reduced coverage) before merge.

## Requirement 10 — Brand Vocabulary Alignment (Inherited)

**User Story:** As a brand steward, I need this refactor to keep the
forbidden-vocabulary discipline that the asset-ledger spec will later enforce.

**Acceptance Criteria:**

- 10.1 New code SHALL NOT introduce the words `coin`, `holder`, `tokenomics`,
  `airdrop`, `staking`, `marketCap`, `cryptocurrency`, or `wallet-as-coin-bag`
  in identifiers, comments, or JSDoc.
- 10.2 Allowed verbs are `earn`, `spend`, `transfer`, `reserve`, `settle`,
  `release`, `credit`, `debit`, `attest`. `mint` is allowed only as a payload
  discriminator string (forthcoming Layer 3 spec).
- 10.3 The forthcoming ESLint forbidden-term rule (in the asset-ledger spec)
  SHALL pass against this refactor's code at all times.

## Out of Scope (Explicit)

- The asset ledger itself (Layer 3) — separate spec.
- The metering log (Layer 2) — separate spec.
- Any cross-asset transfer, swap, or exchange-rate logic.
- Removal of `EnergyAccountStore` symbol — retained as alias forever.
- Retroactive rewriting of historical persisted DTOs — handled lazily on read.
- Joule-specific resource-rate tables (live in the future
  `joule-resource-credits` spec, not here).
