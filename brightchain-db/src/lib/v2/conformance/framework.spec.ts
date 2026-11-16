/**
 * Tests of the conformance framework itself. A corpus run that can only pass
 * proves nothing, so these check that the loader, matcher, runner and
 * inventory each fail when they should.
 */
import {
  FaultyAdapter,
  misreportInsertedId,
} from '../../../../test-support/conformance/faulty-adapter';
import { loadCorpus } from '../../../../test-support/conformance/load-corpus';
import { NodeConformanceAdapter } from '../../../../test-support/conformance/node-adapter';
import {
  BRIGHTDB_ERROR_CATEGORIES,
  BRIGHTDB_ERROR_CODES,
  isBrightDbErrorCategory,
  isBrightDbErrorCode,
} from '../ops/errors';
import { CAPABILITIES } from './capabilities';
import { checkCoverage, checkRun } from './inventory';
import { CorpusValidationError, validateManifest } from './manifest';
import { diff } from './match';
import { ModelAdapter } from './model/model';
import { diffState, runCase, runCorpus } from './runner';
import {
  MANIFEST_VERSION,
  type AdapterSession,
  type ConformanceAdapter,
  type CorpusCase,
  type CorpusManifest,
  type Json,
  type StateSpec,
  type Step,
  type StepOutcome,
} from './types';

const baseCase = (overrides: Partial<CorpusCase> = {}): CorpusCase => ({
  id: 'test.case.001',
  family: 'docs',
  requires: ['docs.read'],
  kind: 'positive',
  runtimes: ['node'],
  topologies: ['memory'],
  ordering: 'strict',
  steps: [{ op: 'listCollections', expect: { returns: [] } }],
  source: 'reviewed',
  ...overrides,
});

const manifestOf = (...cases: CorpusCase[]) =>
  ({
    version: MANIFEST_VERSION,
    capabilities: CAPABILITIES,
    cases,
  }) as unknown as CorpusManifest;

/** An adapter whose steps are answered by a function. */
function fakeAdapter(
  answer: (step: Step) => StepOutcome,
  capabilities: string[] = ['docs.read'],
): ConformanceAdapter {
  return {
    runtime: 'node',
    capabilities: new Set(capabilities),
    profiles: new Set(['memory']),
    async open(): Promise<AdapterSession> {
      return {
        run: async (step) => answer(step),
        readState: async () => ({ collections: {} }),
        close: async () => undefined,
      };
    },
  };
}

describe('error registry', () => {
  it('recognizes its own categories and nothing else', () => {
    for (const category of BRIGHTDB_ERROR_CATEGORIES) {
      expect(isBrightDbErrorCategory(category)).toBe(true);
    }
    expect(isBrightDbErrorCategory('NopeError')).toBe(false);
    expect(isBrightDbErrorCategory(undefined)).toBe(false);
  });

  it('has no duplicate categories', () => {
    expect(new Set(BRIGHTDB_ERROR_CATEGORIES).size).toBe(
      BRIGHTDB_ERROR_CATEGORIES.length,
    );
  });
});

describe('error codes', () => {
  it('recognizes its own codes and nothing else', () => {
    for (const code of BRIGHTDB_ERROR_CODES) {
      expect(isBrightDbErrorCode(code)).toBe(true);
    }
    expect(isBrightDbErrorCode('made_up')).toBe(false);
    expect(isBrightDbErrorCode(undefined)).toBe(false);
    expect(new Set(BRIGHTDB_ERROR_CODES).size).toBe(
      BRIGHTDB_ERROR_CODES.length,
    );
  });

  it('is the only source of codes the corpus may use', () => {
    for (const testCase of loadCorpus().cases) {
      for (const step of testCase.steps) {
        const code = step.expect?.error?.code;
        if (code !== undefined) expect(isBrightDbErrorCode(code)).toBe(true);
      }
    }
  });
});

