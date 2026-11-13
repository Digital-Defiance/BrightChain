/**
 * Runs the BrightDB v2 browser build against real IndexedDB, Web Locks and
 * fetch. Bundle with esbuild (see README in this folder) and open index.html.
 * Query string: ?url=<block server>&token=<token>&wait=<seconds>[&late=0 for a static server]
 * Results appear in #results as JSON and document.title becomes DONE or FAILED.
 */
import {
  BrightDbBrowser,
  HttpBlockSource,
  IndexedDbV2Storage,
  MemoryV2Storage,
  joinFromSource,
  openBrowserDb,
} from '../../src/browser';

type Result = { name: string; ok: boolean; detail?: unknown };
const results: Result[] = [];

async function step(name: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    results.push({ name, ok: true, detail: await fn() });
  } catch (error) {
    results.push({ name, ok: false, detail: String((error as Error)?.stack ?? error) });
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main(): Promise<void> {
  const params = new URLSearchParams(location.search);
  const run = Math.random().toString(36).slice(2, 8);
  const name = `bc-test-${run}`;

  await step('environment has IndexedDB, Web Locks and WebCrypto', async () => {
    assert(typeof indexedDB !== 'undefined', 'no indexedDB');
    assert(typeof navigator.locks?.request === 'function', 'no Web Locks');
    assert(typeof crypto.randomUUID === 'function', 'no crypto.randomUUID');
    return { userAgent: navigator.userAgent.slice(0, 60) };
  });

  await step('documents, indexes and queries in IndexedDB', async () => {
    const db = await openBrowserDb(name);
    const people = db.collection<{ _id: string; city: string; age: number }>('people');
    await people.createIndex('by_city_age', ['city', 'age']);
    await people.insertMany(
      Array.from({ length: 300 }, (_, i) => ({ _id: `p${i}`, city: ['oslo', 'bergen', 'tromso'][i % 3], age: 20 + (i % 40) })),
    );
    const oslo = await people.findByIndex('by_city_age', { equals: ['oslo'], gte: 30, lt: 40 });
    const filtered = await people.find({ age: { $gt: 55 }, city: 'bergen' }).toArray();
    assert(oslo.length > 0 && oslo.every((d) => d.city === 'oslo' && d.age >= 30 && d.age < 40), 'index query wrong');
    assert(filtered.every((d) => d.age > 55 && d.city === 'bergen'), 'filter wrong');
    return { oslo: oslo.length, filtered: filtered.length, root: (await db.root()).slice(0, 12) };
  });

  await step('attachments of several chunks round-trip', async () => {
    const db = await openBrowserDb(name);
    const bytes = new Uint8Array(2_500_000);
    for (let i = 0; i < bytes.length; i += 4096) bytes[i] = (i / 4096) % 251;
    const ref = await db.putAttachment(bytes, { type: 'application/octet-stream' });
    await db.collection('docs').insertOne({ _id: 'file', _files: { f: { ...ref } } });
    const back = await db.getAttachment(ref);
    let chunks = 0;
    for await (const part of db.streamAttachment(ref)) chunks += part.length > 0 ? 1 : 0;
    assert(back.length === bytes.length && back[4096] === bytes[4096] && chunks === 3, 'attachment mismatch');
    return { size: ref.size, chunks };
  });

  await step('data survives closing and reopening the connection', async () => {
    const first = await IndexedDbV2Storage.open(name);
    const db = await BrightDbBrowser.fromStorage(first);
    const root = await db.root();
    first.close();
    const second = await IndexedDbV2Storage.open(name, { create: false });
    const again = await BrightDbBrowser.fromStorage(second);
    assert((await again.root()) === root, 'root changed across reopen');
    assert((await again.collection('people').find({}).toArray()).length === 300, 'documents lost');
    second.close();
    return { root: root.slice(0, 12) };
  });

  await step('two connections write at once and Web Locks keep every commit', async () => {
    const a = await BrightDbBrowser.fromStorage(await IndexedDbV2Storage.open(name));
    const b = await BrightDbBrowser.fromStorage(await IndexedDbV2Storage.open(name));
    await Promise.all([
      ...Array.from({ length: 20 }, (_, i) => a.collection('race').insertOne({ _id: `a${i}`, v: i })),
      ...Array.from({ length: 20 }, (_, i) => b.collection('race').insertOne({ _id: `b${i}`, v: i })),
    ]);
    const all = await a.collection('race').find({}).toArray();
    assert(all.length === 40, `expected 40 documents, found ${all.length}`);
    assert((await b.root()) === (await a.root()), 'connections disagree on the root');
    return { documents: all.length };
  });

  await step('subscribe and diff report a commit made through another connection', async () => {
    const watcher = await BrightDbBrowser.fromStorage(await IndexedDbV2Storage.open(name));
    const writer = await BrightDbBrowser.fromStorage(await IndexedDbV2Storage.open(name));
    const seen: string[] = [];
    const stop = await watcher.subscribe(
      async (event) => {
        for await (const change of event.changes()) seen.push(`${change.id}:${change.type}`);
      },
      { intervalMs: 50 },
    );
    await writer.collection('watched').insertOne({ _id: 'w1', v: 1 });
    for (let i = 0; i < 100 && seen.length === 0; i++) await new Promise((r) => setTimeout(r, 50));
    stop();
    assert(seen.includes('w1:added'), `subscriber saw ${JSON.stringify(seen)}`);
    return { seen };
  });

  await step('a failed commit leaves the old head and no half-written state', async () => {
    const db = await openBrowserDb(name);
    const before = await db.root();
    await db
      .writeBatch([
        { type: 'insert', collection: 'atomic', document: { _id: 'ok', v: 1 } },
        { type: 'insert', collection: 'atomic', document: { _id: 'bad', v: { nested: true } } },
      ])
      .catch(() => undefined);
    // An unindexable value only fails when an index exists, so force a duplicate id instead.
    await db.collection('atomic').insertOne({ _id: 'dup', v: 1 });
    const mid = await db.root();
    await db
      .writeBatch([
        { type: 'insert', collection: 'atomic', document: { _id: 'new1', v: 1 } },
        { type: 'insert', collection: 'atomic', document: { _id: 'dup', v: 2 } },
      ])
      .catch(() => undefined);
    assert((await db.root()) === mid, 'a failed batch moved the head');
    assert((await db.collection('atomic').findById('new1')) === null, 'a failed batch left a document');
    return { movedByFirst: before !== mid };
  });

  const url = params.get('url');
  if (url) {
    const token = params.get('token') ?? undefined;
    const source = new HttpBlockSource(url, { token });
    let joined: BrightDbBrowser | undefined;
    await step('join a database served over HTTP (cross-origin, with a token)', async () => {
      joined = await joinFromSource(await IndexedDbV2Storage.open(`${name}-joined`), source);
      assert((await joined.root()) === (await source.readHead()), 'roots differ after join');
      const docs = await joined.collection('docs').find({}).toArray();
      assert(docs.length > 0, 'no documents after join');
      const file = await joined.collection('docs').findById('with-file');
      return { documents: docs.length, hasFile: file !== null };
    });
    await step('a wrong token is refused', async () => {
      let refused = false;
      try {
        await new HttpBlockSource(url, { token: 'wrong' }).readHead();
      } catch {
        refused = true;
      }
      assert(refused, 'wrong token accepted');
    });
    await step('merge the server\'s later change, and keep local edits', async () => {
      assert(joined, 'not joined');
      const servedAtJoin = await joined.root();
      await joined.collection('docs').insertOne({ _id: 'from-browser', v: 1 });
      const wait = Number(params.get('wait') ?? 0);
      const deadline = Date.now() + wait * 1000;
      // Wait for the server to publish something new since the join.
      while (Date.now() < deadline && (await source.readHead()) === servedAtJoin) {
        await new Promise((r) => setTimeout(r, 250));
      }
      const result = await joined.merge(source);
      assert((await joined.collection('docs').findById('from-browser')) !== null, 'local edit lost');
      // late=0: the server is static (no later write), so only check the merge keeps local edits.
      if (params.get('late') === '0') return { adopted: result.adopted, staticServer: true };
      const late = await joined.collection('docs').findById('late');
      assert(late !== null && result.adopted >= 1, 'the server\'s later document was not merged');
      return { adopted: result.adopted, sawLateServerDocument: late !== null };
    });
  }

  await step('MemoryV2Storage runs the same database in the page', async () => {
    const db = await BrightDbBrowser.fromStorage(MemoryV2Storage.create());
    await db.collection('c').insertOne({ _id: 'a' });
    return { found: (await db.collection('c').findById('a')) !== null };
  });

  document.getElementById('results')!.textContent = JSON.stringify(results, null, 2);
  document.title = results.every((r) => r.ok) ? 'DONE' : 'FAILED';
}

void main();
