/**
 * Replay a failure artifact. Run it through the Nx target:
 *
 *   CONFORMANCE_ARTIFACT=<path> yarn nx run brightchain-db:conformance-replay
 *
 * The target sets CONFORMANCE_REPLAY=1, which makes a missing or unreadable
 * artifact a failure. Without it (the PR lane), only the parser is tested and
 * the replay itself is skipped.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  readArtifactFile,
  shellQuote,
} from '../../../../test-support/conformance/artifact';
import { NodeConformanceAdapter } from '../../../../test-support/conformance/node-adapter';
import { CorpusValidationError } from './manifest';
import { parseArtifact, replayArtifactPath } from './replay';
import { runCase } from './runner';

const replaying = process.env['CONFORMANCE_REPLAY'] === '1';

describe('artifact parsing', () => {
  const testCase = {
    id: 'replay.sample.001',
    family: 'docs',
    requires: ['docs.read'],
    kind: 'positive',
    runtimes: ['node'],
    topologies: ['memory'],
    ordering: 'strict',
    steps: [{ op: 'listCollections', expect: { returns: [] } }],
    source: 'model',
  };

  it('accepts a wrapped artifact and a bare case', () => {
    const wrapped = parseArtifact({
      version: 1,
      case: testCase,
      profile: 'disk',
      seed: 9,
    });
    expect(wrapped).toMatchObject({ profile: 'disk', seed: 9 });
    expect(parseArtifact(testCase, 'memory')).toMatchObject({
      profile: 'memory',
    });
  });

  it('rejects a malformed case and a non-object', () => {
    expect(() => parseArtifact({ case: { ...testCase, steps: [] } })).toThrow(
      CorpusValidationError,
    );
    expect(() => parseArtifact('nope')).toThrow('not an object');
  });
});

describe('replay request', () => {
  it('is off unless the replay target asked for it', () => {
    expect(replayArtifactPath({})).toBeNull();
    expect(replayArtifactPath({ CONFORMANCE_ARTIFACT: 'a.json' })).toBeNull();
  });

  it('returns the path in replay mode', () => {
    expect(
      replayArtifactPath({
        CONFORMANCE_REPLAY: '1',
        CONFORMANCE_ARTIFACT: 'a b.json',
      }),
    ).toBe('a b.json');
  });

  it('fails in replay mode when no artifact was given', () => {
    expect(() => replayArtifactPath({ CONFORMANCE_REPLAY: '1' })).toThrow(
      'CONFORMANCE_ARTIFACT',
    );
    expect(() =>
      replayArtifactPath({
        CONFORMANCE_REPLAY: '1',
        CONFORMANCE_ARTIFACT: '  ',
      }),
    ).toThrow('CONFORMANCE_ARTIFACT');
  });
});

describe('artifact files', () => {
  let directory: string;
  beforeAll(() => {
    directory = mkdtempSync(join(tmpdir(), 'brightdb-replay-spec-'));
  });
  afterAll(() => rmSync(directory, { recursive: true, force: true }));

  it('names the path when the file is missing or not JSON', () => {
    const missing = join(directory, 'missing.json');
    expect(() => readArtifactFile(missing)).toThrow(
      `cannot read artifact ${JSON.stringify(missing)}`,
    );
    const broken = join(directory, 'broken.json');
    writeFileSync(broken, '{ nope');
    expect(() => readArtifactFile(broken)).toThrow('is not valid JSON');
  });

  it('reads a valid artifact from a path with spaces and quotes', () => {
    const file = join(directory, "it's a file.json");
    writeFileSync(
      file,
      JSON.stringify({
        case: {
          id: 'replay.file.001',
          family: 'docs',
          requires: ['docs.read'],
          kind: 'positive',
          runtimes: ['node'],
          topologies: ['memory'],
          ordering: 'strict',
          steps: [{ op: 'listCollections', expect: { returns: [] } }],
          source: 'model',
        },
        profile: 'memory',
      }),
    );
    expect(readArtifactFile(file).case.id).toBe('replay.file.001');
  });
});

describe('shell quoting', () => {
  it('keeps metacharacters and quotes inside one word', () => {
    expect(shellQuote('/tmp/a b.json')).toBe("'/tmp/a b.json'");
    expect(shellQuote('x; rm -rf ~ $(id)')).toBe("'x; rm -rf ~ $(id)'");
    expect(shellQuote("it's")).toBe("'it'\\''s'");
  });
});

(replaying ? describe : describe.skip)('replay of CONFORMANCE_ARTIFACT', () => {
  it('runs the artifact case and it passes', async () => {
    const path = replayArtifactPath(process.env);
    if (path === null) throw new Error('replay mode is off');
    const artifact = readArtifactFile(path);
    const result = await runCase(
      new NodeConformanceAdapter(),
      artifact.profile,
      artifact.case,
    );
    expect({ status: result.status, messages: result.messages }).toEqual({
      status: 'passed',
      messages: [],
    });
  });
});
