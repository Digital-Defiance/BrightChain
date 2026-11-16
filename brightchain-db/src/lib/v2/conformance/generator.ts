/**
 * Seeded operation-sequence generator. The same seed always yields the same
 * case, so a failure is reproduced from its seed alone and a shrunk case is
 * stored as plain corpus JSON that needs no generator to replay.
 *
 * The generator stays inside behavior both production and the model claim:
 * documents never use arrays in filtered fields, a field keeps one type
 * except for explicit null or absence, and replicas write disjoint documents
 * so the winner of a merge never depends on random writer IDs. The
 * `contested` option lifts that last rule for adapters whose writer IDs are
 * known (see `ConformanceAdapter`), so ties are tested too.
 */
import type { CorpusCase, Json, Step } from './types';

/** A small, fast, seedable PRNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Parse a `CONFORMANCE_SEEDS` value, `"start:count"`, such as `"100:25"`.
 * Unset or blank means `fallback`. Anything else that is not two
 * non-negative integers with a count of at least 1 throws, because a typo
 * that quietly ran zero sequences would pass without testing anything.
 */
export function parseSeedRange(
  raw: string | undefined,
  fallback = '1:40',
): { start: number; count: number } {
  const text = raw === undefined || raw.trim() === '' ? fallback : raw.trim();
  const match = /^(\d+):(\d+)$/u.exec(text);
  const start = match ? Number(match[1]) : Number.NaN;
  const count = match ? Number(match[2]) : Number.NaN;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(count) ||
    count < 1
  ) {
    throw new Error(
      `CONFORMANCE_SEEDS must look like "start:count" with a count of at least 1, got ${JSON.stringify(raw)}`,
    );
  }
  return { start, count };
}

/**
 * Strings chosen to separate UTF-8 byte order from UTF-16 order: the
 * fullwidth "ｚ" (U+FF5A) sorts above "😀" (U+1F600) in UTF-16 but below it in UTF-8.
 */
const STRINGS = ['', 'a', 'b', 'ab', 'é', '新', '😀', 'ｚ'];
/** Lowercase ASCII, where locale order and UTF-8 byte order agree. */
const ASCII_STRINGS = ['', 'a', 'b', 'ab'];
const COLLECTIONS = ['alpha', 'beta'];

export interface GenerateOptions {
  /** Operations to generate after the optional replica setup. Default 30. */
  steps?: number;
  /**
   * Steer clear of behavior already recorded as a known divergence (ranges
   * over missing/null fields, non-binary string order). Default true. Turn it
   * off to see those divergences surface in generated runs.
   */
  avoidKnownDivergences?: boolean;
  /** Fork a replica, write on both sides, merge both ways. */
  replicas?: boolean;
  /**
   * With `replicas`, both sides also write the same shared records, starting
   * with one write each at the same counter, so the winner is decided by the
   * (counter, writer) tie-break. Only for adapters that assign writer IDs by
   * creation order; a directory store picks random IDs and would disagree
   * with the model about the winner.
   */
  contested?: boolean;
}

export const GENERATED_REQUIRES = [
  'lifecycle.reopen',
  'collection.lifecycle',
  'docs.insert',
  'docs.replaceById',
  'docs.deleteById',
  'docs.read',
  'batch.atomic',
  'history.snapshot',
];

class Generator {
  private readonly next: () => number;
  /** Roots saved so far, per database: a root exists only where it was saved. */
  private readonly savedRoots = new Map<string, number>();

  constructor(
    seed: number,
    private readonly avoid: boolean,
  ) {
    this.next = mulberry32(seed);
  }

  private int(count: number): number {
    return Math.floor(this.next() * count);
  }
  private pick<T>(items: readonly T[]): T {
    return items[this.int(items.length)];
  }
  private chance(probability: number): boolean {
    return this.next() < probability;
  }

  private scalarN(): Json {
    return this.int(7) - 3;
  }

