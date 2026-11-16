/**
 * Runs the shared BrightDB operation corpus against the Node adapter on each
 * profile, and enforces the inventory: every advertised capability has
 * positive, boundary and error cases, and every required case actually ran.
 */
import { loadCorpus } from '../../../../test-support/conformance/load-corpus';
import { NodeConformanceAdapter } from '../../../../test-support/conformance/node-adapter';
import { checkCoverage, checkRun } from './inventory';
import { runCorpus } from './runner';

const manifest = loadCorpus();
const adapter = new NodeConformanceAdapter();

describe('BrightDB operation corpus', () => {
  it('covers every advertised capability with positive, boundary and error cases', () => {
    expect(checkCoverage(manifest, adapter.capabilities)).toEqual([]);
  });

  describe.each([...adapter.profiles])(
    'node adapter, %s profile',
    (profile) => {
      it('passes every case it runs, and runs every case it should', async () => {
        const report = await runCorpus(adapter, manifest, { profile });
        const failures = report.results
          .filter((result) => result.status === 'failed')
          .map(
            (result) => `${result.id}\n    ${result.messages.join('\n    ')}`,
          );
        expect(failures).toEqual([]);
        expect(checkRun(manifest, adapter, report)).toEqual([]);
      });
    },
  );
});
