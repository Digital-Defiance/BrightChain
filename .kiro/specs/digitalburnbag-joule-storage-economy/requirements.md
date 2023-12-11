# Requirements — Digital Burnbag Joule Storage Economy

## Introduction

This spec integrates the three-layer Joule infrastructure with Digital Burnbag's
upload, storage lifecycle, and destruction pipeline, adding:

- A **storage cost calculator** (browser-safe, pure function, bigint arithmetic).
- **Upload-time debit authorization** that gates file creation on Joule affordability.
- A **StorageContract** lifecycle: daily settlement cron, optional auto-renew,
  expiry → file destruction, and refund of unused credits on early destruction.
- A **provider credit pipeline** that awards Joules to nodes that pass
  proof-of-possession challenges proportionally to the storage they serve.
- **Quota bridge**: `IStorageQuotaService.checkQuota` gains a Joule-affordability check.
- A **React StorageCostPreview** component pack in `digitalburnbag-react-components`.
- **REST endpoints** for cost preview and storage contract inspection.

### Dependencies

This spec is the application layer on top of:

- **`joule-resource-credits`** — provides `DebitAuthorization`, `JouleEarnService`,
  `CaptureMiddleware`, rate table, and the `@Cost` decorator.
- **`asset-account-store-generalization`** — provides `AssetAccountStore(joule)`.
- **`metering-log`** / **`programmable-asset-ledger`** — Layers 2 and 3.
- **`digitalburnbag-lib`** — existing `IFileMetadataBase`, `IStorageQuotaService`,
  `IDestructionService`.

## Glossary

- **Burnbag storage tier** — The user-visible label mapped to an internal
  `DurabilityLevel`: `performance` → HOT, `standard` → WARM, `archive` → COLD,
  `pending-burn` → FROZEN.
- **StorageContract** — Record that tracks daily Joule charge, remaining credits,
  and hosting nodes for a single Burnbag file.
- **Burn date** — `IFileMetadataBase.scheduledDestructionAt`: when set, the file's
  effective tier is automatically downgraded to `pending-burn` (FROZEN, 0.25×).
- **Daily fee** — `dailyMicroJoules`: the recurring charge taken from the owner's
  Joule balance each settlement period for active storage.
- **Upfront charge** — `upfrontMicroJoules = dailyMicroJoules × durationDays`.
  Paid at upload time; remaining portion refunded on early destruction.
- **Provider share** — 30 % of the daily fee, split evenly across active hosting
  nodes for the file and credited via `JouleEarnService.grant()`.
- **Proof-of-possession (PoP)** — Challenge passed by a storage node proving it
  still holds the file data. Triggers provider earning.
- **Settlement cron** — Background job (default every 24 h) that debits daily fees,
  awards provider shares, and expires zero-credit contracts.

## Scope discipline

- **In scope:** cost calculator, upload debit-auth, StorageContract CRUD, daily
  settlement, provider earning, quota bridge, REST endpoints, React upload modal
  extensions.
- **Out of scope:** per-chunk metering, dynamic repricing of active contracts,
  storage provider onboarding, PoP challenge protocol, fiat on-ramp, Joule
  peer-to-peer transfer, secondary storage markets.
- Same Joule vocabulary restrictions apply as `joule-resource-credits`: allowed
  verbs are earn / spend / authorize / capture / release / refund / credit / debit.
  Do **not** use token, coin, trade, sell.

---

## Requirements

### Requirement 1 — BurnbagStorageCostCalculator

**User Story:** As a Burnbag user, I want to see exactly how many Joules uploading
a file will cost before I commit, based on size, durability tier, and how long I
want to keep it, so I can make an informed choice.

#### Acceptance Criteria

1. WHEN `calculateBurnbagStorageCost({ bytes, tier, durationDays })` is
   called THEN it SHALL return `{ upfrontMicroJoules, dailyMicroJoules, rsK, rsM, overheadDisplay, effectiveTier }` with
   `upfrontMicroJoules` and `dailyMicroJoules` as `bigint`, `rsK`/`rsM` as `number`.
