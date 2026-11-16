# Requirements — BrightDB v2.5 Operations and Conformance

## Introduction

BrightDB v2.5 is an API and conformance milestone for the v2 engine
(`brightchain-db/src/lib/v2`). It adds familiar MongoDB-style operations
(filter-based writes, atomic find-and-modify, bulk writes, local
transactions, index planning, read-only aggregation, import/export,
backup/restore) and proves their behavior across every supported deployment
with a shared, versioned operation corpus.

TypeScript is the reference implementation and owns this spec and the shared
fixtures. The C++ port implements the same documented behavior for each
capability it advertises. Browser builds exercise the TypeScript public API
on their real storage backend (IndexedDB).

Source document: `docs/architecture/brightdb-v2-5.md`. Format contract:
`docs/architecture/brightdb-storage-format-v2.md`.

### Out of scope

- MongoDB drivers, the MongoDB wire protocol, Mongoose integration, Compass.
- Full BSON value semantics, typed BSON indexes, documents larger than the
  v2 size limit (separate format proposal).
- Cross-replica transactions or quorum guarantees.
- TTL indexes and durable change feeds (tracked as follow-on, Requirement 26).

## Glossary

- **Core**: `PortableBrightDbCore` and `PortableBrightDb` in `portable-core.ts` / `portable-database.ts`.
- **Root**: Digest of the current database state. Equal roots mean equal data.
- **Snapshot**: Read-only view pinned to one root (`PortableSnapshot`).
- **Writer lock**: `withWriteLock` on the v2 storage; one local writer at a time.
- **Batch**: `writeBatch` unit publishing all its changes as one commit.
- **Operation corpus**: Versioned manifest of conformance cases (Requirement 16).
- **Capability**: A named, advertised feature (e.g. `query.elemMatch`, `index.unique`, `tx.local`).
- **Adapter**: Runtime binding that executes corpus cases (Node, browser, C++, service).
- **Model**: Small independent in-memory reference implementation used as a test oracle.
- **Profile**: A deployment/topology configuration (embedded, browser, HTTP replicas, pools, cloud).
- **Unknown outcome**: Commit result when publication cannot be determined.
- **Replica winner**: The per-document record that wins a merge.

---

## Part A — Operation Contract

### Requirement 1 — Strict Query Validation

**User Story:** As an application developer, I need invalid queries to fail
predictably before anything runs so that a malformed predicate never causes
a partial or surprising write.

**Acceptance Criteria:**

- 1.1 The system SHALL validate complete filters, projections, sorts, updates, and pipelines before execution, including against an empty or missing collection.
- 1.2 Unknown operators and malformed operands SHALL produce a stable, typed error with a machine-readable category and the offending path/operator.
- 1.3 No write SHALL begin when validation fails, regardless of whether the invalid predicate would have matched any document.
- 1.4 The system SHALL reuse shared evaluators (matcher, update engine) only after corpus cases cover their behavior.
- 1.5 Error categories SHALL be enumerated in one registry and be identical across TypeScript, browser, and C++ adapters.

### Requirement 2 — Field Traversal and Comparison Semantics

**User Story:** As an application developer, I need one documented set of
field and comparison rules so scans, indexes, sorts, and updates agree.

**Acceptance Criteria:**

- 2.1 The system SHALL define and test field traversal through nested objects and arrays, including numeric path segments.
- 2.2 The system SHALL define and test scalar and document `$elemMatch`.
- 2.3 The system SHALL distinguish a missing field from an explicit `null`.
- 2.4 The system SHALL define regex matching with options, and type-bracketed range predicates (a range over numbers does not match strings).
- 2.5 Default string comparison SHALL be binary (UTF-8 byte order).
- 2.6 Scans, indexes, sorts, and updates SHALL share the same field and comparison functions.
- 2.7 The system SHALL preserve canonical JSON object semantics and SHALL record every deliberate difference from BSON/MongoDB behavior in a published differences list.
- 2.8 Projections (inclusion, exclusion, nested paths) SHALL be defined and covered by corpus cases.

### Requirement 3 — Reads and Cursors

**User Story:** As an application developer, I need predictable read APIs
with defined ordering and resource behavior.

**Acceptance Criteria:**

