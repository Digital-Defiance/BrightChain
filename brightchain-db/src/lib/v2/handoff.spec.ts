/**
 * Multi-process tests for the portable v2 disk profile: sequential handoff
 * between independent runtimes, concurrent writers, and crash recovery.
 */
import { spawn } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { PortableBrightDb } from './portable-database';

const WORKER = resolve(__dirname, '../../../test-support/v2-worker.ts');

function run(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', WORKER, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (chunk) => (out += chunk));
    child.stderr.on('data', (chunk) => (err += chunk));
    child.once('close', (code) =>
      code === 0 ? resolvePromise(out.trim()) : reject(new Error(err || `exit ${code}`)),
    );
  });
}

const CPP_TOOL = process.env['BRIGHTDB_CPP_TOOL'];

function runCpp(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(CPP_TOOL as string, args, { stdio: ['ignore', 'pipe', 'pipe'], env });
    let out = '';
    let err = '';
    child.stdout.on('data', (chunk) => (out += chunk));
    child.stderr.on('data', (chunk) => (err += chunk));
    child.once('close', (code) =>
      code === 0 ? resolvePromise(out.trim()) : reject(new Error(err || `exit ${code}`)),
    );
  });
}

type Dump = Record<string, Array<{ _id: string }>>;
function normalize(dump: Dump): Dump {
  const sorted: Dump = {};
  for (const name of Object.keys(dump).sort()) {
    sorted[name] = [...dump[name]].sort((a, b) =>
      Buffer.compare(Buffer.from(a._id), Buffer.from(b._id)),
    );
  }
  return sorted;
}