2. WHEN `bytes` is `0n` THEN `dailyMicroJoules` SHALL equal `STORAGE_MIN_CHARGE_UJ` (1n),
   never zero.
3. WHEN `bytes` is a positive value THEN the formula SHALL be integer ceiling division:
   `daily = ceil(bytes × BASE_RATE × durabilityMul × (rsK+rsM) / (1e9 × 1000 × rsK))`.
   Using the scaled constants:
   `BASE_RATE = 500n`, `durabilityMul` from `DURABILITY_MUL_1000` table,
   `rsK` and `rsM` from `BURNBAG_TIER_RS_PARAMS[effectiveTier]`.
4. WHEN `tier` changes from `standard` to `performance` THEN cost SHALL increase by
   2× (WARM durabilityMul=1000 → HOT=2000) with RS overhead 1.50× → 1.60× compounding.
5. WHEN `tier` is `archive` THEN durability cost SHALL be 50% of `standard` (COLD vs WARM);
   RS overhead is 1.33× vs 1.50× so net cost is approximately 44% of `standard`.
6. WHEN `tier` is `pending-burn` THEN durability cost SHALL be 25% of `standard` (FROZEN vs WARM);
   RS overhead is 1.25× so net cost is approximately 21% of `standard`.
7. WHEN `tier` is `performance` THEN `rsK` SHALL be 10 and `rsM` SHALL be 6, tolerating 6 node failures.
   WHEN `tier` is `standard` THEN `rsK` SHALL be 8 and `rsM` SHALL be 4.
   WHEN `tier` is `archive` THEN `rsK` SHALL be 6 and `rsM` SHALL be 2.
   WHEN `tier` is `pending-burn` THEN `rsK` SHALL be 4 and `rsM` SHALL be 1.
8. WHEN `upfrontMicroJoules` is computed THEN it SHALL equal `dailyMicroJoules × durationDays`.
9. WHEN `durationDays` is 0 or negative THEN the function SHALL throw `INVALID_DURATION`.
10. WHEN an explicit `rsK` or `rsM` override is supplied THEN `rsK` SHALL be ≥ 2 and
    `rsM` SHALL be ≥ 1; otherwise the function SHALL throw `INVALID_RS_PARAMS`.
11. THE function SHALL be pure (no I/O, no randomness) and produce identical output for identical input.
12. THE function SHALL reside in `digitalburnbag-lib` (browser-safe; no Node.js built-ins).

### Requirement 2 — Burn-date tier auto-downgrade

**User Story:** As a user, when I set a burn date on a file, I want its storage
cost to automatically drop to the cheapest `pending-burn` tier so I'm not overpaying
for a file I've already committed to deleting.

#### Acceptance Criteria

1. WHEN `IFileMetadataBase.scheduledDestructionAt` is set (non-null) THEN the
   `effectiveTier` returned by the cost calculator SHALL always be `'pending-burn'`
   regardless of the `tier` argument passed.
2. WHEN a burn date is set via the API on an existing file THEN
   `BurnbagStorageContractManager.applyBurnDateDowngrade(contractId)` SHALL be called,
   updating `contract.tier` to `'pending-burn'` and recalculating `dailyMicroJoules`.
3. WHEN the tier is downgraded on an existing contract THEN:
   - The new `dailyMicroJoules` SHALL be the FROZEN-tier rate.
   - The remaining credits SHALL be adjusted downward proportionally to the
     remaining days at the new lower rate.
   - Any excess credits (difference between old and new daily rate × remaining days)
     SHALL be refunded to the owner's Layer 1 balance immediately.
4. WHEN a user attempts to change tier back to a higher tier after a burn date has
   been set THEN the API SHALL reject with `BURN_DATE_TIER_CONFLICT` (409).
5. WHEN the UI renders the upload modal with a burn date pre-filled THEN
   `BurnDateCostNote` SHALL display a notice that FROZEN pricing applies.

### Requirement 3 — Upload cost escrow (quote, approve, commit)

**User Story:** As a Burnbag user, I want to see the exact Joule cost — derived
from the actual encrypted, block-aligned byte count — before any Joules are
reserved, and to explicitly approve before the file is written to permanent
storage, so there are no surprise charges and no data is committed without my
consent.

