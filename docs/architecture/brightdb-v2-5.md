---
title: "BrightDB v2.5 Operations and Conformance"
parent: "Architecture & Design"
nav_order: 15
permalink: /docs/architecture/brightdb-v2-5/
---

# BrightDB v2.5 Operations and Conformance

**Status:** Proposed. TypeScript is the reference implementation and owns this specification and the shared fixtures. The C++ port implements the same documented behavior for each capability it advertises. Browser builds exercise the TypeScript public API on their actual storage backend.

## 1. Release scope

v2.5 is a BrightDB API and conformance milestone. It brings familiar MongoDB-style operations to the v2 engine and verifies their behavior in each supported deployment. Applications use BrightDB's own APIs. MongoDB drivers, the MongoDB wire protocol, Mongoose integration, and Compass connectivity are outside the project scope. Selected MongoDB behavior may serve as a reference for query semantics. BrightDB's format, transaction, and replica contracts are specified here and in the [v2 storage format](./brightdb-storage-format-v2.md).

The core query and CRUD work uses the current v2 document and page encodings. Persisted additions such as index options or retained commit history require an explicit format-extension decision, old-reader behavior, and TypeScript/C++ fixtures before they ship. Keep v1 operational while v2.5 develops. Run legacy regressions when shared code changes.

## 2. Operation contract

### Query validation and reads

- Validate complete filters, projections, sorts, updates, and pipelines before execution, even against an empty or missing collection. Unknown operators and malformed operands return stable, typed errors. No write may begin because an invalid predicate happened to match. Reuse common evaluators once the tests cover their behavior.
- Define and test field traversal through objects and arrays, scalar and document `$elemMatch`, missing versus explicit `null`, regex and options, type-bracketed range predicates, projections, and default binary string comparison. Use the same field and comparison rules for scans, indexes, sorts, and updates. Preserve canonical JSON object semantics and record any deliberate differences from BSON behavior.
- Support `find`, `findOne`, `findById`, `countDocuments`, and `distinct`. `distinct` returns array elements individually and excludes missing fields. Cursor iteration pins a single root, streams when the plan permits, and releases resources on exhaustion or close. Document default order as unspecified. When an operation must pick one match, use the requested sort with `_id` as the final tie-breaker, or UTF-8 `_id` order when no sort is supplied.

### Writes and transactions

- Add filter-based `updateOne`, `updateMany`, `replaceOne`, `deleteOne`, `deleteMany`, and atomic `findOneAndUpdate`, `findOneAndReplace`, and `findOneAndDelete`. Cover update operators, upsert and `$setOnInsert`, duplicate and immutable `_id`, and accurate matched, modified, deleted, and upserted results. Apply the predicate and stage the mutation under the same local writer lock. Include validated array modifiers and positional `arrayFilters` once their match rules are specified.
- Keep `writeBatch` atomic. Define `bulkWrite` separately. Ordered bulk stops at the first item-level error and keeps preceding successes. Unordered bulk attempts the remaining items and reports their indexed outcomes. Stage a successful item as a unit, so a failed item leaves no document or index changes. Storage failures are commit failures, with an explicit unknown-outcome result if publication cannot be determined. Preserve the existing `insertMany` atomic contract.
- Add a local `transaction(callback)` over one pinned root with read-your-writes and one database-head publication. Start with a lock-held transaction. Transaction operations run through the transaction handle and in a defined order. Reject nested transactions, invalidate the handle when the callback ends, and specify that a failed transaction operation aborts the transaction even if the callback catches it. Surface conflicts and unknown commit outcomes explicitly. Callback retries are caller-controlled.
- Test atomicity and uniqueness within the supported writer domain. Replicas merge winning records per document. A merge may retain some effects of a concurrent remote batch, so local commit atomicity gives no cross-replica transaction or quorum guarantee. Specify the outcome of concurrent writes that violate a unique index before exposing uniqueness on mergeable replicas. Ship unique indexes only in modes with a defined and tested contract.

### Indexes and aggregation

- Add a conservative planner for `_id`, leading compound equalities, one following range, and compatible sort order. Apply residual predicates and multikey deduplication before `limit`. Fall back to a scan where index ordering or array and missing-value behavior cannot preserve the result. Add `explain` with plan kind, index, keys and documents examined, and block reads. Assert indexed and forced-scan plans return the same results.
- Define unique, sparse, and partial index behavior and supported sort directions. Exercise index builds on populated collections, index maintenance during mutation and merge, reopen, and failed writes. Track TTL separately until a clock and replication policy are specified.
- Bring the common read-only stages to v2. Start with `$match`, `$sort`, `$skip`, `$limit`, `$project`, `$group`, `$count`, `$unwind`, and equality `$lookup`. Use one snapshot for the input and foreign collections. Define missing values, empty inputs, expression validation, and bounds on memory use for blocking stages. Add more stages by contract and fixture as needed.

### Data portability and operation

