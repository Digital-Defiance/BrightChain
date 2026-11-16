/**
 * Node-only: write a failure artifact where a developer or CI can pick it up.
 * Artifacts go under `dist/conformance-failures/` (git-ignored) and are the
 * input to the `conformance-replay` target.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  parseArtifact,
  type FailureArtifact,
} from '../../src/lib/v2/conformance/replay';

/** Quote a value as one POSIX shell word, whatever characters it holds. */
export function shellQuote(value: string): string {
  return `'${value.split("'").join(`'\\''`)}'`;
}

/** Read and validate an artifact file. Every failure names the path. */
export function readArtifactFile(path: string): FailureArtifact {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch (error) {
    throw new Error(
      `cannot read artifact ${JSON.stringify(path)}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new Error(
      `artifact ${JSON.stringify(path)} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return parseArtifact(raw);
}

/** A file name part with nothing a shell or file system treats specially. */
const safeName = (value: string): string => value.replace(/[^\w.-]/gu, '_');

export const ARTIFACT_DIRECTORY = resolve(
  __dirname,
  '..',
  '..',
  '..',
  'dist',
  'conformance-failures',
);

export function writeFailureArtifact(
  artifact: Omit<FailureArtifact, 'version'>,
  directory: string = ARTIFACT_DIRECTORY,
): string {
  mkdirSync(directory, { recursive: true });
  const file = join(
    directory,
    `${safeName(artifact.case.id)}.${safeName(artifact.profile)}.json`,
  );
  const full: FailureArtifact = { version: 1, ...artifact };
  writeFileSync(file, `${JSON.stringify(full, null, 2)}\n`);
  return file;
}
