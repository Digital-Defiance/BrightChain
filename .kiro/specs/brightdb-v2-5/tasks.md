# Tasks — BrightDB v2.5 Operations and Conformance

> Source: `docs/architecture/brightdb-v2-5.md`. Priorities follow its
> Implementation TODO: **P0** contract/runner, queries/CRUD, cluster
> foundation; **P1** planner/aggregation, transactions/operations,
> interoperability gate; **Follow-on** persisted extensions.
>
> Conventions: shared/runtime-neutral code in `brightchain-db/src/lib/v2/`,
> Node-only tooling in `brightchain-db/test-support/`. Run tests with
> `yarn nx test brightchain-db`. Use `--testPathPatterns` (plural) to filter.
> Write helper scripts as `.ts` files, not raw `node -e`.

## Phase 1 — Contract and Runner (P0) — done

Run the lane: `yarn nx run brightchain-db:conformance-pr`. Replay a failure:
`CONFORMANCE_ARTIFACT=<path> yarn nx run brightchain-db:conformance-replay`.
Code: `brightchain-db/src/lib/v2/conformance/`, `ops/errors.ts`, Node-only pieces
in `brightchain-db/test-support/conformance/`, corpus in
`brightchain-db/fixtures/conformance/corpus/`.

- [x] 1.1 Define the error registry (`BrightDbErrorCategory`, `BrightDbOperationError`) with stable codes. The class is named `BrightDbOperationError` because v1 already exports a `BrightDbError`.
  _Requirements: 1.2, 1.5_
- [x] 1.2 Define corpus manifest types and a validating loader (`validateManifest`).
  _Requirements: 16.1, 16.2, 16.4_
- [x] 1.3 Define the capability matrix (ids, families, format-extension flag) and adapter capability declaration type.
  _Requirements: 16.5, 18.3, 18.4_
- [x] 1.4 Implement the shared runner: state setup, step execution, expectation comparison, result recording (`passed | failed | skipped-by-* | known-divergence`).
  _Requirements: 16.2, 18.2, 18.4_
- [x] 1.5 Implement the node adapter (in-memory and loose disk profiles).
  _Requirements: 18.1, 20.1_
- [x] 1.6 Implement the inventory check: each advertised capability has positive, boundary, and error cases; required cases must have run; zero executed cases fails.
  _Requirements: 16.5, 16.6, 23.4_
- [x] 1.7 Seed the corpus with existing behavior: lifecycle, insert/replace/delete, `writeBatch`, `insertMany`, snapshots, indexes, merge, and query semantics (56 cases, 5 of them known divergences).
  _Requirements: 19.1, 19.2, 19.6_
- [x] 1.8 Build the independent model (collections, snapshots, batch publish, tombstones, replica winners). It is itself a `ConformanceAdapter`, passes the reviewed corpus, and is guarded by an import-restriction lint rule in `eslint.config.mjs`. Indexes are not modelled.
  _Requirements: 17.1, 17.2_
- [x] 1.9 Add seeded operation generators, a differential runner against the model, a shrinker, and freezing into a replayable case.
  _Requirements: 17.3, 25.2_
- [x] 1.10 Add the Nx targets `conformance-pr` and `conformance-replay`. Zero executed cases or a skipped required case fails the lane (`checkRun`). Tool checks (browser, C++, Docker) arrive with the lanes that need them.
  _Requirements: 23.1, 23.4, 25.4_
- [x] 1.11 Capture known divergences as corpus cases tagged `knownDivergence` (asserting intended behavior, reported as `known-divergence`, hard-failing when they start to pass); generate `fixtures/conformance/DIFFERENCES.md`. The `bsonDifference` section is empty until a deliberate difference is decided.
  _Requirements: 2.7_
- [x] 1.12 Keep v1 regression tests wired into `conformance-pr` (`src/__tests__/conformance.*`).
  _Requirements: 23.5, 26.3_
- [x] 1.13 Unit tests for registry, loader, matcher, runner, inventory, known divergences, and artifact parsing.
  _Requirements: 16.5, 16.6_

### Findings from Phase 1 (each has a `knownDivergence` case)

These are bugs or gaps in the shared v1 `queryEngine`, reached through v2.
Fix them in Phase 2 and Phase 4, then remove each tag.

