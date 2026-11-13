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
  forkBrowserDb,
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

  const rawBlocks = (dbName: string) =>
    new Promise<Array<{ key: string; value: Uint8Array }>>((resolve, reject) => {
      const open = indexedDB.open(`brightdb-v2:${dbName}`);
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const out: Array<{ key: string; value: Uint8Array }> = [];
        const cursor = open.result.transaction('blocks', 'readonly').objectStore('blocks').openCursor();
        cursor.onsuccess = () => {
          const at = cursor.result;
          if (!at) {
            open.result.close();
            return resolve(out);
          }
          out.push({ key: String(at.key), value: at.value as Uint8Array });
          at.continue();
        };
        cursor.onerror = () => reject(cursor.error);
      };
    });

  await step('encrypted IndexedDB: round-trips, hides the data, refuses a missing or wrong key', async () => {
    const encName = `${name}-enc`;
    const key = crypto.getRandomValues(new Uint8Array(32));
    const db = await openBrowserDb(encName, { encryption: { key } });
    await db.collection('c').createIndex('by_n', ['n']);
    await db.collection('c').insertMany(Array.from({ length: 50 }, (_, i) => ({ _id: `d${i}`, n: i, note: 'plainly-visible-marker' })));
    const ref = await db.putAttachment(new Uint8Array(1_500_000).fill(9));
    await db.collection('c').insertOne({ _id: 'file', n: -1, _files: { f: { ...ref } } });
    // Nothing readable is stored: names are keyed hashes and no value contains the marker.
    const raw = await rawBlocks(encName);
    const marker = new TextEncoder().encode('plainly-visible-marker');
    const contains = (hay: Uint8Array) => {
      outer: for (let i = 0; i + marker.length <= hay.length; i++) {
        for (let j = 0; j < marker.length; j++) if (hay[i + j] !== marker[j]) continue outer;
        return true;
      }
      return false;
    };
    assert(raw.length > 5, 'no stored blocks');
    assert(raw.every((b) => /^[0-9a-f]{128}$/u.test(b.key)), 'a stored name is not a keyed hash');
    assert(!raw.some((b) => contains(b.value)), 'plaintext found in stored bytes');
    // Reopen with the key: all data, the index and the attachment come back.
    const again = await openBrowserDb(encName, { encryption: { key } });
    assert((await again.collection('c').find({}).toArray()).length === 51, 'documents lost');
    assert((await again.collection('c').findByIndex('by_n', { equals: [7] })).length === 1, 'index lost');
    assert((await again.getAttachment(ref)).length === 1_500_000, 'attachment lost');
    // No key, a wrong key and a plain database opened with a key are all refused.
    let refused = 0;
    await openBrowserDb(encName).catch(() => refused++);
    await openBrowserDb(encName, { encryption: { key: crypto.getRandomValues(new Uint8Array(32)) } }).catch(() => refused++);
    await openBrowserDb(name, { encryption: { key } }).catch(() => refused++);
    assert(refused === 3, `expected 3 refusals, got ${refused}`);
    return { storedBlocks: raw.length, refused };
  });

  await step('garbage collection in IndexedDB removes dead blocks, honors the grace period, keeps live data', async () => {
    const gcName = `${name}-gc`;
    const db = await openBrowserDb(gcName);
    await db.collection('c').insertMany(Array.from({ length: 100 }, (_, i) => ({ _id: `d${i}`, n: i })));
    for (let i = 0; i < 10; i++) await db.collection('c').replaceById(`d${i}`, { _id: `d${i}`, n: 1000 + i });
    await db.collection('c').deleteById('d99');
    const before = (await rawBlocks(gcName)).length;
    const recent = await db.collectGarbage(); // the default one-hour grace keeps what was just written
    assert(recent.removed <= 1, `grace period not honored: removed ${recent.removed}`);
    const dry = await db.collectGarbage({ graceMs: 0, dryRun: true });
    assert(dry.removed > 10 && (await rawBlocks(gcName)).length === before, 'dry run changed something');
    const real = await db.collectGarbage({ graceMs: 0 });
    assert(real.removed === dry.removed, 'dry run and real run disagree');
    const reopened = await openBrowserDb(gcName);
    assert((await reopened.collection('c').find({}).toArray()).length === 99, 'live documents lost');
    assert((await reopened.collection('c').findById('d3'))?.['n'] === 1003, 'live update lost');
    return { before, after: (await rawBlocks(gcName)).length, removed: real.removed };
  });

  await step('garbage collection also works on an encrypted database', async () => {
    const key = crypto.getRandomValues(new Uint8Array(32));
    const encGc = `${name}-encgc`;
    const db = await openBrowserDb(encGc, { encryption: { key } });
    await db.collection('c').insertMany(Array.from({ length: 60 }, (_, i) => ({ _id: `d${i}`, n: i })));
    for (let i = 0; i < 10; i++) await db.collection('c').replaceById(`d${i}`, { _id: `d${i}`, n: 500 + i });
    const real = await db.collectGarbage({ graceMs: 0 });
    assert(real.removed > 5, `nothing collected: ${JSON.stringify(real)}`);
    const reopened = await openBrowserDb(encGc, { encryption: { key } });
    assert((await reopened.collection('c').find({}).toArray()).length === 60, 'live documents lost');
    return { removed: real.removed };
  });

  await step('fork into a new IndexedDB database, write on both sides, merge back (also into an encrypted copy)', async () => {
    const original = await openBrowserDb(`${name}-orig`);
    await original.collection('c').insertMany([{ _id: 'a', v: 1 }, { _id: 'b', v: 2 }]);
    const copy = await forkBrowserDb(original, `${name}-copy`);
    assert((await copy.root()) === (await original.root()), 'fork root differs');
    await copy.collection('c').insertOne({ _id: 'from-copy', v: 3 });
    await original.collection('c').insertOne({ _id: 'from-original', v: 4 });
    await original.merge(copy.blockSource());
    const ids = (await original.collection('c').find({}).toArray()).map((d) => d['_id']).sort();
    assert(JSON.stringify(ids) === JSON.stringify(['a', 'b', 'from-copy', 'from-original']), `merged ids ${ids}`);
    const key = crypto.getRandomValues(new Uint8Array(32));
    const sealed = await forkBrowserDb(original, `${name}-sealed`, { encryption: { key } });
    assert((await sealed.collection('c').find({}).toArray()).length === 4, 'encrypted fork lost documents');
    return { ids };
  });

  await step('migrates a database created by the first (version 1) IndexedDB schema', async () => {
    // Build real data in memory, then lay it out exactly as the version 1 code did: two object
    // stores (blocks keyed by digest, meta with writerId and head) and no `times` store.
    const source = MemoryV2Storage.create();
    const seed = await BrightDbBrowser.fromStorage(source);
    await seed.collection('c').createIndex('by_n', ['n']);
    await seed.collection('c').insertMany(Array.from({ length: 80 }, (_, i) => ({ _id: `d${i}`, n: i })));
    for (let i = 0; i < 5; i++) await seed.collection('c').replaceById(`d${i}`, { _id: `d${i}`, n: 900 + i });
    const ref = await seed.putAttachment(new Uint8Array(1_200_000).fill(4));
    await seed.collection('c').insertOne({ _id: 'file', n: -1, _files: { f: { ...ref } } });
    const legacy = `${name}-legacy`;
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open(`brightdb-v2:${legacy}`, 1);
      open.onupgradeneeded = () => {
        open.result.createObjectStore('blocks');
        open.result.createObjectStore('meta');
      };
      open.onerror = () => reject(open.error);
      open.onsuccess = async () => {
        const db = open.result;
        const tx = db.transaction(['blocks', 'meta'], 'readwrite');
        for (const [digest, bytes] of source.blocks) tx.objectStore('blocks').put(bytes, digest);
        tx.objectStore('meta').put(crypto.getRandomValues(new Uint8Array(16)), 'writerId');
        tx.objectStore('meta').put(await source.readHead(), 'head');
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
    const version = (dbName: string) =>
      new Promise<{ version: number; stores: string[] }>((resolve, reject) => {
        const open = indexedDB.open(`brightdb-v2:${dbName}`);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const info = { version: open.result.version, stores: [...open.result.objectStoreNames].sort() };
          open.result.close();
          resolve(info);
        };
      });
    const before = await version(legacy);
    assert(before.version === 1 && before.stores.join() === 'blocks,meta', `not a v1 database: ${JSON.stringify(before)}`);

    // Open with the current code: the schema upgrades in place and all data is intact.
    const db = await openBrowserDb(legacy);
    const after = await version(legacy);
    assert(after.version >= 2 && after.stores.includes('times'), `not upgraded: ${JSON.stringify(after)}`);
    assert((await db.root()) === (await seed.root()), 'root changed by the upgrade');
    assert((await db.collection('c').find({}).toArray()).length === 81, 'documents lost in the upgrade');
    assert((await db.collection('c').findByIndex('by_n', { equals: [903] })).length === 1, 'index lost in the upgrade');
    assert((await db.getAttachment(ref)).length === 1_200_000, 'attachment lost in the upgrade');
    // It keeps working: new writes, a reopen, and garbage collection (old blocks have no timestamp, so
    // they count as old and are collectable; live data must survive).
    await db.collection('c').insertOne({ _id: 'after-upgrade', n: 5 });
    const gc = await db.collectGarbage({ graceMs: 0 });
    const reopened = await openBrowserDb(legacy);
    assert((await reopened.collection('c').find({}).toArray()).length === 82, 'documents lost after upgrade + GC');
    assert((await reopened.collection('c').findById('d3'))?.['n'] === 903, 'update lost after upgrade + GC');
    assert((await reopened.getAttachment(ref)).length === 1_200_000, 'attachment lost after upgrade + GC');
    // A second connection opened before the upgrade finished does not block it (versionchange closes it).
    return { from: before, to: after, gcRemoved: gc.removed };
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
