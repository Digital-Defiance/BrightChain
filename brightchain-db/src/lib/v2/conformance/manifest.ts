/**
 * Loading and validating the operation corpus. A manifest that fails
 * validation never reaches a runner, so a typo in a case cannot turn into a
 * silently skipped or vacuously passing test. Platform neutral: it takes
 * parsed JSON, and the Node-only file loader lives in test-support.
 */
import { isBrightDbErrorCategory, isBrightDbErrorCode } from '../ops/errors';
import type { PortableWriteOperation } from '../portable-core';
import { CAPABILITIES } from './capabilities';
import {
  CASE_KINDS,
  CASE_SOURCES,
  FAMILIES,
  MANIFEST_VERSION,
  RUNTIMES,
  STEP_OPS,
  type CapabilityDef,
  type CorpusCase,
  type CorpusManifest,
  type StepOp,
} from './types';

export class CorpusValidationError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(
      `Invalid BrightDB corpus (${problems.length} problem${problems.length === 1 ? '' : 's'}):\n- ${problems.join('\n- ')}`,
    );
    this.name = 'CorpusValidationError';
  }
}

/** Steps that cannot run without a `collection`. */
const NEEDS_COLLECTION: ReadonlySet<StepOp> = new Set<StepOp>([
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
  'findAt',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Keys each part of a manifest may carry. Anything else is a typo. */
const MANIFEST_KEYS = ['version', 'capabilities', 'cases'] as const;
const CAPABILITY_KEYS = [
  'id',
  'family',
  'description',
  'requiresFormatExtension',
] as const;
const CASE_KEYS = [
  'id',
  'family',
  'description',
  'requires',
  'kind',
  'runtimes',
  'topologies',
  'ordering',
  'initial',
  'steps',
  'expect',
  'source',
  'tags',
] as const;
const STEP_KEYS = ['op', 'db', 'collection', 'args', 'expect'] as const;
const STEP_EXPECT_KEYS = ['returns', 'error'] as const;
const ERROR_EXPECT_KEYS = ['category', 'code'] as const;
const CASE_EXPECT_KEYS = ['state', 'databases'] as const;
const STATE_KEYS = ['collections'] as const;
const COLLECTION_STATE_KEYS = ['docs', 'indexes'] as const;
const INDEX_KEYS = ['name', 'fields'] as const;

/** Report each key of `value` that is not in `allowed`. */
function checkKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  at: string,
  problems: string[],
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      problems.push(
        `${at}: unknown key ${key} (expected ${allowed.join(', ')})`,
      );
    }
  }
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

/** The value types a step argument can have. */
type ArgType = 'string' | 'object' | 'objectArray' | 'stringArray';

interface ArgSpec {
  required?: Readonly<Record<string, ArgType>>;
  optional?: Readonly<Record<string, ArgType>>;
}

/**
 * The arguments each step takes. Typed over every `StepOp`, so adding an op
 * without saying what it takes does not compile. `rootsEqual` also needs
 * exactly one of `other` and `savedRoot`, checked separately.
 */
const ARG_SPECS: Readonly<Record<StepOp, ArgSpec>> = {
  createCollection: {},
  dropCollection: {},
  insertOne: { required: { document: 'object' } },
  insertMany: { required: { documents: 'objectArray' } },
  replaceById: { required: { id: 'string', document: 'object' } },
  deleteById: { required: { id: 'string' } },
  findById: { required: { id: 'string' } },
  findOne: { optional: { filter: 'object' } },
  find: { optional: { filter: 'object' } },
  createIndex: { required: { name: 'string', fields: 'stringArray' } },
  dropIndex: { required: { name: 'string' } },
  listIndexes: {},
  findByIndex: { required: { name: 'string' }, optional: { query: 'object' } },
  listCollections: {},
  writeBatch: { required: { operations: 'objectArray' } },
  root: {},
  saveRoot: { required: { name: 'string' } },
  findAt: { required: { root: 'string' }, optional: { filter: 'object' } },
  create: { required: { as: 'string' } },
  fork: { required: { as: 'string' } },
  merge: { required: { from: 'string' } },
  rootsEqual: { optional: { other: 'string', savedRoot: 'string' } },
  reopen: {},
  close: {},
};

