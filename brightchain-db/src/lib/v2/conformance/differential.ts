/**
 * Differential testing: run one generated case on a subject adapter and on
 * the reference model, compare every step and the final state, shrink a
 * failing case, and freeze it as a replayable corpus case.
 */
import { diff } from './match';
import { ModelAdapter } from './model/model';
import { diffState } from './runner';
import {
  errorOf,
  type AdapterSession,
  type ConformanceAdapter,
  type CorpusCase,
  type Json,
  type StateSpec,
  type Step,
  type StepOutcome,
} from './types';

/** Every database a case touches: `main`, and each one a step creates or forks. */
export const databasesOf = (testCase: CorpusCase): string[] => {
  const names = new Set<string>(['main']);
  for (const step of testCase.steps) {
    if (step.op === 'fork' || step.op === 'create')
      names.add(String(step.args?.['as']));
  }
  return [...names];
};

/** Indexes are not modelled, so a state is compared and frozen by documents only. */
const documentsOnly = (state: StateSpec): StateSpec => ({
  collections: Object.fromEntries(
    Object.entries(state.collections).map(([key, value]) => [
      key,
      { docs: value.docs },
    ]),
  ),
});

/** Steps whose value is adapter-specific and only success is compared. */
const OPAQUE: ReadonlySet<Step['op']> = new Set(['root']);

/** How a subject and the model disagree on one step: what, and a position-free kind. */
interface OutcomeDifference {
  detail: string;
  kind: string;
}

function compareOutcome(
  step: Step,
  subject: StepOutcome,
  model: StepOutcome,
): OutcomeDifference | null {
  if (subject.ok !== model.ok) {
    return subject.ok
      ? {
          detail: `subject succeeded but the model failed with ${errorOf(model).category}: ${errorOf(model).message}`,
          kind: `subject-ok-model-${errorOf(model).category}`,
        }
      : {
          detail: `subject failed with ${errorOf(subject).category}: ${errorOf(subject).message}, but the model succeeded`,
          kind: `subject-${errorOf(subject).category}-model-ok`,
        };
  }
  if (!subject.ok) {
    const got = errorOf(subject);
    const want = errorOf(model);
    if (got.category !== want.category) {
      return {
        detail: `error category ${got.category} (${got.message}), model says ${want.category}`,
        kind: `category-${got.category}-model-${want.category}`,
      };
    }
    // The code is part of an error's identity, so a code the model reports
    // and the subject does not (or the reverse) is a disagreement too.
    return got.code === want.code
      ? null
      : {
          detail: `error code ${String(got.code)} (${got.message}), model says ${String(want.code)}`,
          kind: `code-${String(got.code)}-model-${String(want.code)}`,
        };
  }
  if (OPAQUE.has(step.op)) return null;
  const found = diff(subject.value, model.value as Json, 'unordered');
  return found ? { detail: found, kind: 'value' } : null;
}

/** A step that could not run at all (for example after shrinking removed its setup). */
class InvalidCandidate extends Error {}

/** The first place a subject and the model disagree on a case. */
export interface Disagreement {
  /** For a person: where it happened and what differed. */
  message: string;
  /**
   * What kind of disagreement it is, without step numbers, so a shrunk case
   * can be checked to still show the same failure as the original.
   */
  signature: string;
}

/**
 * Run `testCase` on both adapters and return the first disagreement, or null.
 * Throws `InvalidCandidate` when the case is structurally unrunnable.
 */
async function findDisagreement(
  subject: ConformanceAdapter,
  profile: string,
  testCase: CorpusCase,
  model: ConformanceAdapter,
): Promise<Disagreement | null> {
  let actual: AdapterSession | undefined;
  let expected: AdapterSession | undefined;
  try {
    actual = await subject.open({ id: profile }, testCase.initial);
    expected = await model.open({ id: profile }, testCase.initial);
    for (const [index, step] of testCase.steps.entries()) {
      let left: StepOutcome;
      let right: StepOutcome;
      try {
        left = await actual.run(step);
        right = await expected.run(step);
      } catch (error) {
        throw new InvalidCandidate(
          error instanceof Error ? error.message : String(error),
        );
      }
      const found = compareOutcome(step, left, right);
      if (found) {
        return {
          message: `step ${index} ${JSON.stringify(step)}: ${found.detail}`,
          signature: `step:${step.op}:${found.kind}`,
        };
      }
    }
    for (const name of databasesOf(testCase)) {
      let left: StateSpec;
      let right: StateSpec;
      try {
        left = await actual.readState(name);
        right = await expected.readState(name);
      } catch (error) {
        throw new InvalidCandidate(
          error instanceof Error ? error.message : String(error),
        );
      }
      const found = diffState(documentsOnly(left), documentsOnly(right));
      if (found) {
        return {
          message: `final state of ${name}: ${found}`,
          signature: `state:${name}`,
        };
      }
    }
    return null;
  } finally {
    await actual?.close();
    await expected?.close();
  }
}