#### Acceptance Criteria

1. WHEN `POST /upload/init` is called THEN the request body SHALL include
   `durabilityTier` and `durationDays`; these SHALL be stored on the session and
   used for all subsequent cost calculations for that upload.
2. WHEN `UploadService.quote(sessionId)` is invoked THEN it SHALL:
   a. Reassemble all received chunks into `plaintextBytes`.
   b. Encrypt to produce `encryptedBytes = plaintextBytes + 12 (IV) + 16 (GCM tag)`.
   c. Compute `blockAlignedBytes = ceil(encryptedBytes / BLOCK_SIZE) × BLOCK_SIZE`.
   d. Call `calculateBurnbagStorageCost({ bytes: blockAlignedBytes, tier, durationDays })`
      to obtain the **exact** upfront and daily Joule costs.
   e. Call `DebitAuthorization.authorize(memberId, opId, upfrontMicroJoules × 1.25)` to
      reserve a safety-buffered amount.
   f. Store the assembled ciphertext in a temporary `burnbag_upload_escrow` collection
      with TTL = `BURNBAG_QUOTE_TTL_MS`.
   g. Set `session.state = 'quoted'` and `session.quoteExpiresAt = now + BURNBAG_QUOTE_TTL_MS`.
   h. Return `IUploadCostQuoteDTO` with exact byte counts, RS params, Joule amounts,
      and `quoteExpiresAt`.
3. WHEN the authorize call in AC 2e returns `INSUFFICIENT_JOULE` THEN `quote()` SHALL
   reject with HTTP 402 `INSUFFICIENT_JOULE_FOR_STORAGE`; no escrow SHALL be stored.
4. WHEN `UploadService.commit(sessionId)` is invoked THEN it SHALL:
   a. Verify `session.state === 'quoted'` AND `quoteExpiresAt > now`; otherwise respond
      409 `UPLOAD_QUOTE_EXPIRED`.
   b. Retrieve the ciphertext from escrow.
   c. Write blocks to permanent `IBlockStore`.
   d. Call `DebitAuthorization.capture(opId, quotedUpfrontMicroJoules)` (exact amount,
      no safety buffer).
   e. Emit `resource_event(storage, blockAlignedBytes × durationDays)` to metering-log.
   f. Call `BurnbagStorageContractManager.createContract(...)`.
   g. Delete the escrow document and the session.
   h. Return `{ fileId, metadata }` with HTTP 201.
5. WHEN any storage write in AC 4c fails THEN `commit()` SHALL call
   `DebitAuthorization.release(opId)`, retain the escrow, and return 500; the client
   MAY retry `commit()` while the quote is still valid.
6. WHEN `UploadService.discard(sessionId)` is invoked THEN it SHALL call
   `DebitAuthorization.release(opId)`, delete the escrow, and delete the session;
   return HTTP 204.
7. WHEN `quoteExpiresAt` is reached without a `commit()` or `discard()` call THEN
   a background cleanup job SHALL call `DebitAuthorization.release(opId)` and purge
   the escrow.
8. WHEN `BURNBAG_JOULE_ENABLED=false` THEN `quote()` SHALL be unavailable; the legacy
   `POST /upload/{sessionId}/finalize` SHALL behave as before this spec (byte-quota
   only, no approval step).
9. WHEN a cost estimate is needed before uploading (e.g. early UI affordability check)
   THEN `GET /burnbag/joule/storage-cost?bytes=<n>&tier=<t>&days=<d>` SHALL serve as
   a pre-screen estimate based on the declared file size.

### Requirement 4 — StorageContract lifecycle

**User Story:** As a file owner, I want a StorageContract to be created for every
file I upload so that the system can track my ongoing storage obligation and
automatically destroy my file when I stop paying or when the contract expires.

#### Acceptance Criteria

1. WHEN `UploadService.finalize()` succeeds THEN `BurnbagStorageContractManager.createContract()`
   SHALL persist a `IBurnbagStorageContract` record with
   `status: 'active'`, `remainingCreditMicroJoules: upfrontMicroJoules`, `autoRenew: false` by default.
