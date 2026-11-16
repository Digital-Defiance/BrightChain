/**
 * Types for the BrightDB v2.5 operation corpus: the cases, the adapter
 * contract that runs them, and the reports a run produces. Platform neutral,
 * so the same manifest drives Node, the browser, C++ and service adapters.
 */
import type {
  BrightDbErrorCategory,
  BrightDbErrorCode,
  NormalizedError,
} from '../ops/errors';

export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json };

export const RUNTIMES = ['node', 'browser', 'cpp', 'service'] as const;
export type Runtime = (typeof RUNTIMES)[number];

export const FAMILIES = [
  'lifecycle',
  'docs',
  'bulk-tx',
  'index-agg',
  'history-files',
  'replication',
] as const;
export type Family = (typeof FAMILIES)[number];

export const CASE_KINDS = ['positive', 'boundary', 'error'] as const;
export type CaseKind = (typeof CASE_KINDS)[number];

export const CASE_SOURCES = [
  'reviewed',
  'model',
  'mongo-reference',
  'golden',
] as const;
export type CaseSource = (typeof CASE_SOURCES)[number];

/**
 * `strict` compares arrays in order. `unordered` lets only the top-level
 * result set (the array being compared) come back in any order; arrays inside
 * its items are still compared in order.
 */
export type Ordering = 'strict' | 'unordered';

/** A named, advertisable feature. */
export interface CapabilityDef {
  id: string;
  family: Family;
  description: string;
  /** True when shipping it needs a persisted format change (requirement 26). */
  requiresFormatExtension?: boolean;
}

/**
 * Operations a step can run. Phase 1 covers what v2 offers today. Later
 * phases add operations here as they land, each behind a capability.
 */
export const STEP_OPS = [
  'createCollection',
  'dropCollection',
  'insertOne',
  'insertMany',
  'replaceById',
  'deleteById',
  'findById',
  'findOne',
  'find',
  'createIndex',
  'dropIndex',
  'listIndexes',
  'findByIndex',
  'listCollections',
  'writeBatch',
  'root',
  'saveRoot',
  'findAt',
  'create',
  'fork',
  'merge',
  'rootsEqual',
  'reopen',
  'close',
] as const;
export type StepOp = (typeof STEP_OPS)[number];

export interface StepExpect {
  /**
   * The step's normalized return value. Wildcards: the string `"$any"`
   * matches anything, `"$id"` matches a generated 32-hex ID, and an object
   * holding `"$partial": true` matches any object containing its other keys.
   * Two captures tie values together across the whole case: `"$id:name"`
   * is a generated 32-hex ID, and `"$bind:name"` is any value. The first
   * place a name appears binds it, and every later place must equal it.
   */
  returns?: Json;
  /** The step must fail with this category (and code, when given). */
  error?: { category: BrightDbErrorCategory; code?: BrightDbErrorCode };
}

export interface Step {
  op: StepOp;
  /** Which database the step runs on. Defaults to `main`. */
  db?: string;
  collection?: string;
  args?: { [key: string]: Json };
  expect?: StepExpect;
}

export interface CollectionState {
  docs: Json[];
  indexes?: Array<{ name: string; fields: string[] }>;
}

/** The visible state of a database: its collections, documents and indexes. */
export interface StateSpec {
  collections: { [name: string]: CollectionState };
}

export interface CorpusCase {
  /** Stable and unique, e.g. `docs.insertOne.generatedId.001`. */
  id: string;
  family: Family;
  description?: string;
  /** Capability IDs this case needs. The adapter must advertise all of them. */
  requires: string[];
  kind: CaseKind;
  runtimes: Runtime[];
  /** Profile IDs the case applies to, e.g. `memory`, `disk`. */
  topologies: string[];
  ordering: Ordering;
  initial?: StateSpec;
  steps: Step[];
  expect?: {
    /** Compared against `main` after the steps, documents sorted by `_id`. */
    state?: StateSpec;
    /**
     * Compared against other databases, by name, after the steps. Each name
     * must be created or forked by a step. Needed to pin down a replica.
     */
    databases?: { [name: string]: StateSpec };
  };
  source: CaseSource;
  tags?: string[];
}

export interface CorpusManifest {
  /** Manifest schema version. Bump when the case shape changes. */
  version: number;
  capabilities: CapabilityDef[];
  cases: CorpusCase[];
}

export const MANIFEST_VERSION = 1;

/** What an adapter returns for one step. */
export interface StepOutcome {
  ok: boolean;
  /** Set when `ok` is true. */
  value?: Json;
  /** Set when `ok` is false. Read it through `errorOf`. */
  error?: NormalizedError;
}

/** The error of a failed outcome. An outcome that failed without one is a bug in the adapter. */
export function errorOf(outcome: StepOutcome): NormalizedError {
  return (
    outcome.error ?? {
      category: 'Unknown',
      message: 'adapter reported a failure without an error',
    }
  );
}

export interface ProfileConfig {
  /** `memory`, `disk`, and later `idb`, `packed`, `encrypted`... */
  id: string;
}

export interface AdapterSession {
  run(step: Step): Promise<StepOutcome>;
  /** The visible state of `db` (default `main`), documents sorted by `_id`. */
  readState(db?: string): Promise<StateSpec>;
  close(): Promise<void>;
}

/**
 * Writer IDs: a replica's writer ID breaks a tie when two replicas write the
 * same record at the same counter, the higher ID winning. An adapter that can
 * choose writer IDs gives the databases of a session, in creation order
 * (`main` first, then each `create` and `fork`), the ordinals 1, 2, 3, ...
 * as fixed-width IDs, which is how the model orders them. A profile that
 * cannot do this (a directory store picks its own random ID) must not run a
 * case whose outcome depends on which writer wins.
 */
export interface ConformanceAdapter {
  readonly runtime: Runtime;
  /** Capability IDs this adapter implements. Never emulate one it lacks. */
  readonly capabilities: ReadonlySet<string>;
  /** Profile IDs this adapter can run. */
  readonly profiles: ReadonlySet<string>;
  open(profile: ProfileConfig, initial?: StateSpec): Promise<AdapterSession>;
}

export type CaseStatus =
  | 'passed'
  | 'failed'
  | 'skipped-by-capability'
  | 'skipped-by-runtime'
  | 'skipped-by-profile'
  /**
   * A case tagged `knownDivergence` that fails, as expected. The case states
   * the behavior BrightDB is meant to have; it fails until that is built.
   */
  | 'known-divergence';

/** Tag marking a case that asserts a target behavior not yet implemented. */
export const KNOWN_DIVERGENCE_TAG = 'knownDivergence';
/** Tag marking a deliberate, permanent difference from BSON/MongoDB behavior. */
export const BSON_DIFFERENCE_TAG = 'bsonDifference';

export interface CaseResult {
  id: string;
  status: CaseStatus;
  /** Why it failed or was skipped. Empty when it passed. */
  messages: string[];
}

export interface RunReport {
  runtime: Runtime;
  profile: string;
  results: CaseResult[];
  counts: Record<CaseStatus, number>;
}