// Set BRIGHTDB_CPP_TOOL to the built brightdb_v2_tool to run the cross-runtime legs.
(CPP_TOOL ? describe : describe.skip)('BrightDB v2 TypeScript and C++ handoff', () => {
  jest.setTimeout(180_000);
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'brightdb-v2-cross-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  async function leg(first: 'ts' | 'cpp'): Promise<void> {
    const path = join(dir, 'db');
    const ts = (args: string[]) => run(args);
    const cpp = (args: string[]) => runCpp(args);
    const [a, b] = first === 'ts' ? [ts, cpp] : [cpp, ts];

    await a(['write', path, 'docs', 'first', '4']);
    const writer = (await readFile(join(path, 'WRITER'), 'utf8')).trim();
    await b(['write', path, 'docs', 'second', '3']);
    await b(['write', path, 'other', 'x', '2']);
    expect(JSON.parse(await a(['delete', path, 'docs', 'first-1']))).toMatchObject({ deletedCount: 1 });
    await a(['write', path, 'docs', 'third', '2']);
    expect(JSON.parse(await b(['delete', path, 'docs', 'second-0']))).toMatchObject({ deletedCount: 1 });

    expect((await readFile(join(path, 'WRITER'), 'utf8')).trim()).toBe(writer);
    const fromTs = normalize(JSON.parse(await ts(['dump', path])));
    const fromCpp = normalize(JSON.parse(await cpp(['dump', path])));
    expect(fromCpp).toEqual(fromTs);
    expect(fromTs['docs'].map((d) => d._id)).toEqual([
      'first-0', 'first-2', 'first-3', 'second-1', 'second-2', 'third-0', 'third-1',
    ]);
    expect(fromTs['other']).toHaveLength(2);
  }

  it('computes identical roots and diffs in both runtimes across a mixed history', async () => {
    const path = join(dir, 'db');
    const roots: string[] = [];
    const rootOf = async (runner: (a: string[]) => Promise<string>) =>
      (JSON.parse(await runner(['root', path])) as { root: string }).root;

    await run(['write', path, 'docs', 'a', '3']);
    roots.push(await rootOf(run));
    await runCpp(['write', path, 'docs', 'b', '2']);
    roots.push(await rootOf(runCpp));
    await run(['delete', path, 'docs', 'a-1']);
    roots.push(await rootOf(run));
    await runCpp(['write', path, 'other', 'o', '2']);
    roots.push(await rootOf(runCpp));
    await runCpp(['delete', path, 'docs', 'b-0']);
    roots.push(await rootOf(runCpp));

    // Each runtime reads the root the other published.
    expect(await rootOf(run)).toBe(await rootOf(runCpp));
    expect(await rootOf(run)).toBe(roots[roots.length - 1]);

    for (let i = 0; i < roots.length; i++) {
      for (let j = 0; j < roots.length; j++) {
        const fromTs = JSON.parse(await run(['diff', path, roots[i], roots[j]]));
        const fromCpp = JSON.parse(await runCpp(['diff', path, roots[i], roots[j]]));
        expect(fromCpp).toEqual(fromTs);
      }
    }
    expect(JSON.parse(await run(['diff', path, roots[0], roots[4]]))).toEqual([
      'docs/a-1:deleted',
      'docs/b-1:added',
      'other/o-0:added',
      'other/o-1:added',
    ]);
  });

  it('keeps indexes current when TypeScript and C++ take turns writing', async () => {
    const path = join(dir, 'db');
    const doc = (id: string, city: string, age: number, tags: string[]) =>
      JSON.stringify({ _id: id, city, age, tags });
    await run(['insertjson', path, 'people', doc('a', 'Oslo', 30, ['x', 'y'])]);
    await runCpp(['insertjson', path, 'people', doc('b', 'Oslo', 20, ['y'])]);
    await run(['createindex', path, 'people', 'by_city_age', 'city', 'age']);
    await runCpp(['createindex', path, 'people', 'by_tag', 'tags']);
    await run(['insertjson', path, 'people', doc('c', 'Bergen', 50, [])]);
    await runCpp(['insertjson', path, 'people', doc('d', 'Oslo', 25, ['x'])]);
    await run(['delete', path, 'people', 'b']);
    await runCpp(['delete', path, 'people', 'a']);

    const queries: Array<[string, object]> = [
      ['by_city_age', {}],
      ['by_city_age', { equals: ['Oslo'] }],
      ['by_city_age', { equals: ['Oslo'], gt: 20 }],
      ['by_city_age', { equals: ['Oslo'], descending: true }],
      ['by_city_age', { prefix: 'B' }],
      ['by_tag', {}],
      ['by_tag', { equals: ['x'] }],
      ['by_tag', { equals: ['y'] }],
    ];
    for (const [index, query] of queries) {
      const q = JSON.stringify(query);
      const fromTs = JSON.parse(await run(['findindex', path, 'people', index, q]));
      const fromCpp = JSON.parse(await runCpp(['findindex', path, 'people', index, q]));
      expect(fromCpp).toEqual(fromTs);
    }
    expect(JSON.parse(await run(['findindex', path, 'people', 'by_city_age', '{"equals":["Oslo"]}']))).toEqual(['d']);
    expect(JSON.parse(await runCpp(['findindex', path, 'people', 'by_tag', '{"equals":["x"]}']))).toEqual(['d']);
  });

  it('shares attachments between runtimes in both directions', async () => {
    const path = join(dir, 'db');
    const small = join(dir, 'small.bin');
    const large = join(dir, 'large.bin');
    await writeFile(small, 'written by one runtime');
    await writeFile(large, Buffer.alloc(2_200_000, 9));

    const refTs = JSON.parse(await run(['putfile', path, small, 'text/plain']));
    const refCpp = JSON.parse(await runCpp(['putfile', path, small, 'text/plain']));
    expect(refCpp).toEqual(refTs);
    const bigTs = JSON.parse(await run(['putfile', path, large]));
    const bigCpp = JSON.parse(await runCpp(['putfile', path, large]));
    expect(bigCpp).toEqual(bigTs);

    // A file past one manifest's reach (65 chunks) gets the same tree in both runtimes.
    const huge = join(dir, 'huge.bin');
    const hugeBytes = Buffer.alloc(64 * 1_048_576 + 1234);
    for (let i = 0; i < hugeBytes.length; i += 4096) hugeBytes[i] = (i / 4096) % 251;
    hugeBytes[hugeBytes.length - 1] = 7;
    await writeFile(huge, hugeBytes);
    const hugeTs = JSON.parse(await run(['putfile', path, huge]));
    const hugeCpp = JSON.parse(await runCpp(['putfile', path, huge]));
    expect(hugeCpp).toEqual(hugeTs);
    expect(JSON.parse(await runCpp(['getfile', path, hugeTs.digest]))).toEqual(
      JSON.parse(await run(['getfile', path, hugeTs.digest])),
    );
    await runCpp(['insertjson', path, 'docs', JSON.stringify({ _id: 'huge', _files: { h: hugeTs } })]);

    // A document written by one runtime references a file stored by the other.
    await runCpp(['insertjson', path, 'docs', JSON.stringify({ _id: 'x', _files: { f: refTs, g: bigTs } })]);
    await run(['insertjson', path, 'docs', JSON.stringify({ _id: 'y', _files: { f: refCpp, g: bigCpp } })]);
    for (const ref of [refTs, bigTs]) {
      expect(JSON.parse(await run(['getfile', path, ref.digest]))).toEqual(
        JSON.parse(await runCpp(['getfile', path, ref.digest])),
      );
    }
    expect(JSON.parse(await runCpp(['getfile', path, bigTs.digest])).size).toBe(2_200_000);
    await expect(
      runCpp(['insertjson', path, 'docs', JSON.stringify({ _id: 'z', _files: { f: { digest: 'a'.repeat(128), size: 1 } } })]),
    ).rejects.toThrow();
  });

  it('forks in one runtime, writes in both, and merges to the same root in both directions', async () => {
    const a = join(dir, 'a');
    const b = join(dir, 'b');
    const c = join(dir, 'c');
    const doc = (id: string, v: number, extra: object = {}) => JSON.stringify({ _id: id, v, city: v % 2 ? 'Oslo' : 'Bergen', ...extra });
    await run(['insertjson', a, 'docs', doc('one', 1)]);
    await runCpp(['insertjson', a, 'docs', doc('two', 2)]);
    await run(['createindex', a, 'docs', 'by_city', 'city']);

    await runCpp(['fork', a, b]); // C++ forks a TypeScript-written database
    await run(['fork', a, c]); // TypeScript forks a database C++ also wrote to

    await run(['insertjson', a, 'docs', doc('ts-a', 3)]);
    await runCpp(['insertjson', b, 'docs', doc('cpp-b', 4)]);
    await run(['insertjson', c, 'docs', doc('ts-c', 5)]);
    await runCpp(['delete', b, 'docs', 'two']);
    await run(['createindex', c, 'docs', 'by_v', 'v']);

    // Each runtime merges replicas the other runtime wrote.
    await run(['merge', a, b]);
    await runCpp(['merge', a, c]);
    await runCpp(['merge', b, a]);
    await run(['merge', b, c]);
    await run(['merge', c, a]);
    await runCpp(['merge', c, b]);
    const roots = await Promise.all([a, b, c].map(async (p) => (JSON.parse(await run(['root', p])) as { root: string }).root));
    expect(new Set(roots).size).toBe(1);
    for (const p of [a, b, c]) {
      expect(JSON.parse(await runCpp(['root', p]))).toEqual({ root: roots[0] });
      const fromTs = normalize(JSON.parse(await run(['dump', p])));
      const fromCpp = normalize(JSON.parse(await runCpp(['dump', p])));
      expect(fromCpp).toEqual(fromTs);
      expect(fromTs['docs'].map((d) => d._id)).toEqual(['cpp-b', 'one', 'ts-a', 'ts-c']);
      expect(JSON.parse(await run(['findindex', p, 'docs', 'by_v', '{"gte":3}']))).toEqual(
        JSON.parse(await runCpp(['findindex', p, 'docs', 'by_v', '{"gte":3}'])),
      );
      expect(JSON.parse(await runCpp(['findindex', p, 'docs', 'by_city', '{"equals":["Oslo"]}']))).toEqual(
        JSON.parse(await run(['findindex', p, 'docs', 'by_city', '{"equals":["Oslo"]}'])),
      );
    }
  });

  it('shares an encrypted store between runtimes, forks it and merges replicas', async () => {
    const key = Buffer.from(Array.from({ length: 32 }, (_, i) => i)).toString('hex');
    const env = { ...process.env, BRIGHTDB_KEY: key };
    const tsRun = (args: string[]) => run(args, env);
    const cppRun = (args: string[]) => runCpp(args, env);
    const a = join(dir, 'a');
    const b = join(dir, 'b');
    const secret = 'cross-runtime-secret-value';
    const doc = (id: string, city: string) => JSON.stringify({ _id: id, city, note: secret });

    await tsRun(['insertjson', a, 'people', doc('one', 'Oslo')]);
    await cppRun(['insertjson', a, 'people', doc('two', 'Bergen')]);
    await tsRun(['createindex', a, 'people', 'by_city', 'city']);
    await cppRun(['insertjson', a, 'people', doc('three', 'Oslo')]);
    expect(JSON.parse(await tsRun(['findindex', a, 'people', 'by_city', '{"equals":["Oslo"]}']))).toEqual(['one', 'three']);
    expect(JSON.parse(await cppRun(['findindex', a, 'people', 'by_city', '{"equals":["Oslo"]}']))).toEqual(['one', 'three']);

    // Without the key, or with the wrong one, neither runtime opens it.
    await expect(run(['dump', a])).rejects.toThrow(/encrypted/u);
    await expect(runCpp(['dump', a])).rejects.toThrow(/encrypted/u);
    const wrong = { ...process.env, BRIGHTDB_KEY: 'ff'.repeat(32) };
    await expect(run(['dump', a], wrong)).rejects.toThrow();
    await expect(runCpp(['dump', a], wrong)).rejects.toThrow();

    await cppRun(['fork', a, b]); // C++ forks a store TypeScript wrote to
    await tsRun(['insertjson', a, 'people', doc('ts-a', 'Oslo')]);
    await cppRun(['insertjson', b, 'people', doc('cpp-b', 'Bergen')]);
    await tsRun(['merge', a, b]);
    await cppRun(['merge', b, a]);
    expect(JSON.parse(await tsRun(['root', a]))).toEqual(JSON.parse(await cppRun(['root', b])));
    expect(JSON.parse(await cppRun(['root', a]))).toEqual(JSON.parse(await tsRun(['root', b])));

    // Nothing on disk reveals the content.
    for (const file of await readdir(a, { recursive: true, withFileTypes: true })) {
      if (!file.isFile()) continue;
      const bytes = await readFile(join(file.parentPath, file.name));
      expect(bytes.includes(Buffer.from(secret))).toBe(false);
    }
  });

  /** Start `serve` in a runtime and return its URL and a way to stop it. */
  function startServer(runtime: 'ts' | 'cpp', path: string, token?: string) {
    const args = ['serve', path, '0', ...(token ? [token] : [])];
    const child =
      runtime === 'cpp'
        ? spawn(CPP_TOOL as string, args, { stdio: ['pipe', 'pipe', 'inherit'] })
        : spawn(process.execPath, ['--import', 'tsx', WORKER, ...args], { stdio: ['pipe', 'pipe', 'inherit'] });
    return new Promise<{ url: string; stop: () => Promise<void> }>((resolvePromise, reject) => {
      child.once('error', reject);
      child.stdout.once('data', (chunk) => {
        const { url } = JSON.parse(String(chunk));
        resolvePromise({
          url,
          stop: () =>
            new Promise<void>((done) => {
              child.once('close', () => done());
              child.stdin.end();
            }),
        });
      });
    });
  }

  it('syncs between runtimes over HTTP in both directions, with and without a token', async () => {
    const a = join(dir, 'a');
    const b = join(dir, 'b');
    await run(['insertjson', a, 'docs', JSON.stringify({ _id: 'one', city: 'Oslo' })]);
    await run(['createindex', a, 'docs', 'by_city', 'city']);
    await run(['fork', a, b]);
    await run(['insertjson', a, 'docs', JSON.stringify({ _id: 'ts-a', city: 'Oslo' })]);
    await runCpp(['insertjson', b, 'docs', JSON.stringify({ _id: 'cpp-b', city: 'Bergen' })]);

    const tsServer = await startServer('ts', a, 'tok');
    const cppServer = await startServer('cpp', b);
    try {
      // C++ pulls from a TypeScript server, TypeScript pulls from a C++ server.
      await expect(runCpp(['pull', b, tsServer.url])).rejects.toThrow(); // token missing
      await runCpp(['pull', b, tsServer.url, 'tok']);
      await run(['pull', a, cppServer.url]);
      await run(['pull', a, cppServer.url]); // idempotent
    } finally {
      await tsServer.stop();
      await cppServer.stop();
    }
    const roots = await Promise.all([
      run(['root', a]).then((r) => JSON.parse(r).root),
      runCpp(['root', b]).then((r) => JSON.parse(r).root),
    ]);
    expect(roots[0]).toBe(roots[1]);
    for (const p of [a, b]) {
      expect(JSON.parse(await run(['findindex', p, 'docs', 'by_city', '{"equals":["Oslo"]}']))).toEqual(['one', 'ts-a']);
      expect(JSON.parse(await runCpp(['findindex', p, 'docs', 'by_city', '{"equals":["Bergen"]}']))).toEqual(['cpp-b']);
    }
  });

  it('writes with TypeScript first, then C++, then TypeScript', () => leg('ts'));
  it('writes with C++ first, then TypeScript, then C++', () => leg('cpp'));

  it('recovers whole batches after SIGKILL of a C++ writer and a TypeScript writer', async () => {
    const path = join(dir, 'db');
    await run(['write', path, 'seed', 'seed', '1']);
    for (const runtime of ['cpp', 'ts', 'cpp'] as const) {
      const child =
        runtime === 'cpp'
          ? spawn(CPP_TOOL as string, ['loop', path, 'docs', '20'], { stdio: ['ignore', 'pipe', 'inherit'] })
          : spawn(process.execPath, ['--import', 'tsx', WORKER, 'loop', path, 'docs', '20'], {
              stdio: ['ignore', 'pipe', 'inherit'],
            });
      await new Promise<void>((ready) => child.stdout.once('data', () => ready()));
      await new Promise((r) => setTimeout(r, 400));
      child.kill('SIGKILL');
      await new Promise((r) => child.once('close', r));

      for (const reader of [run, runCpp]) {
        const dump = JSON.parse(await reader(['dump', path])) as Record<string, Array<{ batch: number }>>;
        const perBatch = new Map<number, number>();
        for (const d of dump['docs'] ?? []) perBatch.set(d.batch, (perBatch.get(d.batch) ?? 0) + 1);
        for (const [batch, count] of perBatch) expect({ batch, count }).toEqual({ batch, count: 20 });
      }
      // The lock must be free for the next writer, and the next loop starts a fresh collection.
      const db = await PortableBrightDb.open({ path });
      await db.writeBatch([{ type: 'dropCollection', collection: 'docs' }]);
      db.close();
    }
  });
});