2. WHEN the daily settlement cron runs THEN for each `status='active'` contract with
   `lastSettledAt < now - settlementInterval`:
   a. Debit `dailyMicroJoules` from the owner's Layer 1 balance.
   b. Decrement `remainingCreditMicroJoules`.
   c. Emit `resource_event(storage, ...)` to metering-log.
   d. Award provider nodes `PROVIDER_SHARE_FRACTION` of `dailyMicroJoules`.
3. WHEN a settlement debit fails with `INSUFFICIENT_JOULE` THEN the contract SHALL
   be set to `status: 'suspended'` and the owner SHALL be notified.
4. WHEN `status: 'suspended'` and `BURNBAG_CONTRACT_SUSPENSION_GRACE_DAYS` have
   elapsed without the balance being replenished THEN the contract SHALL be set to
   `status: 'expired'` and `DestructionService.scheduleDestruction()` SHALL be called
   for the file.
5. WHEN `autoRenew: true` and `remainingCreditMicroJoules` falls below
   `dailyMicroJoules × 7` THEN the system SHALL authorize and capture
   `dailyMicroJoules × 30` from the owner (30-day renewal) and extend `expiresAt`.
6. WHEN `DestructionService.destroyFile()` is called THEN
   `BurnbagStorageContractManager.expireOnDestruction(contractId)` SHALL be called,
   refunding `remainingCreditMicroJoules` to the owner's Layer 1 balance, and the
   contract SHALL be marked `status: 'destroyed'`.
7. WHEN a refund is applied THEN it SHALL be a Layer 1 credit only (not a mint);
   and a `StorageContractDestroyed` event SHALL be emitted to the metering-log so
   Layer 3 audit trail records it.
8. WHEN `BurnbagStorageContractManager.extendContract(contractId, additionalDays)` is
   called THEN it SHALL authorize and capture `dailyMicroJoules × additionalDays`
   and extend `expiresAt` accordingly.

### Requirement 5 — Provider credit pipeline

**User Story:** As a storage node operator, I want to earn Joules automatically
when I pass proof-of-possession challenges for the files I host, so there is a
direct economic incentive to keep files available.

#### Acceptance Criteria

1. WHEN a PoP challenge is passed for a file THEN
   `ProviderCreditPipeline.awardProviderEarning(nodeId, contractId, periodEndMs)`
   SHALL be called by the challenge verifier.
2. WHEN `awardProviderEarning` is called THEN it SHALL compute:
   `earn = floor(dailyMicroJoules × PROVIDER_SHARE_FRACTION / 100n)` and split it
   evenly across all `contract.providerNodeIds`.
3. WHEN the earning is computed THEN `JouleEarnService.grant()` SHALL be called with
   `reason: 'storage-pop:<contractId>:<periodEnd>'` and the result SHALL be posted
   to the provider node's Joule account.
4. WHEN a provider node is added to or removed from `contract.providerNodeIds` THEN
   subsequent PoP earning calculations SHALL use the updated node set.
5. WHEN the contract `status` is not `'active'` THEN no earning SHALL be granted
   for challenges against that contract.
6. WHEN the daily fee paid by the owner is split THEN the totals SHALL satisfy:
   `providerShare + ownerShare + networkShare + protocolShare = dailyMicroJoules`
   (within 1 µJ rounding tolerance).

### Requirement 6 — Quota bridge

**User Story:** As a platform engineer, I want `IStorageQuotaService.checkQuota`
to verify not just available bytes but also that the member can afford the Joule
cost of the requested operation, so there is a single gate before any upload.

#### Acceptance Criteria

1. WHEN `checkQuota(memberId, requestedBytes, { tier, durationDays })`
   is called THEN it SHALL first perform the existing byte-space check.
2. WHEN the byte check passes AND `BURNBAG_JOULE_ENABLED=true` THEN it SHALL
   additionally verify that `AssetAccountStore.getBalance(memberId, 'joule').available
   >= calculateBurnbagStorageCost({ bytes, tier, durationDays }).upfrontMicroJoules`.
3. WHEN the Joule affordability check fails THEN `checkQuota` SHALL return a result
   with `allowed: false` and `reason: 'INSUFFICIENT_JOULE_FOR_STORAGE'` rather than throwing.
