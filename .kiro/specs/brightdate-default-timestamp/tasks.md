# Implementation Plan: BrightDate as Default Timestamp

## Overview

This plan migrates the entire Brightchain ecosystem to use `BrightDateValue` (decimal days since J2000.0) as the native timestamp type. The implementation builds from foundational types and utilities upward through storage, transport, and presentation layers. Since the datastore can be wiped, all interfaces are updated in-place with no legacy overloads.

## Tasks

- [x] 1. Core type definitions and conversion utilities (brightchain-lib)
  - [x] 1.1 Create `BrightDateTimestamp` type alias and `ITimestamped<TTimestamp>` generic interface
    - Create `src/lib/types/brightDateTimestamp.ts` exporting `BrightDateTimestamp` as `BrightDateValue`
    - Create `ITimestamped<TTimestamp = BrightDateTimestamp>` with `createdAt` and `updatedAt` fields
    - Export from the package barrel
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 1.2 Implement conversion utilities
    - Create `src/lib/utils/brightDateConversions.ts`
    - Implement `brightDateToDate(value: BrightDateValue): Date`
    - Implement `dateToBrightDate(date: Date): BrightDateValue`
    - Implement `brightDateToISO(value: BrightDateValue): string`
    - Implement `isoToBrightDate(iso: string): BrightDateValue`
    - Implement `normalizeToBrightDate(input: BrightDateValue | Date | string): BrightDateValue` with error handling for NaN/Infinity/invalid strings
    - Implement `brightDateNow(): BrightDateTimestamp`
    - Export from the package barrel
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 10.4_

  - [x] 1.3 Write property tests for conversion round-trips
    - **Property 1: BrightDateValue-to-Date Round-Trip** — for any valid BrightDateValue v in [-365250, 365250], `dateToBrightDate(brightDateToDate(v))` is within 0.000001 of v
    - **Validates: Requirements 4.5**
    - **Property 2: Date-to-BrightDateValue Round-Trip** — for any valid Date d, `brightDateToDate(dateToBrightDate(d)).getTime()` differs from `d.getTime()` by at most 86ms
    - **Validates: Requirements 4.6**

  - [x] 1.4 Write property test for normalizeToBrightDate
    - **Property 7: normalizeToBrightDate Consistency** — for any valid BrightDateValue v, `normalizeToBrightDate(v)` returns v exactly; for any valid Date d, `normalizeToBrightDate(d)` equals `normalizeToBrightDate(d.toISOString())` within 1 microday
    - **Validates: Requirements 3.3, 7.4, 10.4**

  - [x] 1.5 Write unit tests for conversion utilities
    - Test known epoch values (J2000.0 = 0, Unix epoch = -10957.5)
    - Test boundary values (very large/small BrightDateValues)
    - Test error cases (NaN, Infinity, invalid strings throw TypeError)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 10.4_

- [x] 2. Comparison utilities and JSON serialization (brightchain-lib)
  - [x] 2.1 Implement comparison utilities
    - Create `src/lib/utils/brightDateComparison.ts`
    - Implement `compareBrightDates(a, b): number` returning `a - b`
    - Implement `isInBrightDateRange(value, start, end): boolean`
    - Export from the package barrel
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 2.2 Write property tests for comparison utilities
    - **Property 4: Ordering Preservation (Metamorphic)** — `Math.sign(compareBrightDates(a, b))` equals `Math.sign(brightDateToDate(a).getTime() - brightDateToDate(b).getTime())`
    - **Validates: Requirements 3.4, 9.1, 9.4**
    - **Property 5: compareBrightDates Antisymmetry** — `compareBrightDates(a, a) === 0` and `Math.sign(compareBrightDates(a, b)) === -Math.sign(compareBrightDates(b, a))`
    - **Validates: Requirements 9.2**
    - **Property 6: isInBrightDateRange Correctness** — for start ≤ end, `isInBrightDateRange(t, start, end)` returns true iff `start <= t && t <= end`
    - **Validates: Requirements 9.3**

  - [x] 2.3 Implement JSON replacer and reviver
    - Create `src/lib/utils/brightDateJson.ts`
    - Define `BRIGHT_DATE_FIELDS` set with all known timestamp field names
    - Implement `brightDateReplacer(key, value)` that wraps known timestamp fields as `{ __bd__: value }`
    - Implement `brightDateReviver(key, value)` that unwraps annotated fields
    - Export from the package barrel
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 2.4 Write property test for JSON serialization round-trip
    - **Property 3: JSON Serialization Round-Trip** — for any valid BrightDateValue v, `JSON.parse(JSON.stringify({ createdAt: v }, brightDateReplacer), brightDateReviver).createdAt === v`
    - **Validates: Requirements 5.5**

