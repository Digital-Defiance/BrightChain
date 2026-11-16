/**
 * Negative tests for the differential machinery. A comparison, a shrinker and
 * a freezer that have only ever met a subject that agrees with the model
 * prove nothing, so each of these runs against a subject with a deliberate
 * fault (a correct adapter, broken in one way) and expects the fault found.
 */
import {
  dropInsertsOn,
  dropOnReplace,
  FaultyAdapter,
  misreportInsertedId,
  refuseInsert,
  unsavedRootIsUnknown,
  wrongErrorCode,
  type Fault,
} from '../../../../test-support/conformance/faulty-adapter';
import { compareToModel, freezeCase, shrinkCase } from './differential';
import { buildManifest } from './manifest';
import { ModelAdapter } from './model/model';
import { runCase } from './runner';
import type { ConformanceAdapter, CorpusCase, Step } from './types';

const faulty = (fault: Fault): ConformanceAdapter =>
  new FaultyAdapter(new ModelAdapter(), fault);

const caseOf = (steps: Step[]): CorpusCase => ({
  id: 'negative.case.001',
  family: 'docs',
  requires: ['docs.read'],
  kind: 'positive',
  runtimes: ['node'],
  topologies: ['memory'],
  ordering: 'unordered',
  steps,
  source: 'model',
});

const insert = (id: string, extra: Record<string, number> = {}): Step => ({
  op: 'insertOne',
  collection: 'alpha',
  args: { document: { _id: id, ...extra } },
});
const replace = (id: string, n: number): Step => ({
  op: 'replaceById',
  collection: 'alpha',
  args: { id, document: { n } },
});
const findAll: Step = {
  op: 'find',
  collection: 'alpha',
  args: { filter: {} },
};

describe('compareToModel', () => {
  const steps = [insert('a'), replace('a', 2), findAll];

  it('finds nothing when the subject is correct', async () => {
    const subject = faulty(async (_step, outcome) => outcome);
    expect(await compareToModel(subject, 'memory', caseOf(steps))).toBeNull();
  });

  it('reports a step whose value differs', async () => {
    const message = await compareToModel(
      faulty(dropOnReplace),
      'memory',
      caseOf(steps),
    );
    expect(message).toContain('step 2');
    expect(message).toContain('"op":"find"');
  });

  it('reports a final state that differs when no step shows it', async () => {
    const message = await compareToModel(
      faulty(dropOnReplace),
      'memory',
      caseOf([insert('a'), replace('a', 2)]),
    );
    expect(message).toContain('final state of main');
  });

  it('reports a difference that only a replica shows', async () => {
    const withReplica: Step[] = [
      {
        op: 'insertOne',
        collection: 'alpha',
        args: { document: { _id: 'm' } },
      },
      { op: 'fork', args: { as: 'b' } },
      {
        op: 'insertOne',
        db: 'b',
        collection: 'alpha',
        args: { document: { _id: 'r' } },
      },
    ];
    const message = await compareToModel(
      faulty(dropInsertsOn('b')),
      'memory',
      caseOf(withReplica),
    );
    expect(message).toContain('final state of b');
  });

  it('reports a subject that fails where the model succeeds', async () => {
    const message = await compareToModel(
      faulty(refuseInsert),
      'memory',
      caseOf([insert('a')]),
    );
    expect(message).toContain('subject failed with Closed');
  });

  it('reports a different error category', async () => {
    const duplicate = [insert('a'), insert('a')];
    const message = await compareToModel(
      faulty(async (step, outcome) =>
        step.op === 'insertOne' && !outcome.ok
          ? { ok: false, error: { category: 'Closed', message: 'closed' } }
          : outcome,
      ),
      'memory',
      caseOf(duplicate),
    );
    expect(message).toContain('error category Closed');
    expect(message).toContain('model says DuplicateKey');
  });

  it('reports a different error code, not only a different category', async () => {
    const message = await compareToModel(
      faulty(wrongErrorCode),
      'memory',
      caseOf([insert('a'), insert('a')]),
    );
    expect(message).toContain('error code malformed_operand');
    expect(message).toContain('model says undefined');
  });

  it('reports a returned id that is not the stored one', async () => {
    const message = await compareToModel(
      faulty(misreportInsertedId),
      'memory',
      caseOf([insert('a')]),
    );
    expect(message).toContain('step 0');
  });
});