4. WHEN `BURNBAG_JOULE_ENABLED=false` THEN `checkQuota` SHALL ignore the Joule check
   and behave as the pre-spec implementation.
5. WHEN the `IStorageQuotaCheckOptions` type is extended THEN the new fields `tier`
   and `durationDays` SHALL be optional and typed as defined in
   `burnbagDurability.ts` and `burnbagStorageCost.ts`.

### Requirement 7 — REST endpoints

**User Story:** As a Burnbag frontend and API consumer, I want endpoints to preview
storage costs without uploading and to inspect my active StorageContracts, so I can
plan my Joule budget.

#### Acceptance Criteria

1. `GET /burnbag/joule/storage-cost?bytes=<n>&tier=<t>&days=<d>` SHALL
   return `{ upfrontMicroJoules: string, dailyMicroJoules: string, effectiveTier: string, rsK: number, rsM: number, overheadDisplay: string }`
   (bigint amounts as strings), unauthenticated.
2. WHEN `bytes` or `days` is non-numeric THEN the endpoint SHALL
   return 400 with a field-level validation error.
3. `GET /me/burnbag/storage-contracts` SHALL return the list of `IBurnbagStorageContract`
   records for the authenticated member, with all bigint fields serialized as strings.
4. `GET /me/burnbag/storage-contracts/:contractId` SHALL return a single contract;
   403 if the contract does not belong to the requesting member.
5. `PATCH /me/burnbag/storage-contracts/:contractId` SHALL accept
   `{ autoRenew: boolean }` and update the contract; other fields SHALL be immutable.
6. WHEN a member requests another member's contracts THEN the API SHALL return 403;
   operators with `burnbag:admin` scope MAY read any contract.

### Requirement 8 — React StorageCostPreview component pack

**User Story:** As a user uploading a file, I want an interactive cost preview in
the upload modal that updates live as I change tier and duration, so
I always know the Joule cost before clicking Upload.

#### Acceptance Criteria

1. `StorageCostPreview` SHALL accept `{ bytes: bigint, tier, durationDays, hasBurnDate }`
   as props and render the upfront and daily Joule costs formatted with `formatJoule()`.
2. WHEN `hasBurnDate` is true THEN `StorageCostPreview` SHALL render the cost using
   `effectiveTier: 'pending-burn'` and display a `BurnDateCostNote` badge.
3. `StorageTierSelector` SHALL render four options (`performance`, `standard`, `archive`,
   and conditionally `pending-burn` if burn date already set) with their RS params,
   overhead factor, and node failure tolerance shown inline for each option.
4. `RsParamsDisplay` SHALL render read-only text showing `RS(k,m)`, overhead (e.g. `1.50×`),
   and failure tolerance (e.g. `tolerates 4 node failures`) for the currently selected tier.
5. `StorageDurationPicker` SHALL show quick-select presets (7, 30, 90, 365 days) and
   a free-form day input.
6. ALL cost calculations in the React components SHALL be performed client-side by
   calling `calculateBurnbagStorageCost` directly (no API round-trip).
7. WHEN the user's current Joule balance is passed via `availableBalance` prop THEN
   `StorageCostPreview` SHALL highlight in red when `upfrontMicroJoules > availableBalance`.
8. ALL components SHALL be accessible (ARIA labels on controls, keyboard-navigable).

### Requirement 9 — Configuration and feature flag

**User Story:** As a platform operator, I want to be able to enable or disable
Joule-gated storage independently of the rest of the Joule system, so I can
roll it out gradually and fall back safely.

#### Acceptance Criteria

1. WHEN `BURNBAG_JOULE_ENABLED` is absent from the environment THEN it SHALL default to `false`.
2. WHEN `BURNBAG_JOULE_ENABLED=false` THEN uploads SHALL succeed without any Joule check
   or StorageContract creation; existing contracts SHALL continue to settle normally.