describe('manifest validation', () => {
  const problemsOf = (manifest: unknown): string => {
    try {
      validateManifest(manifest);
    } catch (error) {
      expect(error).toBeInstanceOf(CorpusValidationError);
      return (error as Error).message;
    }
    throw new Error('expected validation to fail');
  };

  it('accepts a well-formed manifest', () => {
    expect(() => validateManifest(manifestOf(baseCase()))).not.toThrow();
  });

  it('rejects a duplicate case id', () => {
    expect(problemsOf(manifestOf(baseCase(), baseCase()))).toContain(
      'duplicate case id',
    );
  });

  it('rejects an unknown capability, op, runtime and error category', () => {
    const message = problemsOf(
      manifestOf(
        baseCase({
          requires: ['no.such.capability'],
          runtimes: ['mainframe' as never],
          steps: [
            { op: 'explode' as never },
            {
              op: 'listCollections',
              expect: { error: { category: 'Bogus' as never } },
            },
          ],
        }),
      ),
    );
    expect(message).toContain('unknown capability no.such.capability');
    expect(message).toContain('unknown runtime mainframe');
    expect(message).toContain('unknown op explode');
    expect(message).toContain('not a known category');
  });

  it('rejects an error case with no step expecting an error', () => {
    expect(problemsOf(manifestOf(baseCase({ kind: 'error' })))).toContain(
      'error case needs',
    );
  });

  it('rejects a case that expects the Unknown category', () => {
    const message = problemsOf(
      manifestOf(
        baseCase({
          kind: 'error',
          steps: [
            {
              op: 'listCollections',
              expect: { error: { category: 'Unknown' } },
            },
          ],
        }),
      ),
    );
    expect(message).toContain('must not expect the Unknown category');
  });

  it('rejects a step that needs a collection and has none', () => {
    expect(
      problemsOf(manifestOf(baseCase({ steps: [{ op: 'insertOne' }] }))),
    ).toContain('insertOne needs a collection');
  });

  it('rejects a wrong manifest version', () => {
    expect(problemsOf({ version: 99, capabilities: [], cases: [] })).toContain(
      'version must be',
    );
  });

  describe('strictness', () => {
    // Plain records, so the tests can hold shapes the types would refuse.
    const rawCase = (
      overrides: Record<string, unknown> = {},
    ): Record<string, unknown> => ({
      ...baseCase(),
      ...overrides,
    });
    const rawManifest = (...cases: Record<string, unknown>[]) => ({
      version: MANIFEST_VERSION,
      capabilities: CAPABILITIES,
      cases,
    });
    const stepCase = (step: Record<string, unknown>) =>
      rawManifest(rawCase({ steps: [{ expect: { returns: null }, ...step }] }));

    it('rejects an unknown key on the manifest, a case, a step and an expectation', () => {
      expect(problemsOf({ ...rawManifest(rawCase()), extra: 1 })).toContain(
        'manifest: unknown key extra',
      );
      expect(problemsOf(rawManifest(rawCase({ expectt: {} })))).toContain(
        'unknown key expectt',
      );
      expect(
        problemsOf(
          rawManifest(
            rawCase({
              steps: [
                { op: 'listCollections', retruns: [], expect: { returns: [] } },
              ],
            }),
          ),
        ),
      ).toContain('unknown key retruns');
      expect(
        problemsOf(
          rawManifest(
            rawCase({
              steps: [{ op: 'listCollections', expect: { retruns: [] } }],
            }),
          ),
        ),
      ).toContain('unknown key retruns');
      expect(
        problemsOf(
          rawManifest(
            rawCase({
              kind: 'error',
              steps: [
                {
                  op: 'listCollections',
                  expect: { error: { category: 'NotFound', cod: 'x' } },
                },
              ],
            }),
          ),
        ),
      ).toContain('unknown key cod');
    });

    it('rejects an unknown key in a state', () => {
      expect(
        problemsOf(
          rawManifest(
            rawCase({
              initial: { collections: { items: { docs: [], doc: [] } } },
            }),
          ),
        ),
      ).toContain('unknown key doc');
    });

    it('rejects a case that asserts nothing', () => {
      const bare = [{ op: 'listCollections' }];
      expect(problemsOf(rawManifest(rawCase({ steps: bare })))).toContain(
        'asserts nothing',
      );
      expect(
        problemsOf(
          rawManifest(
            rawCase({
              steps: [{ op: 'listCollections', expect: {} }],
            }),
          ),
        ),
      ).toContain('asserts nothing');
      expect(
        problemsOf(
          rawManifest(
            rawCase({
              steps: [{ op: 'listCollections', expect: { returns: '$any' } }],
            }),
          ),
        ),
      ).toContain('asserts nothing');
    });

    it('accepts a final-state expectation or an error expectation as the assertion', () => {
      expect(() =>
        validateManifest(
          rawManifest(
            rawCase({
              steps: [{ op: 'listCollections' }],
              expect: { state: { collections: {} } },
            }),
          ),
        ),
      ).not.toThrow();
      expect(() =>
        validateManifest(
          rawManifest(
            rawCase({
              kind: 'error',
              steps: [
                {
                  op: 'listCollections',
                  expect: { error: { category: 'Closed' } },
                },
              ],
            }),
          ),
        ),
      ).not.toThrow();
    });

    it('rejects a missing, misspelled or mistyped operation argument', () => {
      expect(
        problemsOf(stepCase({ op: 'insertOne', collection: 'c', args: {} })),
      ).toContain('insertOne needs args.document');
      expect(
        problemsOf(
          stepCase({
            op: 'insertOne',
            collection: 'c',
            args: { document: { _id: 'a' }, documnt: {} },
          }),
        ),
      ).toContain('unknown key documnt');
      expect(
        problemsOf(
          stepCase({
            op: 'insertOne',
            collection: 'c',
            args: { document: 'nope' },
          }),
        ),
      ).toContain('args.document must be object');
      expect(
        problemsOf(
          stepCase({
            op: 'createIndex',
            collection: 'c',
            args: { name: 'i', fields: 'a' },
          }),
        ),
      ).toContain('args.fields must be stringArray');
      expect(
        problemsOf(
          stepCase({ op: 'writeBatch', args: { operations: [{ doc: 1 }] } }),
        ),
      ).toContain('args.operations[0]: type must be one of');
      expect(
        problemsOf(stepCase({ op: 'listCollections', args: { extra: 1 } })),
      ).toContain('unknown key extra');
    });

    it('rejects an error code that is not declared', () => {
      expect(
        problemsOf(
          rawManifest(
            rawCase({
              kind: 'error',
              steps: [
                {
                  op: 'listCollections',
                  expect: {
                    error: {
                      category: 'InvalidFilter',
                      code: 'unknown_operater',
                    },
                  },
                },
              ],
            }),
          ),
        ),
      ).toContain('"unknown_operater" is not a declared error code');
      expect(() =>
        validateManifest(
          rawManifest(
            rawCase({
              kind: 'error',
              steps: [
                {
                  op: 'listCollections',
                  expect: {
                    error: {
                      category: 'InvalidFilter',
                      code: 'unknown_operator',
                    },
                  },
                },
              ],
            }),
          ),
        ),
      ).not.toThrow();
    });

    it('checks the expected state of other databases', () => {
      const withDatabases = (databases: unknown, steps?: unknown) =>
        rawManifest(
          rawCase({
            steps: steps ?? [
              { op: 'fork', args: { as: 'b' } },
              { op: 'listCollections', expect: { returns: [] } },
            ],
            expect: { databases },
          }),
        );
      const state = { collections: {} };
      expect(() => validateManifest(withDatabases({ b: state }))).not.toThrow();
      expect(problemsOf(withDatabases({ ghost: state }))).toContain(
        'expect.databases.ghost is never created or forked',
      );
      expect(problemsOf(withDatabases({ main: state }))).toContain(
        'belongs in expect.state',
      );
      expect(problemsOf(withDatabases([]))).toContain(
        'expect.databases must be an object',
      );
      expect(
        problemsOf(withDatabases({ b: { collections: { x: { doc: [] } } } })),
      ).toContain('unknown key doc');
      // An empty map checks nothing, so it is rejected and is no assertion.
      const forkOnly = [{ op: 'fork', args: { as: 'b' } }];
      const emptyProblems = problemsOf(withDatabases({}, forkOnly));
      expect(emptyProblems).toContain(
        'expect.databases must name at least one database',
      );
      expect(emptyProblems).toContain('asserts nothing');
      // Alone, a database expectation is an assertion.
      expect(() =>
        validateManifest(
          withDatabases({ b: state }, [{ op: 'fork', args: { as: 'b' } }]),
        ),
      ).not.toThrow();
    });

    it('validates each writeBatch operation by variant', () => {
      const batch = (...operations: unknown[]) =>
        problemsOf(stepCase({ op: 'writeBatch', args: { operations } }));
      const accepted: unknown[] = [
        { type: 'createCollection', collection: 'c' },
        { type: 'dropCollection', collection: 'c' },
        { type: 'insert', collection: 'c', document: { _id: 'a' } },
        { type: 'replace', collection: 'c', id: 'a', document: {} },
        { type: 'delete', collection: 'c', id: 'a' },
        { type: 'createIndex', collection: 'c', name: 'i', fields: ['a'] },
        { type: 'dropIndex', collection: 'c', name: 'i' },
      ];
      for (const operation of accepted) {
        expect(() =>
          validateManifest(
            stepCase({ op: 'writeBatch', args: { operations: [operation] } }),
          ),
        ).not.toThrow();
      }
      expect(
        batch({ type: 'insert', collection: 'c', documentt: {} }),
      ).toContain('unknown key documentt');
      expect(
        batch({ type: 'insert', collection: 'c', documentt: {} }),
      ).toContain('insert needs document (object)');
      expect(batch({ type: 'insert', document: {} })).toContain(
        'insert needs collection (string)',
      );
      expect(batch({ type: 'delete', collection: 'c' })).toContain(
        'delete needs id (string)',
      );
      expect(
        batch({ type: 'replace', collection: 'c', id: 1, document: {} }),
      ).toContain('id must be string');
      expect(
        batch({ type: 'insert', collection: 'c', document: [] }),
      ).toContain('document must be object');
      expect(
        batch({ type: 'createIndex', collection: 'c', name: 'i', fields: 'a' }),
      ).toContain('fields must be stringArray');
      expect(
        batch({ type: 'dropCollection', collection: 'c', id: 'x' }),
      ).toContain('unknown key id');
      expect(batch({ type: 'truncate', collection: 'c' })).toContain(
        'type must be one of',
      );
    });
    it('needs exactly one of other and savedRoot on rootsEqual', () => {
      expect(problemsOf(stepCase({ op: 'rootsEqual', args: {} }))).toContain(
        'exactly one of args.other and args.savedRoot',
      );
      expect(
        problemsOf(
          stepCase({
            op: 'rootsEqual',
            args: { other: 'b', savedRoot: 'r' },
          }),
        ),
      ).toContain('exactly one');
      expect(() =>
        validateManifest(
          stepCase({ op: 'rootsEqual', args: { savedRoot: 'r' } }),
        ),
      ).not.toThrow();
    });
  });
});

