/**
 * Scaling benchmark for the BrightDB v2 portable disk profile.
 * Usage: [BRIGHTDB_BENCH_PACKED=1] node --import tsx v2-bench.ts [sizes=1000,10000,100000]
 * Prints one JSON object per size, then a summary table.
 */
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BrightDbV2DiskStore } from '../src/lib/v2/disk-store';
import { PortableBrightDb } from '../src/lib/v2/portable-database';

const sizes = (process.argv[2] ?? '1000,10000,100000').split(',').map(Number);

async function blockSet(path: string): Promise<Set<string>> {
  const names = new Set<string>();
  const root = join(path, 'blocks');
  for (const prefix of await readdir(root)) {
    for (const name of await readdir(join(root, prefix))) {
      if (!name.startsWith('.')) names.add(name);
    }
  }
  return names;
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
}

async function main(): Promise<void> {
  const proto = BrightDbV2DiskStore.prototype as unknown as {
    readBlock: (digest: string) => Promise<Uint8Array>;
  };
  const original = proto.readBlock;
  let reads: Array<{ digest: string; bytes: number }> = [];
  proto.readBlock = async function (this: unknown, digest: string) {
    const bytes = await original.call(this, digest);
    reads.push({ digest, bytes: bytes.byteLength });
    return bytes;
  };

  const results: Array<Record<string, unknown>> = [];
  for (const size of sizes) {
    const dir = await mkdtemp(join(tmpdir(), 'brightdb-v2-bench-'));
    try {
      const path = join(dir, 'db');
      const db = await PortableBrightDb.open({ path, packed: process.env['BRIGHTDB_BENCH_PACKED'] === '1' });
      const users = db.collection<{ _id: string; n: number; pad: string }>('users');
      const loadStart = performance.now();
      const chunk = 1000;
      for (let start = 0; start < size; start += chunk) {
        await users.insertMany(
          Array.from({ length: Math.min(chunk, size - start) }, (_, i) => ({
            _id: `user-${(start + i).toString().padStart(7, '0')}`,
            n: start + i,
            pad: 'x'.repeat(100),
          })),
        );
      }
      const loadMs = performance.now() - loadStart;
      db.close();

      // Cold lookup: fresh handle, no caches, count blocks read for one _id.
      const coldTarget = `user-${Math.floor(size / 2).toString().padStart(7, '0')}`;
      const cold = await PortableBrightDb.open({ path });
      reads = [];
      const coldStart = performance.now();
      const found = await cold.collection('users').findById(coldTarget);
      const coldMs = performance.now() - coldStart;
      if (!found) throw new Error('cold lookup missed');
      const coldReads = reads.length;
      const coldBytes = reads.reduce((s, r) => s + r.bytes, 0);
      cold.close();

      // Single-document updates: new blocks written, latency.
      const live = await PortableBrightDb.open({ path });
      const before = await blockSet(path);
      const latencies: number[] = [];
      let newBlocksTotal = 0;
      let newBytesTotal = 0;
      const updates = 50;
      for (let i = 0; i < updates; i++) {
        const id = `user-${Math.floor(((i + 1) * size) / (updates + 1)).toString().padStart(7, '0')}`;
        const prior = await blockSet(path);
        const start = performance.now();
        const result = await live
          .collection<{ _id: string; n: number; pad: string }>('users')
          .replaceById(id, { _id: id, n: -i - 1, pad: 'y'.repeat(100) });
        latencies.push(performance.now() - start);
        if (result.modifiedCount !== 1) throw new Error('update missed');
        const after = await blockSet(path);
        const added = [...after].filter((d) => !prior.has(d));
        // 1 document block + metadata blocks (leaf/branch pages, collection, catalog, database root).
        newBlocksTotal += added.length;
      }
      live.close();
      const after = await blockSet(path);
      const lastPage = [...after].filter((d) => !before.has(d)).length;
      void newBytesTotal;
      results.push({
        documents: size,
        loadSeconds: +(loadMs / 1000).toFixed(1),
        coldLookupBlockReads: coldReads,
        coldLookupBytesRead: coldBytes,
        coldLookupMs: +coldMs.toFixed(1),
        newBlocksPerUpdate: +(newBlocksTotal / updates).toFixed(1),
        totalNewBlocksAfter50Updates: lastPage,
        updateP50Ms: +percentile(latencies, 0.5).toFixed(1),
        updateP95Ms: +percentile(latencies, 0.95).toFixed(1),
        totalBlocks: after.size,
      });
      console.log(JSON.stringify(results[results.length - 1]));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
  console.table(results);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