function hasArgType(value: unknown, type: ArgType): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'object':
      return isRecord(value);
    case 'objectArray':
      return Array.isArray(value) && value.every(isRecord);
    case 'stringArray':
      return isStringArray(value);
  }
}

/** Check a step's `args` against what its op takes. */
function checkArgs(
  op: StepOp,
  rawArgs: unknown,
  at: string,
  problems: string[],
): void {
  if (rawArgs !== undefined && !isRecord(rawArgs)) {
    problems.push(`${at}: args must be an object`);
    return;
  }
  const args: Record<string, unknown> = isRecord(rawArgs) ? rawArgs : {};
  const spec = ARG_SPECS[op];
  const required = spec.required ?? {};
  const optional = spec.optional ?? {};
  checkKeys(
    args,
    [...Object.keys(required), ...Object.keys(optional)],
    `${at} args`,
    problems,
  );
  for (const [key, type] of Object.entries(required)) {
    if (!(key in args)) {
      problems.push(`${at}: ${op} needs args.${key} (${type})`);
    } else if (!hasArgType(args[key], type)) {
      problems.push(`${at}: args.${key} must be ${type}`);
    }
  }
  for (const [key, type] of Object.entries(optional)) {
    if (key in args && !hasArgType(args[key], type)) {
      problems.push(`${at}: args.${key} must be ${type}`);
    }
  }
  if (
    op === 'rootsEqual' &&
    ['other', 'savedRoot'].filter((key) => key in args).length !== 1
  ) {
    problems.push(
      `${at}: rootsEqual needs exactly one of args.other and args.savedRoot`,
    );
  }
  if (op === 'writeBatch' && Array.isArray(args['operations'])) {
    for (const [index, operation] of args['operations'].entries()) {
      if (isRecord(operation)) {
        checkBatchOperation(
          operation,
          `${at} args.operations[${index}]`,
          problems,
        );
      }
    }
  }
}

/**
 * The fields each `writeBatch` operation variant takes, besides `type`. Typed
 * over the production operation union, so a new variant does not compile until
 * it is described here.
 */
const BATCH_SPECS: Readonly<
  Record<PortableWriteOperation['type'], Readonly<Record<string, ArgType>>>
> = {
  createCollection: { collection: 'string' },
  dropCollection: { collection: 'string' },
  insert: { collection: 'string', document: 'object' },
  replace: { collection: 'string', id: 'string', document: 'object' },
  delete: { collection: 'string', id: 'string' },
  createIndex: { collection: 'string', name: 'string', fields: 'stringArray' },
  dropIndex: { collection: 'string', name: 'string' },
};

const isBatchType = (value: unknown): value is PortableWriteOperation['type'] =>
  typeof value === 'string' && Object.hasOwn(BATCH_SPECS, value);

/** Check one `writeBatch` operation: its type, exact keys and value types. */
function checkBatchOperation(
  operation: Record<string, unknown>,
  at: string,
  problems: string[],
): void {
  const type = operation['type'];
  if (!isBatchType(type)) {
    problems.push(
      `${at}: type must be one of ${Object.keys(BATCH_SPECS).join(', ')}`,
    );
    return;
  }
  const fields = BATCH_SPECS[type];
  checkKeys(operation, ['type', ...Object.keys(fields)], at, problems);
  for (const [key, valueType] of Object.entries(fields)) {
    if (!(key in operation)) {
      problems.push(`${at}: ${type} needs ${key} (${valueType})`);
    } else if (!hasArgType(operation[key], valueType)) {
      problems.push(`${at}: ${key} must be ${valueType}`);
    }
  }
}