- [x] 3. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Block interface and class migrations (brightchain-lib)
  - [x] 4.1 Migrate `IBaseBlockMetadata` interface
    - Change `dateCreated` getter return type from `Date` to `BrightDateTimestamp`
    - Import `BrightDateTimestamp` type
    - _Requirements: 2.1, 2.2, 10.1_

  - [x] 4.2 Migrate `BlockMetadata` class
    - Change `_dateCreated` field type to `BrightDateTimestamp`
    - Update constructor default to `BrightDate.now().value`
    - Update `toJson()` to serialize `dateCreated` as a number
    - Update `fromJson()` to parse `dateCreated` as a number (with fallback via `normalizeToBrightDate` for any legacy string)
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 10.1_

  - [x] 4.3 Migrate `BaseBlock` class
    - Change `_dateCreated` to `BrightDateTimestamp`
    - Use `brightDateNow()` for current timestamp
    - Update future-date validation to use numeric comparison
    - _Requirements: 2.1, 3.1, 3.4_

  - [x] 4.4 Migrate `IBlockMetadata` storage interface
    - Change `createdAt`, `expiresAt`, `lastAccessedAt` to `BrightDateTimestamp`
    - Update `BlockStoreOptions.expiresAt` to `BrightDateTimestamp`
    - Update `createDefaultBlockMetadata` to use `brightDateNow()`
    - _Requirements: 2.1, 2.2, 8.1_

  - [x] 4.5 Migrate block header interfaces
    - Update `ICblHeader.dateCreated`, `ISuperCblHeader.dateCreated`, `ICblBase.dateCreated` to `BrightDateTimestamp`
    - Update `IEphemeralBlock.dateCreated` to `BrightDateTimestamp`
    - Update `IVcbl.vaultCreatedAt`, `vaultModifiedAt` to `BrightDateTimestamp`
    - Update `ICblServices.getDateCreated()` return type
    - Update `IBlockEncryption` method parameter `dateCreated`
    - _Requirements: 2.1, 2.2, 10.1, 10.2_

  - [x] 4.6 Write unit tests for BlockMetadata and BaseBlock with BrightDate
    - Test BlockMetadata JSON serialization round-trip with numeric dateCreated
    - Test BaseBlock future-date validation using BrightDate numeric comparison
    - _Requirements: 2.1, 3.1, 5.1_

- [x] 5. CBL Index migration (brightchain-lib)
  - [x] 5.1 Migrate `ICBLIndexEntry` interface
    - Change `createdAt` to `BrightDateTimestamp`
    - Change `deletedAt` to `BrightDateTimestamp | undefined`
    - _Requirements: 2.1, 2.2, 8.1_

  - [x] 5.2 Write unit tests for CBL index with BrightDate fields
    - Test CRUD operations with BrightDate timestamp values
    - _Requirements: 2.1, 8.1_