- Provide streamed JSON/NDJSON and Extended JSON import/export with a report of unsupported or lossy conversions. Document how string IDs and the v2 size limit affect imports. Full BSON value semantics, typed BSON indexes, and any larger document encoding require a separate format proposal.
- Provide backup and restore from an explicitly retained root. Include documents, index definitions, attachments, and verification of the restored graph. Exercise encrypted backups, key handling, and retention through garbage collection. Report progress and actionable errors.
- Keep `subscribe` as a root-diff notification API. Specify an optional durable change feed with retained history, resume positions, ordering, and a clear expired-position error before promising per-commit replay. The current subscription may coalesce commits.
- For service deployments, expose BrightDB-native operations with authentication, authorization, health, and metrics. Exercise denied operations and pool isolation through the deployed entry point. Existing block-source HTTP is a replica transport, and its bearer token covers access to that source.

## 3. Shared operation corpus

Maintain one versioned manifest in the TypeScript repository. Inventory the public operations by family and the supported operator, option, and error surface. Each case has a stable ID, capability requirements, initial state, ordered steps or a seeded schedule, and expected return values, error category, and visible state. Include an optional expected root or bytes for format fixtures with fixed IDs and counters. Each case declares ordering expectations, supported runtimes, and topologies. An inventory test fails when an advertised capability has no positive, boundary, or error cases, or a required case never ran.

Run the same cases through adapters for the production Node API, browser API, C++ API, and each claimed service path. Adapters normalize representation only, such as stable error categories or result sets whose order is unspecified. They must surface unsupported operations explicitly and must never emulate a missing feature. Reuse the [fixture generator](../../brightchain-db/src/lib/v2/fixtures.spec.ts), [process handoff harness](../../brightchain-db/src/lib/v2/handoff.spec.ts), and existing merge, block-source, and pool tests. Keep the byte-format vectors distinct from the operation corpus.

Use three sources for expectations.

1. Reviewed examples and a small independent in-memory model for BrightDB behavior, including batch publication, retained snapshots, tombstones, replica winners, and invariants. Generated cases compare against the model and shrink to a replayable trace. Keep the model independent of the production matcher, update engine, index encoder, and merge implementation.
2. Checked-in expected results from a pinned MongoDB reference version for the declared compatible subset. Generate them in a separate job or by explicit maintainer command using test tooling only. Record version and comparison settings. Normalize IDs, clocks, and unordered outputs. Review expectation changes before landing them. BrightDB-specific behavior uses its own expected results.
3. Golden block bytes and roots from the v2 format contract and cross-runtime read/write fixtures. Verify the exact digest only when database ID, writer ID, versions, and input order are controlled. For production scenarios, compare semantic state and use root equality for replicas of the same database after convergence.

### Coverage by operation family

| Family | Required cases |
| --- | --- |
| Lifecycle and storage | Create, open, close, reopen, and incompatible-format errors. Empty and populated databases, clean process handoff, concurrent initialization, writer contention, and missing or damaged blocks. |
| Documents and reads | Every read and write method. Generated and explicit IDs, duplicate and missing keys, no-ops, validation, Unicode, missing and null, mixed types, nested arrays, projections, limit and sort ties, and size boundaries. |
| Bulk and transaction | Failure before the first item, halfway through, and at commit. Ordered and unordered partial results, atomic batch rollback, read-your-writes, one root across collections, read visibility under contention, and restart after acknowledgement. |
| Index and aggregation | Empty, single-field, compound and multikey cases. Create, drop, and maintain indexes through insert, replace, delete, and merge. Indexed versus forced scan, invalid pipeline, empty aggregation, and snapshot-consistent lookup. |
| History and files | Snapshot, diff, subscribe and unsubscribe, attachment streaming, retention, garbage collection, packed storage and compaction, key rotation and re-sealing, backup, and restore. Include a retained root and an unretained root, concurrent readers, and missing descendants. Run only for declared storage capabilities. |
| Replication and access | Join, clone, fork, merge, independent concurrent writers, stale heads, duplicate messages, tombstones, drop/recreate, divergent index definitions, attachments, incremental fetches, wrong database, wrong credentials, and pool isolation. |

## 4. Topology and fault matrix

Run each operation's baseline on every applicable profile. Cross profiles with the failure modes they can encounter and keep explicit interaction scenarios for combinations with high consequences. Use pairwise selection for the rest and publish the cases that ran. Required profiles and excluded combinations are declared up front.

| Profile | Required execution and assertions |
| --- | --- |
| Embedded reference | TypeScript in-memory and real loose disk. Include separate writers sharing one directory, packed disk, encrypted disk, and a packed-plus-encrypted reopen and recovery case. Check identical logical results and the applicable durability and key guarantees. |
| Browser | Real browser with IndexedDB. Test separate tabs, lock contention, reload, interruption of an active writer, encrypted storage, and HTTP catch-up. Use the in-memory browser profile for fast semantic checks and include a second browser engine in scheduled runs where supported. |
| C++ interoperability | Build the port from an explicit revision. Run the shared supported corpus, write in one runtime and reopen and mutate in the other, then reverse directions. Exercise loose, packed, and encrypted profiles where advertised, including an interrupted writer. Run mixed TypeScript/C++ HTTP replication against real processes. |
| HTTP replicas | Three separate processes with independent writer IDs and stores. Run a fully connected topology and A–B–C forwarding, followed by a 2+1 partition. Write on both sides, introduce a new or restarted node, heal, and perform bidirectional pulls. Assert eventual equal roots and equivalent queries, index contents, and attachment digests. |
| BrightChain pools | Three independently configured BrightChain node processes with separate persistent pools and head registries. Exercise the production v2 storage and sync integration, plus restart, rejoin, pool scoping, and encrypted-pool cases. First establish a runnable v2 service path. Use explicit pull where that is the deployed contract. Any production gossip mode gets its own end-to-end lane before it is advertised. |
| Cloud storage profiles | Test the object-store-backed pool profiles the project advertises, using local emulators in scheduled runs and an opt-in real-service verification before claiming provider compatibility. Exercise throttling, transient fetch failures, missing objects, and credentials expiry. |