describe('expectation matching', () => {
  it('matches wildcards, partial objects and generated ids', () => {
    expect(diff({ a: 1, b: 2 }, { $partial: true, a: 1 }, 'strict')).toBeNull();
    expect(
      diff('0123456789abcdef0123456789abcdef', '$id', 'strict'),
    ).toBeNull();
    expect(diff('xyz', '$any', 'strict')).toBeNull();
  });

  it('reports a missing key, an extra key and a wrong value', () => {
    expect(diff({ a: 1 }, { a: 1, b: 2 }, 'strict')).toContain('missing');
    expect(diff({ a: 1, b: 2 }, { a: 1 }, 'strict')).toContain(
      'unexpected keys b',
    );
    expect(diff({ a: 1 }, { a: 2 }, 'strict')).toContain('expected 2, got 1');
    expect(diff('short', '$id', 'strict')).toContain('generated 32-hex id');
  });

  it('is order-sensitive when strict and order-blind when unordered', () => {
    expect(diff([1, 2], [2, 1], 'strict')).not.toBeNull();
    expect(diff([1, 2], [2, 1], 'unordered')).toBeNull();
    expect(diff([1, 1, 2], [1, 2, 2], 'unordered')).not.toBeNull();
  });

  it('applies unordered only to the result set, not to arrays inside it', () => {
    // The result set may come back in any order.
    expect(
      diff(
        [{ tags: ['a', 'b'] }, { tags: ['c'] }],
        [{ tags: ['c'] }, { tags: ['a', 'b'] }],
        'unordered',
      ),
    ).toBeNull();
    // An array field of a document may not.
    expect(
      diff([{ tags: ['b', 'a'] }], [{ tags: ['a', 'b'] }], 'unordered'),
    ).toContain('no unmatched item');
    // Nor may an array field of a single returned document.
    expect(
      diff({ tags: ['b', 'a'] }, { tags: ['a', 'b'] }, 'unordered'),
    ).toContain('$.tags[0]');
    // Nor an array nested in an array.
    expect(diff([[1, 2]], [[2, 1]], 'unordered')).not.toBeNull();
  });

  it('compares document arrays and index field lists in order when states are compared', () => {
    const state = (docs: Json[], fields: string[]): StateSpec => ({
      collections: { items: { docs, indexes: [{ name: 'i', fields }] } },
    });
    expect(
      diffState(
        state([{ _id: 'b', t: [1, 2] }, { _id: 'a' }], ['x', 'y']),
        state([{ _id: 'a' }, { _id: 'b', t: [1, 2] }], ['x', 'y']),
      ),
    ).toBeNull();
    expect(
      diffState(
        state([{ _id: 'a', t: [2, 1] }], []),
        state([{ _id: 'a', t: [1, 2] }], []),
      ),
    ).toContain('docs');
    expect(diffState(state([], ['y', 'x']), state([], ['x', 'y']))).toContain(
      'indexes',
    );
  });

  describe('captures', () => {
    const id = (digit: string) => digit.repeat(32);

    it('requires every use of a name to hold the same value', () => {
      const captures = new Map<string, string>();
      expect(diff(id('a'), '$id:made', 'strict', '$', captures)).toBeNull();
      expect(diff(id('a'), '$id:made', 'strict', '$', captures)).toBeNull();
      expect(diff(id('b'), '$id:made', 'strict', '$', captures)).toContain(
        'captured as made',
      );
    });

    it('still demands a generated id of an $id capture', () => {
      expect(diff('short', '$id:made', 'strict')).toContain(
        'generated 32-hex id for made',
      );
    });

    it('binds any value with $bind, and ties it to later uses', () => {
      const captures = new Map<string, string>();
      expect(
        diff(
          [{ v: 1 }, { v: 1 }],
          [{ v: '$bind:x' }, { v: '$bind:x' }],
          'strict',
          '$',
          captures,
        ),
      ).toBeNull();
      expect(
        diff(
          [{ v: 1 }, { v: 2 }],
          [{ v: '$bind:y' }, { v: '$bind:y' }],
          'strict',
        ),
      ).toContain('captured as y');
    });

    it('keeps separate names separate, and a map separate per call', () => {
      expect(diff([1, 2], ['$bind:a', '$bind:b'], 'strict')).toBeNull();
      expect(diff(1, '$bind:a', 'strict')).toBeNull();
      expect(diff(2, '$bind:a', 'strict')).toBeNull();
    });

    it('does not let an unordered candidate that failed bind a name', () => {
      const captures = new Map<string, string>();
      // The first actual item fails on `b`; it must not leave `a` bound to 1.
      expect(
        diff(
          [
            { a: 1, b: 9 },
            { a: 2, b: 2 },
          ],
          [
            { a: '$bind:k', b: 2 },
            { a: 1, b: 9 },
          ],
          'unordered',
          '$',
          captures,
        ),
      ).toBeNull();
      expect(captures.get('k')).toBe('2');
    });

    it('ties steps together across a case, so a wrong stored id fails', async () => {
      const generated = loadCorpus().cases.find(
        (testCase) => testCase.id === 'docs.insertOne.generatedId.001',
      );
      if (!generated) throw new Error('generatedId case is missing');
      const honest = new ModelAdapter();
      expect((await runCase(honest, 'memory', generated)).status).toBe(
        'passed',
      );
      const liar = new FaultyAdapter(honest, misreportInsertedId);
      const result = await runCase(liar, 'memory', generated);
      expect(result.status).toBe('failed');
      expect(result.messages.join('\n')).toContain('captured as inserted');
    });

    it('applies to the final state as well as to steps', async () => {
      const testCase = baseCase({
        requires: ['docs.insert'],
        steps: [
          {
            op: 'insertOne',
            collection: 'c',
            args: { document: { n: 1 } },
            expect: {
              returns: { $partial: true, insertedId: '$id:made' },
            },
          },
        ],
        expect: {
          state: { collections: { c: { docs: [{ _id: '$id:made', n: 1 }] } } },
        },
      });
      const model = new ModelAdapter();
      expect((await runCase(model, 'memory', testCase)).status).toBe('passed');
      const liar = new FaultyAdapter(model, misreportInsertedId);
      expect((await runCase(liar, 'memory', testCase)).status).toBe('failed');
    });
  });

  it('distinguishes null from a missing key', () => {
    expect(diff({ a: null }, { a: null }, 'strict')).toBeNull();
    expect(diff({}, { a: null }, 'strict')).toContain('missing');
  });
});