/**
 * Run `testCase` on the subject and on the model. Returns a description of
 * the first disagreement, or null. Throws `InvalidCandidate` when the case is
 * structurally unrunnable.
 */
export async function compareToModel(
  subject: ConformanceAdapter,
  profile: string,
  testCase: CorpusCase,
  model: ConformanceAdapter = new ModelAdapter(),
): Promise<string | null> {
  return (
    (await findDisagreement(subject, profile, testCase, model))?.message ?? null
  );
}

/** Whether `candidate` still disagrees in the same way as the original failure. */
async function stillFails(
  subject: ConformanceAdapter,
  profile: string,
  candidate: CorpusCase,
  signature: string,
): Promise<boolean> {
  try {
    const found = await findDisagreement(
      subject,
      profile,
      candidate,
      new ModelAdapter(),
    );
    return found?.signature === signature;
  } catch (error) {
    if (error instanceof InvalidCandidate) return false;
    throw error;
  }
}

/**
 * Remove steps (delta debugging), then drop document fields, while the case
 * still fails in the same way. A candidate that fails differently, such as
 * one whose `saveRoot` was removed so a later read names a root that was never
 * saved, is not accepted: the result must reproduce the original failure.
 * A case that does not disagree is returned unchanged.
 */
export async function shrinkCase(
  subject: ConformanceAdapter,
  profile: string,
  failing: CorpusCase,
): Promise<CorpusCase> {
  const original = await findDisagreement(
    subject,
    profile,
    failing,
    new ModelAdapter(),
  );
  if (!original) return failing;
  const fails = (candidate: CorpusCase) =>
    stillFails(subject, profile, candidate, original.signature);
  let current = failing;
  for (
    let chunk = Math.ceil(current.steps.length / 2);
    chunk >= 1;
    chunk = Math.floor(chunk / 2)
  ) {
    let removed = true;
    while (removed) {
      removed = false;
      for (let start = 0; start < current.steps.length; start += chunk) {
        const steps = [
          ...current.steps.slice(0, start),
          ...current.steps.slice(start + chunk),
        ];
        if (steps.length === 0) continue;
        const candidate = { ...current, steps };
        if (await fails(candidate)) {
          current = candidate;
          removed = true;
          break;
        }
      }
    }
    if (chunk === 1) break;
  }

  // Simplify documents: drop each non-_id field that is not needed.
  for (let index = 0; index < current.steps.length; index += 1) {
    const documents = (step: Step): { [key: string]: Json }[] => {
      const args = step.args ?? {};
      if (args['document'] && typeof args['document'] === 'object')
        return [args['document'] as never];
      if (Array.isArray(args['documents'])) return args['documents'] as never;
      return [];
    };
    for (const [position, document] of documents(
      current.steps[index],
    ).entries()) {
      for (const field of Object.keys(document).filter(
        (key) => key !== '_id',
      )) {
        const steps = JSON.parse(JSON.stringify(current.steps)) as Step[];
        const target = documents(steps[index])[position];
        delete target[field];
        const candidate = { ...current, steps };
        if (await fails(candidate)) current = candidate;
      }
    }
  }
  return current;
}

/**
 * Fill in expectations from the model so the case replays without a
 * generator and without the model: a plain corpus case.
 */
export async function freezeCase(testCase: CorpusCase): Promise<CorpusCase> {
  const session = await new ModelAdapter().open(
    { id: 'memory' },
    testCase.initial,
  );
  const steps: Step[] = [];
  try {
    for (const step of testCase.steps) {
      const outcome = await session.run(step);
      const failure = errorOf(outcome);
      const expect = outcome.ok
        ? OPAQUE.has(step.op)
          ? { returns: '$any' as Json }
          : { returns: outcome.value as Json }
        : {
            error: {
              category: failure.category,
              ...(failure.code === undefined ? {} : { code: failure.code }),
            },
          };
      steps.push({ ...step, expect });
    }
    // Every database the differential checks, not only `main`, so a mismatch
    // shrunk down to a replica still fails when the artifact is replayed.
    const databases: { [name: string]: StateSpec } = {};
    for (const name of databasesOf(testCase)) {
      if (name !== 'main') {
        databases[name] = documentsOnly(await session.readState(name));
      }
    }
    return {
      ...testCase,
      steps,
      kind: steps.some((step) => step.expect?.error) ? 'error' : 'positive',
      expect: {
        state: documentsOnly(await session.readState('main')),
        ...(Object.keys(databases).length > 0 ? { databases } : {}),
      },
    };
  } finally {
    await session.close();
  }
}