3. ALL configurable limits (`BURNBAG_MAX_REDUNDANCY`, `BURNBAG_MAX_DURATION_DAYS`,
   `BURNBAG_CONTRACT_SUSPENSION_GRACE_DAYS`, `BURNBAG_DEFAULT_TIER`,
   `BURNBAG_DEFAULT_REDUNDANCY`, `BURNBAG_DEFAULT_DURATION_DAYS`,
   `BURNBAG_SETTLEMENT_INTERVAL_MS`) SHALL be validated at process startup and
   SHALL fail fast with a descriptive error if any value is out of range.
4. WHEN `BURNBAG_PROVIDER_SHARE_FRACTION` together with the other three fractions do
   not sum to 100 THEN startup SHALL fail with `REVENUE_SHARE_DOES_NOT_SUM_TO_100`.

### Requirement 10 — Property tests

**User Story:** As an engineer, I want automated property tests verifying that the
cost calculator is deterministic, that the upload lifecycle conserves Joules (no
creation or destruction of value beyond the intended revenue split), and that the
refund on early destruction is always correct.

#### Acceptance Criteria

1. PROPERTY TEST: `calculateBurnbagStorageCost(p)` for all generated `{ bytes, tier, redundancy, durationDays }`
   SHALL produce identical output on repeated calls (determinism).
2. PROPERTY TEST: `upfrontMicroJoules = dailyMicroJoules × durationDays` exactly.
3. PROPERTY TEST: For any `tier ∈ { performance, standard, archive, pending-burn }`,
   `cost(performance) > cost(standard) > cost(archive) > cost(pending-burn)` at the same
   byte count and duration.
4. PROPERTY TEST: For RS params `(rsK, rsM)` and `(rsK, rsM+1)` at fixed `rsK`, the
   cost with `rsM+1` parity shards SHALL be strictly greater than with `rsM` at the
   same byte count and duration (RS overhead monotonicity).
5. PROPERTY TEST (lifecycle conservation): After a full upload (authorize → capture →
   StorageContract.create), the member's Joule balance change SHALL equal exactly
   `upfrontMicroJoules` (no extra debit, no under-debit).
6. PROPERTY TEST (early destroy): `refunded + consumed = upfrontMicroJoules` where
   `consumed = settledDays × dailyMicroJoules` and `refunded = remainingCreditMicroJoules`
   before destruction.
7. PROPERTY TEST (provider conservation): Sum of all provider grants across all PoP
   challenges for a contract over its full lifetime SHALL equal
   `floor(totalConsumed × PROVIDER_SHARE_FRACTION / 100)` within 1 µJ rounding.
8. ALL property tests SHALL use `fast-check` generators with a minimum of 1000 runs.

---

### Requirement 11 — Upload cost approval UI

**User Story:** As a user, after uploading all file chunks, I want to see the exact
Joule cost in a confirmation dialog — based on the actual encrypted block count and
RS shard layout — before clicking "Confirm Upload", so I know exactly what I will be
charged and can cancel at no cost if I change my mind.

#### Acceptance Criteria

1. AFTER all chunks are uploaded, the upload flow SHALL call `POST /upload/{sessionId}/quote`
   and display the returned `IUploadCostQuoteDTO` in an approval dialog before any
   permanent write occurs.
2. THE approval dialog SHALL display: total stored bytes, RS layout (e.g. `RS(8,4) · 1.50×`),
   exact upfront Joules, daily Joules, duration, and a live countdown to `quoteExpiresAt`.
3. THE dialog SHALL display a prominent warning when
   `upfrontMicroJoules > user.availableJouleBalance`.
4. WHEN the user clicks "Confirm Upload" THEN the client SHALL call
   `POST /upload/{sessionId}/commit`.
5. WHEN the user clicks "Cancel" THEN the client SHALL call
   `POST /upload/{sessionId}/discard`.
6. WHEN the countdown reaches zero while the dialog is open THEN the dialog SHALL
   automatically show "Quote expired — please re-upload" and the client SHALL
   proactively call `discard()`.
7. WHEN `commit()` returns 201 THEN the upload modal SHALL show a success state, close,
   and the file SHALL appear in the folder listing without a page reload.
8. THE `UploadCostApprovalModal` component SHALL be keyboard-navigable and fully
   ARIA-labelled.
