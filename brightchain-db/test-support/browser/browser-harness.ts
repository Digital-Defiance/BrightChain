/**
 * Serves a populated database with CORS and a token for browser-test.ts, then
 * adds a document a few seconds later so the page can merge it.
 * Usage: node --import tsx browser-harness.ts [delaySeconds]
 */
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serveBlocks } from '../../src/lib/v2/block-server';
import { PortableBrightDb } from '../../src/lib/v2/portable-database';

async function main(): Promise<void> {
  const delay = Number(process.argv[2] ?? 8);
  const db = await PortableBrightDb.open({ path: join(await mkdtemp(join(tmpdir(), 'bc-harness-')), 'db') });
  await db.collection('docs').createIndex('by_n', ['n']);
  await db.collection('docs').insertMany(Array.from({ length: 80 }, (_, i) => ({ _id: `d${i}`, n: i })));
  const ref = await db.putAttachment(Buffer.alloc(1_300_000, 5));
  await db.collection('docs').insertOne({ _id: 'with-file', n: -1, _files: { f: { ...ref } } });
  const server = await serveBlocks(db.blockSource(), { token: 'tok', corsOrigin: '*', port: Number(process.env['PORT'] ?? 0) });
  console.log(JSON.stringify({ url: server.url }));
  setTimeout(() => void db.collection('docs').insertOne({ _id: 'late', n: 1000 }), delay * 1000);
  await new Promise(() => undefined);
}

void main();