- [x] 6. Head registry and BrightDB changes (brightchain-db)
  - [x] 6.1 Migrate `HeadRecord` interface
    - Change `timestamp` from ISO string to `BrightDateTimestamp`
    - _Requirements: 2.1, 8.1_

  - [x] 6.2 Migrate `IHeadRegistry` and `DeferredHeadUpdate`
    - Update `DeferredHeadUpdate.timestamp` to `BrightDateTimestamp`
    - Update `getHeadTimestamp()` return type to `BrightDateTimestamp | undefined`
    - Update `mergeHeadUpdate()` timestamp parameter to `BrightDateTimestamp`
    - _Requirements: 2.1, 8.1, 9.1_

  - [x] 6.3 Update `InMemoryHeadRegistry` LWW merge logic
    - Replace Date/string comparison with direct numeric comparison (`timestamp > localTimestamp`)
    - Use `brightDateNow()` where `new Date()` was used
    - _Requirements: 3.1, 9.1_

  - [x] 6.4 Migrate BrightDB TTL sweep
    - Update `sweepTTL` to compute cutoff as `brightDateNow() - (expireAfterSeconds / 86400)`
    - Compare document timestamp fields as BrightDateValue (with `normalizeToBrightDate` fallback)
    - _Requirements: 8.1, 8.2, 9.3_

  - [x] 6.5 Migrate `ChangeStreamEvent.timestamp` in BrightDB types
    - Change `timestamp` field to `BrightDateTimestamp`
    - _Requirements: 2.1_

  - [x] 6.6 Write unit tests for HeadRegistry LWW merge and TTL sweep
    - Test LWW merge correctly picks higher numeric timestamp
    - Test TTL sweep expires documents based on BrightDate cutoff
    - _Requirements: 8.1, 9.1_

  - [x] 6.7 Migrate `Collection` per-document timestamps to BrightDate (brightchain-db)
    - Change `docTimestamps` and `docTombstones` maps from Unix milliseconds (`Date.now()`) to `BrightDateTimestamp` (`brightDateNow()`)
    - Update `writeDoc()`: replace `this.docTimestamps.set(id, Date.now())` with `brightDateNow()`
    - Update `removeDoc()`: replace `this.docTombstones.set(logicalId, Date.now())` with `brightDateNow()`
    - Update `mergeFromGossipHead()` comparisons — already numeric, but now consistently BrightDate units
    - Update `CollectionMeta` type annotation: `docTimestamps` and `docTombstones` are `Record<string, BrightDateTimestamp>`
    - _Requirements: 3.1, 8.1, 9.1_

  - [x] 6.8 Add injectable clock to `Collection` / `BrightDb` (brightchain-db)
    - Add `nowBd?: () => BrightDateTimestamp` option to `CollectionOptions` (defaults to `brightDateNow`)
    - Thread it through `writeDoc()`, `removeDoc()`, and `sweepTTL()` so tests can control time
    - Add `nowBd` to `BrightDb` options and forward to all `Collection` instances it creates
    - Write unit tests verifying that a custom `nowBd` clock is used for write timestamps and TTL cutoff
    - _Requirements: 3.1, 8.1_

  - [x] 6.9 Migrate `CursorSession.lastAccessed` to `BrightDateTimestamp` (brightchain-db)
    - Change `lastAccessed: number` (Unix ms) to `lastAccessed: BrightDateTimestamp` in `CursorSession`
    - Update any cursor sweep/expiry logic that compares `lastAccessed` to use BrightDate arithmetic
    - _Requirements: 2.1, 8.1_

  - [x] 6.10 Wire `CryptoSessionStore` to use BrightDate clock (brightchain-api-lib)
    - Where `CryptoSessionStore` is instantiated in brightchain-api-lib, pass `nowMs: () => toUnixMs(brightDateNow())` so the session store's internal millisecond clock is driven by BrightDate
    - Import `toUnixMs` from `@brightchain/brightdate` and `brightDateNow` from `@brightchain/brightchain-lib`
    - Note: `CryptoSessionStore` works internally in ms (sliding/absolute TTLs are ms-based) — `toUnixMs` is the correct bridge, not a unit change
    - _Requirements: 3.1_

- [x] 7. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Ledger serialization changes (brightchain-lib)
  - [x] 8.1 Migrate `ILedgerEntry` interface
    - Change `timestamp` from `Date` to `BrightDateTimestamp`
    - _Requirements: 2.1, 3.1_

  - [x] 8.2 Update `LedgerEntrySerializer` binary format
    - Change `serializeForHashing()` to use `view.setFloat64(offset, entry.timestamp, false)` instead of `setBigUint64`
    - Change `deserialize()` to use `view.getFloat64(offset, false)` instead of `getBigUint64`
    - Timestamp slot remains 8 bytes, reinterpreted as float64 BrightDateValue
    - _Requirements: 5.1, 5.2, 3.2_

  - [x] 8.3 Write property test for ledger serialization round-trip
    - **Property 8: Ledger Serialization Round-Trip** — for any valid ILedgerEntry with BrightDateValue timestamp, `deserialize(serialize(entry)).timestamp` equals the original exactly
    - **Validates: Requirements 5.1, 5.2**

  - [x] 8.4 Write unit tests for ledger serialization
    - Test serialize/deserialize with known BrightDateValue timestamps
    - Test error handling for corrupted float64 data
    - _Requirements: 5.1, 5.2_

