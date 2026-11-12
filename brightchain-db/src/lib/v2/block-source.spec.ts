import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { HttpBlockSource, serveBlocks, type BlockServer } from './block-source';
import { BrightDbV2MissingBlockError } from './disk-store';
import { PortableBrightDb } from './portable-database';

describe('BrightDB v2 block sources', () => {
  let dir: string;
  const servers: BlockServer[] = [];
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'brightdb-v2-source-'));
  });
  afterEach(async () => {
    await Promise.all(servers.splice(0).map((s) => s.close()));
    await rm(dir, { recursive: true, force: true });
  });

  const open = (name: string, key?: Buffer) =>
    PortableBrightDb.open({ path: join(dir, name), encryption: key ? { key } : undefined });
  const serve = async (db: PortableBrightDb, token?: string) => {
    const server = await serveBlocks(db.blockSource(), { token });
    servers.push(server);
    return server;
  };
  /** A fetch that counts requests by kind. */
  function counting() {
    const counts = { head: 0, blocks: 0 };
    const counted: typeof fetch = (input, init) => {
      const url = String(input);
      if (url.endsWith('/head')) counts.head++;
      else counts.blocks++;
      return fetch(input, init);
    };
    return { counts, counted };
  }

  it('syncs two databases over HTTP, fetching only the blocks the other side lacks', async () => {
    const a = await open('a');
    await a.collection('docs').insertMany(Array.from({ length: 600 }, (_, i) => ({ _id: `d${i}`, v: i })));
    const b = await a.fork(join(dir, 'b'));
    const serverA = await serve(a);
    const serverB = await serve(b);

    await a.collection('docs').insertOne({ _id: 'from-a', v: -1 });
    await b.collection('docs').replaceById('d7', { _id: 'd7', v: 777 });
    const fromB = counting();
    const fromA = counting();
    // Each side pulls from the other's server.
    const pulled = await a.merge(new HttpBlockSource(serverB.url, { fetch: fromB.counted }));
    await b.merge(new HttpBlockSource(serverA.url, { fetch: fromA.counted }));
    expect(pulled.adopted).toBe(1);
    expect(await a.root()).toBe(await b.root());
    expect((await a.collection('docs').findById('d7'))?.['v']).toBe(777);
    expect(await b.collection('docs').findById('from-a')).toMatchObject({ v: -1 });
    // A handful of pages and one document, not the 600-document collection.
    expect(fromB.counts.blocks).toBeLessThan(25);
    expect(fromA.counts.blocks).toBeLessThan(25);

    // Pulling again when nothing changed reads only the head.
    const idle = counting();
    expect((await a.merge(new HttpBlockSource(serverB.url, { fetch: idle.counted }))).root).toBe(await a.root());
    expect(idle.counts).toEqual({ head: 1, blocks: 0 });
    a.close();
    b.close();
  });

  it('requires the token and rejects a wrong one', async () => {
    const a = await open('a');
    await a.collection('docs').insertOne({ _id: 'one' });
    const b = await a.fork(join(dir, 'b'));
    await a.collection('docs').insertOne({ _id: 'two' });
    const server = await serve(a, 'secret');
    await expect(b.merge(new HttpBlockSource(server.url))).rejects.toThrow(/HTTP 401/u);
    await expect(b.merge(new HttpBlockSource(server.url, { token: 'nope' }))).rejects.toThrow(/HTTP 401/u);
    await b.merge(new HttpBlockSource(server.url, { token: 'secret' }));
    expect(await b.collection('docs').findById('two')).toEqual({ _id: 'two' });
    const post = await fetch(`${server.url}/head`, { method: 'POST', headers: { authorization: 'Bearer secret' } });
    expect(post.status).toBe(405);
    a.close();
    b.close();
  });

  it('rejects a server that returns the wrong bytes and publishes nothing', async () => {
    const a = await open('a');
    await a.collection('docs').insertOne({ _id: 'one' });
    const b = await a.fork(join(dir, 'b'));
    await a.collection('docs').insertOne({ _id: 'two' });
    const server = await serve(a);
    const before = await b.root();
    let corrupted = 0;
    const lying: typeof fetch = async (input, init) => {
      const response = await fetch(input, init);
      if (!String(input).includes('/blocks/')) return response;
      const bytes = Buffer.from(await response.arrayBuffer());
      bytes[bytes.length - 1] ^= 1;
      corrupted++;
      return new Response(bytes, { status: 200 });
    };
    await expect(b.merge(new HttpBlockSource(server.url, { fetch: lying }))).rejects.toThrow(/digest check/u);
    expect(corrupted).toBeGreaterThan(0);
    expect(await b.root()).toBe(before);
    a.close();
    b.close();
  });

  it('reports a missing block and leaves the database unchanged', async () => {
    const a = await open('a');
    await a.collection('docs').insertOne({ _id: 'one' });
    const b = await a.fork(join(dir, 'b'));
    await a.collection('docs').insertOne({ _id: 'two' });
    const server = await serve(a);
    const before = await b.root();
    const missing: typeof fetch = async (input, init) =>
      String(input).includes('/blocks/') ? new Response('', { status: 404 }) : fetch(input, init);
    await expect(b.merge(new HttpBlockSource(server.url, { fetch: missing }))).rejects.toThrow(BrightDbV2MissingBlockError);
    expect(await b.root()).toBe(before);
    await expect(new HttpBlockSource(server.url).readBlock('f'.repeat(128))).rejects.toThrow(BrightDbV2MissingBlockError);
    a.close();
    b.close();
  });

  it('serves an encrypted directory to a plain replica as verified plaintext blocks', async () => {
    const key = Buffer.alloc(32, 9);
    const a = await open('a', key);
    await a.collection('docs').insertOne({ _id: 'secret-doc', note: 'hello' });
    const fork = await a.fork(join(dir, 'forked'));
    await a.collection('docs').insertOne({ _id: 'later' });
    const server = await serve(a);
    await fork.merge(new HttpBlockSource(server.url));
    expect(await fork.root()).toBe(await a.root());
    a.close();
    fork.close();
  });
});

