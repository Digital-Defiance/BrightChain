/**
 * The model is only worth using as an oracle if it agrees with the reviewed
 * corpus. Known-divergence cases state the intended behavior, so the model
 * must pass them too: that is how we know the intent is coherent.
 */
import { loadCorpus } from '../../../../../test-support/conformance/load-corpus';
import { checkRun } from '../inventory';
import { runCorpus } from '../runner';
import {
  KNOWN_DIVERGENCE_TAG,
  type CorpusManifest,
  type Json,
  type Step,
} from '../types';
import { MODEL_CAPABILITIES, ModelAdapter } from './model';

const withoutDivergenceTags = (manifest: CorpusManifest): CorpusManifest => ({
  ...manifest,
  cases: manifest.cases.map((testCase) => ({
    ...testCase,
    tags: testCase.tags?.filter((tag) => tag !== KNOWN_DIVERGENCE_TAG),
  })),
});

describe('reference model', () => {
  const adapter = new ModelAdapter();
  const manifest = withoutDivergenceTags(loadCorpus());

  it('passes every reviewed case it implements, including the intended behavior of known divergences', async () => {
    const report = await runCorpus(adapter, manifest, { profile: 'memory' });
    const failures = report.results
      .filter((result) => result.status === 'failed')
      .map((result) => `${result.id}\n    ${result.messages.join('\n    ')}`);
    expect(failures).toEqual([]);
    expect(checkRun(manifest, adapter, report)).toEqual([]);
    expect(report.counts.passed).toBeGreaterThan(0);
  });

  it('skips index cases explicitly instead of passing them', async () => {
    const report = await runCorpus(adapter, manifest, {
      profile: 'memory',
      only: ['index-agg.'],
    });
    expect(report.counts.passed).toBe(0);
    expect(report.counts['skipped-by-capability']).toBeGreaterThan(0);
    expect(MODEL_CAPABILITIES.has('index.basic')).toBe(false);
  });
});

describe('reference model filter validation', () => {
  const find = (filter: Json): Step => ({
    op: 'find',
    collection: 'items',
    args: { filter },
  });

  async function outcomeOf(filter: Json, docs: Json[]) {
    const session = await new ModelAdapter().open(
      { id: 'memory' },
      { collections: { items: { docs } } },
    );
    try {
      return await session.run(find(filter));
    } finally {
      await session.close();
    }
  }

  const rejected = (code: string, message: string) => ({
    ok: false,
    error: { category: 'InvalidFilter', code, message },
  });

  // An operator that is false for every document must not hide a bad one.
  it.each([
    ['one doc', [{ _id: 'a', n: 1 }]],
    ['no doc', []],
  ])('rejects an unknown operator after a false one (%s)', async (_, docs) => {
    expect(await outcomeOf({ n: { $gt: 5, $bogus: 1 } }, docs)).toMatchObject(
      rejected('unknown_operator', 'Unknown operator $bogus'),
    );
  });

  it('rejects an unknown operator in any field of the filter', async () => {
    expect(
      await outcomeOf({ m: 99, n: { $gt: 5, $bogus: 1 } }, [
        { _id: 'a', m: 1, n: 1 },
      ]),
    ).toMatchObject(rejected('unknown_operator', 'Unknown operator $bogus'));
  });

  it('rejects a malformed operand after a false operator', async () => {
    expect(
      await outcomeOf({ n: { $gt: 5, $in: 1 } }, [{ _id: 'a', n: 1 }]),
    ).toMatchObject(rejected('malformed_operand', '$in needs an array'));
  });

  it('rejects a top-level operator and a non-object filter', async () => {
    expect(await outcomeOf({ $bogus: 1 }, [])).toMatchObject(
      rejected('unknown_operator', 'Unknown operator $bogus'),
    );
    expect(await outcomeOf([1], [])).toMatchObject(
      rejected('malformed_filter', 'A filter must be an object'),
    );
  });

  it('still answers a valid filter', async () => {
    expect(
      await outcomeOf({ n: { $gt: 0, $lt: 5 } }, [{ _id: 'a', n: 1 }]),
    ).toEqual({ ok: true, value: [{ _id: 'a', n: 1 }] });
  });
});

describe('reference model replicas', () => {
  const writes = (db: string, v: string): Step => ({
    op: 'replaceById',
    db,
    collection: 'items',
    args: { id: 'x', document: { v } },
  });

  async function winnerAfterTie(
    forks: string[],
    writers: string[],
    mergeOrder: Array<[string, string]>,
  ): Promise<Json> {
    const session = await new ModelAdapter().open(
      { id: 'memory' },
      { collections: { items: { docs: [{ _id: 'x', v: 'base' }] } } },
    );
    try {
      for (const name of forks) {
        await session.run({ op: 'fork', args: { as: name } });
      }
      for (const name of writers) await session.run(writes(name, name));
      for (const [into, from] of mergeOrder) {
        await session.run({ op: 'merge', db: into, args: { from } });
      }
      const [first] = mergeOrder[0];
      const read = await session.run({
        op: 'findById',
        db: first,
        collection: 'items',
        args: { id: 'x' },
      });
      return read.value ?? null;
    } finally {
      await session.close();
    }
  }

  it('gives a same-counter tie to the writer created last, in either merge direction', async () => {
    const forks = ['b', 'c'];
    expect(await winnerAfterTie(forks, ['b', 'c'], [['b', 'c']])).toEqual({
      _id: 'x',
      v: 'c',
    });
    expect(await winnerAfterTie(forks, ['b', 'c'], [['c', 'b']])).toEqual({
      _id: 'x',
      v: 'c',
    });
  });

  it('orders writers by number, not by text, past nine databases', async () => {
    // main is writer 1 and the nth fork is writer n + 1, so r8 is writer 9 and
    // r9 is writer 10. Writer 10 must win, though "w10" sorts before "w9" as text.
    const forks = Array.from({ length: 10 }, (_, index) => `r${index + 1}`);
    expect(await winnerAfterTie(forks, ['r8', 'r9'], [['r8', 'r9']])).toEqual({
      _id: 'x',
      v: 'r9',
    });
  });

  it('does not let one session affect the writer order of the next', async () => {
    const first = await winnerAfterTie(['b', 'c'], ['b', 'c'], [['b', 'c']]);
    const second = await winnerAfterTie(['b', 'c'], ['b', 'c'], [['b', 'c']]);
    expect(second).toEqual(first);
  });
});