- [x] 9. User/Member/Messaging interface migrations (brightchain-lib)
  - [x] 9.1 Migrate Member interfaces
    - Update `IMemberPublicProfile`: `lastActive`, `dateCreated`, `dateUpdated` → `BrightDateTimestamp`
    - Update `IMemberPrivateProfile`: `dateCreated`, `dateUpdated`, `activityLog[].timestamp` → `BrightDateTimestamp`
    - Update `IMemberData`: `dateCreated`, `dateUpdated`, `lastSeen`, `activityLog[].timestamp` → `BrightDateTimestamp`
    - Update `IMemberVerification.dateVerified` → `BrightDateTimestamp`
    - Update `IMemberNetworkStatus.lastUpdate` → `BrightDateTimestamp`
    - Update `IHydratedMember`, `IMemberOperational`: `dateCreated`, `dateUpdated` → `BrightDateTimestamp`
    - Update `IMemberDTO<D>` generic default to `BrightDateTimestamp`
    - _Requirements: 2.1, 2.2, 10.1, 10.2_

  - [x] 9.2 Migrate Messaging and Email interfaces
    - Update `IDeliveryReceipt`: `queuedAt`, `sentAt`, `deliveredAt`, `readAt`, `failedAt` → `BrightDateTimestamp`
    - Update `IEmailMetadata`: `date`, `resentDate`, `readReceipts` values → `BrightDateTimestamp`
    - Update `IEmailGatewayQueueEntry`: `nextAttemptAt`, `enqueuedAt`, `lastAttemptAt` → `BrightDateTimestamp`
    - Update `IEmailGatewayBounce.timestamp` → `BrightDateTimestamp`
    - Update `IEmailGatewayInboundMessage.receivedAt` → `BrightDateTimestamp`
    - Update `IContentDisposition`: `creationDate`, `modificationDate`, `readDate` → `BrightDateTimestamp`
    - Update `MessageQueryOptions`: `startDate`, `endDate` → `BrightDateTimestamp`
    - Update `IMessageMetadataStore.markAsRead()` timestamp parameter → `BrightDateTimestamp`
    - _Requirements: 2.1, 2.2, 10.1, 10.2_

  - [x] 9.3 Migrate Alias, Key, and Certificate interfaces
    - Update `IAliasRecord`: `registeredAt`, `deactivatedAt` → `BrightDateTimestamp`
    - Update `IGpgKey`: `createdAt`, `expiresAt` → `BrightDateTimestamp`
    - Update `IKeyStoreEntry`: `createdAt`, `updatedAt` → `BrightDateTimestamp`
    - Update `ISmimeCertificate`: `validFrom`, `validTo` → `BrightDateTimestamp`
    - Update `IKeyringEntry`: `created`, `lastAccessed` → `BrightDateTimestamp`
    - _Requirements: 2.1, 2.2, 10.1, 10.2_

  - [x] 9.4 Migrate Service and Infrastructure interfaces
    - Update `IBrightTrustService` interfaces: `createdAt`, `updatedAt` → `BrightDateTimestamp`
    - Update `IOperatorPrompt.expiresAt` → `BrightDateTimestamp`
    - Update `IBrightTrustDataRecordActionLog.dateCreated` → `BrightDateTimestamp`
    - Update `IBrightTrustMetrics.expiration.last_run` → `BrightDateTimestamp`
    - Update `IReconciliationService` interfaces: `lastSyncTimestamp`, `timestamp`, `generatedAt` → `BrightDateTimestamp`
    - Update `ILocationRecord`: `lastSeen`, `locationUpdatedAt` → `BrightDateTimestamp`
    - Update `IBasicDataObjectDTO.dateCreated` → `BrightDateTimestamp`
    - Update `IBaseFriendRequest.createdAt` → `BrightDateTimestamp`
    - Update `IServer.createdAt` → `BrightDateTimestamp`
    - _Requirements: 2.1, 2.2, 10.1, 10.2_

  - [x] 9.5 Migrate `IBrightChainInitResult` type parameters
    - Change `IRoleBase<TID, Date>` and `IUserBase<TID, Date>` type parameters to use `BrightDateTimestamp`
    - _Requirements: 2.1, 10.1_

  - [x] 9.6 Update all implementations referencing migrated interfaces
    - Replace `new Date()` with `brightDateNow()` in all services that create timestamps
    - Replace Date comparisons with numeric comparisons on BrightDateValue
    - Use `normalizeToBrightDate()` at any boundary where external Date/string input arrives
    - _Requirements: 3.1, 3.2, 3.3, 10.3_