  /** A document. `n` is a number, null or absent. `s` is a string or absent. */
  private document(id: string | undefined): { [key: string]: Json } {
    const doc: { [key: string]: Json } = {};
    if (id !== undefined) doc['_id'] = id;
    // `r` is always a number, so ranges over it never meet a missing value.
    doc['r'] = this.scalarN();
    // `t` is always a lowercase ASCII string, where locale and byte order agree.
    doc['t'] = this.pick(ASCII_STRINGS);
    if (this.chance(0.75)) doc['n'] = this.chance(0.1) ? null : this.scalarN();
    if (this.chance(0.6)) doc['s'] = this.pick(STRINGS);
    if (this.chance(0.3))
      doc['tags'] = [this.pick(STRINGS), this.pick(STRINGS)];
    if (this.chance(0.2)) doc['nested'] = { n: this.scalarN() };
    return doc;
  }

  /** A document one side of a tie writes; `side` makes the two sides differ. */
  contestedDocument(side: string): { [key: string]: Json } {
    return { ...this.document(undefined), s: side };
  }

  private filter(): { [key: string]: Json } {
    switch (this.int(9)) {
      case 0:
        return {};
      case 1:
        return { n: this.scalarN() };
      case 2:
        return { n: null };
      case 3:
        return { n: { $exists: this.chance(0.5) } };
      case 4:
        return {
          [this.avoid ? 'r' : 'n']: {
            [this.pick(['$gt', '$gte', '$lt', '$lte'])]: this.scalarN(),
          },
        };
      case 5:
        return { s: this.pick(STRINGS) };
      case 6:
        return {
          [this.avoid ? 't' : 's']: {
            [this.pick(['$gt', '$gte', '$lt', '$lte'])]: this.pick(
              this.avoid ? ASCII_STRINGS : STRINGS,
            ),
          },
        };
      case 7:
        return { n: { $ne: this.scalarN() } };
      default:
        return { n: { $in: [this.scalarN(), this.scalarN()] } };
    }
  }

  private batch(ids: readonly string[]): Json {
    const operations: Json[] = [];
    for (let index = 0, count = 1 + this.int(4); index < count; index += 1) {
      const collection = this.pick(COLLECTIONS);
      switch (this.int(4)) {
        case 0:
          operations.push({
            type: 'insert',
            collection,
            document: this.document(this.pick(ids)),
          });
          break;
        case 1:
          operations.push({
            type: 'replace',
            collection,
            id: this.pick(ids),
            document: this.document(undefined),
          });
          break;
        case 2:
          operations.push({ type: 'delete', collection, id: this.pick(ids) });
          break;
        default:
          operations.push({
            type: 'insert',
            collection,
            document: this.document(this.pick(ids)),
          });
      }
    }
    return operations;
  }

  /** One operation on `db`, writing only to documents named in `ids`. */
  operation(ids: readonly string[], db?: string, allowStructural = true): Step {
    const collection = this.pick(COLLECTIONS);
    const on = (step: Step): Step => (db ? { ...step, db } : step);
    const roll = this.int(100);
    if (roll < 22) {
      return on({
        op: 'insertOne',
        collection,
        args: { document: this.document(this.pick(ids)) },
      });
    }
    if (roll < 30) {
      const documents = Array.from({ length: 1 + this.int(3) }, () =>
        this.document(this.pick(ids)),
      );
      return on({ op: 'insertMany', collection, args: { documents } });
    }
    if (roll < 40) {
      // Sometimes name a different _id, which must be refused. Production only
      // refuses it when the target exists (a known divergence), so by default
      // the generator restates the same _id or none.
      const id = this.pick(ids);
      const mismatch = !this.avoid && this.chance(0.2);
      const document = this.document(
        mismatch ? this.pick(ids) : this.chance(0.3) ? id : undefined,
      );
      return on({ op: 'replaceById', collection, args: { id, document } });
    }
    if (roll < 48) {
      return on({ op: 'deleteById', collection, args: { id: this.pick(ids) } });
    }
    if (roll < 56)
      return on({ op: 'findById', collection, args: { id: this.pick(ids) } });
    if (roll < 62) {
      return on({
        op: 'findOne',
        collection,
        args: { filter: { _id: this.pick(ids) } },
      });
    }
    if (roll < 78)
      return on({ op: 'find', collection, args: { filter: this.filter() } });
    if (roll < 84)
      return on({ op: 'writeBatch', args: { operations: this.batch(ids) } });
    if (roll < 87 && allowStructural)
      return on({ op: 'createCollection', collection });
    if (roll < 89 && allowStructural)
      return on({ op: 'dropCollection', collection });
    const key = db ?? 'main';
    const saved = this.savedRoots.get(key) ?? 0;
    if (roll < 94) {
      this.savedRoots.set(key, saved + 1);
      return on({ op: 'saveRoot', args: { name: `${key}-r${saved + 1}` } });
    }
    if (roll < 97 && saved > 0) {
      return on({
        op: 'findAt',
        collection,
        args: { root: `${key}-r${1 + this.int(saved)}`, filter: this.filter() },
      });
    }
    return on({ op: 'reopen' });
  }
}