| Case | Finding | Fix in |
| --- | --- | --- |
| `docs.read.unknownOperator.001` | An unknown operator is silently ignored, so the filter matches everything. A filter-based delete would wipe the collection. | 2.3 |
| `docs.read.rangeSkipsMissingAndNull.001` | `$lt`/`$lte` match documents whose field is missing or null (`compareValues` ranks null below everything). | 2.1 |
| `docs.read.numericRangeSkipsStrings.001` | `{ n: { $gt: 0 } }` matches the string `"z"`; mixed types fall back to `String(a).localeCompare(...)`. | 2.1 |
| `docs.read.stringRangeIsBinary.001` | Strings compare with `localeCompare`, not UTF-8 byte order. | 2.1 |
| `docs.replaceById.mismatchedIdOnMissingDocument.001` | A replacement naming a different `_id` is refused only when the target exists. | 4.5 |

To confirm, not a bug yet: two replicas that each implicitly create the same
collection after a fork are different collection generations, and a merge keeps
one side's documents. Decide whether that is the intended contract (task 5.7
documents it) or whether implicit creation should be avoided.

Also noted: a malformed block digest fails with a storage error on disk but is
treated as a missing block in memory (the memory store does not validate).

## Phase 2 — Semantics and Validation (P0)

- [ ] 2.1 Implement `ops/semantics`: path resolution (missing vs null, array fan-out, numeric segments), type-bracketed `compare`, range matching, regex with options.
  _Requirements: 2.1, 2.3, 2.4, 2.5_
- [ ] 2.2 Property test: `compare` sign equals byte comparison of encoded index keys for all indexable types.
  _Requirements: 2.6_
- [ ] 2.3 Implement `validateFilter` (all supported operators, nested logical operators, `$elemMatch` scalar and document forms).
  _Requirements: 1.1, 1.2, 2.2_
- [ ] 2.4 Implement `validateProjection` and `validateSort`.
  _Requirements: 1.1, 2.8_
- [ ] 2.5 Implement `validateUpdate` (operator set, path conflicts, no operator/plain mixing).
  _Requirements: 1.1, 4.2_
- [ ] 2.6 Implement the filter evaluator over the AST using only `ops/semantics`.
  _Requirements: 1.4, 2.6_
- [ ] 2.7 Implement projection evaluation.
  _Requirements: 2.8_
- [ ] 2.8 Corpus cases: every operator with positive, boundary, error; unicode strings; missing vs null; mixed types; nested arrays; validation against empty/missing collection.
  _Requirements: 1.1, 1.3, 2.1–2.5, 19.2_
- [ ] 2.9 Cross-check the v1 `queryEngine` against the new evaluator on shared cases; record each divergence as a decision (fix v2, document difference).
  _Requirements: 2.7_
- [ ] 2.10 Reference-expectation generator skeleton and first batch of Mongo-derived cases for the compatible subset.
  _Requirements: 17.4, 17.5, 17.8_

## Phase 3 — Reads and Cursors (P0)

- [ ] 3.1 Add `countDocuments` and `distinct` to `PortableReadCollection`.
  _Requirements: 3.1, 3.2_
- [ ] 3.2 Add options (`sort`, `limit`, `skip`, `projection`) to `find`/`findOne`; implement shared `selectOne` with `_id` tie-breaker.
  _Requirements: 3.5, 3.6_
- [ ] 3.3 Make cursors pin a root, stream, and release on exhaustion and `close()`.
  _Requirements: 3.3, 3.4, 3.7_
- [ ] 3.4 Route `findMatching` through the (initially scan + `_id`) planner interface so Phase 8 can slot in.
  _Requirements: 9.1_
- [ ] 3.5 Corpus cases: ties, default order unspecified (unordered comparison), limit/sort/skip boundaries, cursor close, concurrent writer visibility.
  _Requirements: 3.1–3.7, 19.2, 19.3_

## Phase 4 — Staging Savepoints and Writes (P0)

- [ ] 4.1 Extract `commitWithLock` from the existing batch path; add `mark()` / `rollbackTo()` to document and index staging with unit tests.
  _Requirements: 4.6, 6.5_
- [ ] 4.2 Implement the update engine with each operator in Req 4.2, each gated on its corpus cases.
  _Requirements: 1.4, 4.2_
- [ ] 4.3 Implement `updateOne`, `updateMany`, `replaceOne`, `deleteOne`, `deleteMany` with accurate result counts and single commit per call.
  _Requirements: 4.1, 4.5, 4.8_