describe('rootsEqual against a saved root', () => {
  const caseOf = (steps: Step[]): CorpusCase =>
    baseCase({
      requires: ['docs.read'],
      steps,
      initial: { collections: { items: { docs: [{ _id: 'a' }] } } },
    });
  const save: Step = { op: 'saveRoot', args: { name: 'r' } };
  const same: Step = {
    op: 'rootsEqual',
    args: { savedRoot: 'r' },
    expect: { returns: true },
  };
  const changed: Step = {
    op: 'insertOne',
    collection: 'items',
    args: { document: { _id: 'b' } },
  };
  const adapters: [string, ConformanceAdapter][] = [
    ['node', new NodeConformanceAdapter()],
    ['model', new ModelAdapter()],
  ];

  it.each(adapters)(
    '%s: is true when the root has not moved',
    async (_, adapter) => {
      const result = await runCase(adapter, 'memory', caseOf([save, same]));
      expect(result).toMatchObject({ status: 'passed' });
    },
  );

  it.each(adapters)(
    '%s: is false once the root has moved, so the check can fail',
    async (_, adapter) => {
      const result = await runCase(
        adapter,
        'memory',
        caseOf([save, changed, same]),
      );
      expect(result.status).toBe('failed');
      expect(result.messages.join('\n')).toContain('expected true, got false');
    },
  );

  it.each(adapters)(
    '%s: reports an unknown saved root as NotFound',
    async (_, adapter) => {
      const session = await adapter.open({ id: 'memory' });
      try {
        expect(await session.run(same)).toMatchObject({
          ok: false,
          error: { category: 'NotFound', code: 'unknown_saved_root' },
        });
      } finally {
        await session.close();
      }
    },
  );
});