describe('BrightDB v2 directory handoff and crash recovery', () => {
  jest.setTimeout(180_000);
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'brightdb-v2-handoff-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('hands a store between separate processes and keeps the writer ID', async () => {
    const path = join(dir, 'db');
    await run(['write', path, 'docs', 'one', '3']);
    const writer = (await readFile(join(path, 'WRITER'), 'utf8')).trim();
    const head1 = (await readFile(join(path, 'HEAD'), 'utf8')).trim();

    await run(['write', path, 'docs', 'two', '2']);
    expect((await run(['delete', path, 'docs', 'one-1'])).includes('"deletedCount":1')).toBe(true);
    expect((await readFile(join(path, 'WRITER'), 'utf8')).trim()).toBe(writer);
    expect((await readFile(join(path, 'HEAD'), 'utf8')).trim()).not.toBe(head1);

    const dump = JSON.parse(await run(['dump', path])) as Record<string, Array<{ _id: string }>>;
    expect(dump['docs'].map((d) => d._id)).toEqual(['one-0', 'one-2', 'two-0', 'two-1']);
  });

  it('serializes writers racing from separate processes without losing a commit', async () => {
    const path = join(dir, 'db');
    await run(['write', path, 'seed', 'seed', '1']);
    const tags = Array.from({ length: 8 }, (_, i) => `w${i}`);
    await Promise.all(tags.map((tag) => run(['write', path, 'docs', tag, '5'])));
    const dump = JSON.parse(await run(['dump', path])) as Record<string, Array<{ tag: string }>>;
    expect(dump['docs']).toHaveLength(40);
    for (const tag of tags) {
      expect(dump['docs'].filter((d) => d.tag === tag)).toHaveLength(5);
    }
  });

  it('recovers a complete committed state after SIGKILL during continuous writes', async () => {
    const path = join(dir, 'db');
    await run(['write', path, 'seed', 'seed', '1']);
    for (let round = 0; round < 6; round++) {
      const child = spawn(
        process.execPath,
        ['--import', 'tsx', WORKER, 'loop', path, 'docs', '20'],
        { stdio: ['ignore', 'pipe', 'inherit'] },
      );
      await new Promise<void>((ready) => child.stdout.once('data', () => ready()));
      await new Promise((r) => setTimeout(r, 150 + round * 90));
      child.kill('SIGKILL');
      await new Promise((r) => child.once('close', r));

      // A fresh process must open the store and see only whole batches.
      const db = await PortableBrightDb.open({ path });
      const docs = await db.collection<{ _id: string; batch: number; size: number }>('docs').find({}).toArray();
      db.close();
      const perBatch = new Map<number, number>();
      for (const d of docs) perBatch.set(d.batch, (perBatch.get(d.batch) ?? 0) + 1);
      for (const [batch, count] of perBatch) {
        expect({ batch, count }).toEqual({ batch, count: 20 });
      }
      // Batches are committed in order, so the visible ones form a prefix.
      expect([...perBatch.keys()].sort((a, b) => a - b)).toEqual(
        Array.from({ length: perBatch.size }, (_, i) => i),
      );
      // Restart the next round on a fresh collection so batch numbers restart cleanly.
      await run(['delete', path, 'docs', 'none']);
      if (round < 5) {
        const again = await PortableBrightDb.open({ path });
        await again.writeBatch([{ type: 'dropCollection', collection: 'docs' }]);
        again.close();
      }
    }
    // The lock must not be left held by the killed process.
    await run(['write', path, 'after', 'a', '1']);
    // A writer killed while publishing can leave a temporary HEAD file behind. It is never read.
    const leftovers = (await readdir(path)).filter((n) => n.startsWith('.brightdb-'));
    expect(leftovers.every((n) => n.endsWith('.tmp'))).toBe(true);
    expect(JSON.parse(await run(['dump', path]))['after']).toHaveLength(1);
  });
});
