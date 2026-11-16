/**
 * The Node conformance adapter. It drives the production TypeScript API
 * (`PortableBrightDb`) directly, on an in-memory store or a real directory.
 * It normalizes representation only: errors are mapped to the shared
 * categories and results are plain JSON. It never emulates a missing feature.
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  BrightDbV2CommitOutcomeUnknownError,
  BrightDbV2MissingBlockError,
  DuplicateKeyError,
  PortableBrightDb,
} from '../../src/index';
import { capabilityIds } from '../../src/lib/v2/conformance/capabilities';
import type {
  AdapterSession,
  ConformanceAdapter,
  Json,
  ProfileConfig,
  StateSpec,
  Step,
  StepOutcome,
} from '../../src/lib/v2/conformance/types';
import { MemoryV2Storage } from '../../src/lib/v2/memory-storage';
import {
  BrightDbOperationError,
  type BrightDbErrorCategory,
  type BrightDbErrorCode,
  type NormalizedError,
} from '../../src/lib/v2/ops/errors';
import type { PortableWriteOperation } from '../../src/lib/v2/portable-core';

/**
 * Map what v2 throws today onto the shared categories. Message matching is a
 * stopgap: as the operation layer gains typed errors, they take over and
 * this list shrinks.
 */
export function classifyError(error: unknown): NormalizedError {
  const message = error instanceof Error ? error.message : String(error);
  const make = (
    category: BrightDbErrorCategory,
    code?: BrightDbErrorCode,
  ): NormalizedError => ({ category, code, message });

  if (error instanceof BrightDbOperationError) {
    return { category: error.category, code: error.code, message };
  }
  if (error instanceof DuplicateKeyError) return make('DuplicateKey');
  if (error instanceof BrightDbV2CommitOutcomeUnknownError) {
    return make('CommitOutcomeUnknown');
  }
  if (error instanceof BrightDbV2MissingBlockError) return make('MissingBlock');
  if (/primary key/u.test(message)) return make('ImmutableId');
  if (/must have a string _id|A key must occupy/u.test(message)) {
    return make('InvalidDocument');
  }
  if (/already exists/u.test(message)) return make('AlreadyExists');
  if (/does not exist/u.test(message)) return make('NotFound');
  if (/is closed/u.test(message)) return make('Closed');
  if (/different databases/u.test(message)) return make('WrongDatabase');
  return make('Unknown');
}

interface Handle {
  db: PortableBrightDb;
  storage?: MemoryV2Storage;
  path?: string;
}

/**
 * A fixed-width writer ID for the database with this ordinal (1, 2, ...), so
 * IDs sort in ordinal order, as the model orders its writers.
 */
function writerIdFor(ordinal: number): Uint8Array {
  const id = new Uint8Array(16);
  new DataView(id.buffer).setUint32(12, ordinal);
  return id;
}

const toJson = (value: unknown): Json =>
  value === undefined ? null : (JSON.parse(JSON.stringify(value)) as Json);

const byId = (left: Json, right: Json): number => {
  const a = String((left as { _id?: unknown })._id);
  const b = String((right as { _id?: unknown })._id);
  return a < b ? -1 : a > b ? 1 : 0;
};

class NodeSession implements AdapterSession {
  private readonly handles = new Map<string, Handle>();
  private readonly roots = new Map<string, string>();
  private counter = 0;
  /** Databases created so far in this session. */
  private writers = 0;

  constructor(
    private readonly profile: string,
    private readonly directory: string | null,
  ) {}

  async init(initial?: StateSpec): Promise<void> {
    const main = await this.create('main');
    this.handles.set('main', main);
    if (!initial) return;
    const operations: PortableWriteOperation[] = [];
    for (const [name, state] of Object.entries(initial.collections)) {
      operations.push({ type: 'createCollection', collection: name });
      for (const document of state.docs) {
        operations.push({
          type: 'insert',
          collection: name,
          document: document as never,
        });
      }
      for (const index of state.indexes ?? []) {
        operations.push({
          type: 'createIndex',
          collection: name,
          name: index.name,
          fields: index.fields,
        });
      }
    }
    if (operations.length > 0) await main.db.writeBatch(operations);
  }

  private async create(name: string): Promise<Handle> {
    if (this.profile === 'disk') {
      const path = join(this.requireDirectory(), `${name}-${this.counter++}`);
      return { db: await PortableBrightDb.open({ path }), path };
    }
    // An in-memory store takes a writer ID, so a tie between replicas is
    // decided the way the model decides it. A directory picks its own.
    this.writers += 1;
    const storage = MemoryV2Storage.create(
      undefined,
      writerIdFor(this.writers),
    );
    return { db: await PortableBrightDb.open({ storage }), storage };
  }

  private requireDirectory(): string {
    if (!this.directory) throw new Error('disk profile has no directory');
    return this.directory;
  }

  private handle(name = 'main'): Handle {
    const handle = this.handles.get(name);
    if (!handle) throw new Error(`conformance: no database named ${name}`);
    return handle;
  }

  async run(step: Step): Promise<StepOutcome> {
    try {
      return { ok: true, value: await this.execute(step) };
    } catch (error) {
      return { ok: false, error: classifyError(error) };
    }
  }

