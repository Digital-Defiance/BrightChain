/**
 * Child-process worker for the BrightDB v2 multi-process tests.
 * Usage: node --import tsx v2-worker.ts <command> <directory> [args]
 * Each command prints one JSON line on success.
 */
import { PortableBrightDb } from '../src/lib/v2/portable-database';

async function main(): Promise<void> {
  const [command, path, ...args] = process.argv.slice(2);
  const db = await PortableBrightDb.open({ path });
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
