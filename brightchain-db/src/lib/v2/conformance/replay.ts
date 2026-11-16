/**
 * Failure artifacts. When a generated or corpus case fails, the run writes an
 * artifact holding everything needed to run it again: the frozen case, the
 * profile, and where it came from. `conformance-replay` consumes one.
 *
 * Phase 1 artifacts carry the case, profile, seed and message. Topology, node
 * roots, repository revisions and the fault trace join them in phase 6.
 */
import { buildManifest } from './manifest';
import type { CorpusCase } from './types';

export interface FailureArtifact {
  /** Artifact schema version. */
  version: 1;
  case: CorpusCase;
  profile: string;
  /** The generator seed, when the case came from one. */
  seed?: number;
  /** Why the original run failed. */
  message?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Decide from the environment whether this run is a replay, and of which
 * file. The `conformance-replay` target sets `CONFORMANCE_REPLAY=1`; in that
 * mode a missing artifact path is an error, not a reason to skip, so the lane
 * cannot pass without replaying anything. Returns null outside replay mode.
 */
export function replayArtifactPath(
  env: Readonly<Record<string, string | undefined>>,
): string | null {
  const path = env['CONFORMANCE_ARTIFACT'];
  if (env['CONFORMANCE_REPLAY'] !== '1') return null;
  if (path === undefined || path.trim() === '') {
    throw new Error(
      'conformance-replay needs an artifact: set CONFORMANCE_ARTIFACT=<path to a failure artifact>',
    );
  }
  return path;
}

/**
 * Validate parsed JSON as a failure artifact. A bare corpus case is accepted
 * too, so a shrunk case printed by a failing run can be replayed as is.
 * Throws a `CorpusValidationError` when the case itself is malformed.
 */
export function parseArtifact(
  raw: unknown,
  defaultProfile = 'memory',
): FailureArtifact {
  if (!isRecord(raw)) throw new Error('artifact is not an object');
  const wrapped = isRecord(raw['case']);
  const testCase = (wrapped ? raw['case'] : raw) as unknown as CorpusCase;
  // Validating through a one-case manifest reuses every check the corpus gets.
  buildManifest([testCase]);
  return {
    version: 1,
    case: testCase,
    profile:
      wrapped && typeof raw['profile'] === 'string'
        ? raw['profile']
        : defaultProfile,
    seed: wrapped && typeof raw['seed'] === 'number' ? raw['seed'] : undefined,
    message:
      wrapped && typeof raw['message'] === 'string'
        ? raw['message']
        : undefined,
  };
}
