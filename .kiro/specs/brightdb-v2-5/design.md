# Design — BrightDB v2.5 Operations and Conformance

## Overview

v2.5 has two deliverables that ship together:

1. **Operation layer.** Filter-based CRUD, find-and-modify, bulk writes,
   local transactions, an index planner with `explain`, read-only
   aggregation, import/export, and backup/restore on top of the v2 engine.
2. **Conformance layer.** A versioned operation corpus, an independent model,
   runtime adapters, a topology/fault harness, and CI gates that prove the
   operation layer in every advertised deployment.

No persisted format changes are part of the core work (Req 26.1). Everything
below is built on the current v2 document and page encodings.

## Current State (verified in code)

- v2 lives in `brightchain-db/src/lib/v2/`. `PortableCollection` currently exposes only `findById`, `findOne`, `find`, `listIndexes`, `findByIndex`, `insertOne`, `insertMany`, `replaceById`, `deleteById`, `createIndex`, `dropIndex`.
- `PortableBrightDbCore` exposes `writeBatch`, `snapshot`/`at`, `subscribe`, `merge`, `forkInto`, `collectGarbage`, attachments, `blockSource`, `root`. `PortableBrightDb` adds `fork`, `compactPacks`, `resealBlocks`, and disk/encryption options.
- Writes are staged on an internal batch and published by `persist()` under `store.withWriteLock`.
- The v1 engine has `queryEngine.ts` (`matchesFilter`, `sortDocuments`), `aggregation.ts`, and filter-based `Collection` methods. These are the behavioral starting point, but v2 must not inherit them unreviewed (Req 1.4, 2.6).
- Test assets to reuse: `fixtures.spec.ts`, `handoff.spec.ts`, `merge.spec.ts`, `block-source.spec.ts`, `brightchain-storage.spec.ts`, `portable-database.spec.ts`.

## Architecture

```
                    ┌──────────────────────────────────────────┐
                    │  Public API (PortableBrightDb / Tx)      │
                    └───────┬──────────────────────────────────┘
                            │
  ┌─────────────────────────▼───────────────────────────────────┐
  │ ops/  validate → plan → execute                             │
  │   validate/   filter, update, projection, sort, pipeline    │
  │   semantics/  path traversal, compare, type brackets        │
  │   read/       find, cursor, count, distinct                 │
  │   write/      update*, replace*, delete*, findOneAnd*, bulk │
  │   tx/         transaction handle                            │
  │   plan/       planner, explain                              │
  │   agg/        pipeline stages                               │
  │   io/         import/export, backup/restore                 │
  └─────────────────────────┬───────────────────────────────────┘
                            │ staged mutations (existing batch)
                  ┌─────────▼──────────┐
                  │ portable-core.ts   │  commit / persist / merge
                  └─────────┬──────────┘
                            │
                  ┌─────────▼──────────┐
                  │ BrightDbV2Storage  │  memory / disk / packed / IDB / pool
                  └────────────────────┘

  conformance/
    manifest/   corpus + capability matrix + error registry
    model/      independent reference model
    reference/  MongoDB expectation generator (test tooling only)
    adapters/   node, browser, cpp, service
    harness/    process orchestration, fault controller, replay
```

### Placement (per workspace rules)

- Everything runtime-neutral (operation layer, semantics, validators, corpus schema, error registry, model) goes in `brightchain-db/src/lib/v2/ops/` and `brightchain-db/src/lib/v2/conformance/`. They must run in Node and the browser, so no Node-only imports there.
- Node-only pieces (process orchestration, disk fault injection, MongoDB reference generator, C++ adapter, import/export file streaming) go in `brightchain-db/test-support/` or a Node-only subpath. If they grow, extract a `@digitaldefiance` library (candidate: `brightdb-conformance`).
- Service-facing request/response shapes: base data interfaces in `brightchain-lib`, Express-based response types in `brightchain-api-lib`, per the shared-interface convention.

## Component Design

### 1. Error registry (Req 1.2, 1.5, 6.6, 7.6–7.9)

One registry, `BrightDbErrorCategory`, shared by all runtimes and the corpus:

| Category | Used for |
| --- | --- |
| `InvalidFilter`, `InvalidUpdate`, `InvalidProjection`, `InvalidSort`, `InvalidPipeline` | Validation (Req 1) |
| `UnknownOperator`, `MalformedOperand` | Validation detail (carried as `code`) |
| `DuplicateKey`, `ImmutableId`, `DocumentTooLarge` | Writes (Req 4) |
| `UniqueUnsupported` | Req 8.4 |
| `TransactionNested`, `TransactionClosed`, `TransactionAborted` | Req 7 |
| `CommitFailed`, `CommitOutcomeUnknown` | Req 6.6, 7.9 |
| `MemoryBoundExceeded` | Req 11.4 |
| `Unsupported` | Adapters, Req 18.3 |
| `PermissionDenied`, `AuthenticationFailed` | Req 15 |