describe('runner', () => {
  const ok = (value: StepOutcome['value'] = null): StepOutcome => ({
    ok: true,
    value,
  });

  it('passes a case whose steps match', async () => {
    const result = await runCase(
      fakeAdapter(() => ok([])),
      'memory',
      baseCase(),
    );
    expect(result).toMatchObject({ status: 'passed', messages: [] });
  });

  it('fails a case whose return value differs', async () => {
    const result = await runCase(
      fakeAdapter(() => ok(['surprise'])),
      'memory',
      baseCase(),
    );
    expect(result.status).toBe('failed');
  });

  it('fails when an expected error does not happen', async () => {
    const testCase = baseCase({
      kind: 'error',
      steps: [
        {
          op: 'listCollections',
          expect: { error: { category: 'DuplicateKey' } },
        },
      ],
    });
    const result = await runCase(
      fakeAdapter(() => ok([])),
      'memory',
      testCase,
    );
    expect(result.status).toBe('failed');
    expect(result.messages[0]).toContain('but it succeeded');
  });

  it('fails when the error has the wrong category, and when it was not expected at all', async () => {
    const boom: StepOutcome = {
      ok: false,
      error: { category: 'Closed', message: 'closed' },
    };
    const wrong = baseCase({
      kind: 'error',
      steps: [
        {
          op: 'listCollections',
          expect: { error: { category: 'DuplicateKey' } },
        },
      ],
    });
    expect(
      (
        await runCase(
          fakeAdapter(() => boom),
          'memory',
          wrong,
        )
      ).messages[0],
    ).toContain('got Closed');
    expect(
      (
        await runCase(
          fakeAdapter(() => boom),
          'memory',
          baseCase(),
        )
      ).messages[0],
    ).toContain('unexpected Closed');
  });

  it('fails when the final state differs', async () => {
    const testCase = baseCase({
      expect: { state: { collections: { x: { docs: [] } } } },
    });
    const result = await runCase(
      fakeAdapter(() => ok([])),
      'memory',
      testCase,
    );
    expect(result.status).toBe('failed');
    expect(result.messages[0]).toContain('final state');
  });

  it('reports a thrown adapter as a failure, not a crash', async () => {
    const adapter = fakeAdapter(() => {
      throw new Error('adapter exploded');
    });
    const result = await runCase(adapter, 'memory', baseCase());
    expect(result.status).toBe('failed');
    expect(result.messages[0]).toContain('adapter exploded');
  });

  it('skips by capability, runtime and profile, and never reports a skip as passed', async () => {
    const lacking = fakeAdapter(() => ok([]), []);
    expect((await runCase(lacking, 'memory', baseCase())).status).toBe(
      'skipped-by-capability',
    );
    const adapter = fakeAdapter(() => ok([]));
    expect(
      (await runCase(adapter, 'memory', baseCase({ runtimes: ['browser'] })))
        .status,
    ).toBe('skipped-by-runtime');
    expect(
      (await runCase(adapter, 'memory', baseCase({ topologies: ['disk'] })))
        .status,
    ).toBe('skipped-by-profile');
  });

  describe('known divergences', () => {
    const tagged = baseCase({
      tags: ['knownDivergence'],
      steps: [{ op: 'listCollections', expect: { returns: ['intended'] } }],
    });

    it('reports a failing tagged case as a known divergence, not a failure', async () => {
      const result = await runCase(
        fakeAdapter(() => ok([])),
        'memory',
        tagged,
      );
      expect(result.status).toBe('known-divergence');
      expect(result.messages[0]).toContain('expected 1 items');
    });

    it('fails a tagged case that now passes, so the tag cannot go stale', async () => {
      const result = await runCase(
        fakeAdapter(() => ok(['intended'])),
        'memory',
        tagged,
      );
      expect(result.status).toBe('failed');
      expect(result.messages[0]).toContain('remove the knownDivergence tag');
    });

    it('does not count a tagged case as coverage, but counts it as executed', async () => {
      const manifest = manifestOf(tagged);
      expect(checkCoverage(manifest, new Set(['docs.read']))).toContain(
        'capability docs.read has no positive case',
      );
      const adapter = fakeAdapter(() => ok([]));
      const report = await runCorpus(adapter, manifest, { profile: 'memory' });
      expect(checkRun(manifest, adapter, report)).toEqual([]);
    });
  });

  it('counts each status in a run', async () => {
    const report = await runCorpus(
      fakeAdapter(() => ok([])),
      manifestOf(
        baseCase(),
        baseCase({ id: 'test.case.002', runtimes: ['browser'] }),
      ),
      { profile: 'memory' },
    );
    expect(report.counts).toMatchObject({
      passed: 1,
      'skipped-by-runtime': 1,
      failed: 0,
    });
  });
});

