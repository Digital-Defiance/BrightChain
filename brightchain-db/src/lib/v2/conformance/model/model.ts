/**
 * An independent in-memory reference model of BrightDB's visible behavior,
 * written from the requirements, not from the production code. It is a
 * `ConformanceAdapter`, so it runs the same corpus as production and acts as
 * the oracle for generated operation sequences.
 *
 * Independence rule: this directory must not import the production matcher,
 * update engine, index encoder, merge, codec or storage (an ESLint rule
 * enforces it). It may import the shared types and the error registry.
 *
 * It models the intended behavior, including where production does not yet
 * match (unknown operators are rejected, ranges are type-bracketed).
 * Indexes are not modelled; index cases report `skipped-by-capability`.
 */
import type {
  BrightDbErrorCategory,
  BrightDbErrorCode,
  NormalizedError,
} from '../../ops/errors';
import type {
  AdapterSession,
  ConformanceAdapter,
  Json,
  ProfileConfig,
  StateSpec,
  Step,
  StepOutcome,
} from '../types';

type Doc = { [key: string]: Json };
interface Version {
  counter: number;
  /** The writer's ordinal within its session. A higher one wins a tie. */
  writer: number;
}
/** A document slot. `doc` is null for a tombstone. */
interface Slot {
  doc: Doc | null;
  version: Version;
}
interface Collection {
  records: Map<string, Slot>;
}
interface Database {
  id: string;
  writer: number;
  clock: number;
  collections: Map<string, Collection>;
}

class ModelError extends Error {
  constructor(
    readonly category: BrightDbErrorCategory,
    message: string,
    readonly code?: BrightDbErrorCode,
  ) {
    super(message);
  }
}

/** The capabilities the model implements. Indexes are deliberately absent. */
export const MODEL_CAPABILITIES: ReadonlySet<string> = new Set([
  'lifecycle.reopen',
  'collection.lifecycle',
  'docs.insert',
  'docs.replaceById',
  'docs.deleteById',
  'docs.read',
  'batch.atomic',
  'history.snapshot',
  'replication.merge',
]);

// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------

const clone = <T extends Json>(value: T): T =>
  value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);

/** A stable string for a JSON value; object key order does not matter. */
function canon(value: Json | undefined): string {
  if (value === undefined) return 'undefined';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canon).join(',')}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canon(value[key])}`)
    .join(',')}}`;
}

const encoder = new TextEncoder();

/** Compare strings by UTF-8 bytes, which is not the same as by UTF-16 units. */
function compareUtf8(left: string, right: string): number {
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  const length = Math.min(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1;
  }
  return a.length === b.length ? 0 : a.length < b.length ? -1 : 1;
}