/** Check the shape of a database state (`initial`, `expect.state`). */
function checkState(value: unknown, at: string, problems: string[]): void {
  if (!isRecord(value)) {
    problems.push(`${at}: must be an object`);
    return;
  }
  checkKeys(value, STATE_KEYS, at, problems);
  const collections = value['collections'];
  if (!isRecord(collections)) {
    problems.push(`${at}: collections must be an object`);
    return;
  }
  for (const [name, collection] of Object.entries(collections)) {
    const where = `${at}.collections.${name}`;
    if (!isRecord(collection)) {
      problems.push(`${where}: must be an object`);
      continue;
    }
    checkKeys(collection, COLLECTION_STATE_KEYS, where, problems);
    if (!hasArgType(collection['docs'], 'objectArray')) {
      problems.push(`${where}: docs must be an array of objects`);
    }
    const indexes = collection['indexes'];
    if (indexes === undefined) continue;
    if (!Array.isArray(indexes)) {
      problems.push(`${where}: indexes must be an array`);
      continue;
    }
    for (const [position, index] of indexes.entries()) {
      if (
        !isRecord(index) ||
        typeof index['name'] !== 'string' ||
        !isStringArray(index['fields'])
      ) {
        problems.push(
          `${where}: indexes[${position}] needs a string name and string fields`,
        );
      } else {
        checkKeys(index, INDEX_KEYS, `${where} indexes[${position}]`, problems);
      }
    }
  }
}

/** The names `create` and `fork` steps give new databases. */
function createdDatabases(steps: unknown): Set<string> {
  const names = new Set<string>();
  if (!Array.isArray(steps)) return names;
  for (const step of steps) {
    if (!isRecord(step) || !isRecord(step['args'])) continue;
    const target = step['args']['as'];
    if (
      (step['op'] === 'create' || step['op'] === 'fork') &&
      typeof target === 'string'
    ) {
      names.add(target);
    }
  }
  return names;
}

/**
 * True when a step expectation asserts something. `"$any"` matches every
 * value, so on its own it does not.
 */
const assertsSomething = (expectation: Record<string, unknown>): boolean =>
  expectation['error'] !== undefined ||
  (expectation['returns'] !== undefined && expectation['returns'] !== '$any');

/**
 * Validate parsed JSON as a corpus manifest. Returns it typed, or throws a
 * `CorpusValidationError` naming every problem found.
 */
