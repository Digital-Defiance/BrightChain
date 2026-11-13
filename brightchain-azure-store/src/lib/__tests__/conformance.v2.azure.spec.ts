/**
 * BrightDB v2 and named blocks on AzureBlobBlockStore.
 *
 * Hits a REAL Azure Blob endpoint: Azurite or a live account. Skips unless opted in:
 *   AZURE_CONFORMANCE_TEST=1
 *   AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;..."
 *
 * Runs the same checks as the S3 spec: putInPoolWithId, a plain v2 database with
 * full 1 MiB chunks, and an encrypting-pool v2 database with sealed chunks.
 */
import { BlobServiceClient } from '@azure/storage-blob';
import { BlockSize, initializeBrightChain, resetInitialization } from '@brightchain/brightchain-lib';
import { BrightChainV2Storage, PortableBrightDb } from '@brightchain/db';
import { randomUUID } from 'crypto';
import { AzureBlobBlockStore } from '../stores/azureBlobBlockStore';

const ENABLED = process.env['AZURE_CONFORMANCE_TEST'] === '1';
const CONNECTION_STRING = process.env['AZURE_STORAGE_CONNECTION_STRING'];
const describeOrSkip = ENABLED && CONNECTION_STRING ? describe : describe.skip;

jest.setTimeout(180_000);

describeOrSkip('BrightDB v2 on AzureBlobBlockStore (REAL)', () => {
  const containerName = `bc-v2-${randomUUID().slice(0, 8)}`;
  let service: BlobServiceClient;
  let store: AzureBlobBlockStore;

  beforeAll(async () => {
    initializeBrightChain();
    service = BlobServiceClient.fromConnectionString(CONNECTION_STRING as string);
    await service.getContainerClient(containerName).create();
    store = new AzureBlobBlockStore({
      region: 'eastus',
      containerOrBucketName: containerName,
      supportedBlockSizes: [BlockSize.Small],
      connectionString: CONNECTION_STRING as string,
    });
  });

  afterAll(async () => {
    try {
      await service.getContainerClient(containerName).delete();
    } catch {
      /* best effort */
    }
    resetInitialization();
  });

  it('putInPoolWithId stores bytes under the given name, idempotently, per pool', async () => {
    const id = 'ef'.repeat(64);
    expect(store.putInPoolWithId).toBeDefined();
    await store.putInPoolWithId('p1', id, Buffer.from('sealed bytes'));
    await store.putInPoolWithId('p1', id, Buffer.from('ignored second write'));
    expect(Buffer.from(await store.getFromPool('p1', id)).toString()).toBe('sealed bytes');
    expect(await store.hasInPool('p1', id)).toBe(true);
    expect(await store.hasInPool('p2', id)).toBe(false);
    await expect(store.putInPoolWithId('p1', 'short', Buffer.from('x'))).rejects.toThrow(/128 lowercase/u);
    const big = Buffer.alloc(1_048_576 + 29, 7);
    await store.putInPoolWithId('p1', 'ab'.repeat(64), big);
    expect((await store.getFromPool('p1', 'ab'.repeat(64))).length).toBe(1_048_605);
  });

  it('holds a plain v2 database, including a full 1 MiB chunk, and reopens it', async () => {
    const registry = store.createHeadRegistry();
    await registry.load();
    const options = { store, poolId: 'plain-v2', headRegistry: registry, dbName: 'app' };
    const db = await PortableBrightDb.open({ storage: await BrightChainV2Storage.openOrCreate(options) });
    await db.collection('docs').insertMany([{ _id: 'a', v: 1 }, { _id: 'b', v: 2 }]);
    const ref = await db.putAttachment(Buffer.alloc(1_048_576 * 2 + 5, 3));
    await db.collection('docs').insertOne({ _id: 'file', _files: { f: { ...ref } } });
    const root = await db.root();
    db.close();

    const reloaded = store.createHeadRegistry();
    await reloaded.load();
    const again = await PortableBrightDb.open({
      storage: await BrightChainV2Storage.openOrCreate({ ...options, headRegistry: reloaded }),
    });
    expect(await again.root()).toBe(root);
    expect(await again.collection('docs').findById('a')).toEqual({ _id: 'a', v: 1 });
    expect((await again.getAttachment(ref)).length).toBe(ref.size);
    again.close();
  });

  it('holds an encrypting-pool v2 database with sealed 1 MiB chunks and nothing readable in the container', async () => {
    const registry = store.createHeadRegistry();
    await registry.load();
    const key = Buffer.alloc(32, 11);
    const options = { store, poolId: 'secure-v2', headRegistry: registry, dbName: 'app', poolEncryption: { key } };
    const db = await PortableBrightDb.open({ storage: await BrightChainV2Storage.openOrCreate(options) });
    const secret = 'container-secret-note';
    await db.collection('docs').insertMany([{ _id: 'a', note: secret }, { _id: 'b', note: secret }]);
    const ref = await db.putAttachment(Buffer.concat([Buffer.alloc(1_048_576, 9), Buffer.from(secret)]));
    await db.collection('docs').insertOne({ _id: 'file', _files: { f: { ...ref } } });
    expect(await db.collection('docs').findById('a')).toMatchObject({ note: secret });
    expect((await db.getAttachment(ref)).length).toBe(ref.size);
    const root = await db.root();
    db.close();

    // Read the raw blobs: none holds the secret or is named by the plaintext root.
    let checked = 0;
    for await (const blob of service.getContainerClient(containerName).listBlobsFlat({ prefix: '' })) {
      if (!blob.name.includes('secure-v2')) continue;
      const bytes = await service.getContainerClient(containerName).getBlobClient(blob.name).downloadToBuffer();
      expect(bytes.includes(Buffer.from(secret))).toBe(false);
      expect(blob.name).not.toContain(root);
      checked++;
    }
    expect(checked).toBeGreaterThan(5);

    const reloaded = store.createHeadRegistry();
    await reloaded.load();
    const again = await PortableBrightDb.open({
      storage: await BrightChainV2Storage.openOrCreate({ ...options, headRegistry: reloaded }),
    });
    expect(await again.root()).toBe(root);
    expect((await again.getAttachment(ref)).length).toBe(ref.size);
    again.close();
  });
});