Faults must be injected at named phases and include both success and failure assertions.

- **Publication:** Interrupt before block durability, after staging, immediately before head replacement, and after publication before acknowledgement. Reopen and verify the old or new complete root, with no partial multi-collection state. An acknowledged commit survives the documented restart conditions. Include disk-full and permission errors, and make unknown outcomes observable.
- **Transport:** Delay, drop, duplicate, or reorder announcements and pull responses. Withhold or corrupt a document, index page, attachment chunk, or root. Verify the previous root stays readable and incomplete state stays unpublished. Restore connectivity, retry, and assert idempotence and bounded convergence. Use a stale peer and a concurrent delete to check that deleted data stays deleted according to the version rules.
- **Security and maintenance:** Use wrong credentials or keys, key rotation, a denied pool, interrupted backup/restore and pack compaction, and garbage collection during reads or sync. Confirm that data reachable from protected roots remains available and that rejected operations expose no data from another pool. Verify only capabilities actually enforced by the chosen adapter.

One required cluster trace starts with an indexed collection and an attachment on three synchronized replicas. While partitioned, one side performs an upsert and a multi-collection batch. The other deletes a shared document, edits a disjoint record, and drops and recreates another collection. Restart a writer, withhold one referenced block during the first pull, and verify the published state is still readable. Release the block, merge in both directions, and verify the per-record winners, collection generation, indexed and scan results, attachment bytes, and identical final roots. Replay all pulls and assert the head is unchanged.

## 5. Execution and release gates

- **Pull requests:** Run the checked-in semantic corpus, coverage inventory, deterministic generated seeds, targeted fault injection, and the real disk and browser smoke profiles through Nx. Add a separate-process HTTP smoke scenario. Use a required C++ lane for changes to shared bytes or advertised cross-language behavior. Missing tools or zero executed cases fail a required lane.
- **Scheduled runs:** Run the three-node partition and restart matrix, browser expansion, mixed-runtime handoff, encryption and packing combinations, live reference comparisons, larger generated workloads, and cloud emulator cases. Repeat known failure schedules as fixed regressions. Keep performance runs separate from noisy pull-request timing checks.
- **Release:** Test the packaged public entry points from a clean install, with real standalone and clustered configurations. Require every advertised profile to pass its gate, including backup/restore, crash/reopen, and bidirectional handoff where claimed. At 1k, 10k, and 100k documents, record scan and index work, point-lookup block reads, write bytes, query and commit p95, and convergence time. Use deterministic work counters for fast-path regression checks and publish latency with the environment and workload.
- Use explicit readiness and phase barriers, bounded waits with diagnostics, and seeded workload and fault schedules. Persist case ID, seed and shrink path, repository revisions or image digests, topology, backend and flags, operation and fault trace, and each node's root and error. Provide one Nx replay target that consumes the failure artifact. Redact secrets and key material from diagnostics.

## 6. Implementation TODO

- [ ] **P0 — Contract and runner.** Add the operation manifest, capability matrix, shared runner, reference fixtures, and independent model. Make missing coverage and silently skipped required lanes fail. Capture the known query divergences as regression cases.
- [ ] **P0 — Correct queries and complete CRUD.** Implement strict query semantics, filter-based writes, upserts, bulk results, and count and distinct on v2. Run the v1 regressions and the TypeScript/browser corpus.
- [ ] **P0 — Cluster test foundation.** Add process orchestration and deterministic fault controls to the existing handoff harness. Gate three independent HTTP replicas and a real BrightChain v2 pool deployment. Report each topology and the operations it exercised.
- [ ] **P1 — Index planning and aggregation.** Add conservative planning, streaming cursors, `explain`, defined index options, and the common snapshot-bound pipelines. Gate index equivalence, merge maintenance, and work counters.
- [ ] **P1 — Transactions and operations.** Add transactional reads and writes, streamed import/export, and verified backup/restore. Exercise interruptions, contention, and encryption across supported backends.
- [ ] **P1 — Interoperability release gate.** Pin and build the C++ port in CI, run the shared corpus and mixed-runtime topology tests, and publish the supported capabilities and deliberate query differences. TypeScript release claims and C++ parity claims follow their respective gates.
- [ ] **Follow-on — Persisted extensions.** Specify retained change history and resume tokens, TTL, and any additional document types or index semantics that require a format extension.