describe('inventory', () => {
  const advertised = new Set(['docs.read']);

  it('flags a capability missing a positive, boundary or error case', () => {
    const problems = checkCoverage(manifestOf(baseCase()), advertised);
    expect(problems).toContain('capability docs.read has no boundary case');
    expect(problems).toContain('capability docs.read has no error case');
    expect(problems).not.toContain('capability docs.read has no positive case');
  });

  it('is satisfied by all three kinds', () => {
    const manifest = manifestOf(
      baseCase(),
      baseCase({ id: 'test.case.002', kind: 'boundary' }),
      baseCase({
        id: 'test.case.003',
        kind: 'error',
        steps: [
          { op: 'listCollections', expect: { error: { category: 'Closed' } } },
        ],
      }),
    );
    expect(checkCoverage(manifest, advertised)).toEqual([]);
  });

  it('flags an advertised capability the matrix does not define', () => {
    expect(
      checkCoverage(manifestOf(baseCase()), new Set(['made.up'])),
    ).toContain(
      'capability made.up is advertised but not in the capability matrix',
    );
  });

  it('fails a run that executed nothing', async () => {
    const adapter = fakeAdapter(() => ({ ok: true, value: [] }), []);
    const manifest = manifestOf(baseCase());
    const report = await runCorpus(adapter, manifest, { profile: 'memory' });
    expect(checkRun(manifest, adapter, report)).toEqual([
      'no cases executed for runtime node, profile memory',
    ]);
  });

  it('fails a required case that never ran', async () => {
    const adapter = fakeAdapter(() => ({ ok: true, value: [] }));
    const manifest = manifestOf(baseCase(), baseCase({ id: 'test.case.002' }));
    const report = await runCorpus(adapter, manifest, {
      profile: 'memory',
      only: ['test.case.001'],
    });
    expect(checkRun(manifest, adapter, report)).toEqual([
      'required case test.case.002 was never run',
    ]);
  });
});