- [ ] 4.4 Implement upsert (equality-derived base document, `$setOnInsert`).
  _Requirements: 4.3_
- [ ] 4.5 Enforce duplicate `_id` and immutable `_id` errors with state unchanged.
  _Requirements: 4.4_
- [ ] 4.6 Implement `findOneAndUpdate`, `findOneAndReplace`, `findOneAndDelete` (`returnDocument`, projection, sort).
  _Requirements: 5.1–5.5_
- [ ] 4.7 Write the match rules for `$push`/`$pull` modifiers and positional operators / `arrayFilters`; add corpus cases; then implement behind `update.arrayFilters`.
  _Requirements: 4.7_
- [ ] 4.8 Corpus cases: no-op update, matched vs modified, upserted id, write-then-crash recovery, index maintenance after each write type.
  _Requirements: 4.1–4.8, 19.2, 19.4_
- [ ] 4.9 Concurrency tests: two local handles contending; verify `findOneAnd*` never double-claims.
  _Requirements: 5.2, 19.1_
- [ ] 4.10 Property test: model agreement on generated write sequences.
  _Requirements: 17.3_

## Phase 5 — Bulk Writes and Transactions (P0/P1)

- [ ] 5.1 Implement `bulkWrite` ordered and unordered using savepoints; result shape with per-item status.
  _Requirements: 6.3, 6.4, 6.5, 6.7_
- [ ] 5.2 Confirm `writeBatch` and `insertMany` behavior unchanged with regression cases.
  _Requirements: 6.1, 6.2_
- [ ] 5.3 Implement `CommitFailed` / `CommitOutcomeUnknown` mapping with `intendedRoot`.
  _Requirements: 6.6, 7.9_
- [ ] 5.4 Implement `transaction(callback)` with lock-held staging, read-your-writes, single publication.
  _Requirements: 7.1–7.4, 7.10_
- [ ] 5.5 Enforce nested rejection, handle invalidation, and abort-even-if-caught.
  _Requirements: 7.6, 7.7, 7.8_
- [ ] 5.6 Corpus cases: failure before first item, midway, at commit; ordered/unordered partials; one root across collections; read visibility under contention; restart after acknowledgement.
  _Requirements: 19.3_
- [ ] 5.7 Document local atomicity vs replica merge semantics; add corpus cases showing partial retention of a concurrent remote batch after merge.
  _Requirements: 8.1, 8.2_
- [ ] 5.8 Property test: aborted transaction leaves root unchanged.
  _Requirements: 7.10_

## Phase 6 — Cluster Test Foundation (P0)

- [ ] 6.1 Build `ProcessCluster` on top of `handoff.spec.ts` harness: spawn N processes, independent writer IDs and data dirs, bounded readiness with captured diagnostics.
  _Requirements: 20.4, 25.1_
- [ ] 6.2 Build `NetworkController` proxy: partitions, delay, drop, duplicate, reorder, withhold/corrupt by digest; seeded and phase-named.
  _Requirements: 21.2, 21.4_
- [ ] 6.3 Build embedded `FaultController` with the four publication phases and actions (`crash`, `throw`, `diskFull`, `eacces`).
  _Requirements: 21.1, 21.4_
- [ ] 6.4 Implement `RunRecorder`, failure artifact, and redactor; wire `conformance-replay`.
  _Requirements: 25.3, 25.4, 25.5_
- [ ] 6.5 HTTP replica scenarios: fully connected, A–B–C forwarding, 2+1 partition with writes both sides, new/restarted node, heal, bidirectional pull; assert equal roots, equivalent queries, index contents, attachment digests.
  _Requirements: 20.4_
- [ ] 6.6 Publication fault cases: reopen yields complete old or complete new root; no partial multi-collection state; acknowledged commits survive restart; unknown outcome observable.
  _Requirements: 21.1_
- [ ] 6.7 Transport fault cases: withheld/corrupt document, index page, attachment chunk, root; previous root readable; idempotent retry; stale peer plus concurrent delete.
  _Requirements: 21.2_
- [ ] 6.8 Audit the BrightChain v2 pool service path; if absent, build the minimal runnable path (storage + sync + head registry) before the lane.
  _Requirements: 20.5_
- [ ] 6.9 BrightChain pool lane: three node processes, separate pools and head registries, restart, rejoin, pool scoping, encrypted pool, explicit pull.
  _Requirements: 20.5, 19.6_
