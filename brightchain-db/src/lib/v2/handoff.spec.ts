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