- 3.1 The system SHALL support `find`, `findOne`, `findById`, `countDocuments`, and `distinct` on v2 collections.
- 3.2 `distinct` SHALL return array elements individually and SHALL exclude documents where the field is missing.
- 3.3 A cursor SHALL pin a single root for its lifetime and SHALL stream results when the plan permits.
- 3.4 A cursor SHALL release its resources on exhaustion and on explicit close.
- 3.5 Default result order SHALL be documented as unspecified.
- 3.6 When an operation must choose one match, it SHALL use the requested sort with `_id` as the final tie-breaker, or UTF-8 `_id` order when no sort is supplied.
- 3.7 Reads SHALL not observe a partially published commit.

### Requirement 4 — Filter-Based Writes

**User Story:** As an application developer, I need `updateOne/Many`,
`replaceOne`, and `deleteOne/Many` so I do not hand-roll read-modify-write.

**Acceptance Criteria:**

- 4.1 The system SHALL provide `updateOne`, `updateMany`, `replaceOne`, `deleteOne`, `deleteMany`.
- 4.2 The system SHALL support the declared update operators (at minimum `$set`, `$unset`, `$inc`, `$mul`, `$min`, `$max`, `$rename`, `$push`, `$pull`, `$addToSet`, `$pop`, `$setOnInsert`, `$currentDate`), each with corpus cases.
- 4.3 Upsert SHALL insert a document derived from the filter's equality fields plus the update, applying `$setOnInsert` only on insert.
- 4.4 Duplicate `_id` and any attempt to change `_id` SHALL fail with a typed error and leave state unchanged.
- 4.5 Results SHALL report accurate `matchedCount`, `modifiedCount`, `deletedCount`, and `upsertedId`. A no-op update SHALL count as matched but not modified.
- 4.6 The system SHALL apply the predicate and stage the mutation under the same local writer lock.
- 4.7 Array modifiers and positional `arrayFilters` SHALL be accepted only after their match rules are specified and covered by corpus cases.
- 4.8 Each filter-based write SHALL publish exactly one commit.

### Requirement 5 — Atomic Find-and-Modify

**User Story:** As an application developer, I need atomic
`findOneAndUpdate/Replace/Delete` for counters, queues, and claims.

**Acceptance Criteria:**

- 5.1 The system SHALL provide `findOneAndUpdate`, `findOneAndReplace`, `findOneAndDelete`.
- 5.2 Selection and mutation SHALL occur under one writer lock with no interleaving local writer.
- 5.3 The caller SHALL be able to request the document before or after modification, with a projection.
- 5.4 Sort and `_id` tie-breaking SHALL follow Requirement 3.6.
- 5.5 Upsert behavior SHALL match Requirement 4.3.

### Requirement 6 — Bulk Writes

**User Story:** As an application developer, I need `bulkWrite` with
well-defined partial-failure behavior, distinct from the atomic `writeBatch`.

**Acceptance Criteria:**

- 6.1 `writeBatch` SHALL remain fully atomic; its behavior SHALL not change.
- 6.2 `insertMany` SHALL preserve its existing atomic contract.
- 6.3 Ordered `bulkWrite` SHALL stop at the first item-level error and SHALL keep preceding successes.
- 6.4 Unordered `bulkWrite` SHALL attempt all remaining items and SHALL report indexed outcomes per item.
- 6.5 Each item SHALL be staged as a unit; a failed item SHALL leave no document or index changes.
- 6.6 Storage failures SHALL be reported as commit failures. When publication cannot be determined the result SHALL be an explicit unknown-outcome error.
- 6.7 The result SHALL include per-item status, aggregate counts, and upserted IDs.

### Requirement 7 — Local Transactions

**User Story:** As an application developer, I need a local
`transaction(callback)` with read-your-writes and a single publication.

**Acceptance Criteria:**

- 7.1 `transaction(callback)` SHALL pin one root and expose a transaction handle with the same read/write API surface as the database.
- 7.2 Reads inside the transaction SHALL observe the transaction's own earlier writes (read-your-writes).
- 7.3 On success, all changes across all collections SHALL publish as one database-head update.
- 7.4 The initial implementation SHALL hold the writer lock for the callback's duration.
- 7.5 Operations SHALL run through the transaction handle in a defined order.
- 7.6 Nested transactions SHALL be rejected with a typed error.
- 7.7 The handle SHALL be invalidated when the callback ends; later use SHALL fail with a typed error.
- 7.8 A failed transaction operation SHALL abort the transaction even if the callback catches the error.
- 7.9 Conflicts and unknown commit outcomes SHALL be surfaced explicitly. The system SHALL NOT retry the callback; retries are caller-controlled.
- 7.10 An aborted transaction SHALL leave root, indexes, and attachments unchanged.