const isObject = (value: Json | undefined): value is Doc =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function assertKey(id: unknown): asserts id is string {
  if (typeof id !== 'string') {
    throw new ModelError(
      'InvalidDocument',
      'A document must have a string _id',
    );
  }
  const bytes = encoder.encode(id).length;
  if (bytes < 1 || bytes > 1024) {
    throw new ModelError(
      'InvalidDocument',
      'A key must occupy 1–1024 UTF-8 bytes',
    );
  }
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

function equal(
  present: boolean,
  value: Json | undefined,
  wanted: Json,
): boolean {
  if (wanted === null) return !present || value === null;
  return present && canon(value) === canon(wanted);
}

/** Order two values of the same comparable type, or null when they are not comparable. */
function order(value: Json | undefined, operand: Json): number | null {
  if (typeof value === 'number' && typeof operand === 'number') {
    return value < operand ? -1 : value > operand ? 1 : 0;
  }
  if (typeof value === 'string' && typeof operand === 'string') {
    return compareUtf8(value, operand);
  }
  if (typeof value === 'boolean' && typeof operand === 'boolean') {
    return Number(value) - Number(operand);
  }
  return null;
}

const OPERATORS: ReadonlySet<string> = new Set([
  '$eq',
  '$ne',
  '$exists',
  '$in',
  '$gt',
  '$gte',
  '$lt',
  '$lte',
]);

/** The operators of a field condition, or null when it is a plain value to match. */
function operatorsOf(condition: Json): Doc | null {
  return isObject(condition) &&
    Object.keys(condition).some((key) => key.startsWith('$'))
    ? condition
    : null;
}

/**
 * Reject an invalid filter before anything is evaluated, however it would
 * have matched. Every field and every operator is checked, so one operator
 * that does not match cannot hide another that is wrong.
 */
function validateFilter(filter: Json): asserts filter is Doc {
  if (!isObject(filter)) {
    throw new ModelError(
      'InvalidFilter',
      'A filter must be an object',
      'malformed_filter',
    );
  }
  for (const [field, condition] of Object.entries(filter)) {
    if (field.startsWith('$')) {
      throw new ModelError(
        'InvalidFilter',
        `Unknown operator ${field}`,
        'unknown_operator',
      );
    }
    const operators = operatorsOf(condition);
    if (!operators) continue;
    for (const [operator, operand] of Object.entries(operators)) {
      if (!OPERATORS.has(operator)) {
        throw new ModelError(
          'InvalidFilter',
          `Unknown operator ${operator}`,
          'unknown_operator',
        );
      }
      if (operator === '$in' && !Array.isArray(operand)) {
        throw new ModelError(
          'InvalidFilter',
          '$in needs an array',
          'malformed_operand',
        );
      }
    }
  }
}

function applyOperator(
  operator: string,
  present: boolean,
  value: Json | undefined,
  operand: Json,
): boolean {
  switch (operator) {
    case '$eq':
      return equal(present, value, operand);
    case '$ne':
      return !equal(present, value, operand);
    case '$exists':
      return present === Boolean(operand);
    case '$in':
      return (
        Array.isArray(operand) &&
        operand.some((item) => equal(present, value, item))
      );
    case '$gt':
    case '$gte':
    case '$lt':
    case '$lte': {
      const relation = present ? order(value, operand) : null;
      if (relation === null) return false;
      return operator === '$gt'
        ? relation > 0
        : operator === '$gte'
          ? relation >= 0
          : operator === '$lt'
            ? relation < 0
            : relation <= 0;
    }
    default:
      // Unreachable once `validateFilter` has run.
      throw new Error(`model: unvalidated operator ${operator}`);
  }
}

/** Whether `doc` matches a filter that `validateFilter` has accepted. */
function matches(doc: Doc, filter: Doc): boolean {
  return Object.entries(filter).every(([field, condition]) => {
    const present = Object.prototype.hasOwnProperty.call(doc, field);
    const value = doc[field];
    const operators = operatorsOf(condition);
    return operators
      ? Object.entries(operators).every(([operator, operand]) =>
          applyOperator(operator, present, value, operand),
        )
      : equal(present, value, condition);
  });
}

// ---------------------------------------------------------------------------
// Databases
// ---------------------------------------------------------------------------

let databaseCounter = 0;

function newDatabase(writer: number): Database {
  databaseCounter += 1;
  return {
    id: `model-db-${databaseCounter}`,
    writer,
    clock: 0,
    collections: new Map(),
  };
}

/** A copy of `database`, written by `writer` (the same writer by default). */
function cloneDatabase(
  database: Database,
  writer: number = database.writer,
): Database {
  const copy: Database = {
    id: database.id,
    writer,
    clock: database.clock,
    collections: new Map(),
  };
  for (const [name, collection] of database.collections) {
    copy.collections.set(name, {
      records: new Map(
        [...collection.records].map(([id, record]) => [
          id,
          {
            doc: record.doc ? clone(record.doc) : null,
            version: { ...record.version },
          },
        ]),
      ),
    });
  }
  return copy;
}

const newer = (left: Version, right: Version): boolean =>
  left.counter !== right.counter
    ? left.counter > right.counter
    : left.writer > right.writer;

/** The replica rule: per document, the record with the higher version wins. */
function mergeInto(local: Database, remote: Database): void {
  if (local.id !== remote.id) {
    throw new ModelError(
      'WrongDatabase',
      'The replicas belong to different databases',
    );
  }
  for (const [name, remoteCollection] of remote.collections) {
    let collection = local.collections.get(name);
    if (!collection) {
      collection = { records: new Map() };
      local.collections.set(name, collection);
    }
    for (const [id, record] of remoteCollection.records) {
      const current = collection.records.get(id);
      if (!current || newer(record.version, current.version)) {
        collection.records.set(id, {
          doc: record.doc ? clone(record.doc) : null,
          version: { ...record.version },
        });
      }
    }
  }
  local.clock = Math.max(local.clock, remote.clock);
}

/** Equal roots mean equal data and versions. */
function rootOf(database: Database): string {
  const collections: { [name: string]: Json } = {};
  for (const [name, collection] of database.collections) {
    const records: { [id: string]: Json } = {};
    for (const [id, record] of collection.records) {
      records[id] = {
        doc: record.doc,
        counter: record.version.counter,
        writer: record.version.writer,
      };
    }
    collections[name] = records;
  }
  return canon({ id: database.id, collections });
}

function stateOf(database: Database): StateSpec {
  const collections: StateSpec['collections'] = {};
  for (const [name, collection] of database.collections) {
    const docs = [...collection.records.values()]
      .filter((record) => record.doc !== null)
      .map((record) => clone(record.doc as Doc) as Json)
      .sort((left, right) =>
        compareUtf8(
          String((left as Doc)['_id']),
          String((right as Doc)['_id']),
        ),
      );
    collections[name] = { docs, indexes: [] };
  }
  return { collections };
}

// ---------------------------------------------------------------------------
// Operations on a database
// ---------------------------------------------------------------------------

function nextVersion(database: Database): Version {
  database.clock += 1;
  return { counter: database.clock, writer: database.writer };
}

let generated = 0;
function generateId(): string {
  generated += 1;
  return generated.toString(16).padStart(32, '0');
}

const live = (
  collection: Collection | undefined,
  id: string,
): Slot | undefined => {
  const record = collection?.records.get(id);
  return record && record.doc !== null ? record : undefined;
};

function insertDocument(database: Database, name: string, input: Json): string {
  if (!isObject(input)) {
    throw new ModelError('InvalidDocument', 'A document must be an object');
  }
  const doc = clone(input);
  if ('_id' in doc) assertKey(doc['_id']);
  else doc['_id'] = generateId();
  const id = doc['_id'] as string;
  let collection = database.collections.get(name);
  if (live(collection, id)) {
    throw new ModelError('DuplicateKey', `Duplicate key _id: ${id}`);
  }
  if (!collection) {
    collection = { records: new Map() };
    database.collections.set(name, collection);
  }
  collection.records.set(id, { doc, version: nextVersion(database) });
  return id;
}

function replaceDocument(
  database: Database,
  name: string,
  id: string,
  input: Json,
): { matchedCount: number; modifiedCount: number } {
  assertKey(id);
  if (!isObject(input)) {
    throw new ModelError('InvalidDocument', 'A document must be an object');
  }
  if ('_id' in input && input['_id'] !== id) {
    throw new ModelError(
      'ImmutableId',
      'The primary key _id cannot be changed',
    );
  }
  const collection = database.collections.get(name);
  const record = live(collection, id);
  if (!collection || !record) return { matchedCount: 0, modifiedCount: 0 };
  const doc = { ...clone(input), _id: id } as Doc;
  if (canon(doc) === canon(record.doc))
    return { matchedCount: 1, modifiedCount: 0 };
  collection.records.set(id, { doc, version: nextVersion(database) });
  return { matchedCount: 1, modifiedCount: 1 };
}

function deleteDocument(database: Database, name: string, id: string): number {
  assertKey(id);
  const collection = database.collections.get(name);
  if (!collection || !live(collection, id)) return 0;
  collection.records.set(id, { doc: null, version: nextVersion(database) });
  return 1;
}

function select(database: Database, name: string, filter: Json): Doc[] {
  const collection = database.collections.get(name);
  const documents = [...(collection?.records.values() ?? [])]
    .filter((record) => record.doc !== null)
    .map((record) => record.doc as Doc);
  validateFilter(filter);
  return documents
    .filter((doc) => matches(doc, filter))
    .map((doc) => clone(doc))
    .sort((left, right) =>
      compareUtf8(String(left['_id']), String(right['_id'])),
    );
}

type BatchOperation =
  | { type: 'createCollection' | 'dropCollection'; collection: string }
  | { type: 'insert'; collection: string; document: Json }
  | { type: 'replace'; collection: string; id: string; document: Json }
  | { type: 'delete'; collection: string; id: string }
  | { type: 'createIndex' | 'dropIndex'; collection: string };

function createCollection(database: Database, name: string): void {
  if (database.collections.has(name)) {
    throw new ModelError(
      'AlreadyExists',
      `BrightDB collection already exists: ${name}`,
    );
  }
  database.collections.set(name, { records: new Map() });
}

function applyBatch(
  database: Database,
  operations: readonly BatchOperation[],
): void {
  for (const operation of operations) {
    switch (operation.type) {
      case 'createCollection':
        createCollection(database, operation.collection);
        break;
      case 'dropCollection':
        database.collections.delete(operation.collection);
        break;
      case 'insert':
        insertDocument(database, operation.collection, operation.document);
        break;
      case 'replace':
        replaceDocument(
          database,
          operation.collection,
          operation.id,
          operation.document,
        );
        break;
      case 'delete':
        deleteDocument(database, operation.collection, operation.id);
        break;
      default:
        throw new ModelError(
          'Unsupported',
          `The model does not implement ${operation.type}`,
        );
    }
  }
}

/** Run `change` on a copy and keep it only if it finishes, so failures leave no trace. */
function atomically<T>(database: Database, change: (draft: Database) => T): T {
  const draft = cloneDatabase(database);
  const result = change(draft);
  database.collections = draft.collections;
  database.clock = draft.clock;
  return result;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

class ModelSession implements AdapterSession {
  /** Writers handed out so far. Each database gets the next ordinal. */
  private writers = 0;
  private readonly databases = new Map<string, Database>([
    ['main', newDatabase(this.nextWriter())],
  ]);
  private readonly closed = new Set<string>();
  private readonly saved = new Map<string, Database>();

  constructor(initial?: StateSpec) {
    if (!initial) return;
    const main = this.databases.get('main') as Database;
    for (const [name, state] of Object.entries(initial.collections)) {
      createCollection(main, name);
      for (const doc of state.docs) insertDocument(main, name, doc);
    }
  }

  private nextWriter(): number {
    this.writers += 1;
    return this.writers;
  }

  private database(name = 'main'): Database {
    const database = this.databases.get(name);
    if (!database) throw new Error(`model: no database named ${name}`);
    return database;
  }

  async run(step: Step): Promise<StepOutcome> {
    try {
      return { ok: true, value: this.execute(step) };
    } catch (error) {
      if (error instanceof ModelError) {
        const normalized: NormalizedError = {
          category: error.category,
          code: error.code,
          message: error.message,
        };
        return { ok: false, error: normalized };
      }
      throw error;
    }
  }

  private execute(step: Step): Json {
    const name = step.db ?? 'main';
    const database = this.database(name);
    const args = step.args ?? {};
    const collection = step.collection ?? '';
    if (this.closed.has(name) && step.op !== 'reopen') {
      throw new ModelError('Closed', 'BrightDB database is closed');
    }
    switch (step.op) {
      case 'createCollection':
        createCollection(database, collection);
        return null;
      case 'dropCollection':
        database.collections.delete(collection);
        return null;
      case 'insertOne':
        return {
          acknowledged: true,
          insertedId: insertDocument(database, collection, args['document']),
        };
      case 'insertMany':
        return atomically(database, (draft) => {
          const documents = args['documents'] as Json[];
          const insertedIds: { [index: string]: string } = {};
          documents.forEach((doc, index) => {
            insertedIds[String(index)] = insertDocument(draft, collection, doc);
          });
          return {
            acknowledged: true,
            insertedCount: documents.length,
            insertedIds,
          };
        });
      case 'replaceById': {
        const result = replaceDocument(
          database,
          collection,
          String(args['id']),
          args['document'],
        );
        return { acknowledged: true, ...result, upsertedCount: 0 };
      }
      case 'deleteById':
        return {
          acknowledged: true,
          deletedCount: deleteDocument(
            database,
            collection,
            String(args['id']),
          ),
        };
      case 'findById': {
        assertKey(String(args['id']));
        return clone(
          live(database.collections.get(collection), String(args['id']))?.doc ??
            null,
        );
      }
      case 'findOne':
        return (select(database, collection, args['filter'] ?? {})[0] ??
          null) as Json;
      case 'find':
        return select(database, collection, args['filter'] ?? {}) as Json;
      case 'listCollections':
        return [...database.collections.keys()].sort(compareUtf8);
      case 'writeBatch':
        atomically(database, (draft) =>
          applyBatch(draft, args['operations'] as unknown as BatchOperation[]),
        );
        return null;
      case 'root':
        return rootOf(database);
      case 'saveRoot':
        this.saved.set(String(args['name']), cloneDatabase(database));
        return null;
      case 'findAt': {
        const snapshot = this.saved.get(String(args['root']));
        if (!snapshot)
          throw new ModelError(
            'MissingBlock',
            `Missing block ${String(args['root'])}`,
          );
        return select(snapshot, collection, args['filter'] ?? {}) as Json;
      }
      case 'create':
        this.databases.set(String(args['as']), newDatabase(this.nextWriter()));
        return null;
      case 'fork':
        this.databases.set(
          String(args['as']),
          cloneDatabase(database, this.nextWriter()),
        );
        return null;
      case 'merge':
        atomically(database, (draft) =>
          mergeInto(draft, this.database(String(args['from']))),
        );
        return null;
      case 'rootsEqual': {
        // Against another database, or against a root saved earlier.
        if (args['savedRoot'] !== undefined) {
          const snapshot = this.saved.get(String(args['savedRoot']));
          if (!snapshot) {
            throw new ModelError(
              'NotFound',
              `No saved root named ${String(args['savedRoot'])}`,
              'unknown_saved_root',
            );
          }
          return rootOf(database) === rootOf(snapshot);
        }
        return (
          rootOf(database) === rootOf(this.database(String(args['other'])))
        );
      }
      case 'reopen':
        this.closed.delete(name);
        return null;
      case 'close':
        this.closed.add(name);
        return null;
      default:
        throw new ModelError(
          'Unsupported',
          `The model does not implement ${step.op}`,
        );
    }
  }

  async readState(name = 'main'): Promise<StateSpec> {
    return stateOf(this.database(name));
  }

  async close(): Promise<void> {
    this.databases.clear();
  }
}

export class ModelAdapter implements ConformanceAdapter {
  readonly runtime = 'node' as const;
  readonly capabilities = MODEL_CAPABILITIES;
  readonly profiles: ReadonlySet<string> = new Set(['memory', 'disk']);

  async open(
    _profile: ProfileConfig,
    initial?: StateSpec,
  ): Promise<AdapterSession> {
    return new ModelSession(initial);
  }
}