- [x] 10. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. API DTO pattern (brightchain-api-lib)
  - [x] 11.1 Create generic `IBaseResponse<TTimestamp>` interface
    - Define `IBaseResponse<TTimestamp = BrightDateTimestamp>` with `createdAt` and `updatedAt`
    - Define `IEnrichedTimestampResponse` with both BrightDate and ISO fields
    - Export from the package barrel
    - _Requirements: 7.1, 7.3_

  - [x] 11.2 Migrate `IRequestUser` and event interfaces
    - Update `IRequestUser` generic `D` parameter default to `BrightDateTimestamp`
    - Update event interfaces: `IPresenceChangeEvent.timestamp`, `IMessageEvent.timestamp`, `IBlockAvailabilityEvent.timestamp`, `IBlockReplicatedEvent.timestamp`, `IPartitionEnteredEvent.timestamp`, `IPartitionExitedEvent.timestamp` → `BrightDateTimestamp`
    - Update `IPresenceViewer`: `joinedAt`, `lastSeen` → `BrightDateTimestamp`
    - Update `VaultIndexEntry`: `createdAt`, `updatedAt` → `BrightDateTimestamp`
    - _Requirements: 2.1, 7.1, 10.1_

  - [x] 11.3 Implement request normalization middleware
    - Add utility/middleware that calls `normalizeToBrightDate()` on incoming request timestamp fields
    - Ensure API converts Traditional_Date inputs to BrightDateValue before processing
    - _Requirements: 7.4_

  - [x] 11.4 Write unit tests for API DTO pattern
    - Test `IEnrichedTimestampResponse` derivation (BrightDate → ISO)
    - Test request normalization converts Date/string inputs to BrightDateValue
    - _Requirements: 7.1, 7.2, 7.4_

- [x] 12. Frontend display hook (brightchain-react)
  - [x] 12.1 Implement `useBrightDateDisplay` hook
    - Create `src/hooks/useBrightDateDisplay.ts`
    - Accept `BrightDateValue`, optional `locale`, optional `Intl.DateTimeFormatOptions`
    - Return `{ brightDateString, localeString, date }` memoized with `useMemo`
    - Use `BrightDate.fromValue(value).toString()` for BrightDate string
    - Use `brightDateToDate(value).toLocaleDateString(locale, options)` for locale string
    - Export from the package barrel
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 12.2 Write unit tests for `useBrightDateDisplay` hook
    - Test that BrightDate string representation is returned as primary format
    - Test locale string derivation from BrightDateValue
    - Test memoization behavior (same input → same reference)
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 13. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Update the BrightChain whitepaper to include BrightDate
  ```
  High-Velocity Sovereignty via BrightDate: We replace vulnerable, politically-managed UTC with a sub-microsecond monotonic system based on the J2000.0 astronomical epoch. This does more than secure an audit trail; it provides a massive performance boost to BrightDB. By eliminating the "clock skew" and synchronization lag inherent in traditional distributed systems, BrightDate enables near-instantaneous event ordering and high-velocity indexing across the entire network, regardless of a node's hardware.
  ```
  - docs/papers/BrightChain.md

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation between major phases
- Property tests validate universal correctness properties from the design document (8 properties total)
- Unit tests validate specific examples and edge cases
- The datastore can be wiped — no backward-compatible migration path is needed
- All interfaces are updated in-place with no legacy overloads
- `fast-check` is already available in the project for property-based testing