  private async execute(step: Step): Promise<Json> {
    const handle = this.handle(step.db);
    const { db } = handle;
    const args = step.args ?? {};
    const name = step.collection ?? '';
    switch (step.op) {
      case 'createCollection':
        await db.writeBatch([{ type: 'createCollection', collection: name }]);
        return null;
      case 'dropCollection':
        await db.writeBatch([{ type: 'dropCollection', collection: name }]);
        return null;
      case 'insertOne':
        return toJson(
          await db.collection(name).insertOne(args['document'] as never),
        );
      case 'insertMany':
        return toJson(
          await db.collection(name).insertMany(args['documents'] as never),
        );
      case 'replaceById':
        return toJson(
          await db
            .collection(name)
            .replaceById(String(args['id']), args['document'] as never),
        );
      case 'deleteById':
        return toJson(await db.collection(name).deleteById(String(args['id'])));
      case 'findById':
        return toJson(await db.collection(name).findById(String(args['id'])));
      case 'findOne':
        return toJson(
          await db.collection(name).findOne((args['filter'] ?? {}) as never),
        );
      case 'find':
        return toJson(
          await db
            .collection(name)
            .find((args['filter'] ?? {}) as never)
            .toArray(),
        );
      case 'createIndex':
        await db
          .collection(name)
          .createIndex(String(args['name']), args['fields'] as string[]);
        return null;
      case 'dropIndex':
        await db.collection(name).dropIndex(String(args['name']));
        return null;
      case 'listIndexes':
        return toJson(await db.collection(name).listIndexes());
      case 'findByIndex':
        return toJson(
          await db
            .collection(name)
            .findByIndex(String(args['name']), (args['query'] ?? {}) as never),
        );
      case 'listCollections':
        return toJson(await db.listCollections());
      case 'writeBatch':
        await db.writeBatch(
          args['operations'] as unknown as PortableWriteOperation[],
        );
        return null;
      case 'root':
        return await db.root();
      case 'saveRoot':
        this.roots.set(String(args['name']), await db.root());
        return null;
      case 'findAt': {
        // A saved name, or else a literal digest (lets a case probe a bogus root).
        const root =
          this.roots.get(String(args['root'])) ?? String(args['root']);
        const snapshot = await db.at(root);
        return toJson(
          await snapshot
            .collection(name)
            .find((args['filter'] ?? {}) as never)
            .toArray(),
        );
      }
      case 'create':
        this.handles.set(
          String(args['as']),
          await this.create(String(args['as'])),
        );
        return null;
      case 'fork': {
        const target = String(args['as']);
        if (handle.storage) {
          this.writers += 1;
          const storage = handle.storage.copy(writerIdFor(this.writers));
          this.handles.set(target, {
            db: await PortableBrightDb.open({ storage }),
            storage,
          });
        } else {
          const path = join(
            this.requireDirectory(),
            `${target}-${this.counter++}`,
          );
          this.handles.set(target, { db: await db.fork(path), path });
        }
        return null;
      }
      case 'merge':
        await db.merge(this.handle(String(args['from'])).db);
        return null;
      case 'rootsEqual': {
        // Against another database, or against a root saved earlier.
        if (args['savedRoot'] !== undefined) {
          const saved = this.roots.get(String(args['savedRoot']));
          if (saved === undefined) {
            throw new BrightDbOperationError(
              'NotFound',
              `No saved root named ${String(args['savedRoot'])}`,
              { code: 'unknown_saved_root' },
            );
          }
          return (await db.root()) === saved;
        }
        return (
          (await db.root()) ===
          (await this.handle(String(args['other'])).db.root())
        );
      }
      case 'reopen': {
        db.close();
        const name = step.db ?? 'main';
        if (handle.storage) {
          const storage = handle.storage;
          this.handles.set(name, {
            db: await PortableBrightDb.open({ storage }),
            storage,
          });
        } else {
          const path = handle.path as string;
          this.handles.set(name, {
            db: await PortableBrightDb.open({ path }),
            path,
          });
        }
        return null;
      }
      case 'close':
        db.close();
        return null;
      default: {
        const never: never = step.op;
        throw new BrightDbOperationError(
          'Unsupported',
          `unsupported op ${String(never)}`,
          {
            code: 'unsupported_op',
          },
        );
      }
    }
  }

  async readState(db = 'main'): Promise<StateSpec> {
    const { db: database } = this.handle(db);
    const collections: StateSpec['collections'] = {};
    for (const name of await database.listCollections()) {
      const collection = database.collection(name);
      const docs = toJson(await collection.find({}).toArray()) as Json[];
      docs.sort(byId);
      collections[name] = {
        docs,
        indexes: (await collection.listIndexes()).map((index) => ({
          name: index.name,
          fields: [...index.fields],
        })),
      };
    }
    return { collections };
  }

  async close(): Promise<void> {
    for (const { db } of this.handles.values()) {
      try {
        db.close();
      } catch {
        // already closed
      }
    }
    if (this.directory)
      await rm(this.directory, { recursive: true, force: true });
  }
}

export class NodeConformanceAdapter implements ConformanceAdapter {
  readonly runtime = 'node' as const;
  readonly capabilities: ReadonlySet<string> = new Set(capabilityIds());
  readonly profiles: ReadonlySet<string> = new Set(['memory', 'disk']);

  async open(
    profile: ProfileConfig,
    initial?: StateSpec,
  ): Promise<AdapterSession> {
    if (!this.profiles.has(profile.id)) {
      throw new BrightDbOperationError(
        'Unsupported',
        `unknown profile ${profile.id}`,
        {
          code: 'unknown_profile',
        },
      );
    }
    const directory =
      profile.id === 'disk'
        ? await mkdtemp(join(tmpdir(), 'brightdb-conformance-'))
        : null;
    const session = new NodeSession(profile.id, directory);
    try {
      await session.init(initial);
    } catch (error) {
      await session.close();
      throw error;
    }
    return session;
  }
}