export function validateManifest(raw: unknown): CorpusManifest {
  const problems: string[] = [];
  if (!isRecord(raw)) {
    throw new CorpusValidationError(['manifest is not an object']);
  }
  if (raw['version'] !== MANIFEST_VERSION) {
    problems.push(
      `version must be ${MANIFEST_VERSION}, got ${String(raw['version'])}`,
    );
  }
  const capabilities = raw['capabilities'];
  const cases = raw['cases'];
  if (!Array.isArray(capabilities))
    problems.push('capabilities must be an array');
  if (!Array.isArray(cases)) problems.push('cases must be an array');
  checkKeys(raw, MANIFEST_KEYS, 'manifest', problems);
  if (problems.length > 0) throw new CorpusValidationError(problems);

  const capabilityIds = new Set<string>();
  for (const [index, capability] of (capabilities as unknown[]).entries()) {
    const where = `capabilities[${index}]`;
    if (!isRecord(capability) || typeof capability['id'] !== 'string') {
      problems.push(`${where} needs a string id`);
      continue;
    }
    const id = capability['id'];
    checkKeys(capability, CAPABILITY_KEYS, `${where} (${id})`, problems);
    if (capabilityIds.has(id))
      problems.push(`${where}: duplicate capability ${id}`);
    capabilityIds.add(id);
    if (!(FAMILIES as readonly unknown[]).includes(capability['family'])) {
      problems.push(
        `${where} (${id}): unknown family ${String(capability['family'])}`,
      );
    }
    if (typeof capability['description'] !== 'string') {
      problems.push(`${where} (${id}): description must be a string`);
    }
  }

  const caseIds = new Set<string>();
  for (const [index, entry] of (cases as unknown[]).entries()) {
    const where = `cases[${index}]`;
    if (
      !isRecord(entry) ||
      typeof entry['id'] !== 'string' ||
      entry['id'] === ''
    ) {
      problems.push(`${where} needs a non-empty string id`);
      continue;
    }
    const id = entry['id'];
    const at = `${where} (${id})`;
    checkKeys(entry, CASE_KEYS, at, problems);
    if (
      entry['description'] !== undefined &&
      typeof entry['description'] !== 'string'
    ) {
      problems.push(`${at}: description must be a string`);
    }
    if (entry['tags'] !== undefined && !isStringArray(entry['tags'])) {
      problems.push(`${at}: tags must be an array of strings`);
    }
    if (entry['initial'] !== undefined) {
      checkState(entry['initial'], `${at} initial`, problems);
    }
    const caseExpect = entry['expect'];
    if (caseExpect !== undefined) {
      if (!isRecord(caseExpect)) {
        problems.push(`${at}: expect must be an object`);
      } else {
        checkKeys(caseExpect, CASE_EXPECT_KEYS, `${at} expect`, problems);
        if (caseExpect['state'] !== undefined) {
          checkState(caseExpect['state'], `${at} expect.state`, problems);
        }
        const databases = caseExpect['databases'];
        if (databases !== undefined) {
          if (!isRecord(databases)) {
            problems.push(`${at}: expect.databases must be an object`);
          } else if (Object.keys(databases).length === 0) {
            problems.push(
              `${at}: expect.databases must name at least one database`,
            );
          } else {
            for (const [name, state] of Object.entries(databases)) {
              checkState(state, `${at} expect.databases.${name}`, problems);
              if (name === 'main') {
                problems.push(
                  `${at}: expect.databases.main belongs in expect.state`,
                );
              } else if (!createdDatabases(entry['steps']).has(name)) {
                problems.push(
                  `${at}: expect.databases.${name} is never created or forked by a step`,
                );
              }
            }
          }
        }
      }
    }
    if (caseIds.has(id)) problems.push(`${at}: duplicate case id`);
    caseIds.add(id);

    if (!(FAMILIES as readonly unknown[]).includes(entry['family'])) {
      problems.push(`${at}: unknown family ${String(entry['family'])}`);
    }
    if (!(CASE_KINDS as readonly unknown[]).includes(entry['kind'])) {
      problems.push(`${at}: kind must be one of ${CASE_KINDS.join(', ')}`);
    }
    if (!(CASE_SOURCES as readonly unknown[]).includes(entry['source'])) {
      problems.push(`${at}: source must be one of ${CASE_SOURCES.join(', ')}`);
    }
    if (entry['ordering'] !== 'strict' && entry['ordering'] !== 'unordered') {
      problems.push(`${at}: ordering must be strict or unordered`);
    }

    const requires = entry['requires'];
    if (!Array.isArray(requires) || requires.length === 0) {
      problems.push(`${at}: requires must list at least one capability`);
    } else {
      for (const need of requires) {
        if (typeof need !== 'string' || !capabilityIds.has(need)) {
          problems.push(`${at}: requires unknown capability ${String(need)}`);
        }
      }
    }

    const runtimes = entry['runtimes'];
    if (!Array.isArray(runtimes) || runtimes.length === 0) {
      problems.push(`${at}: runtimes must be a non-empty array`);
    } else {
      for (const runtime of runtimes) {
        if (!(RUNTIMES as readonly unknown[]).includes(runtime)) {
          problems.push(`${at}: unknown runtime ${String(runtime)}`);
        }
      }
    }
    const topologies = entry['topologies'];
    if (
      !Array.isArray(topologies) ||
      topologies.length === 0 ||
      topologies.some((topology) => typeof topology !== 'string')
    ) {
      problems.push(`${at}: topologies must be a non-empty array of strings`);
    }

    const steps = entry['steps'];
    if (!Array.isArray(steps) || steps.length === 0) {
      problems.push(`${at}: steps must be a non-empty array`);
      continue;
    }
    let sawErrorExpectation = false;
    let sawAssertion =
      isRecord(caseExpect) &&
      (caseExpect['state'] !== undefined ||
        (isRecord(caseExpect['databases']) &&
          Object.keys(caseExpect['databases']).length > 0));
    for (const [stepIndex, step] of steps.entries()) {
      const stepAt = `${at} step ${stepIndex}`;
      if (
        !isRecord(step) ||
        !(STEP_OPS as readonly unknown[]).includes(step['op'])
      ) {
        problems.push(
          `${stepAt}: unknown op ${isRecord(step) ? String(step['op']) : '?'}`,
        );
        continue;
      }
      checkKeys(step, STEP_KEYS, stepAt, problems);
      const op = step['op'] as StepOp;
      if (step['db'] !== undefined && typeof step['db'] !== 'string') {
        problems.push(`${stepAt}: db must be a string`);
      }
      if (
        step['collection'] !== undefined &&
        typeof step['collection'] !== 'string'
      ) {
        problems.push(`${stepAt}: collection must be a string`);
      }
      if (NEEDS_COLLECTION.has(op) && typeof step['collection'] !== 'string') {
        problems.push(`${stepAt}: ${op} needs a collection`);
      }
      checkArgs(op, step['args'], stepAt, problems);
      const expectation = step['expect'];
      if (expectation !== undefined) {
        if (!isRecord(expectation)) {
          problems.push(`${stepAt}: expect must be an object`);
          continue;
        }
        checkKeys(expectation, STEP_EXPECT_KEYS, `${stepAt} expect`, problems);
        if (assertsSomething(expectation)) sawAssertion = true;
        if (expectation['error'] !== undefined) {
          const error = expectation['error'];
          if (!isRecord(error) || !isBrightDbErrorCategory(error['category'])) {
            problems.push(
              `${stepAt}: expect.error.category is not a known category`,
            );
          } else {
            checkKeys(
              error,
              ERROR_EXPECT_KEYS,
              `${stepAt} expect.error`,
              problems,
            );
            if (error['category'] === 'Unknown') {
              problems.push(
                `${stepAt}: a case must not expect the Unknown category`,
              );
            }
            if (
              error['code'] !== undefined &&
              !isBrightDbErrorCode(error['code'])
            ) {
              problems.push(
                `${stepAt}: expect.error.code ${JSON.stringify(error['code'])} is not a declared error code`,
              );
            }
          }
          if (expectation['returns'] !== undefined) {
            problems.push(
              `${stepAt}: expect cannot have both error and returns`,
            );
          }
          sawErrorExpectation = true;
        }
      }
    }
    if (entry['kind'] === 'error' && !sawErrorExpectation) {
      problems.push(
        `${at}: an error case needs at least one step expecting an error`,
      );
    }
    if (!sawAssertion) {
      problems.push(
        `${at}: asserts nothing; add a step expect (returns other than "$any", or error) or an expect.state or expect.databases`,
      );
    }
  }

  if (problems.length > 0) throw new CorpusValidationError(problems);
  return raw as unknown as CorpusManifest;
}

/** Build a manifest from the built-in capability matrix and a list of cases. */
export function buildManifest(
  cases: readonly CorpusCase[],
  capabilities: readonly CapabilityDef[] = CAPABILITIES,
): CorpusManifest {
  return validateManifest({
    version: MANIFEST_VERSION,
    capabilities,
    cases,
  });
}