### Requirement 8 — Atomicity and Uniqueness on Replicas

**User Story:** As an operator, I need honest guarantees about what local
atomicity means once replicas merge.

**Acceptance Criteria:**

- 8.1 Atomicity and uniqueness SHALL be tested within the supported single-writer domain.
- 8.2 Documentation SHALL state that replicas merge winning records per document, that a merge may retain some effects of a concurrent remote batch, and that local commit atomicity gives no cross-replica transaction or quorum guarantee.
- 8.3 Before unique indexes are exposed on mergeable replicas, the system SHALL specify and test the outcome of concurrent writes that violate uniqueness.
- 8.4 Unique indexes SHALL ship only in modes with a defined and tested contract; other modes SHALL reject unique index creation with a typed error.

### Requirement 9 — Index Planner and Explain

**User Story:** As an application developer, I need queries to use indexes
safely, and a way to see why.

**Acceptance Criteria:**

- 9.1 The planner SHALL support `_id` lookup, leading compound-index equalities, one following range, and compatible sort order.
- 9.2 Residual predicates and multikey deduplication SHALL be applied before `limit`.
- 9.3 The planner SHALL fall back to a scan whenever index order or array/missing-value behavior cannot preserve the scan's result.
- 9.4 `explain` SHALL report plan kind, chosen index, keys examined, documents examined, and block reads.
- 9.5 For every indexed corpus case, a forced-scan execution SHALL return the same result set (and the same order when a sort is requested).
- 9.6 The planner SHALL be conservative: any unsupported predicate shape SHALL choose scan rather than a risky index plan.

### Requirement 10 — Index Options

**User Story:** As an application developer, I need unique, sparse, and
partial indexes with clearly defined behavior.

**Acceptance Criteria:**

- 10.1 The system SHALL define unique, sparse, and partial index semantics, and supported sort directions.
- 10.2 Index builds on populated collections, index maintenance during insert/replace/delete/merge, reopen, and failed writes SHALL each be covered by corpus cases.
- 10.3 Any persisted index option SHALL require a format-extension decision, defined old-reader behavior, and TypeScript/C++ fixtures before it ships (Requirement 26).
- 10.4 TTL indexes SHALL NOT ship in v2.5.
- 10.5 Failed index builds SHALL leave the previous published root intact.

### Requirement 11 — Read-Only Aggregation

**User Story:** As an application developer, I need common aggregation
stages over a consistent snapshot.

**Acceptance Criteria:**

- 11.1 The system SHALL support `$match`, `$sort`, `$skip`, `$limit`, `$project`, `$group`, `$count`, `$unwind`, and equality `$lookup`.
- 11.2 One snapshot SHALL serve the input and every foreign collection in a pipeline.
- 11.3 Missing values, empty inputs, and expression validation SHALL be defined.
- 11.4 Blocking stages (`$sort`, `$group`) SHALL enforce a configurable memory bound and fail with a typed error when exceeded.
- 11.5 Pipelines SHALL be fully validated before execution (Requirement 1).
- 11.6 Additional stages SHALL be added only with a contract and corpus fixtures.

### Requirement 12 — Import and Export

**User Story:** As an operator, I need to move data in and out without
loading whole collections into memory.

**Acceptance Criteria:**

- 12.1 The system SHALL provide streamed JSON/NDJSON import and export.
- 12.2 The system SHALL provide Extended JSON import and export.
- 12.3 Every import/export SHALL produce a report listing unsupported or lossy conversions.
- 12.4 Documentation SHALL describe how string IDs and the v2 document size limit affect imports; oversize documents SHALL be reported, not truncated.
- 12.5 Imports SHALL be bounded in memory and SHALL publish in defined chunks with a documented atomicity mode (all-or-nothing option, and chunked option).

### Requirement 13 — Backup and Restore

**User Story:** As an operator, I need verified backup and restore from a
retained root.

**Acceptance Criteria:**

- 13.1 Backup SHALL operate from an explicitly retained root so garbage collection cannot remove it mid-backup.
- 13.2 A backup SHALL include documents, index definitions, and attachments.
- 13.3 Restore SHALL verify the restored graph (all reachable blocks present, digests valid, root matches).
- 13.4 Encrypted backups, key handling, and retention through garbage collection SHALL be covered by corpus cases.
- 13.5 Backup and restore SHALL report progress and actionable errors, and SHALL redact key material.
- 13.6 An interrupted backup or restore SHALL leave the source untouched and SHALL be resumable or cleanly restartable.