- [ ] 6.10 Implement required cluster trace `cluster.trace.001` end to end (indexed collection + attachment, partition, upsert + multi-collection batch vs delete + disjoint edit + drop/recreate, writer restart, withheld block, merge both ways, final root equality, replay idempotence).
  _Requirements: 22.1–22.5_
- [ ] 6.11 Add HTTP smoke (3 processes) to `conformance-pr`; report each topology and the operations it exercised.
  _Requirements: 23.2_
- [ ] 6.12 Declare required profiles and excluded combinations in a checked-in profile manifest; generate pairwise selections and publish the executed case list.
  _Requirements: 20.7_

## Phase 7 — Browser Profile (P0/P1)

- [ ] 7.1 Browser adapter with Playwright: load built bundle, marshal steps, real IndexedDB profile, in-memory fast profile.
  _Requirements: 18.1, 20.2_
- [ ] 7.2 Browser cases: separate tabs, lock contention, reload, interrupted active writer, encrypted storage, HTTP catch-up.
  _Requirements: 20.2_
- [ ] 7.3 Add browser smoke to `conformance-pr`; add second engine to `conformance-nightly`.
  _Requirements: 20.2, 23.1, 24.1_

## Phase 8 — Index Planning and Explain (P1)

- [ ] 8.1 Add counting storage wrapper (block reads, bytes written) and key/doc counters.
  _Requirements: 9.4, 24.7_
- [ ] 8.2 Implement the conservative planner (`idLookup`, equality prefix, one range, ordered sort) with scan fallback for multikey/missing ambiguity.
  _Requirements: 9.1, 9.3, 9.6_
- [ ] 8.3 Apply residual predicates and multikey dedup before `limit`.
  _Requirements: 9.2_
- [ ] 8.4 Implement `explain` and the `forceScan` hint.
  _Requirements: 9.4_
- [ ] 8.5 Index/scan equivalence harness over all indexed corpus cases and generated cases.
  _Requirements: 9.5_
- [ ] 8.6 Corpus cases: empty, single-field, compound, multikey; create/drop; maintenance through insert/replace/delete/merge; reopen; failed writes.
  _Requirements: 10.2, 19.4_
- [ ] 8.7 Define and test unique index behavior in single-writer pools; reject on mergeable replicas with `UniqueUnsupported`.
  _Requirements: 8.3, 8.4, 10.1_
- [ ] 8.8 Write the format-extension decision for sparse/partial options (record layout, old-reader behavior, fixtures plan). Implement only after approval.
  _Requirements: 10.3, 26.2_
- [ ] 8.9 Work-counter budgets checked in for point lookup and range queries.
  _Requirements: 24.7_

## Phase 9 — Aggregation (P1)

- [ ] 9.1 Pipeline validation (`validatePipeline`), including expression validation and stage ordering rules.
  _Requirements: 11.3, 11.5_
- [ ] 9.2 Streaming stages: `$match`, `$project`, `$skip`, `$limit`, `$unwind`.
  _Requirements: 11.1_
- [ ] 9.3 Blocking stages with memory bound: `$sort`, `$group`, `$count`; `MemoryBoundExceeded`.
  _Requirements: 11.1, 11.4_
- [ ] 9.4 Equality `$lookup` over one snapshot (indexed foreign lookup when available).
  _Requirements: 11.1, 11.2_
- [ ] 9.5 Push leading `$match`/`$sort`/`$limit` into the planner.
  _Requirements: 9.1, 11.1_
- [ ] 9.6 Corpus cases: missing values, empty inputs, invalid pipeline, snapshot-consistent lookup under concurrent write.
  _Requirements: 11.2, 11.3, 19.4_

## Phase 10 — Import/Export and Backup/Restore (P1)

- [ ] 10.1 Streaming JSON/NDJSON export from a pinned snapshot.
  _Requirements: 12.1_
- [ ] 10.2 Streaming import with atomic and chunked modes, size checks, conversion report.
  _Requirements: 12.1, 12.3, 12.4, 12.5_
- [ ] 10.3 Extended JSON subset import/export with explicit lossy/unsupported reporting.
  _Requirements: 12.2, 12.3_
- [ ] 10.4 Document string IDs and size-limit effects on imports.
  _Requirements: 12.4_
- [ ] 10.5 Backup from a retained root (hold via `keepRoots`), including documents, index definitions, attachments, manifest.
  _Requirements: 13.1, 13.2_
