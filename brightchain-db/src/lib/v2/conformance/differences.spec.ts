import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCorpus } from '../../../../test-support/conformance/load-corpus';
import { renderDifferences } from './differences';

const FILE = join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'fixtures',
  'conformance',
  'DIFFERENCES.md',
);

describe('DIFFERENCES.md', () => {
  const expected = `${renderDifferences(loadCorpus())}\n`;

  it('matches what the corpus tags say', () => {
    if (process.env['UPDATE_DIFFERENCES'] === '1')
      writeFileSync(FILE, expected);
    expect(readFileSync(FILE, 'utf8')).toBe(expected);
  });
});
