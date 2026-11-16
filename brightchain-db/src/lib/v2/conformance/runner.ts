/**
 * The shared conformance runner. It takes a manifest and an adapter and runs
 * every applicable case, recording each as passed, failed, or skipped with a
 * reason. A case the adapter cannot run is reported as skipped, never as
 * passed, and a required lane can then refuse a run with no executed cases.
 */
import { diff, type Captures } from './match';
import {
  errorOf,
  KNOWN_DIVERGENCE_TAG,
  type AdapterSession,
  type CaseResult,
  type CaseStatus,
  type ConformanceAdapter,
  type CorpusCase,
  type CorpusManifest,
  type RunReport,
  type StateSpec,
} from './types';

const STATUSES: readonly CaseStatus[] = [
  'passed',
  'failed',
  'skipped-by-capability',
  'skipped-by-runtime',
  'skipped-by-profile',
  'known-divergence',
];

export function emptyCounts(): Record<CaseStatus, number> {
  return Object.fromEntries(STATUSES.map((status) => [status, 0])) as Record<
    CaseStatus,
    number
  >;
}

/** Decide whether `adapter` should run `testCase` under `profile`, and why not. */
export function applicability(
  adapter: ConformanceAdapter,
  profile: string,
  testCase: CorpusCase,
): { status: CaseStatus; message: string } | null {
  if (!testCase.runtimes.includes(adapter.runtime)) {
    return {
      status: 'skipped-by-runtime',
      message: `case does not list runtime ${adapter.runtime}`,
    };
  }
  if (!testCase.topologies.includes(profile)) {
    return {
      status: 'skipped-by-profile',
      message: `case does not list profile ${profile}`,
    };
  }
  const missing = testCase.requires.filter(
    (id) => !adapter.capabilities.has(id),
  );
  if (missing.length > 0) {
    return {
      status: 'skipped-by-capability',
      message: `adapter lacks ${missing.join(', ')}`,
    };
  }
  return null;
}

/**
 * Compare the visible state of a database to an expected state. Pass the
 * case's `captures` so a state can refer to values bound in earlier steps.
 */
export function diffState(
  actual: StateSpec,
  expected: StateSpec,
  captures: Captures = new Map(),
): string | null {
  const actualNames = Object.keys(actual.collections).sort();
  const expectedNames = Object.keys(expected.collections).sort();
  if (actualNames.join('\u0000') !== expectedNames.join('\u0000')) {
    return `collections: expected [${expectedNames.join(', ')}], got [${actualNames.join(', ')}]`;
  }
  for (const name of expectedNames) {
    const want = expected.collections[name];
    const have = actual.collections[name];
    // Documents in a state are a set; adapters sort them only as normalization.
    const docs = diff(
      have.docs,
      want.docs,
      'unordered',
      `collections.${name}.docs`,
      captures,
    );
    if (docs) return docs;
    if (want.indexes) {
      const indexes = diff(
        have.indexes ?? [],
        want.indexes as never,
        'unordered',
        `collections.${name}.indexes`,
        captures,
      );
      if (indexes) return indexes;
    }
  }
  return null;
}

/** Run one case in a fresh session. Never throws; failures become results. */
export async function runCase(
  adapter: ConformanceAdapter,
  profile: string,
  testCase: CorpusCase,
): Promise<CaseResult> {
  const skip = applicability(adapter, profile, testCase);
  if (skip) {
    return { id: testCase.id, status: skip.status, messages: [skip.message] };
  }

  let session: AdapterSession | undefined;
  const messages: string[] = [];
  // Values bound by `$id:name` and `$bind:name`, shared by every step and state.
  const captures: Captures = new Map();
  try {
    session = await adapter.open({ id: profile }, testCase.initial);
    for (const [index, step] of testCase.steps.entries()) {
      const outcome = await session.run(step);
      const label = `step ${index} (${step.op}${step.collection ? ` ${step.collection}` : ''})`;
      const wantsError = step.expect?.error;
      if (wantsError) {
        if (outcome.ok) {
          messages.push(
            `${label}: expected error ${wantsError.category}, but it succeeded`,
          );
          break;
        }
        const error = errorOf(outcome);
        if (error.category !== wantsError.category) {
          messages.push(
            `${label}: expected error ${wantsError.category}, got ${error.category}: ${error.message}`,
          );
          break;
        }
        if (wantsError.code !== undefined && error.code !== wantsError.code) {
          messages.push(
            `${label}: expected error code ${wantsError.code}, got ${String(error.code)}`,
          );
          break;
        }
        continue;
      }
      if (!outcome.ok) {
        const error = errorOf(outcome);
        messages.push(
          `${label}: unexpected ${error.category}: ${error.message}`,
        );
        break;
      }
      if (step.expect?.returns !== undefined) {
        const found = diff(
          outcome.value,
          step.expect.returns,
          testCase.ordering,
          '$',
          captures,
        );
        if (found) {
          messages.push(`${label}: ${found}`);
          break;
        }
      }
    }
    if (messages.length === 0 && testCase.expect?.state) {
      const found = diffState(
        await session.readState('main'),
        testCase.expect.state,
        captures,
      );
      if (found) messages.push(`final state: ${found}`);
    }
    for (const [name, state] of Object.entries(
      testCase.expect?.databases ?? {},
    )) {
      if (messages.length > 0) break;
      const found = diffState(await session.readState(name), state, captures);
      if (found) messages.push(`final state of ${name}: ${found}`);
    }
  } catch (error) {
    messages.push(
      `runner error: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`,
    );
  } finally {
    try {
      await session?.close();
    } catch (error) {
      messages.push(
        `close error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  if (testCase.tags?.includes(KNOWN_DIVERGENCE_TAG)) {
    // The case states the intended behavior. Failing is expected; passing
    // means the divergence is fixed and the tag must come off.
    return messages.length > 0
      ? { id: testCase.id, status: 'known-divergence', messages }
      : {
          id: testCase.id,
          status: 'failed',
          messages: [
            `now passes: remove the ${KNOWN_DIVERGENCE_TAG} tag so it guards the fix`,
          ],
        };
  }
  return {
    id: testCase.id,
    status: messages.length === 0 ? 'passed' : 'failed',
    messages,
  };
}

export interface RunOptions {
  profile: string;
  /** Run only cases whose ID starts with one of these prefixes. */
  only?: readonly string[];
}

/** Run every applicable case in the manifest. */
export async function runCorpus(
  adapter: ConformanceAdapter,
  manifest: CorpusManifest,
  { profile, only }: RunOptions,
): Promise<RunReport> {
  const results: CaseResult[] = [];
  const counts = emptyCounts();
  for (const testCase of manifest.cases) {
    if (only && !only.some((prefix) => testCase.id.startsWith(prefix)))
      continue;
    const result = await runCase(adapter, profile, testCase);
    results.push(result);
    counts[result.status] += 1;
  }
  return { runtime: adapter.runtime, profile, results, counts };
}
