/**
 * The corpus inventory. It answers two questions a green test run cannot:
 * does every advertised capability have a positive, a boundary and an error
 * case, and did every case a lane requires actually run?
 */
import { applicability } from './runner';
import {
  CASE_KINDS,
  KNOWN_DIVERGENCE_TAG,
  type CaseKind,
  type ConformanceAdapter,
  type CorpusManifest,
  type RunReport,
} from './types';

/**
 * Problems with the corpus itself: an advertised capability that lacks a case
 * of some kind, or an advertised capability the matrix does not define.
 */
export function checkCoverage(
  manifest: CorpusManifest,
  advertised: ReadonlySet<string>,
): string[] {
  const problems: string[] = [];
  const defined = new Set(
    manifest.capabilities.map((capability) => capability.id),
  );
  for (const id of advertised) {
    if (!defined.has(id)) {
      problems.push(
        `capability ${id} is advertised but not in the capability matrix`,
      );
    }
  }
  for (const capability of manifest.capabilities) {
    if (!advertised.has(capability.id)) continue;
    const kinds = new Set<CaseKind>();
    for (const testCase of manifest.cases) {
      // A case that asserts unbuilt behavior must not count as coverage.
      if (testCase.tags?.includes(KNOWN_DIVERGENCE_TAG)) continue;
      if (testCase.requires.includes(capability.id)) kinds.add(testCase.kind);
    }
    for (const kind of CASE_KINDS) {
      if (!kinds.has(kind)) {
        problems.push(`capability ${capability.id} has no ${kind} case`);
      }
    }
  }
  return problems;
}

/**
 * Problems with a run: a lane that executed nothing, or a case the lane
 * required that was skipped or never recorded. A case is required when the
 * adapter's runtime, profile and capabilities all say it should run.
 */
export function checkRun(
  manifest: CorpusManifest,
  adapter: ConformanceAdapter,
  report: RunReport,
): string[] {
  const problems: string[] = [];
  const ran = (status: string) =>
    status === 'passed' || status === 'failed' || status === 'known-divergence';
  const executed = report.results.filter((result) => ran(result.status));
  if (executed.length === 0) {
    problems.push(
      `no cases executed for runtime ${report.runtime}, profile ${report.profile}`,
    );
  }
  const recorded = new Map(report.results.map((result) => [result.id, result]));
  for (const testCase of manifest.cases) {
    if (applicability(adapter, report.profile, testCase) !== null) continue;
    const result = recorded.get(testCase.id);
    if (!result) {
      problems.push(`required case ${testCase.id} was never run`);
    } else if (!ran(result.status)) {
      problems.push(`required case ${testCase.id} was ${result.status}`);
    }
  }
  return problems;
}
