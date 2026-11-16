/**
 * Render the list of differences from BSON/MongoDB behavior and the known
 * divergences from the corpus tags, so the published list cannot drift from
 * what the cases actually assert.
 */
import {
  BSON_DIFFERENCE_TAG,
  KNOWN_DIVERGENCE_TAG,
  type CorpusCase,
  type CorpusManifest,
} from './types';

const section = (
  title: string,
  intro: string,
  cases: CorpusCase[],
): string[] => {
  const lines = [`## ${title}`, '', intro, ''];
  if (cases.length === 0) {
    lines.push('None recorded.', '');
    return lines;
  }
  for (const testCase of cases) {
    lines.push(
      `- \`${testCase.id}\`: ${testCase.description ?? '(no description)'}`,
    );
  }
  lines.push('');
  return lines;
};

export function renderDifferences(manifest: CorpusManifest): string {
  const withTag = (tag: string) =>
    manifest.cases
      .filter((testCase) => testCase.tags?.includes(tag))
      .sort((left, right) => (left.id < right.id ? -1 : 1));
  return [
    '# BrightDB v2 differences and known divergences',
    '',
    '<!-- Generated from the operation corpus. Do not edit by hand.',
    '     Regenerate: UPDATE_DIFFERENCES=1 yarn nx test brightchain-db --testPathPatterns=v2/conformance/differences -->',
    '',
    ...section(
      'Deliberate differences from BSON/MongoDB',
      "Behavior BrightDB chooses on purpose. Each case asserts BrightDB's behavior.",
      withTag(BSON_DIFFERENCE_TAG),
    ),
    ...section(
      'Known divergences',
      'Behavior BrightDB is meant to have but does not yet. Each case asserts the intended behavior and is reported as a known divergence until it passes. When it passes, the run fails until the tag is removed.',
      withTag(KNOWN_DIVERGENCE_TAG),
    ),
  ].join('\n');
}
