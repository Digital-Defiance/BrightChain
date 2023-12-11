/**
 * @fileoverview Persistence conformance: AzureBlobBlockStore + CloudHeadRegistry.
 *
 * Hits a REAL Azure Blob Storage endpoint — either Azurite (local emulator)
 * or a live Azure account. Skips unless opted in via env vars.
 *
 * ── Azurite (local, no cost) ──────────────────────────────────────────────
 *   AZURE_CONFORMANCE_TEST=1
 *   AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;..."
 *
 * Creates a randomly-named container, runs the suite, then deletes it.
 */

import {
  BlockSize,
  initializeBrightChain,
  PooledMemoryBlockStore,
  resetInitialization,
} from '@brightchain/brightchain-lib';
import { BrightDb } from '@brightchain/db';
import { randomUUID } from 'crypto';
import { BlobServiceClient } from '@azure/storage-blob';
import { AzureBlobBlockStore } from '../stores/azureBlobBlockStore';

// ─── Gate ───────────────────────────────────────────────────────────────────

const ENABLED = process.env['AZURE_CONFORMANCE_TEST'] === '1';
const CONNECTION_STRING = process.env['AZURE_STORAGE_CONNECTION_STRING'];

const describeOrSkip = ENABLED && CONNECTION_STRING ? describe : describe.skip;

jest.setTimeout(120_000);

describeOrSkip('Conformance: AzureBlobBlockStore + CloudHeadRegistry (REAL)', () => {
  const containerName = `bc-conformance-${randomUUID().slice(0, 8)}`;
  let azureStore: AzureBlobBlockStore;
  let memStore: PooledMemoryBlockStore;
  let blobServiceClient: BlobServiceClient;

  beforeAll(async () => {
    initializeBrightChain();

    console.log(`[Azure Conformance] Creating container "${containerName}" ...`);
    blobServiceClient = BlobServiceClient.fromConnectionString(CONNECTION_STRING!);
    await blobServiceClient.getContainerClient(containerName).create();
    console.log(`[Azure Conformance] Container "${containerName}" created.`);

    azureStore = new AzureBlobBlockStore({
      region: 'eastus',
      containerOrBucketName: containerName,
      supportedBlockSizes: [BlockSize.Small],
      connectionString: CONNECTION_STRING!,
    });
    memStore = new PooledMemoryBlockStore(BlockSize.Small);
  });

  afterAll(async () => {
    console.log(`[Azure Conformance] Deleting container "${containerName}" ...`);
    try {
      await blobServiceClient.getContainerClient(containerName).delete();
      console.log(`[Azure Conformance] Container "${containerName}" deleted.`);
    } catch (err) {
      console.warn(
        `[Azure Conformance] Failed to delete container:`,
        err instanceof Error ? err.message : err,
      );
    }
    resetInitialization();
  });

  it('should persist user doc via CloudHeadRegistry across restart', async () => {
    const memberId = 'e95903ff6a9347229b845fc9aaf53bc8';

    const registry1 = azureStore.createHeadRegistry();
    const db1 = new BrightDb(memStore, { name: 'conform', headRegistry: registry1 });
    await db1.connect();
    await db1.collection('users').insertOne({
      _id: memberId, username: 'jessica', email: 'jessica@example.com',
    } as never);

    const registry2 = azureStore.createHeadRegistry();
    await registry2.load();
    const db2 = new BrightDb(memStore, { name: 'conform', headRegistry: registry2 });
    await db2.connect();

    const found = await db2.collection('users').findOne({ username: 'jessica' } as never);
    expect(found).not.toBeNull();
    expect((found as any)._id).toBe(memberId);
  });

  it('should persist member_index doc across restart', async () => {
    const memberId = 'aaaa1111bbbb2222cccc3333dddd4444';

    const registry1 = azureStore.createHeadRegistry();
    const db1 = new BrightDb(memStore, { name: 'conform', headRegistry: registry1 });
    await db1.connect();
    await db1.collection('member_index').insertOne({
      _id: memberId, id: memberId, publicCBL: '00'.repeat(64),
      privateCBL: '00'.repeat(64), type: 1, status: 'Active', poolId: 'Test',
    } as never);

    const registry2 = azureStore.createHeadRegistry();
    await registry2.load();
    const db2 = new BrightDb(memStore, { name: 'conform', headRegistry: registry2 });
    await db2.connect();

    const found = await db2.collection('member_index').findOne({ id: memberId } as never);
    expect(found).not.toBeNull();
  });

  it('should persist updates across restart', async () => {
    const registry1 = azureStore.createHeadRegistry();
    const db1 = new BrightDb(memStore, { name: 'conform', headRegistry: registry1 });
    await db1.connect();
    await db1.collection('users').insertOne({
      _id: 'upd_az', username: 'updatable', email: 'old@test.com',
    } as never);
    await db1.collection('users').updateOne(
      { _id: 'upd_az' } as never,
      { $set: { email: 'new@test.com' } } as never,
    );

    const registry2 = azureStore.createHeadRegistry();
    await registry2.load();
    const db2 = new BrightDb(memStore, { name: 'conform', headRegistry: registry2 });
    await db2.connect();

    const found = await db2.collection('users').findOne({ _id: 'upd_az' } as never);
    expect((found as any).email).toBe('new@test.com');
  });

  it('should persist deletes across restart', async () => {
    const registry1 = azureStore.createHeadRegistry();
    const db1 = new BrightDb(memStore, { name: 'conform', headRegistry: registry1 });
    await db1.connect();
    const col = db1.collection('del_test');
    await col.insertMany([
      { _id: 'dk1', v: 'keep' },
      { _id: 'dk2', v: 'remove' },
    ] as never);
    await col.deleteOne({ _id: 'dk2' } as never);

    const registry2 = azureStore.createHeadRegistry();
    await registry2.load();
    const db2 = new BrightDb(memStore, { name: 'conform', headRegistry: registry2 });
    await db2.connect();
    const col2 = db2.collection('del_test');

    expect(await col2.findById('dk1')).not.toBeNull();
    expect(await col2.findById('dk2')).toBeNull();
  });

  it('should persist full registration → login chain across restart', async () => {
    const memberId = 'ff001122334455667788990011223344';

    const registry1 = azureStore.createHeadRegistry();
    const db1 = new BrightDb(memStore, { name: 'conform', headRegistry: registry1 });
    await db1.connect();
    await db1.collection('users').insertOne({
      _id: memberId, username: 'alice', email: 'alice@example.com',
      publicKey: 'ab'.repeat(33), accountStatus: 'Active',
    } as never);
    await db1.collection('member_index').insertOne({
      _id: memberId, id: memberId, publicCBL: '00'.repeat(64),
      privateCBL: '00'.repeat(64), type: 1, status: 'Active', poolId: 'BC',
    } as never);

    const registry2 = azureStore.createHeadRegistry();
    await registry2.load();
    const db2 = new BrightDb(memStore, { name: 'conform', headRegistry: registry2 });
    await db2.connect();

    const userDoc = await db2.collection('users').findOne({ username: 'alice' } as never);
    expect(userDoc).not.toBeNull();
    const foundId = (userDoc as any)._id;

    const indexDoc = await db2.collection('member_index').findOne({
      id: foundId.replace(/-/g, ''),
    } as never);
    expect(indexDoc).not.toBeNull();
  });
});