- [ ] 10.6 Restore with full graph verification before head publication; progress callbacks; redaction.
  _Requirements: 13.3, 13.5_
- [ ] 10.7 Encrypted backup handling and key-handling cases; GC-during-backup case.
  _Requirements: 13.4_
- [ ] 10.8 Interrupted backup/restore cases (source untouched, clean restart).
  _Requirements: 13.6, 21.3_
- [ ] 10.9 Cases for packed storage, compaction, key rotation, re-sealing, retained vs unretained roots, missing descendants.
  _Requirements: 19.5_

## Phase 11 — Subscribe Documentation and Service (P1)

- [ ] 11.1 Document `subscribe` coalescing; add corpus cases accepting ≥1 event with correct final root.
  _Requirements: 14.1_
- [ ] 11.2 Define service DTOs (`brightchain-lib` base interfaces, `brightchain-api-lib` response types).
  _Requirements: 15.1_
- [ ] 11.3 Implement authenticated, per-pool authorized native operations, `/health`, `/metrics`.
  _Requirements: 15.2, 15.3_
- [ ] 11.4 Service adapter and cases: denied operations, wrong credentials, pool isolation through the deployed entry point.
  _Requirements: 15.4, 15.6, 21.3_
- [ ] 11.5 Document block-source HTTP as replica transport with its own bearer scope.
  _Requirements: 15.5_

## Phase 12 — Interoperability and Release Gates (P1)

- [ ] 12.1 Define the C++ shim protocol (`--capabilities`, step JSON in/out); implement the C++ adapter that builds from a pinned revision.
  _Requirements: 18.1, 20.3_
- [ ] 12.2 Run shared corpus against C++; record unsupported capabilities explicitly.
  _Requirements: 18.3, 20.3_
- [ ] 12.3 Mixed handoff: write in TS, reopen/mutate in C++, then reverse; loose, packed, encrypted where advertised; interrupted writer.
  _Requirements: 20.3_
- [ ] 12.4 Mixed TS/C++ HTTP replication with real processes.
  _Requirements: 20.3_
- [ ] 12.5 `conformance-cpp` PR lane triggered by shared-byte or cross-language changes.
  _Requirements: 23.3_
- [ ] 12.6 Cloud storage profiles: local emulators nightly; opt-in real-service verification; throttling, transient fetch failures, missing objects, credential expiry.
  _Requirements: 20.6_
- [ ] 12.7 `conformance-nightly`: partition/restart matrix, browser expansion, mixed handoff, encryption×packing, live Mongo comparison, large generated workloads, cloud emulators; fixed regressions for known failure schedules.
  _Requirements: 24.1, 24.2_
- [ ] 12.8 `conformance-release`: packaged clean install, standalone and clustered configs, backup/restore, crash/reopen, bidirectional handoff, and the 1k/10k/100k performance table with environment and workload.
  _Requirements: 24.4–24.7_
- [ ] 12.9 Publish supported capabilities and deliberate query differences for TypeScript and C++ separately.
  _Requirements: 24.8, 2.7_

## Phase 13 — Follow-on (not in v2.5 unless 26.2 is satisfied)

- [ ] 13.1 Format-extension proposal: durable change feed (retained history, resume tokens, ordering, expired-position error).
  _Requirements: 14.2, 26.4_
- [ ] 13.2 Spec TTL indexes (clock and replication policy).
  _Requirements: 10.4, 26.4_
- [ ] 13.3 Proposal for additional document types and any new index semantics.
  _Requirements: 26.4_

## Checkpoints

- [ ] A. After Phase 2: corpus, model, and semantics green on node in-memory + disk; inventory test enforcing.
- [ ] B. After Phase 5: full CRUD, bulk, and transactions pass corpus and model-agreement tests; v1 regressions green.
- [ ] C. After Phase 6: cluster trace and publication/transport fault cases pass in `conformance-pr`/nightly.
- [ ] D. After Phase 9: planner equivalence and aggregation cases pass; work-counter budgets checked in.
- [ ] E. After Phase 12: release gate green for every advertised profile.

## Suggested Order for a Short Burst

If time is limited, the highest-value slice that still stands alone is
Phases 1, 2, 3, 4, and 6.1–6.6: a trustworthy contract and runner, correct
queries, complete CRUD, and the crash/transport fault foundation. Everything
after that builds on those without needing to change them.
