/**
 * Child-process worker for the BrightDB v2 multi-process tests.
 * Usage: node --import tsx v2-worker.ts <command> <directory> [args]
 * Each command prints one JSON line on success.
 */
import { readFileSync } from 'node:fs';
import { digestPayload } from '../src/lib/v2/codec';
import { HttpBlockSource, serveBlocks } from '../src/lib/v2/block-source';
import { PortableBrightDb } from '../src/lib/v2/portable-database';

async function main(): Promise<void> {
  const [command, path, ...args] = process.argv.slice(2);
  if (command === 'clone') {
    // clone <target directory> <url> [token]: copy a served database into a new directory
    const [url, token] = args;
    const keyHex = process.env['BRIGHTDB_KEY'];
    (await PortableBrightDb.cloneFrom(path, new HttpBlockSource(url, { token }), keyHex ? { encryption: { key: Buffer.from(keyHex, 'hex') } } : {})).close();
    console.log(JSON.stringify({ ok: true }));
    return;
  }
  // BRIGHTDB_KEY (64 hex digits) opens an encrypted database.
  const hex = process.env['BRIGHTDB_KEY'];
  const encryption = hex ? { key: Buffer.from(hex, 'hex') } : undefined;
  const db = await PortableBrightDb.open({ path, encryption });
  try {
    switch (command) {
      case 'write': {
        // write <collection> <tag> <count>: one atomic batch of <count> documents.
        const [collection, tag, count] = args;
        await db.writeBatch(
          Array.from({ length: Number(count) }, (_, index) => ({
            type: 'insert' as const,
            collection,
            document: { _id: `${tag}-${index}`, tag, index },
          })),
        );
        console.log(JSON.stringify({ ok: true }));
        break;
      }
      case 'delete': {
        const [collection, id] = args;
        const result = await db.collection(collection).deleteById(id);
        console.log(JSON.stringify(result));
        break;
      }
      case 'dump': {
        const out: Record<string, unknown[]> = {};
        for (const name of (await db.listCollections()).sort()) {
          const docs = await db.collection(name).find({}).toArray();
          out[name] = docs.sort((a, b) =>
            String(a['_id']).localeCompare(String(b['_id'])),
          );
        }
        console.log(JSON.stringify(out));
        break;
      }
      case 'insertjson': {
        const [collection, json] = args;
        const result = await db.collection(collection).insertOne(JSON.parse(json));
        console.log(JSON.stringify({ insertedId: result.insertedId }));
        break;
      }
      case 'createindex': {
        const [collection, name, ...fields] = args;
        await db.collection(collection).createIndex(name, fields);
        console.log(JSON.stringify({ ok: true }));
        break;
      }
      case 'findindex': {
        const [collection, index, query] = args;
        const docs = await db.collection(collection).findByIndex(index, JSON.parse(query));
        console.log(JSON.stringify(docs.map((d) => d['_id'])));
        break;
      }
      case 'putfile': {
        const [file, type] = args;
        console.log(JSON.stringify(await db.putAttachment(readFileSync(file), { type })));
        break;
      }
      case 'getfile': {
        const [digest] = args;
        const bytes = await db.getAttachment({ digest });
        console.log(JSON.stringify({ size: bytes.length, sha3: digestPayload(bytes) }));
        break;
      }
      case 'fork': {
        const [target] = args;
        (await db.fork(target)).close();
        console.log(JSON.stringify({ ok: true }));
        break;
      }
      case 'merge': {
        const [other, root] = args;
        const source = await PortableBrightDb.open({ path: other, encryption });
        try {
          const result = await db.merge(source, root ? { root } : {});
          console.log(JSON.stringify(result));
        } finally {
          source.close();
        }
        break;
      }
      case 'serve': {
        // serve [port] [token]: serve this database read-only until stdin closes
        const [port, token] = args;
        const server = await serveBlocks(db.blockSource(), {
          port: port ? Number(port) : 0,
          token,
        });
        console.log(JSON.stringify({ url: server.url }));
        await new Promise<void>((resolve) => {
          process.stdin.resume();
          process.stdin.on('end', resolve);
        });
        await server.close();
        break;
      }
      case 'pull': {
        // pull <url> [token]: merge a served replica into this one
        const [url, token] = args;
        console.log(JSON.stringify(await db.merge(new HttpBlockSource(url, { token }))));
        break;
      }
      case 'find': {
        // find <collection> <filter json>: ids of matching documents, sorted
        const [collection, filter] = args;
        const docs = await db.collection(collection).find(JSON.parse(filter)).toArray();
        console.log(JSON.stringify(docs.map((d) => d['_id']).sort()));
        break;
      }
      case 'gc': {
        // gc [graceMs]: delete blocks the current root does not reach
        const [grace] = args;
        const r = await db.collectGarbage({ graceMs: grace ? Number(grace) : undefined });
        console.log(JSON.stringify({ keptReachable: r.keptReachable, keptRecent: r.keptRecent, removed: r.removed }));
        break;
      }
      case 'root': {
        console.log(JSON.stringify({ root: await db.root() }));
        break;
      }
      case 'diff': {
        // diff <from> <to>: sorted "collection/id:type" summaries
        const [from, to] = args;
        const lines: string[] = [];
        for await (const change of db.diff(from, to)) {
          lines.push(`${change.collection}/${change.id}:${change.type}`);
        }
        console.log(JSON.stringify(lines.sort()));
        break;
      }
      case 'loop': {
        // loop <collection> <batchSize>: commit batches forever until killed.
        const [collection, size] = args;
        console.log(JSON.stringify({ ready: true }));
        for (let batch = 0; ; batch++) {
          await db.writeBatch(
            Array.from({ length: Number(size) }, (_, index) => ({
              type: 'insert' as const,
              collection,
              document: { _id: `b${batch}-${index}`, batch, size: Number(size) },
            })),
          );
        }
      }
      default:
        throw new Error(`Unknown command ${command}`);
    }
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