```ts
interface BrightDbError extends Error {
  category: BrightDbErrorCategory;
  code: string;        // stable, e.g. 'unknown_operator'
  path?: string;       // offending field path
  operator?: string;
  details?: Record<string, unknown>; // never contains key material
}
```

### 2. Semantics module (Req 2)

`ops/semantics/` is the **single** implementation of:

- `resolvePath(doc, path) → Resolved[]` returning `{ present: boolean; value }` per traversal branch, so *missing* and *explicit null* are distinguishable. Array traversal rules: a non-numeric segment fans out over array elements; a numeric segment indexes.
- `compare(a, b)`: type-bracketed total order (null < number < string < object < array < boolean, documented), strings by UTF-8 bytes.
- `matchesRange(op, value, operand)`: only compares within the operand's type bracket.
- `matchRegex(value, pattern, options)`.

Scans, index key encoding (`index-key.ts`), sorts, and the update engine all import from here. A property test asserts `compare` ordering equals the byte order of the index key encoder for every indexable type (Req 2.6).

A `DIFFERENCES.md` generated from corpus cases tagged `bsonDifference` lists deliberate divergences (Req 2.7).

### 3. Validators (Req 1)

Each validator is a pure function `validateX(input): ValidatedX` that either returns a normalized AST or throws a typed error. They run before any lock is taken or any block read occurs. Execution consumes only the AST, so an unvalidated input cannot reach the executor.

- `validateFilter` → `FilterAst` (operators: comparison, `$in/$nin`, `$exists`, `$type`, `$regex`, `$size`, `$all`, `$elemMatch`, `$and/$or/$nor/$not`).
- `validateUpdate` → `UpdateAst` (operator set from Req 4.2; rejects mixing operators with plain fields; rejects conflicting paths).
- `validateProjection`, `validateSort`, `validatePipeline`.

### 4. Reads and cursors (Req 3)

```ts
interface PortableReadCollection<T> {
  // existing
  findById(id): Promise<T | null>;
  findOne(filter?, options?): Promise<T | null>;
  find(filter?, options?): Cursor<T>;
  // new
  countDocuments(filter?): Promise<number>;
  distinct<K extends keyof T>(field: K, filter?): Promise<unknown[]>;
  explain(filter?, options?): Promise<ExplainResult>;
  aggregate(pipeline): AggregateCursor;
}
```

- A cursor captures the root at creation (`snapshot()`), plans against that snapshot, and iterates through an `AsyncGenerator`. `close()` and exhaustion call `return()` on the generator, releasing readers.
- "Pick one" operations call `selectOne(plan, sort)`, which appends `_id` as the final sort key; with no sort it uses UTF-8 `_id` order (Req 3.6). This helper is shared by `findOne`, `updateOne`, `deleteOne`, `replaceOne`, and `findOneAnd*`.
- `distinct` flattens arrays and skips missing; it uses the same traversal as filters.
- Existing `findMatching` is refactored to go through the planner, keeping its current `_id` fast path as the `idLookup` plan.

### 5. Writes (Req 4, 5)

All filter-based writes use one internal primitive:

```ts
commitWithLock<R>(fn: (tx: StagedTx) => Promise<R>): Promise<R>
```

which takes the writer lock, pins the head, runs `fn` against a staging view (reads see staged writes), then publishes once. This is the same mechanism `writeBatch` uses today, extracted so that `updateMany` etc. do not re-implement lock handling.

`updateOne(filter, update, { upsert, arrayFilters, sort })`:

1. Validate filter and update (outside the lock).
2. Take lock; select via `selectOne` on the staging view.
3. Apply `UpdateAst` to a copy; reject `_id` change (`ImmutableId`).
4. If unchanged → `{matched:1, modified:0}`, no staging, no commit.
5. Stage `replace` via the existing `replace()` path (which maintains indexes).
6. On no match + upsert: build base doc from filter equalities, apply update with `$setOnInsert` enabled, stage `insert`.
7. Publish; return counts.

`findOneAnd*` reuse the same code path with `returnDocument: 'before' | 'after'` and `projection`.

The update engine is a new module in `ops/write/update-engine.ts`. It may be seeded from v1 logic only after corpus cases exist for each operator (Req 1.4). Positional and `arrayFilters` support is gated behind capability `update.arrayFilters` and ships only when its match rules are written into the corpus (Req 4.7).