describe('BrightDB v2 cloneFrom', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'brightdb-v2-clone-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('copies a served database into a new directory, then stays mergeable', async () => {
    const a = await PortableBrightDb.open({ path: join(dir, 'a') });
    await a.collection('docs').createIndex('by_n', ['n']);
    await a.collection('docs').insertMany(Array.from({ length: 100 }, (_, i) => ({ _id: `d${i}`, n: i })));
    const ref = await a.putAttachment(Buffer.alloc(1_200_000, 6));
    await a.collection('docs').insertOne({ _id: 'file', n: -1, _files: { f: { ...ref } } });
    const server = await serveBlocks(a.blockSource(), { token: 'tok' });
    try {
      await expect(PortableBrightDb.cloneFrom(join(dir, 'denied'), new HttpBlockSource(server.url))).rejects.toThrow(/HTTP 401/u);
      const source = new HttpBlockSource(server.url, { token: 'tok' });
      const b = await PortableBrightDb.cloneFrom(join(dir, 'b'), source);
      expect(await b.root()).toBe(await a.root());
      expect((await b.getAttachment(ref)).length).toBe(ref.size);
      expect((await b.collection('docs').findByIndex('by_n', { gte: 98 })).map((d) => d['_id'])).toEqual(['d98', 'd99']);

      await a.collection('docs').insertOne({ _id: 'from-a', n: 500 });
      await b.collection('docs').insertOne({ _id: 'from-b', n: 600 });
      await b.merge(source);
      await a.merge(b);
      expect(await a.root()).toBe(await b.root());

      const c = await PortableBrightDb.cloneFrom(join(dir, 'c'), source, { encryption: { key: Buffer.alloc(32, 8) } });
      expect(await c.collection('docs').findById('from-a')).toMatchObject({ n: 500 });
      await expect(PortableBrightDb.open({ path: join(dir, 'c') })).rejects.toThrow(/encrypted/u);
      for (const db of [b, c]) db.close();
    } finally {
      await server.close();
    }
    a.close();
  });
});