### Requirement 14 — Change Notification

**User Story:** As an application developer, I need to know what the
current `subscribe` does and does not promise.

**Acceptance Criteria:**

- 14.1 `subscribe` SHALL remain a root-diff notification API and MAY coalesce commits; this SHALL be documented.
- 14.2 A durable change feed (retained history, resume positions, ordering, expired-position error) SHALL be specified before any per-commit replay is promised. It is deferred (Requirement 26).

### Requirement 15 — Service Deployment

**User Story:** As an operator, I need BrightDB-native service operations
with authentication, authorization, health, and metrics.

**Acceptance Criteria:**

- 15.1 The service SHALL expose BrightDB-native operations over its own API (not the MongoDB wire protocol).
- 15.2 The service SHALL authenticate callers and authorize each operation per pool.
- 15.3 The service SHALL expose health and metrics endpoints.
- 15.4 Denied operations and pool isolation SHALL be exercised through the deployed entry point.
- 15.5 The existing block-source HTTP SHALL be documented as a replica transport whose bearer token covers access to that source only.
- 15.6 Responses to denied requests SHALL expose no data from another pool.

---

## Part B — Conformance

### Requirement 16 — Shared Operation Corpus

**User Story:** As a maintainer, I need one versioned manifest of cases so
every runtime is tested against the same expectations.

**Acceptance Criteria:**

- 16.1 One versioned manifest SHALL live in the TypeScript repository and inventory public operations by family, with the supported operator, option, and error surface.
- 16.2 Each case SHALL have a stable ID, capability requirements, initial state, ordered steps or a seeded schedule, expected return values, expected error category, and expected visible state.
- 16.3 Format-fixture cases MAY include an expected root or bytes, with fixed IDs and counters.
- 16.4 Each case SHALL declare ordering expectations, supported runtimes, and topologies.
- 16.5 An inventory test SHALL fail when an advertised capability has no positive, boundary, or error case.
- 16.6 An inventory test SHALL fail when a required case never ran in a required lane.
- 16.7 Byte-format vectors SHALL be kept distinct from the operation corpus.

### Requirement 17 — Sources of Expectation

**User Story:** As a maintainer, I need independent oracles so a shared bug
cannot validate itself.

**Acceptance Criteria:**

- 17.1 The system SHALL include reviewed examples and an independent in-memory model covering batch publication, retained snapshots, tombstones, replica winners, and invariants.
- 17.2 The model SHALL NOT import the production matcher, update engine, index encoder, or merge implementation.
- 17.3 Generated cases SHALL be compared against the model and SHALL shrink failures to a replayable trace.
- 17.4 Checked-in expected results from a pinned MongoDB reference version SHALL cover the declared compatible subset; they SHALL be generated by a separate job or explicit maintainer command using test tooling only.
- 17.5 Reference expectations SHALL record the MongoDB version and comparison settings, SHALL normalize IDs, clocks, and unordered outputs, and SHALL be reviewed before landing.
- 17.6 BrightDB-specific behavior SHALL use its own expected results, not Mongo output.
- 17.7 Golden block bytes and roots SHALL come from the v2 format contract and cross-runtime read/write fixtures. Exact-digest checks SHALL apply only when database ID, writer ID, versions, and input order are controlled; other scenarios SHALL compare semantic state, using root equality only for converged replicas of the same database.
- 17.8 MongoDB SHALL NOT be a runtime dependency of any shipped package.

### Requirement 18 — Runtime Adapters

**User Story:** As a maintainer, I need each runtime to run the same cases
without hidden emulation.

**Acceptance Criteria:**

- 18.1 Adapters SHALL exist for the production Node API, browser API, C++ API, and each claimed service path.
- 18.2 Adapters SHALL normalize representation only (stable error categories, unordered result sets).
- 18.3 Adapters SHALL surface unsupported operations explicitly as `unsupported` and SHALL NOT emulate a missing feature.
- 18.4 A case requiring a capability the adapter does not advertise SHALL be reported as skipped-by-capability, never as passed.
- 18.5 The existing fixture generator, process handoff harness, and merge/block-source/pool tests SHALL be reused.

### Requirement 19 — Operation Family Coverage

**User Story:** As a maintainer, I need minimum required cases per family.

