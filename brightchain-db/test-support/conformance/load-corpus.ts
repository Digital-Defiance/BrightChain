/**
 * Node-only: read the checked-in corpus files and build the validated
 * manifest. The files live in `fixtures/conformance/corpus/`, one per family,
 * each `{ "cases": [...] }`. Capabilities come from the matrix in code, so
 * there is one place that says what BrightDB claims to support.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CAPABILITIES } from '../../src/lib/v2/conformance/capabilities';
import { validateManifest } from '../../src/lib/v2/conformance/manifest';
import {
  MANIFEST_VERSION,
  type CorpusCase,
  type CorpusManifest,
} from '../../src/lib/v2/conformance/types';

export const CORPUS_DIRECTORY = join(
  __dirname,
  '..',
  '..',
  'fixtures',
  'conformance',
  'corpus',
);

export function loadCorpus(
  directory: string = CORPUS_DIRECTORY,
): CorpusManifest {
  const cases: CorpusCase[] = [];
  for (const file of readdirSync(directory)
    .filter((name) => name.endsWith('.json'))
    .sort()) {
    const parsed = JSON.parse(readFileSync(join(directory, file), 'utf8')) as {
      cases?: CorpusCase[];
    };
    if (!Array.isArray(parsed.cases)) {
      throw new Error(`${file}: expected { "cases": [...] }`);
    }
    cases.push(...parsed.cases);
  }
  return validateManifest({
    version: MANIFEST_VERSION,
    capabilities: CAPABILITIES,
    cases,
  });
}