### 6. Bulk writes (Req 6)

```ts
bulkWrite(ops: BulkOp[], { ordered = true }): Promise<BulkWriteResult>

interface BulkWriteResult {
  ok: boolean;
  items: Array<
    | { index: number; status: 'ok'; matched?: number; modified?: number; deleted?: number; upsertedId?: string }
    | { index: number; status: 'error'; error: BrightDbError }
    | { index: number; status: 'skipped' }   // ordered: after first error
  >;
  counts: { inserted: number; matched: number; modified: number; deleted: number; upserted: number };
}
```

Execution: take lock once, pin head, for each item open a **savepoint** on the staging view. On item error, roll back to the savepoint (so no document or index change remains, Req 6.5). Ordered stops; unordered continues. After the loop, publish once. The commit is one head update for all surviving items.

Publication failure maps to `CommitFailed`, or `CommitOutcomeUnknown` when the head write's result cannot be read back (the writer re-reads the head on reopen and the result carries the intended root digest so the caller can check).

Savepoint support is the main engine change: the staging view needs `mark()` / `rollbackTo(mark)` over document staging and index staging (`noteEntry`). Design it as an undo log of `(collection, key, previousRecord)` plus index entry deltas.

### 7. Transactions (Req 7)

```ts
transaction<R>(fn: (tx: PortableTransaction) => Promise<R>): Promise<R>
```

- `PortableTransaction` mirrors the collection API (`tx.collection(name)`), backed by the staging view and the held writer lock.
- States: `active → committing → committed | aborted`. Any operation error moves to `aborted`-pending; the callback may catch it but commit is skipped and `TransactionAborted` is thrown after the callback returns (Req 7.8).
- Nested `db.transaction` inside a callback throws `TransactionNested` (detected through an async-local marker).
- After the callback settles the handle's state becomes `closed`; further use throws `TransactionClosed`.
- Commit: single `persist()`. If persist throws, map to `CommitFailed` / `CommitOutcomeUnknown`.
- Lock-held design means no write-write conflicts locally. The `Conflict` outcome is reserved for a future optimistic mode and for storage-level head races between processes; both surface as a typed error, never a silent retry.

### 8. Indexes and planner (Req 9, 10)

Plan kinds: `idLookup`, `indexEquality`, `indexRange`, `indexScanOrdered` (for sort), `collectionScan`.

Planner algorithm (conservative):

1. Normalize filter AST into top-level conjuncts. If any `$or/$nor/$not` is at the top level that cannot be split, use scan.
2. For each index, count the leading fields with equality conjuncts, then at most one range conjunct on the next field.
3. Reject an index whose fields involve array traversal when the predicate's meaning on arrays differs from index entry semantics (multikey). In that case use the index only for candidate generation and re-evaluate the full predicate (residual), deduplicating by `_id` **before** `limit` (Req 9.2).
4. Sort satisfied by index only if direction and field order match and no multikey/missing-value ambiguity exists; otherwise sort in memory (bounded).
5. Choose by lowest estimated keys examined; ties break on index name for determinism.

`explain` returns:

```ts
interface ExplainResult {
  kind: PlanKind;
  index?: string;
  keysExamined: number;
  docsExamined: number;
  blockReads: number;
  residual: boolean;
  sortInMemory: boolean;
}
```

Counters come from instrumentation on the storage reader (a counting wrapper), which also feeds the release-gate work counters (Req 24.7).

Equivalence harness: for every corpus case with `plan: indexed`, run again with `hint: 'forceScan'` and compare results (Req 9.5). `hint` is a test/ops option, not a persisted setting.

Index options: sparse and partial are expressed as options on `createIndex`. Storing them is a persisted change, so they ride the format-extension process (Req 10.3, 26.2). Until the decision lands, `createIndex` rejects options with `Unsupported`. Unique is gated by Req 8.4 (single-writer pools only at first; replicated modes reject with `UniqueUnsupported` until the merge-violation outcome is specified).

### 9. Aggregation (Req 11)

Pipeline compiled to a chain of async-iterator stages over one snapshot.

- Streaming stages: `$match`, `$project`, `$skip`, `$limit`, `$unwind`, `$lookup` (equality, per-input-doc indexed lookup against the foreign snapshot if an index exists, else a hashed in-memory build side bounded by the memory limit).
- Blocking stages: `$sort` (external-free, bounded; fails with `MemoryBoundExceeded`), `$group` (hash table bounded), `$count`.
- `$match` at the start is pushed into the planner; `$match` + `$sort` + `$limit` prefixes may use an index.
- Memory bound default is configurable on the database (default 64 MiB), reported in the error.
- Expressions in `$group`/`$project` are limited to a documented set (field refs, literals, `$sum`, `$avg`, `$min`, `$max`, `$first`, `$last`, `$push`, `$addToSet`, `$count`).

