# Tasks — Digital Burnbag Joule Storage Economy

All tasks are grouped by phase. Each task cites the requirements it satisfies.
`bigint` is mandatory for all Joule amounts; never use `number` for µJ values.

---

## Phase 1 — Shared library primitives (`digitalburnbag-lib`)

These tasks produce browser-safe, Node-free modules consumed by both the API and the React components.

- [x] **1.1** Create `burnbagDurability.ts`

**File:** `digitalburnbag-lib/src/lib/joule/burnbagDurability.ts`

- Define `BurnbagStorageTier` union type: `'performance' | 'standard' | 'archive' | 'pending-burn'`
- Define `IBurnbagRsParams { readonly k: number; readonly m: number }`
- Export `BURNBAG_TIER_RS_PARAMS: Record<BurnbagStorageTier, IBurnbagRsParams>`:
  - `performance`: RS(10,6) — 1.60× overhead, 6 node failures tolerated
  - `standard`:    RS(8,4)  — 1.50× overhead, 4 node failures tolerated
  - `archive`:     RS(6,2)  — 1.33× overhead, 2 node failures tolerated
  - `pending-burn`:RS(4,1)  — 1.25× overhead, 1 node failure tolerated
- Export `BURNBAG_TIER_TO_DURABILITY: Record<BurnbagStorageTier, DurabilityLevel>` (mapping to brightchain-lib enum)
- Export `effectiveTier(userTier: BurnbagStorageTier, hasBurnDate: boolean): BurnbagStorageTier` — returns `'pending-burn'` when `hasBurnDate`, else `userTier`

_Requirements: 1.7, 2.1_

---

- [x] **1.2** Create `burnbagStorageRates.ts`

**File:** `digitalburnbag-lib/src/lib/joule/burnbagStorageRates.ts`

- Export `STORAGE_BASE_RATE_UJ_PER_GB_DAY = 500n` (µJ per GB per day; 1 GB = 1,000,000,000 bytes)
- Export `STORAGE_HOT_MUL_1000 = 2000n`, `STORAGE_WARM_MUL_1000 = 1000n`, `STORAGE_COLD_MUL_1000 = 500n`, `STORAGE_FROZEN_MUL_1000 = 250n`
- Export `STORAGE_MIN_CHARGE_UJ = 1n` — floor: never allow a zero daily charge
- Export helper `durabilityMul1000(tier: BurnbagStorageTier): bigint` — returns the above constants via `BURNBAG_TIER_TO_DURABILITY`
- Export `ceilDiv(numerator: bigint, denominator: bigint): bigint` — `(a + b - 1n) / b` ceiling division, throws if denominator ≤ 0n

_Requirements: 1.2, 1.3_

---

- [x] **1.3** Create `burnbagStorageCost.ts`

**File:** `digitalburnbag-lib/src/lib/joule/burnbagStorageCost.ts`

Define and export:

```ts
export interface IBurnbagStorageCostParams {
  bytes: bigint;
  tier: BurnbagStorageTier;
  durationDays: number;
  rsK?: number;  // defaults to BURNBAG_TIER_RS_PARAMS[effectiveTier].k
  rsM?: number;  // defaults to BURNBAG_TIER_RS_PARAMS[effectiveTier].m
}

export interface IBurnbagStorageCost {
  upfrontMicroJoules: bigint;
  dailyMicroJoules: bigint;
  rsK: number;
  rsM: number;
  overheadDisplay: string;      // e.g. "1.50×"
  effectiveTier: BurnbagStorageTier;
}
```

Implement `calculateBurnbagStorageCost(params: IBurnbagStorageCostParams): IBurnbagStorageCost`:

1. Resolve `effectiveTier = effectiveTier(params.tier, false)` (burn-date override is caller's responsibility via `tier` field)
2. Resolve `rsK = params.rsK ?? BURNBAG_TIER_RS_PARAMS[effectiveTier].k`; `rsM = params.rsM ?? BURNBAG_TIER_RS_PARAMS[effectiveTier].m`
3. Validate: `durationDays ≥ 1` (throw `INVALID_DURATION`); `rsK ≥ 2 && rsM ≥ 1` (throw `INVALID_RS_PARAMS`)
4. Compute:

   ```
   daily = max(
     ceilDiv(bytes × BASE_RATE × durabilityMul1000(tier) × BigInt(rsK + rsM),
             1_000_000_000n × 1000n × BigInt(rsK)),
     STORAGE_MIN_CHARGE_UJ
   )
   upfront = daily × BigInt(durationDays)
   ```

5. Build `overheadDisplay` string from integer arithmetic: `${(rsK+rsM)*100/rsK / 100}.${...}×`
6. Function is pure — no I/O, no side effects

_Requirements: 1.1–1.12_

---

- [x] **1.4** Create `storageContract.ts` interface

**File:** `digitalburnbag-lib/src/lib/joule/storageContract.ts`

Export `IBurnbagStorageContract`:

```ts
export interface IBurnbagStorageContract {
  readonly contractId: string;
  readonly fileId: string;
  readonly ownerId: string;
  readonly createdAt: Date;
  expiresAt: Date;
  readonly committedDays: number;
  readonly bytes: bigint;
  tier: BurnbagStorageTier;
  rsK: number;           // mutable: upgraded by AUTO_RS_UPGRADE
  rsM: number;           // mutable: upgraded by AUTO_RS_UPGRADE
  readonly upfrontMicroJoules: bigint;
  readonly dailyMicroJoules: bigint;
  remainingCreditMicroJoules: bigint;
  survivalFundMicroJoules: bigint;   // funded by download bandwidth fees
  autoRenew: boolean;
  providerNodeIds: string[];
  status: 'active' | 'expired' | 'destroyed' | 'suspended';
  lastSettledAt: Date;
}
```

_Requirements: 4.1_

---

- [x] **1.5** Add `rsK?` / `rsM?` to `IFileMetadataBase`

**File:** `digitalburnbag-lib/src/lib/interfaces/bases/file-metadata.ts`

Add two optional fields:

```ts
/** RS data shards (k). Defaults to BURNBAG_TIER_RS_PARAMS[storageTier].k if absent. */
rsK?: number;
/** RS parity shards (m). Defaults to BURNBAG_TIER_RS_PARAMS[storageTier].m if absent. */
rsM?: number;
```

These diverge from tier defaults only when `AUTO_RS_UPGRADE` has run on the contract.
No migration needed — existing records fall back to tier defaults.

_Requirements: 3.7 (IFileMetadataBase extensions)_

---

- [x] **1.6** Extend `IStorageQuotaCheckOptions`

**File:** `digitalburnbag-lib/src/lib/interfaces/storage/storageQuotaCheckOptions.ts` (or equivalent)

Add optional fields `tier?: BurnbagStorageTier` and `durationDays?: number`.
No `redundancy` field — tier implies RS params.

_Requirements: 6.5_

---

- [x] **1.8** Extend `IUploadSessionBase` for escrow and add `IUploadCostQuoteDTO`

**Files:**

- `digitalburnbag-lib/src/lib/interfaces/bases/upload-session.ts` (extend existing)
- `digitalburnbag-lib/src/lib/interfaces/dtos/uploadCostQuoteDTO.ts` (new)

**`IUploadSessionBase<TID>` escrow additions** (all fields optional when
`BURNBAG_JOULE_ENABLED=false`; `state` defaults to `'uploading'`):

```ts
durabilityTier: BurnbagStorageTier;    // required at session creation
durationDays: number;                   // required at session creation
state: 'uploading' | 'quoted';          // default: 'uploading'
quotedAt?: string;                      // ISO timestamp set by quote()
quoteExpiresAt?: string;                // ISO timestamp: now + BURNBAG_QUOTE_TTL_MS
quotedUpfrontMicroJoules?: string;      // bigint as string
quotedDailyMicroJoules?: string;        // bigint as string
quotedBlockAlignedBytes?: number;
quotedRsK?: number;
quotedRsM?: number;
jouleOpId?: string;                     // DebitAuthorization op ID for capture/release
```

Also update `ICreateUploadSessionParams<TID>` to require `durabilityTier` and
`durationDays` when `BURNBAG_JOULE_ENABLED=true`.

**`IUploadCostQuoteDTO`:**

```ts
export interface IUploadCostQuoteDTO {
  sessionId: string;
  plaintextBytes: number;
  encryptedBytes: number;
  blockAlignedBytes: number;
  blockCount: number;
  shardSize: number;
  rsK: number;
  rsM: number;
  totalShardsStored: number;
  totalStoredBytes: string;       // bigint as string
  durabilityTier: BurnbagStorageTier;
  durationDays: number;
  upfrontMicroJoules: string;     // bigint as string
  dailyMicroJoules: string;       // bigint as string
  overheadDisplay: string;
  quoteExpiresAt: string;         // ISO timestamp
}
```

_Requirements: 3.1, 3.2, 11.1_

---

- [x] **1.7** Property tests for cost calculator

**File:** `digitalburnbag-lib/src/lib/joule/burnbagStorageCost.property.spec.ts`

Using `fast-check`, ≥ 1000 runs each:

- **Determinism**: `calculateBurnbagStorageCost(p)` called twice returns identical object
- **Upfront conservation**: `upfront === daily × BigInt(durationDays)` always
- **Tier cost ordering**: `pending-burn < archive < standard < performance` for all positive byte counts and equal `durationDays`
- **RS overhead monotonicity**: cost increases monotonically as `rsM` increases at fixed `rsK` and `bytes`
- **Min charge**: `daily ≥ 1n` for all `bytes ≥ 0n`
- **BigInt purity**: no `number` arithmetic in hot path (lint rule or manual inspection)

_Requirements: 10.1–10.4_

---

## Phase 2 — Upload debit authorization (`digitalburnbag-api-lib`)

- [x] **2.1** Create `BurnbagUploadCostEstimator`

**File:** `digitalburnbag-api-lib/src/lib/joule/burnbagUploadCostEstimator.ts`

```ts
export function burnbagUploadCostEstimator(req: Request): bigint {
  const { totalSizeBytes, durabilityTier, durationDays } = req.body;
  return calculateBurnbagStorageCost({
    bytes: BigInt(totalSizeBytes),
    tier: durabilityTier,
    durationDays,
    // rsK/rsM default to tier's canonical params — no override at upload time
    // NOTE: this is a declared-size estimate only; authoritative cost is
    // computed in UploadService.quote() using blockAlignedBytes.
  }).upfrontMicroJoules;
}
```

Validate `totalSizeBytes`, `durabilityTier`, `durationDays` at boundary; throw 422 with
`INVALID_DURATION` or `INVALID_TIER` if malformed. This estimator is only used as an
early affordability pre-screen on `POST /upload/init` to fast-fail obviously unaffordable
uploads — the definitive cost is determined in `UploadService.quote()`.

_Requirements: 3.2d_

---

- [x] **2.2** Wire `DebitAuthorization` into `UploadService.quote()` and `commit()`

This task implements the debit lifecycle for the three-phase escrow flow.
All logic is guarded by `BURNBAG_JOULE_ENABLED`.

**Phase — quote** (`UploadService.quote(sessionId)` in
`digitalburnbag-api-lib/src/lib/services/uploadService.ts`):

1. Reassemble chunks → `plaintextBytes`.
2. Encrypt → `encryptedBytes` (AES-GCM: `plaintextBytes + 28`).
3. Compute `blockAlignedBytes = ceil(encryptedBytes / BLOCK_SIZE) × BLOCK_SIZE`.
4. Resolve `{ rsK, rsM } = BURNBAG_TIER_RS_PARAMS[session.durabilityTier]`.
5. Call `calculateBurnbagStorageCost({ bytes: blockAlignedBytes, tier, durationDays })`.
6. Call `DebitAuthorization.authorize(memberId, opId, upfrontMicroJoules × 1.25)`.
7. On `INSUFFICIENT_JOULE`: reject 402; do NOT store escrow.
8. Store ciphertext in `burnbag_upload_escrow` via `IUploadRepository.storeEscrowData()`.
9. Update session: `state='quoted'`, `quoteExpiresAt`, all `quoted*` fields, `jouleOpId`.
10. Return `IUploadCostQuoteDTO`.

**Phase — commit** (`UploadService.commit(sessionId)`):

1. Verify `session.state === 'quoted'` AND `quoteExpiresAt > now`; else 409 `UPLOAD_QUOTE_EXPIRED`.
2. Retrieve ciphertext from escrow via `IUploadRepository.getEscrowData(sessionId)`.
3. Write blocks to permanent `IBlockStore`.
4. On storage write failure: call `DebitAuthorization.release(opId)` and return 500
   (retain escrow for retry while quote is still valid — AC 3.5).
5. Call `DebitAuthorization.capture(opId, session.quotedUpfrontMicroJoules)`.
6. Emit `resource_event(type='storage', fileId, blockAlignedBytes, durationDays, µJ)` to
   `MeteringLogWriter`.
7. Call `BurnbagStorageContractManager.createContract(...)`.
8. Delete escrow + session.
9. Return `{ fileId, metadata }` (201).

**Phase — discard** (`UploadService.discard(sessionId)`):

1. Call `DebitAuthorization.release(session.jouleOpId)`.
2. Delete escrow + session.
3. Return 204.

**Background TTL expiry**:

- BrightDB auto-purges `burnbag_upload_escrow` documents.
- A background job reacts to purge events to call `DebitAuthorization.release(opId)`.

_Requirements: 3.2–3.8_

---

- [x] **2.3** `BURNBAG_JOULE_ENABLED` feature flag guard

**File:** `digitalburnbag-api-lib/src/lib/config/burnbagConfig.ts`

- Read `BURNBAG_JOULE_ENABLED` env var (default `false` in test, `true` in prod)
- Export `isBurnbagJouleEnabled(): boolean`
- Use this guard in every place the Joule system is entered (upload, quota check, settlement cron)

_Requirements: 9.1, 9.2_

---

- [x] **2.4** Extend `IStorageQuotaService.checkQuota()`

**File:** `digitalburnbag-api-lib/src/lib/services/storageQuotaService.ts`

When `BURNBAG_JOULE_ENABLED` and options include `tier` + `durationDays`:

- After the existing byte-space check passes, compute `requiredµJ = calculateBurnbagStorageCost({ bytes, tier, durationDays }).upfrontMicroJoules`
- Check `AssetAccountStore.getBalance(memberId, 'joule').available >= requiredµJ`
- If insufficient: return `{ allowed: false, reason: 'INSUFFICIENT_JOULE_FOR_STORAGE' }` (no throw)

_Requirements: 6.1–6.4_

---

- [x] **2.5** Startup environment validation

**File:** `digitalburnbag-api-lib/src/lib/config/burnbagConfig.ts` (extend task 2.3)

At startup, when `BURNBAG_JOULE_ENABLED=true`:

- Validate all required `BURNBAG_*` env vars are present and parseable
- Assert `BURNBAG_PROVIDER_SHARE_FRACTION + <other shares> === 100`; throw if not
- Log validated config at `INFO` level

_Requirements: 9.3, 9.4_

---

- [x] **2.6** Property test: debit–capture balance conservation

**File:** `digitalburnbag-api-lib/src/lib/__tests__/uploadDebit.property.spec.ts`

Using fast-check:

- `authorize → capture(actual) → release(remainder)`: net L1 balance change equals `actual` µJ exactly
- Conservation: `reserved - captured - released === 0`

_Requirements: 10.5_

---

- [x] **2.7** Implement `UploadService.quote()`

**File:** `digitalburnbag-api-lib/src/lib/services/uploadService.ts`

Full implementation of the quote phase as specified in task 2.2 "Phase — quote".

- Add `quote(sessionId: string, requestingUserId: string): Promise<IUploadCostQuoteDTO>` to
  `IUploadService<TID>` in `digitalburnbag-lib/src/lib/interfaces/services/upload-service.ts`
- Implement in `UploadService<TID>`
- Guard with `BURNBAG_JOULE_ENABLED`; throw `FEATURE_DISABLED` if false

_Requirements: 3.1, 3.2_

---

- [x] **2.8** Implement `UploadService.commit()` and `UploadService.discard()`

**File:** `digitalburnbag-api-lib/src/lib/services/uploadService.ts`

Full implementation of the commit and discard phases as specified in task 2.2.

- Add `commit(sessionId: string, requestingUserId: string): Promise<IUploadCommitResultDTO>` and
  `discard(sessionId: string, requestingUserId: string): Promise<void>` to `IUploadService<TID>`
- Implement in `UploadService<TID>`
- `IUploadCommitResultDTO` (new in `digitalburnbag-lib/src/lib/interfaces/dtos/uploadCommitResultDTO.ts`):

  ```ts
  export interface IUploadCommitResultDTO {
    fileId: string;
    metadata: IFileMetadataBase;
  }
  ```

- Legacy `finalize()` SHALL remain on `IUploadService` (for `BURNBAG_JOULE_ENABLED=false`)

_Requirements: 3.4, 3.5, 3.6_

---

- [x] **2.9** Extend `IUploadRepository` and implement escrow storage

**Files:**

- `digitalburnbag-lib/src/lib/interfaces/repositories/upload-repository.ts` (extend)
- `digitalburnbag-db/src/lib/repositories/brightDBUploadRepository.ts` (implement)

**New `IUploadRepository` methods:**

```ts
storeEscrowData(sessionId: string, ciphertext: Buffer, ttlMs: number): Promise<void>;
getEscrowData(sessionId: string): Promise<Buffer | null>;
deleteEscrowData(sessionId: string): Promise<void>;
```

**BrightDB `burnbag_upload_escrow` collection:**

```ts
{
  _id: ObjectId,
  sessionId: string,    // indexed unique
  ciphertext: Binary,   // encrypted file data
  expiresAt: Date,      // TTL field
}
```

Create a TTL index on `expiresAt` with `expireAfterSeconds = 0`
(BrightDB enforces TTL based on the document's own `expiresAt` value).

When the TTL fires and BrightDB auto-purges a document, a `ChangeStream` listener
(or scheduled cleanup job) SHALL detect the deletion and call
`DebitAuthorization.release(session.jouleOpId)` for the associated session.

_Requirements: 3.7_

---

## Phase 3 — StorageContract lifecycle (`digitalburnbag-api-lib`)

- [x] **3.1** BrightDB schema + repository for `IBurnbagStorageContract`

**File:** `digitalburnbag-api-lib/src/lib/repositories/burnbagStorageContractRepository.ts`

- Mongoose schema matching `IBurnbagStorageContract` (bigint fields stored as `Decimal128`)
- Indexes: `{ fileId: 1 }` unique, `{ ownerId: 1, status: 1 }`, `{ status: 1, lastSettledAt: 1 }` (for settlement cron)
- CRUD: `create()`, `findByFileId()`, `findByOwner()`, `updateContract()`, `findDueForSettlement(cutoff: Date)`

_Requirements: 4.1_

---

- [x] **3.2** Implement `BurnbagStorageContractManager`

**File:** `digitalburnbag-api-lib/src/lib/services/burnbagStorageContractManager.ts`

Inject `IFecService` via `FecServiceFactory.getBestAvailable()`. Methods:

- **`createContract(params)`**: builds `IBurnbagStorageContract` from upload params, persists via repository; calls `FecService.encode(fileData, shardSize, rsK, rsM)` to generate and store initial parity shards
- **`extendContract(contractId, additionalDays)`**: updates `expiresAt`; no charge (called from survival fund sweep)
- **`applyBurnDateDowngrade(fileId)`**: downgrades `tier` to `'pending-burn'`, recalculates `dailyMicroJoules` using RS(4,1), updates `remainingCreditMicroJoules = newDailyµJ × remainingDays` and refunds difference to owner L1
- **`upgradeRsParams(contractId, newK, newM)`**: updates `rsK`, `rsM`, `dailyMicroJoules`; calls `FecServiceFactory.getBestAvailable()` then `fecService.createParityData()` to regenerate parity shards for new params; deducts upgrade cost from `survivalFundMicroJoules`
- **`expireStaleContracts()`**: marks `status='expired'` for contracts where `expiresAt < now` and `autoRenew=false`
- **`expireOnDestruction(fileId)`**: marks `status='destroyed'`, issues refund (see Phase 3.4)

_Requirements: 4.1–4.8, 2.2–2.4_

---

- [x] **3.3** Settlement cron (24h)

**File:** `digitalburnbag-api-lib/src/lib/cron/burnbagSettlementCron.ts`

Runs on `BURNBAG_SETTLEMENT_INTERVAL_MS` (default 86400000 ms):

```
For each contract where status='active' AND lastSettledAt < now - interval:
  due = min(dailyMicroJoules, remainingCreditMicroJoules)
  Debit ownerId L1 by due (non-optional)
  remainingCreditMicroJoules -= due
  lastSettledAt = now
  Emit resource_event(storage, fileId, bytes, due)
  Call ProviderCreditPipeline.awardProviderEarning(contractId, due)
Expire contracts where remainingCreditMicroJoules=0 AND autoRenew=false
Suspend contracts where owner L1 balance insufficient
Emit summary metric: contracts_settled, contracts_expired, contracts_suspended
```

Configurable via `BURNBAG_SETTLEMENT_INTERVAL_MS`.

_Requirements: 4.2–4.5_

---

- [x] **3.4** Wire `expireOnDestruction()` into `DestructionService`

**File:** `digitalburnbag-api-lib/src/lib/services/destructionService.ts` (extend existing)

In `destroyFile(fileId)`:

1. Call `BurnbagStorageContractManager.expireOnDestruction(fileId)`
2. Compute `refund = contract.remainingCreditMicroJoules`
3. If `refund > 0`: call `AssetAccountStore.credit(ownerId, 'joule', refund)` (L1 only, no mint)
4. Mark contract `status='destroyed'`
5. Emit `StorageContractDestroyed` resource_event to metering-log

_Requirements: 4.6, 4.7_

---

- [x] **3.5** Wire `applyBurnDateDowngrade()` when burn date is set

**File:** extend the existing "set burn date" service call path

When `scheduledDestructionAt` is first set on a file:

- Call `BurnbagStorageContractManager.applyBurnDateDowngrade(fileId)`
- This downgrades to RS(4,1) / FROZEN tier cost, refunds the tier difference to owner

_Requirements: 2.2, 2.3_

---

- [x] **3.6** Property test: refund + consumed = upfront (conservation)

**File:** `digitalburnbag-api-lib/src/lib/__tests__/storageContractConservation.property.spec.ts`

Using fast-check:

- For any `(durationDays, partialDaysConsumed)`: `consumed + refunded === upfrontMicroJoules`
- No Joule is created or destroyed across the contract lifecycle

_Requirements: 10.6_

---

## Phase 4 — Provider credit pipeline (`digitalburnbag-api-lib`)

- [x] **4.1** Implement `ProviderCreditPipeline`

**File:** `digitalburnbag-api-lib/src/lib/services/providerCreditPipeline.ts`

```ts
interface IProviderCreditPipeline {
  awardProviderEarning(contractId: string, dailyDue: bigint, periodEndMs: number): Promise<void>;
}
```

Implementation:

1. Load `contract.providerNodeIds` and `contract.dailyMicroJoules`
2. `earns = floor(dailyDue × PROVIDER_SHARE_FRACTION / 100n)`
3. `perNode = floor(earns / BigInt(nodeIds.length))`
4. `remainder = earns - perNode × BigInt(nodeIds.length)` → credit to first node (dust)
5. For each nodeId: call `JouleEarnService.grant(nodeId, perNode, 'storage-pop:<contractId>:<periodEnd>')`
6. Assert `sum of all grants ≤ earns` (conservation check)

_Requirements: 5.1–5.5_

---

- [x] **4.2** Integrate into settlement cron

In task 3.3's settlement loop, after debiting owner, call `ProviderCreditPipeline.awardProviderEarning(contractId, due, now)`.

_Requirements: 5.1_

---

- [x] **4.3** Revenue share conservation assertion

In the settlement loop, after all share credits:

```
assert: providerShare + ownerShare + networkShare + protocolShare === dailyDue ± 1n
```

Log as ERROR and halt settlement for that contract if violated.

_Requirements: 5.6_

---

- [x] **4.4** Property test: provider grants over lifetime

**File:** `digitalburnbag-api-lib/src/lib/__tests__/providerCredits.property.spec.ts`

Using fast-check:

- Sum of all provider grants over contract lifetime equals `floor(totalConsumed × PROVIDER_SHARE_FRACTION / 100n) ± 1n`

_Requirements: 10.7_

---

## Phase 5 — REST endpoints (`brightchain-api`)

- [x] **5.1** `GET /burnbag/joule/storage-cost`

**File:** `brightchain-api/src/app/routes/burnbag/joule/storageCost.ts`

Unauthenticated. Query params: `bytes`, `tier`, `days`.

- Validate all fields present and parseable
- Call `calculateBurnbagStorageCost({ bytes: BigInt(bytes), tier, durationDays: days })`
- Return `{ upfrontMicroJoules: string, dailyMicroJoules: string, effectiveTier: string, rsK: number, rsM: number, overheadDisplay: string }`
- Serialize bigint fields as strings (JSON doesn't support bigint natively)
- 400 on any invalid input

_Requirements: 7.1, 7.2_

---

- [x] **5.2** `GET /me/burnbag/storage-contracts`

Paginated list of contracts for authenticated member. All bigint fields as strings.

_Requirements: 7.3, 7.6_

---

- [x] **5.3** `GET /me/burnbag/storage-contracts/:contractId`

Single contract lookup. Return 403 if `contract.ownerId !== req.memberId` (unless `burnbag:admin` scope).

_Requirements: 7.4_

---

- [x] **5.4** `PATCH /me/burnbag/storage-contracts/:contractId`

Accept `{ autoRenew: boolean }` only. All other fields immutable — return 400 if other fields present.

_Requirements: 7.5_

---

- [x] **5.5** `POST /upload/{sessionId}/quote`

**File:** `digitalburnbag-api-lib/src/lib/controllers/upload-controller.ts`

Authenticated. No request body required.

- Guard `BURNBAG_JOULE_ENABLED`; return 404 if disabled
- Verify session belongs to `req.memberId`; return 403 otherwise
- Verify `session.state === 'uploading'`; return 409 `UPLOAD_ALREADY_QUOTED` if
  already `'quoted'`
- Call `UploadService.quote(sessionId, memberId)`
- Return 200 `IUploadCostQuoteDTO` (all bigint fields as strings)
- On `INSUFFICIENT_JOULE_FOR_STORAGE`: return 402

Also update `POST /upload/init` request body validation to **require** `durabilityTier`
(`BurnbagStorageTier`) and `durationDays` (`number, >=1`) when
`BURNBAG_JOULE_ENABLED=true`; return 422 if absent or invalid.

_Requirements: 3.1, 3.2, 3.3, 11.1_

---

- [x] **5.6** `POST /upload/{sessionId}/commit`

**File:** `digitalburnbag-api-lib/src/lib/controllers/upload-controller.ts`

Authenticated. No request body required.

- Guard `BURNBAG_JOULE_ENABLED`; return 404 if disabled
- Verify session belongs to `req.memberId`
- Call `UploadService.commit(sessionId, memberId)`
- Return 201 `IUploadCommitResultDTO` (`{ fileId, metadata }`)
- On `UPLOAD_QUOTE_EXPIRED` (409): propagate to client
- On storage write failure (500): propagate to client (escrow retained for retry)

_Requirements: 3.4, 3.5_

---

- [x] **5.7** `POST /upload/{sessionId}/discard`

**File:** `digitalburnbag-api-lib/src/lib/controllers/upload-controller.ts`

Authenticated. No request body required.

- Guard `BURNBAG_JOULE_ENABLED`; return 404 if disabled
- Verify session belongs to `req.memberId`
- Call `UploadService.discard(sessionId, memberId)`
- Return 204 No Content
- Idempotent: if session/escrow already deleted, return 204

_Requirements: 3.6_

---

## Phase 6 — React component pack (`digitalburnbag-react-components`)

- [x] **6.1** `StorageTierSelector.tsx`

Radio group with four options. Each option displays:

- Tier label (e.g. "Standard")
- RS params (e.g. `RS(8,4)`)
- Overhead factor (e.g. `1.50×`)
- Node failure tolerance (e.g. `tolerates 4 node failures`)
- Cost multiplier relative to standard (derived from `calculateBurnbagStorageCost`)

_Requirements: 8.3_

---

- [x] **6.2** `RsParamsDisplay.tsx`

Read-only display component. Props: `rsK: number, rsM: number`.  
Renders: `"RS(k,m) · 1.50× overhead · tolerates m node failures"`.  
Used inside `StorageTierSelector` per option and in the `StorageCostPreview` summary.

_Requirements: 8.4_

---

- [x] **6.3** `StorageDurationPicker.tsx`

Quick-select presets: 7, 30, 90, 365 days. Free-form number input. Min 1 day.

_Requirements: 8.5_

---

- [x] **6.4** `StorageCostPreview.tsx`

Props: `{ bytes: bigint, tier: BurnbagStorageTier, durationDays: number, hasBurnDate: boolean, availableBalance?: bigint }`.

- Calls `calculateBurnbagStorageCost` client-side (no API round-trip)
- Displays upfront and daily µJ formatted via `formatJoule()`
- Shows `BurnDateCostNote` badge when `hasBurnDate`
- Renders `RsParamsDisplay` for active tier
- Highlights in red when `upfrontMicroJoules > availableBalance`

_Requirements: 8.1, 8.2, 8.6, 8.7_

---

- [x] **6.5** `BurnDateCostNote.tsx`

Stateless badge: `"Burn date set — storage reduced to FROZEN tier RS(4,1)"`.

_Requirements: 8.2_

---

- [x] **6.6** `useStorageCostEstimate` hook

**File:** `digitalburnbag-react-components/src/joule/hooks/useStorageCostEstimate.ts`

```ts
function useStorageCostEstimate(
  bytes: bigint,
  tier: BurnbagStorageTier,
  durationDays: number,
  hasBurnDate: boolean,
): IBurnbagStorageCost
```

- Calls `calculateBurnbagStorageCost` with memoization on input changes
- Handles `bytes = 0n` gracefully (returns min charge)

_Requirements: 8.6_

---

- [x] **6.7** Integrate into upload modal

In `digitalburnbag-react-components` upload modal:

- Compose `StorageTierSelector` + `StorageDurationPicker` + `StorageCostPreview`
- Pass `hasBurnDate` prop from form state
- Submit `{ bytes, tier, durationDays }` to `POST /upload/init`

All components: ARIA labels on controls, keyboard-navigable.

_Requirements: 2.5, 8.1, 8.2, 8.8_

---

- [x] **6.8** `UploadCostApprovalModal.tsx`

**File:** `digitalburnbag-react-components/src/joule/UploadCostApprovalModal.tsx`

Modal component displayed after all chunks are uploaded and before any file is
permanently written. Implements the user-facing approval step.

**Props:**

```ts
interface UploadCostApprovalModalProps {
  sessionId: string;
  availableJouleBalance: bigint;
  onCommit: (result: IUploadCommitResultDTO) => void;
  onDiscard: () => void;
}
```

**Behaviour:**

1. On mount: call `BurnbagApiClient.quoteUpload(sessionId)` → display
   `IUploadCostQuoteDTO` (total stored bytes, RS layout, upfront µJ, daily µJ,
   duration, overhead factor).
2. Show a live countdown to `quoteExpiresAt` (ISO timestamp from DTO).
3. Display a prominent warning (ARIA `role="alert"`) when
   `upfrontMicroJoules > availableJouleBalance`.
4. "Confirm Upload" button: call `BurnbagApiClient.commitUpload(sessionId)`;
   on 201 → call `onCommit(result)` and close modal.
5. "Cancel" button: call `BurnbagApiClient.discardUpload(sessionId)`;
   on 204 → call `onDiscard()` and close modal.
6. When countdown reaches zero: replace UI with "Quote expired — please re-upload";
   proactively call `discardUpload()`.
7. Fully keyboard-navigable (Tab, Enter, Escape to cancel); all interactive
   elements have `aria-label` attributes.

Also add to `BurnbagApiClient`:

```ts
quoteUpload(sessionId: string): Promise<IUploadCostQuoteDTO>;
commitUpload(sessionId: string): Promise<IUploadCommitResultDTO>;
discardUpload(sessionId: string): Promise<void>;
```

_Requirements: 11.1–11.8_

---

## Cross-cutting concerns

- [x] **C.1** Barrel exports

Update `digitalburnbag-lib/src/index.ts` to export all new joule types and functions.  
Update `digitalburnbag-react-components/src/index.ts` for component exports.

- [x] **C.2** Codacy analysis

After each file edit, run `codacy_cli_analyze` with `rootPath=/Volumes/Code/BrightChain` and the edited file path. Fix any issues before proceeding.

- [ ] **C.3** Dependency check

After any `npm install` / `yarn add`, run `codacy_cli_analyze` with `tool=trivy` to check for new vulnerabilities.