**Acceptance Criteria:**

- 19.1 **Lifecycle and storage:** create, open, close, reopen, incompatible-format errors; empty and populated databases; clean process handoff; concurrent initialization; writer contention; missing or damaged blocks.
- 19.2 **Documents and reads:** every read and write method; generated and explicit IDs; duplicate and missing keys; no-ops; validation; Unicode; missing vs null; mixed types; nested arrays; projections; limit and sort ties; size boundaries.
- 19.3 **Bulk and transaction:** failure before the first item, halfway, and at commit; ordered and unordered partial results; atomic batch rollback; read-your-writes; one root across collections; read visibility under contention; restart after acknowledgement.
- 19.4 **Index and aggregation:** empty, single-field, compound, and multikey; create/drop/maintain through insert, replace, delete, merge; indexed vs forced scan; invalid pipeline; empty aggregation; snapshot-consistent lookup.
- 19.5 **History and files:** snapshot, diff, subscribe/unsubscribe, attachment streaming, retention, GC, packed storage and compaction, key rotation and re-sealing, backup, restore; retained and unretained roots; concurrent readers; missing descendants. Run only for declared storage capabilities.
- 19.6 **Replication and access:** join, clone, fork, merge, independent concurrent writers, stale heads, duplicate messages, tombstones, drop/recreate, divergent index definitions, attachments, incremental fetches, wrong database, wrong credentials, pool isolation.

### Requirement 20 — Topology Profiles

**User Story:** As a maintainer, I need every operation baseline run on each
applicable deployment profile.

**Acceptance Criteria:**

- 20.1 **Embedded reference:** TypeScript in-memory and real loose disk, plus separate writers sharing one directory, packed disk, encrypted disk, and a packed-plus-encrypted reopen/recovery case, asserting identical logical results and applicable durability and key guarantees.
- 20.2 **Browser:** real browser with IndexedDB; separate tabs, lock contention, reload, interruption of an active writer, encrypted storage, HTTP catch-up. An in-memory browser profile MAY serve fast semantic checks. A second browser engine SHALL run in scheduled runs where supported.
- 20.3 **C++ interoperability:** build the port from an explicit revision; run the shared supported corpus; write in one runtime and reopen/mutate in the other, then reverse; exercise loose, packed, and encrypted profiles where advertised, including an interrupted writer; run mixed TypeScript/C++ HTTP replication against real processes.
- 20.4 **HTTP replicas:** three separate processes with independent writer IDs and stores; fully connected and A–B–C forwarding topologies; a 2+1 partition with writes on both sides; a new or restarted node; heal and bidirectional pulls; assert eventual equal roots and equivalent queries, index contents, and attachment digests.
- 20.5 **BrightChain pools:** three independently configured node processes with separate persistent pools and head registries; production v2 storage and sync integration; restart, rejoin, pool scoping, encrypted pools. A runnable v2 service path SHALL exist first. Explicit pull SHALL be used where that is the deployed contract. Any production gossip mode SHALL have its own end-to-end lane before being advertised.
- 20.6 **Cloud storage:** object-store-backed pool profiles the project advertises, using local emulators in scheduled runs and an opt-in real-service verification before claiming provider compatibility; throttling, transient fetch failures, missing objects, credential expiry.
- 20.7 Required profiles and excluded combinations SHALL be declared up front. Profiles SHALL be crossed with applicable failure modes; high-consequence combinations SHALL have explicit scenarios; the remainder SHALL use pairwise selection and the executed case list SHALL be published.

### Requirement 21 — Fault Injection

**User Story:** As a maintainer, I need faults injected at named phases with
both success and failure assertions.

**Acceptance Criteria:**

- 21.1 **Publication:** the harness SHALL interrupt before block durability, after staging, immediately before head replacement, and after publication before acknowledgement. After reopen the state SHALL be the complete old or complete new root with no partial multi-collection state. Acknowledged commits SHALL survive the documented restart conditions. Disk-full and permission errors SHALL be covered and unknown outcomes SHALL be observable.
- 21.2 **Transport:** the harness SHALL delay, drop, duplicate, or reorder announcements and pull responses; withhold or corrupt a document, index page, attachment chunk, or root. The previous root SHALL stay readable and incomplete state SHALL stay unpublished. After connectivity is restored, retry SHALL be idempotent and convergence bounded. A stale peer plus concurrent delete SHALL keep deleted data deleted per version rules.
- 21.3 **Security and maintenance:** wrong credentials or keys, key rotation, a denied pool, interrupted backup/restore and pack compaction, and garbage collection during reads or sync SHALL be covered. Data reachable from protected roots SHALL remain available. Rejected operations SHALL expose no data from another pool. Only capabilities the chosen adapter enforces SHALL be asserted.
- 21.4 Fault injection SHALL be deterministic given a seed and a named phase.