### 10. Import/export (Req 12)

Node-side streaming (`test-support`-style Node module, exported from the package's node entry):

- `exportCollection(db, name, { format: 'ndjson' | 'json' | 'extendedJson', sink })` reads from a pinned snapshot, writes through an async iterable to a `Writable`.
- `importCollection(db, name, { format, source, mode: 'atomic' | 'chunked', chunkSize, onConflict })` parses incrementally, validates each document (size, `_id` string), and stages in chunks.
- `ConversionReport { converted, lossy: Array<{docIndex, path, reason}>, rejected: Array<{docIndex, reason}> }` is returned and optionally streamed.
- Atomic mode builds a single batch bounded by a configurable limit; if exceeded, fails before staging. Chunked mode publishes per chunk and reports the last published root so a failed import can be resumed.
- Extended JSON: a small, explicit subset (`$oid`, `$date`, `$numberLong`, `$numberDecimal`, `$binary`). Others are reported as unsupported/lossy; no silent coercion.

### 11. Backup and restore (Req 13)

- `backup(db, { root?, target })`: takes a retention hold on `root` (defaults to current head) through the existing `keepRoots` mechanism used by `collectGarbage`, walks reachable blocks via `reachable.ts`, writes them to a target store/directory, then writes a manifest `{ root, databaseId, blockCount, bytes, createdAt(BrightDate) }`. The hold is released in `finally`.
- Encryption: blocks are copied in the form defined by the target store; a backup of an encrypted source either re-seals with a supplied key ring or copies ciphertext with key-id metadata. Key material is never logged.
- `restore(source, target)`: copies blocks, then verifies by `at(root)` followed by a full reachable walk, checking digests and that every descendant exists. The head is published only after verification.
- Progress through a callback `{phase, done, total}`. Interrupted runs leave the target without a published head, so a restart is clean.

### 12. Subscribe (Req 14)

No code change beyond documentation and corpus cases that assert coalescing is permitted (tests accept ≥1 event, final root correct). The durable feed is deferred.

### 13. Service (Req 15)

A BrightDB-native service surface layered on the existing block-server and pool code:

- Request/response DTOs: base data interfaces in `brightchain-lib`; Express response types in `brightchain-api-lib`.
- Auth and per-pool authorization middleware; every operation resolves `(principal, pool, operation)` through a policy check before reaching the Core.
- `GET /health`, `GET /metrics` (operation counts, error categories, commit latency histogram, GC stats).
- The block-source HTTP endpoint stays a replica transport with its own bearer token; docs state this explicitly.

### 14. Conformance: corpus (Req 16)

Manifest schema (versioned, JSON, validated by a schema at load):

```ts
interface CorpusManifest {
  version: number;
  capabilities: CapabilityDef[];     // id, family, description, requiresFormatExt?
  cases: CorpusCase[];
}

interface CorpusCase {
  id: string;                        // stable, e.g. 'write.updateOne.upsert.setOnInsert.001'
  family: 'lifecycle' | 'docs' | 'bulk-tx' | 'index-agg' | 'history-files' | 'replication';
  requires: string[];                // capability ids
  kind: 'positive' | 'boundary' | 'error';
  runtimes: Array<'node' | 'browser' | 'cpp' | 'service'>;
  topologies: string[];              // profile ids
  ordering: 'strict' | 'unordered' | 'sortedBy:<spec>';
  initial: StateSpec;                // collections, docs, indexes, attachments
  steps: Step[] | { seed: number; schedule: ScheduleSpec };
  expect: {
    returns?: unknown[];             // per step
    error?: { step: number; category: string; code?: string };
    state?: StateSpec;               // visible state after steps
    root?: string;                   // only for format-fixture cases
  };
  source: 'reviewed' | 'model' | 'mongo-reference' | 'golden';
  tags?: string[];                   // e.g. 'bsonDifference'
}
```

**Inventory test:** loads the manifest and the adapter capability declarations, then asserts for every advertised capability: ≥1 positive, ≥1 boundary, ≥1 error case; and after a run, that every case required by the lane has a recorded result (not skipped-by-accident). The lane runner fails on zero executed cases (Req 23.4).

### 15. Conformance: model (Req 17.1–17.3)

`conformance/model/` is a deliberately small, separately-written implementation: documents as a `Map<collection, Map<id, JsonValue>>`, a naive filter evaluator written from the spec in this document (not importing `ops/semantics`), snapshots as immutable copies, tombstones with versions, and merge as per-record last-writer-wins by `(version, writerId)`. Generators produce operation sequences from a seed; failures shrink by delta-debugging the operation list and by simplifying documents; the shrunk trace is written as a corpus-case JSON that replays without the generator.

To keep the model independent, a lint rule (`no-restricted-imports`) forbids `conformance/model/**` from importing `ops/**`, `index-key`, `merge`, or `portable-core`.

### 16. Conformance: MongoDB reference (Req 17.4–17.6, 17.8)

A maintainer command `nx run brightchain-db:conformance-refgen` starts a pinned `mongod` (container digest recorded) and runs the compatible-subset cases, writing `fixtures/reference/<mongo-version>/<case-id>.json` with `{ mongoVersion, settings, normalized }`. Normalization removes ObjectIds, clocks, and sorts unordered outputs. The generator lives in test tooling; `mongodb` driver is a devDependency of the tooling only, never of a shipped package (Req 17.8). A CI check fails if a reference file changes without the file's review marker being updated.

### 17. Conformance: adapters (Req 18)

```ts
interface ConformanceAdapter {
  readonly runtime: 'node' | 'browser' | 'cpp' | 'service';
  readonly capabilities: ReadonlySet<string>;
  open(profile: ProfileConfig): Promise<AdapterSession>;
}
interface AdapterSession {
  run(step: Step): Promise<StepResult>;  // throws Unsupported for unadvertised ops
  readState(spec: StateQuery): Promise<StateSpec>;
  root(): Promise<string>;
  close(): Promise<void>;
}
```

- **Node:** direct calls to `PortableBrightDb`.
- **Browser:** Playwright drives a page that loads the built bundle; steps are marshalled through `page.evaluate`; IndexedDB profile real, in-memory profile for speed. A second engine (WebKit or Firefox) is added in scheduled runs.
- **C++:** a CLI/FFI shim built from a pinned revision accepts step JSON on stdin and returns result JSON; the adapter spawns it per session. Capability list comes from the shim's `--capabilities` output.
- **Service:** HTTP client against a spawned service process.

The adapter normalizes only error category mapping and unordered results.

### 18. Conformance: topology harness and faults (Req 20–22, 25)

`harness/` (Node-only):

- `ProcessCluster`: spawns N node processes (TypeScript HTTP replica, C++ replica, BrightChain pool node) with separate data dirs and writer IDs. Readiness through a `/health` poll with a bounded timeout and diagnostics capture of stdout/stderr on failure.
- `NetworkController`: a TCP/HTTP proxy in front of each node, supporting partition groups, delay, drop, duplicate, reorder, and per-path rules (e.g. withhold block digest X, corrupt chunk Y). All rules are driven by a seeded PRNG and a named phase.
- `FaultController` (embedded): wraps `BrightDbV2Storage` with named hook points:

| Phase | Hook |
| --- | --- |
| `beforeBlockDurable` | before `writeBlocks` fsync |
| `afterStaging` | after blocks written, before manifest/head work |
| `beforeHeadReplace` | immediately before head swap |
| `afterPublishBeforeAck` | after head swap, before returning to caller |

  A fault is `{ phase, action: 'crash' | 'throw' | 'diskFull' | 'eacces', nth }`. `crash` is implemented by terminating the child process (disk profile) or by discarding the in-memory store handle and reopening from persisted state (IDB profile).
- `RunRecorder`: logs the operation and fault trace and each node's root/error; on failure writes the artifact described in Req 25.3, passing all strings through a redactor that drops key material and bearer tokens.
- `replay`: `CONFORMANCE_ARTIFACT=<path> nx run brightchain-db:conformance-replay` re-creates the topology, seed, and schedule.

Cluster trace (Req 22) is one named scenario, `cluster.trace.001`, implemented as a scripted schedule on `ProcessCluster` with `NetworkController` rules. Its assertions are listed step by step in the tasks.

### 19. CI and release gates (Req 23, 24)

Nx targets on `brightchain-db`:

| Target | Lane | Contents |
| --- | --- | --- |
| `conformance-pr` | PR | corpus (node, in-memory + loose disk), inventory test, deterministic seeds (fixed list), targeted fault cases, browser smoke, HTTP smoke (3 procs) |
| `conformance-cpp` | PR when shared bytes change | build pinned C++ rev, run shared corpus |
| `conformance-nightly` | scheduled | 3-node partition/restart matrix, browser expansion, mixed handoff, encryption×packing, live Mongo comparison, large generated workloads, cloud emulators |
| `conformance-release` | release | packaged install from tarball, standalone + clustered, backup/restore, crash/reopen, bidirectional handoff, perf table |
| `conformance-replay` | manual | consume failure artifact |

A lane runner reads a lane definition listing required profiles and cases; it fails on missing tools (browser, C++ toolchain, Docker) and on zero executed cases.

Performance: the counting storage wrapper records `blockReads`, `keysExamined`, `docsExamined`, `bytesWritten`. PR checks assert those counters against checked-in budgets with tolerance bands. Latency (p95 query/commit, convergence time) is measured only in release/scheduled lanes, and the report includes machine, Node version, and workload description.

## Data Models

Corpus and model types are as above. Persisted data models are unchanged. The only new persisted items are deferred behind the format-extension process:

- Index options (`unique`, `sparse`, `partialFilter`) in the index definition record.
- Retained commit history / change feed positions.

For each, the extension decision document must include: record layout, version marker, old-reader behavior (refuse to open vs ignore-and-warn), TypeScript and C++ golden fixtures, and migration notes.

## Correctness Properties

1. **Validation-before-write:** for any invalid input I and any state S, executing a write with I leaves root(S) unchanged and throws a typed error.
2. **Index/scan equivalence:** for any filter, sort, limit and state, the indexed plan result equals the forced-scan result.
3. **Atomic publication:** after any crash at a named publication phase, the reopened root is exactly the pre-commit root or exactly the post-commit root.
4. **Bulk item isolation:** a failed bulk item leaves no document or index difference from the state before that item.
5. **Transaction abort:** an aborted transaction leaves the root unchanged.
6. **Snapshot stability:** a cursor or aggregation returns the same result set regardless of concurrent commits after it started.
7. **Convergence:** after healing and bidirectional pulls, all replicas have equal roots; replaying pulls leaves heads unchanged (idempotence).
8. **Compare/index-key agreement:** `compare(a,b)` has the same sign as byte comparison of encoded index keys.
9. **Model agreement:** for generated operation sequences within the supported single-writer domain, production visible state equals model state.
10. **Backup fidelity:** `restore(backup(db, root))` has root equal to `root` and passes full reachability verification.

## Error Handling

- Validation errors: thrown synchronously from the async method before the lock is taken.
- Item errors in bulk: captured per item; never thrown unless `ordered` and the caller opts into `throwOnError`.
- Storage errors: wrapped as `CommitFailed` with the cause; if publication state cannot be determined, `CommitOutcomeUnknown` with `intendedRoot` so a caller can check `root()` after reopen.
- Adapter unsupported operations: `Unsupported`, recorded as skipped-by-capability.
- Harness failures: always write a failure artifact, then fail the lane.

## Testing Strategy

- Unit tests next to each module (`*.spec.ts`), Jest through Nx (`yarn nx test brightchain-db`; note the flag is `--testPathPatterns`).
- Corpus is the primary behavioral test; module unit tests cover internals.
- Property tests use `fast-check` (check it is already a dependency before adding) for model comparison, compare/index agreement, and index/scan equivalence, with seeds printed on failure.
- Integration tests for HTTP replicas and pools run through the harness, not ad hoc scripts.
- Per workspace convention, helper scripts are written as `.ts` files, not raw node one-liners.

## Changes made while building Phase 1

The design above is the target. Phase 1 settled these details differently or
more precisely, and later phases should follow the code:

- **Error class.** `BrightDbOperationError` (in `ops/errors.ts`), not `BrightDbError`, which v1 already exports. New categories: `InvalidDocument` (non-string or out-of-range `_id`) and `WrongDatabase` (merging an unrelated database).
- **Expectations are per step.** Each step carries `expect: { returns } | { error }`; the case-level `expect` holds only the final `state`. Wildcards: `"$any"`, `"$id"`, `{ "$partial": true, ... }`. State documents compare as a set.
- **`StepOutcome`** is `{ ok, value?, error? }`, read through `errorOf()`. The library tsconfig is strict, so narrowing on a union was not reliable across the two build configs.
- **Corpus layout.** Cases live as JSON, one file per family, in `fixtures/conformance/corpus/`. The capability matrix lives in code (`capabilities.ts`) so there is one place that says what BrightDB claims. The loader merges both and validates.
- **Known divergences.** A case tagged `knownDivergence` states the intended behavior. It runs as status `known-divergence` while it fails, becomes a hard failure when it passes (so the tag cannot go stale), and does not count toward capability coverage. `DIFFERENCES.md` is generated from the tags and checked by a test.
- **The model is an adapter.** `ModelAdapter` implements `ConformanceAdapter`, so it runs the reviewed corpus (with known-divergence tags stripped, since it implements the intended behavior) and serves as the oracle for generated sequences. Indexes are not modelled.
- **Generator scope.** Generated runs avoid recorded divergences by default (`avoidKnownDivergences`), and replicas create collections before forking. `CONFORMANCE_INCLUDE_KNOWN=1` switches the first off; `CONFORMANCE_SEEDS=start:count` widens the range.
- **Lanes run through Jest.** `conformance-pr` is the Nx jest executor over the conformance and v1 conformance specs with `passWithNoTests: false`. `conformance-replay` runs one artifact through Jest, since no TypeScript script runner is installed.
- **Failure artifacts** are `{ version, case, profile, seed?, message? }` under `dist/conformance-failures/`. A bare corpus case also replays.

### Fixes from the pre-commit review (findings 6.1 to 6.12 and 6.17)

These tightened the framework so it cannot pass without checking what it claims to check. Each changes what a later phase may rely on.

- **6.1, ordering.** `unordered` now applies only to the top-level result set being compared (the array itself, or the documents of a state). Arrays inside an item, such as a document's array fields and an index's `fields`, are always compared in order (Req 18.2).
- **6.2 and 6.3, root comparisons.** `rootsEqual` has a second form, `args.savedRoot`, which compares the current root with one saved by `saveRoot`. Exactly one of `other` and `savedRoot` is required. An unknown saved name fails with `NotFound` and code `unknown_saved_root`. `replication.merge.idempotent.001` and the bulk-tx failed-batch case now compare against the saved root instead of `main` against itself or `$any`.
- **6.4, manifest validation.** Unknown keys are rejected at every level (manifest, capability, case, step, `expect`, `expect.error`, states, indexes). A case must hold at least one real assertion: a step `returns` other than `"$any"`, a step `error`, `expect.state` or `expect.databases`. Step arguments are checked per op by a table typed over every `StepOp`, so a new op does not compile until its arguments are described.
- **6.5, replay lane.** `conformance-replay` sets `CONFORMANCE_REPLAY=1`. In that mode a missing artifact path, or an unreadable or invalid file, fails the run instead of skipping it. The artifact path is passed in the `CONFORMANCE_ARTIFACT` environment variable, not interpolated into the command line (Nx substitutes `{args.*}` as raw text and does not interpolate `env` values), so any path works. The printed `Replay:` hint shell-quotes the path and artifact file names are sanitized.
- **6.6, frozen artifacts.** `freezeCase` records the final state of every database the differential compares, not only `main`. The extra states go in a new case field, `expect.databases` (a map from database name to `StateSpec`), which must name a database a step creates or forks. `runCase` checks each one, so a mismatch shrunk down to a replica fails on replay.
- **6.7, shrinking.** `shrinkCase` records the signature of the first disagreement (the step op and kind of difference, or the database for a state difference, with no step numbers) and accepts a candidate only if it disagrees with the same signature. Removing a `saveRoot` can no longer swap the original failure for a new one. A case that does not disagree is returned unchanged.
- **6.8, negative tests.** `differential.negative.spec.ts` runs `compareToModel`, `shrinkCase` and `freezeCase` against `FaultyAdapter` (in `test-support/conformance/`), a correct adapter with one deliberate fault: a lossy replace, a replica-only loss, a wrong error category or code, a wrong returned id, and a refused insert.
- **6.9, model filters.** The model validates the whole filter (every field, every operator, operand types) before evaluating any document, so an invalid operator cannot hide behind an earlier false one, and an empty or missing collection is validated the same way.
- **6.10, error codes.** `ops/errors.ts` declares `BRIGHTDB_ERROR_CODES` (`unknown_operator`, `malformed_operand`, `malformed_filter`, `unknown_saved_root`, `unsupported_op`, `unknown_profile`) and the `BrightDbErrorCode` type. `BrightDbOperationError`, `NormalizedError`, the model, the node adapter and `StepExpect.error.code` all use it, and the manifest rejects a code outside the list. The differential now compares the code as well as the category, since a code the model reports and the subject omits is a disagreement. Frozen artifacts therefore carry a code only when the model reported one. `docs.read.unknownOperator.001` is a preserved `knownDivergence` case and intentionally expects only the `InvalidFilter` category, with no code, until production rejects the unknown operator. Code comparison is covered by the negative differential test (`differential.negative.spec.ts`, the wrong-code fault) and by the model spec.
- **6.11, captures.** A string in `returns` or in a state can be `"$id:name"` (a generated 32-hex id) or `"$bind:name"` (any value). The first use of a name binds it for the rest of the case and every later use must equal it. `docs.insertOne.generatedId.001` uses `"$id:inserted"` for the returned id, the `find` result and the final state, so an `insertOne` that returns an id other than the one it stored now fails. Captures bind on a copy while an unordered match tries candidates, so a candidate that fails binds nothing.
- **6.12, same-counter ties.** Two replicas writing one record at the same counter are decided by the higher writer ID. The adapter contract now says an adapter that can choose writer IDs gives a session's databases the ordinals 1, 2, 3 in creation order (`main`, then each `create` and `fork`), as fixed-width IDs. The node adapter does this for the memory profile only; a directory store picks a random writer ID. The model assigns writer ordinals per session and compares them as numbers (this also removes the per-process writer counter and the `'w10' < 'w9'` text comparison from 6.13; the database and generated-id counters are still module-level). Coverage: `replication.merge.sameCounterConverges.001` (memory and disk: both replicas end on the same one of the two versions) and `replication.merge.sameCounterHigherWriterWins.001` (memory only: the later-created writer wins in both merge directions). The generator's `contested` option makes both sides rewrite a shared record at the same counter right after the fork and lets the replica write shared records afterwards. It is used on the memory profile only and its cases list only `memory`.
- **6.17, seeds.** `CONFORMANCE_SEEDS` is parsed by `parseSeedRange`. Unset or blank means `1:40`. Anything that is not `start:count` with non-negative safe integers and a count of at least 1 throws, so a typo cannot run zero sequences.

### Deviations from the design, recorded (finding 6.21)

The code differs from the design above in these places. Later phases should follow the code, or change it deliberately:

- **No `sortedBy:<spec>` ordering.** `Ordering` is `strict | unordered`. A case that needs a defined sort order for results asserts it with `strict` and an explicit sort in the step.
- **Nested results are compared in order.** `unordered` applies only to the top-level result set (6.1). A future op that returns an object holding a list, such as `{items: [...]}`, gets that list compared in order. A case that needs it unordered has to wait for `sortedBy:<spec>` or a per-path ordering.
- **No `{ seed, schedule }` step form.** `CorpusCase.steps` is always an array of steps. A generated case is expanded from its seed into plain steps, so a shrunk or frozen case replays without the generator. The schedule form arrives with fault injection in a later phase.
- **A smaller adapter contract.** An adapter has `open(profile, initial?)` returning a session with `run(step)`, `readState(db?)` and `close()`. There is no `root()` and no `readState(StateQuery)`: the root is the `root` step, and a state read returns whole collections.
- **`NormalizedError` has `category`, `code?` and `message`, with no `path` or `operator`.** `BrightDbOperationError` carries both, but they are dropped on normalization, so a case cannot yet assert the offending path or operator (Req 1.2). Add them to `NormalizedError`, `StepExpect.error` and the manifest checks before Phase 2 validation cases need them.
- **Seven error categories were added to the design's list.** `InvalidDocument` and `WrongDatabase` are noted above. `AlreadyExists`, `NotFound`, `Closed`, `MissingBlock` and `Unknown` are not named in the design. A case must never expect `Unknown`.
- **The registry is not exported from the package entry point.** `ops/errors.ts` is imported by path inside the package. Req 1.5 expects one registry shared across runtimes, so export it from `src/index.ts` when the first consumer outside the package needs it.
- **Step vocabulary and case fields added in the fixes above:** `rootsEqual` with `args.savedRoot`, per-op argument validation, `expect.databases`, the `$id:name` and `$bind:name` captures, `CONFORMANCE_REPLAY`, and the `contested` generator option.

## Risks and Open Decisions

| Item | Risk | Resolution path |
| --- | --- | --- |
| Savepoints in the staging view | Touches index staging code in `portable-core.ts` | Land with unit tests first (Task 4.1) before bulk and transactions |
| Unique index on mergeable replicas | Concurrent violating writes cannot be prevented locally | Single-writer pools only until merge outcome is specified (Req 8.3/8.4) |
| C++ shim | Requires a stable CLI/FFI surface in the port | Define `--capabilities` + step JSON protocol first; the port team (same maintainer) implements incrementally |
| BrightChain pool v2 service path | Req 20.5 says to establish it first; it may not exist yet | Task 12.1 audits and, if missing, builds the minimal path before the lane |
| Aggregation memory bound | No spill-to-disk | Documented failure; spill is a follow-on |
| Mongo reference drift | Pinned version may lag | Pin by digest; refresh is an explicit maintainer command |