describe('shrinkCase', () => {
  it('removes steps and fields that the failure does not need', async () => {
    const noise = Array.from({ length: 8 }, (_, index) =>
      insert(`n${index}`, { r: index, t: index }),
    );
    const failing = caseOf([
      ...noise,
      insert('a', { r: 1, t: 2 }),
      findAll,
      replace('a', 2),
      findAll,
    ]);
    const subject = faulty(dropOnReplace);
    expect(await compareToModel(subject, 'memory', failing)).not.toBeNull();

    const shrunk = await shrinkCase(subject, 'memory', failing);

    expect(shrunk.steps.length).toBeLessThan(failing.steps.length);
    expect(shrunk.steps.map((step) => step.op)).toContain('replaceById');
    expect(await compareToModel(subject, 'memory', shrunk)).not.toBeNull();
    // Fields other than _id are dropped from the inserted document.
    const inserted = shrunk.steps.find((step) => step.op === 'insertOne');
    expect(inserted?.args?.['document']).toEqual({ _id: 'a' });
  });

  it('returns a case that does not fail unchanged', async () => {
    const passing = caseOf([insert('a'), findAll]);
    expect(await shrinkCase(faulty(dropOnReplace), 'memory', passing)).toBe(
      passing,
    );
  });

  it('keeps the original failure instead of one it creates by removing a setup step', async () => {
    // Original failure: the lossy replace shows at the final find. Removing
    // the saveRoot would leave findAt naming a root that was never saved, which
    // this subject reports as Unknown where the model says MissingBlock. That
    // is a different disagreement, and a shrinker that accepts any
    // disagreement would settle on it.
    const failing = caseOf([
      insert('a'),
      { op: 'saveRoot', args: { name: 'r1' } },
      replace('a', 2),
      {
        op: 'findAt',
        collection: 'alpha',
        args: { root: 'r1', filter: {} },
      },
      findAll,
    ]);
    const subject = faulty(async (step, outcome, session) =>
      unsavedRootIsUnknown(
        step,
        await dropOnReplace(step, outcome, session),
        session,
      ),
    );
    const original = await compareToModel(subject, 'memory', failing);
    expect(original).toContain('"op":"find"');

    const shrunk = await shrinkCase(subject, 'memory', failing);

    const ops = shrunk.steps.map((step) => step.op);
    expect(ops).toContain('replaceById');
    expect(ops).toContain('find');
    // The shrunk case fails where the original did, not on the unsaved root.
    const again = await compareToModel(subject, 'memory', shrunk);
    expect(again).not.toContain('findAt');
  });
});

describe('freezeCase', () => {
  it('produces a case the model passes and the faulty subject fails', async () => {
    const frozen = await freezeCase(
      caseOf([insert('a'), replace('a', 2), findAll]),
    );
    expect(() => buildManifest([frozen])).not.toThrow();
    expect((await runCase(new ModelAdapter(), 'memory', frozen)).status).toBe(
      'passed',
    );
    const result = await runCase(faulty(dropOnReplace), 'memory', frozen);
    expect(result.status).toBe('failed');
  });

  it('records the state of every database, so a replica-only failure replays', async () => {
    const withReplica = caseOf([
      {
        op: 'insertOne',
        collection: 'alpha',
        args: { document: { _id: 'm' } },
      },
      { op: 'fork', args: { as: 'b' } },
      {
        op: 'insertOne',
        db: 'b',
        collection: 'alpha',
        args: { document: { _id: 'r' } },
      },
    ]);
    const subject = faulty(dropInsertsOn('b'));
    const frozen = await freezeCase(withReplica);

    expect(frozen.expect?.databases?.['b']).toEqual({
      collections: { alpha: { docs: [{ _id: 'm' }, { _id: 'r' }] } },
    });
    expect(() => buildManifest([frozen])).not.toThrow();
    expect((await runCase(new ModelAdapter(), 'memory', frozen)).status).toBe(
      'passed',
    );
    const result = await runCase(subject, 'memory', frozen);
    expect(result.status).toBe('failed');
    expect(result.messages.join('\n')).toContain('final state of b');
  });

  it('records an error code the model reports, and the model replays it', async () => {
    const frozen = await freezeCase(
      caseOf([
        insert('a'),
        {
          op: 'find',
          collection: 'alpha',
          args: { filter: { n: { $bogus: 1 } } },
        },
      ]),
    );
    expect(frozen.steps[1].expect).toEqual({
      error: { category: 'InvalidFilter', code: 'unknown_operator' },
    });
    expect((await runCase(new ModelAdapter(), 'memory', frozen)).status).toBe(
      'passed',
    );
    // A subject that reports the same category with another code fails it.
    const result = await runCase(faulty(wrongErrorCode), 'memory', frozen);
    expect(result.status).toBe('failed');
    expect(result.messages.join('\n')).toContain('expected error code');
  });

  it('leaves the code out of an error that has none', async () => {
    const frozen = await freezeCase(caseOf([insert('a'), insert('a')]));
    expect(frozen.steps[1].expect).toEqual({
      error: { category: 'DuplicateKey' },
    });
  });
});