/** Generate a case from a seed. Expectations are filled in later from the model. */
export function generateCase(
  seed: number,
  options: GenerateOptions = {},
): CorpusCase {
  const generator = new Generator(seed, options.avoidKnownDivergences ?? true);
  const count = options.steps ?? 30;
  const steps: Step[] = [];
  const shared = ['k1', 'k2', 'k3', 'ключ'];

  if (options.replicas) {
    // Create every collection before the fork. Two replicas that each create
    // the same collection independently are different collection generations,
    // and a merge keeps only one side's documents. That is a semantic to
    // confirm, not something a generated run should trip over.
    for (const name of COLLECTIONS)
      steps.push({ op: 'createCollection', collection: name });
    // Shared documents exist before the fork and only the primary rewrites them.
    for (const id of shared) {
      steps.push({
        op: 'insertOne',
        collection: 'alpha',
        args: {
          document: {
            _id: id,
            n: steps.length,
            r: steps.length,
            s: 'base',
            t: 'a',
          },
        },
      });
    }
    steps.push({ op: 'fork', args: { as: 'b' } });
    if (options.contested) {
      // Right after the fork both clocks are equal, so these two writes to
      // the same record get the same counter from different writers.
      steps.push({
        op: 'replaceById',
        collection: 'alpha',
        args: { id: shared[0], document: generator.contestedDocument('main') },
      });
      steps.push({
        op: 'replaceById',
        db: 'b',
        collection: 'alpha',
        args: {
          id: shared[0],
          document: generator.contestedDocument('replica'),
        },
      });
    }
    for (let index = 0; index < count; index += 1) {
      if (index % 3 === 2) {
        // The replica touches only its own documents and never drops
        // collections, unless the run is contested and it may also take on
        // the shared ones.
        const own = ['b1', 'b2', 'b3'];
        steps.push(
          generator.operation(
            options.contested ? own.concat(shared) : own,
            'b',
            false,
          ),
        );
      } else {
        steps.push(
          generator.operation(shared.concat(['a1', 'a2']), undefined, false),
        );
      }
    }
    steps.push({ op: 'merge', args: { from: 'b' } });
    steps.push({ op: 'merge', db: 'b', args: { from: 'main' } });
    steps.push({ op: 'rootsEqual', args: { other: 'b' } });
  } else {
    const ids = ['k1', 'k2', 'k3', 'k4', 'ключ'];
    for (let index = 0; index < count; index += 1)
      steps.push(generator.operation(ids));
  }

  return {
    id: `generated.seed-${seed}${options.replicas ? '.replicas' : ''}${options.replicas && options.contested ? '.contested' : ''}`,
    family: options.replicas ? 'replication' : 'docs',
    description: `Generated from seed ${seed}`,
    requires: options.replicas
      ? [...GENERATED_REQUIRES, 'replication.merge']
      : GENERATED_REQUIRES,
    kind: 'positive',
    runtimes: ['node'],
    // A contested case needs known writer IDs, which only memory stores allow.
    topologies:
      options.replicas && options.contested ? ['memory'] : ['memory', 'disk'],
    ordering: 'unordered',
    steps,
    source: 'model',
    tags: ['generated'],
  };
}
