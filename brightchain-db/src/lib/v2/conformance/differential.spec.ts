/**
 * Generated operation sequences, run on production and on the independent
 * model. Any disagreement fails with the seed and a shrunk, replayable case.
 * Override the seed range with CONFORMANCE_SEEDS="start:count".
 */
import {
  shellQuote,
  writeFailureArtifact,
} from '../../../../test-support/conformance/artifact';
import { NodeConformanceAdapter } from '../../../../test-support/conformance/node-adapter';
import { compareToModel, freezeCase, shrinkCase } from './differential';
import { generateCase, mulberry32, parseSeedRange } from './generator';
import type { CorpusCase } from './types';

const adapter = new NodeConformanceAdapter();

const { start, count } = parseSeedRange(process.env['CONFORMANCE_SEEDS']);

async function failureReport(
  profile: string,
  testCase: CorpusCase,
  message: string,
  seed: number,
): Promise<string> {
  const shrunk = await shrinkCase(adapter, profile, testCase);
  const frozen = await freezeCase(shrunk);
  const file = writeFailureArtifact({ case: frozen, profile, seed, message });
  return [
    `${testCase.id} (${profile}) disagrees with the model: ${message}`,
    `Shrunk from ${testCase.steps.length} to ${shrunk.steps.length} steps.`,
    `Replay: CONFORMANCE_ARTIFACT=${shellQuote(file)} yarn nx run brightchain-db:conformance-replay`,
    JSON.stringify(frozen, null, 2),
  ].join('\n');
}

describe('CONFORMANCE_SEEDS', () => {
  it('defaults when unset or blank and parses start:count', () => {
    expect(parseSeedRange(undefined)).toEqual({ start: 1, count: 40 });
    expect(parseSeedRange('  ')).toEqual({ start: 1, count: 40 });
    expect(parseSeedRange('100:25')).toEqual({ start: 100, count: 25 });
    expect(parseSeedRange('0:1')).toEqual({ start: 0, count: 1 });
  });

  it.each(['5', 'a:b', '1:', ':3', '1:2:3', '-1:5', '1.5:2', '3:0', '1:-2'])(
    'rejects %p instead of running zero sequences',
    (value) => {
      expect(() => parseSeedRange(value)).toThrow('CONFORMANCE_SEEDS');
    },
  );

  it('rejects numbers too large to be exact', () => {
    expect(() => parseSeedRange('99999999999999999999:5')).toThrow(
      'CONFORMANCE_SEEDS',
    );
  });
});

describe('generator', () => {
  it('writes the same record on both replicas at the same counter when contested', () => {
    const steps = generateCase(3, { replicas: true, contested: true }).steps;
    const fork = steps.findIndex((step) => step.op === 'fork');
    const [mine, theirs] = steps.slice(fork + 1, fork + 3);
    expect(mine).toMatchObject({ op: 'replaceById', collection: 'alpha' });
    expect(theirs).toMatchObject({
      op: 'replaceById',
      db: 'b',
      collection: 'alpha',
    });
    expect(theirs.args?.['id']).toBe(mine.args?.['id']);
    expect(theirs.args?.['document']).not.toEqual(mine.args?.['document']);
    expect(generateCase(3, { replicas: true, contested: true })).toMatchObject({
      topologies: ['memory'],
    });
  });

  it('never has the replica touch shared records unless contested', () => {
    const shared = ['k1', 'k2', 'k3', 'ключ'];
    for (let seed = 1; seed <= 20; seed += 1) {
      for (const step of generateCase(seed, { replicas: true }).steps) {
        if (step.db !== 'b' || step.op === 'merge') continue;
        expect(shared).not.toContain(step.args?.['id']);
      }
    }
  });

  it('is deterministic for a seed and varies across seeds', () => {
    expect(generateCase(7)).toEqual(generateCase(7));
    expect(generateCase(7)).not.toEqual(generateCase(8));
    const first = mulberry32(1);
    const second = mulberry32(1);
    expect([first(), first(), first()]).toEqual([second(), second(), second()]);
  });
});

describe('production agrees with the reference model', () => {
  const run = (
    profile: string,
    seeds: number,
    options: { replicas?: boolean; contested?: boolean },
  ) =>
    it(`${profile}: ${seeds} generated sequences${options.replicas ? ' with replicas' : ''}${options.contested ? ' contesting the same records' : ''}`, async () => {
      const disagreements: string[] = [];
      for (let seed = start; seed < start + seeds; seed += 1) {
        const testCase = generateCase(seed, {
          steps: 30,
          avoidKnownDivergences:
            process.env['CONFORMANCE_INCLUDE_KNOWN'] !== '1',
          ...options,
        });
        const message = await compareToModel(adapter, profile, testCase);
        if (message) {
          disagreements.push(
            await failureReport(profile, testCase, message, seed),
          );
          break; // one shrunk report is enough to act on
        }
      }
      expect(disagreements).toEqual([]);
    });

  run('memory', count, {});
  run('memory', Math.ceil(count / 2), { replicas: true });
  // Memory only: its writer IDs are assigned in creation order, as the model's are.
  run('memory', Math.ceil(count / 2), { replicas: true, contested: true });
  run('disk', 4, {});
  run('disk', 2, { replicas: true });
});