### Requirement 22 — Required Cluster Trace

**User Story:** As a maintainer, I need one end-to-end scenario that
exercises the hardest interactions.

**Acceptance Criteria:**

- 22.1 The trace SHALL start with three synchronized replicas holding an indexed collection and an attachment.
- 22.2 While partitioned, one side SHALL perform an upsert and a multi-collection batch; the other SHALL delete a shared document, edit a disjoint record, and drop and recreate another collection.
- 22.3 A writer SHALL be restarted and one referenced block SHALL be withheld during the first pull; the published state SHALL remain readable.
- 22.4 After releasing the block and merging in both directions, the system SHALL verify per-record winners, collection generation, indexed and scan results, attachment bytes, and identical final roots.
- 22.5 Replaying all pulls SHALL leave the head unchanged.

### Requirement 23 — Pull Request Gates

**User Story:** As a maintainer, I need fast, deterministic CI on every PR.

**Acceptance Criteria:**

- 23.1 PR runs through Nx SHALL execute the checked-in semantic corpus, the coverage inventory, deterministic generated seeds, targeted fault injection, and real disk and browser smoke profiles.
- 23.2 A separate-process HTTP smoke scenario SHALL run on PRs.
- 23.3 A required C++ lane SHALL run for changes to shared bytes or advertised cross-language behavior.
- 23.4 Missing tools or zero executed cases SHALL fail a required lane.
- 23.5 v1 regression tests SHALL run when shared code changes.

### Requirement 24 — Scheduled and Release Gates

**User Story:** As a maintainer, I need heavier runs on a schedule and a
strict release gate.

**Acceptance Criteria:**

- 24.1 Scheduled runs SHALL include the three-node partition/restart matrix, browser expansion, mixed-runtime handoff, encryption and packing combinations, live reference comparisons, larger generated workloads, and cloud emulator cases.
- 24.2 Known failure schedules SHALL be repeated as fixed regressions.
- 24.3 Performance runs SHALL be separate from noisy PR timing checks.
- 24.4 Release testing SHALL use packaged public entry points from a clean install with real standalone and clustered configurations.
- 24.5 Every advertised profile SHALL pass its gate, including backup/restore, crash/reopen, and bidirectional handoff where claimed.
- 24.6 At 1k, 10k, and 100k documents the release run SHALL record scan and index work, point-lookup block reads, write bytes, query and commit p95, and convergence time.
- 24.7 Fast-path regression checks SHALL use deterministic work counters; latency SHALL be published with environment and workload.
- 24.8 TypeScript release claims and C++ parity claims SHALL follow their respective gates independently.

### Requirement 25 — Determinism, Diagnostics, and Replay

**User Story:** As a maintainer, I need failures to be reproducible from
their artifacts.

**Acceptance Criteria:**

- 25.1 Tests SHALL use explicit readiness and phase barriers and bounded waits with diagnostics; no unbounded sleeps.
- 25.2 Workload and fault schedules SHALL be seeded.
- 25.3 On failure the system SHALL persist case ID, seed and shrink path, repository revisions or image digests, topology, backend and flags, operation and fault trace, and each node's root and error.
- 25.4 One Nx replay target SHALL consume a failure artifact and re-run it.
- 25.5 Secrets and key material SHALL be redacted from all diagnostics.

### Requirement 26 — Format-Extension Governance and Deferred Work

**User Story:** As a maintainer, I need persisted changes gated so old
readers and the C++ port are never silently broken.

**Acceptance Criteria:**

- 26.1 Core query and CRUD work SHALL use current v2 document and page encodings with no format change.
- 26.2 Any persisted addition (index options, retained commit history) SHALL require a written format-extension decision, defined old-reader behavior, and TypeScript/C++ fixtures before shipping.
- 26.3 v1 SHALL remain operational during v2.5 development.
- 26.4 The following SHALL be tracked as follow-on and SHALL NOT ship in v2.5 unless 26.2 is satisfied: durable change feed with resume tokens, TTL indexes, additional document types, new index semantics.
