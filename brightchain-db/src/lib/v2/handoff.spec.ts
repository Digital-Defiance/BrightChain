/**
 * Multi-process tests for the portable v2 disk profile: sequential handoff
 * between independent runtimes, concurrent writers, and crash recovery.
 */
import { spawn } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { PortableBrightDb } from './portable-database';

const WORKER = resolve(__dirname, '../../../test-support/v2-worker.ts');

function run(args: string[]): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', WORKER, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
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

function runCpp(args: string[]): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(CPP_TOOL as string, args, { stdio: ['ignore', 'pipe', 'pipe'] });
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
    expect((await readdir(path)).filter((n) => n.startsWith('.brightdb-'))).toEqual([]);
  });
});
