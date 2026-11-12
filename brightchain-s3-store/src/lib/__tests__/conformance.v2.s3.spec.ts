/**
 * BrightDB v2 and named blocks on S3Block Store.
 *
 * Runs against an in-process S3-compatible fake by default. To run against a
 * real endpoint (LocalStack, MinIO, AWS), set the same variables as
 * conformance.s3.spec.ts: S3_CONFORMANCE_TEST=1, AWS_S3_ENDPOINT (optional),
 * AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION.
 */
import { CreateBucketCommand, DeleteBucketCommand, DeleteObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { BlockSize, initializeBrightChain, resetInitialization } from '@brightchain/brightchain-lib';
import { BrightChainV2Storage, PortableBrightDb } from '@brightchain/db';
import { randomUUID } from 'crypto';
import { startFakeS3, type FakeS3 } from './fakeS3Server';
import { S3BlockStore } from '../stores/s3BlockStore';

jest.setTimeout(180_000);

const REAL = process.env['S3_CONFORMANCE_TEST'] === '1' && process.env['AWS_ACCESS_KEY_ID'] && process.env['AWS_SECRET_ACCESS_KEY'];

// The AWS SDK imports modules dynamically, which jest only allows with --experimental-vm-modules.
// Run with: NODE_OPTIONS=--experimental-vm-modules yarn jest -c brightchain-s3-store/jest.conformance.config.ts conformance.v2.s3
const describeOrSkip = /experimental-vm-modules/u.test(process.env['NODE_OPTIONS'] ?? '') ? describe : describe.skip;

describeOrSkip(`BrightDB v2 on S3BlockStore (${REAL ? 'real endpoint' : 'in-process S3 fake'})`, () => {
  const bucket = `bc-v2-${randomUUID().slice(0, 8)}`;
  let fake: FakeS3 | undefined;
  let client: S3Client;
  let store: S3BlockStore;

  beforeAll(async () => {
    initializeBrightChain();
    const region = process.env['AWS_REGION'] || 'us-east-1';
    let endpoint = process.env['AWS_S3_ENDPOINT'];
    let accessKeyId = process.env['AWS_ACCESS_KEY_ID'] ?? 'test';
    let secretAccessKey = process.env['AWS_SECRET_ACCESS_KEY'] ?? 'test';
    if (!REAL) {
      fake = await startFakeS3();
      endpoint = fake.endpoint;
      accessKeyId = 'test';
      secretAccessKey = 'test';
    }
    client = new S3Client({ region, ...(endpoint ? { endpoint, forcePathStyle: true } : {}), credentials: { accessKeyId, secretAccessKey } });
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    store = new S3BlockStore({
      region,
      containerOrBucketName: bucket,
      supportedBlockSizes: [BlockSize.Small],
      accessKeyId,
      secretAccessKey,
      ...(endpoint ? { endpoint } : {}),
    });
  });

  afterAll(async () => {
    try {
      let token: string | undefined;
      do {
        const list = await client.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }));
        for (const obj of list.Contents ?? []) await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: obj.Key }));
        token = list.IsTruncated ? list.NextContinuationToken : undefined;
      } while (token);
      await client.send(new DeleteBucketCommand({ Bucket: bucket }));
    } catch {
      /* best effort */
    }
    await fake?.close();
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
    // A payload just over the 1 MiB size class (a sealed 1 MiB chunk) is stored with its exact length.
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

  it('holds an encrypting-pool v2 database with sealed 1 MiB chunks and nothing readable in the bucket', async () => {
    const registry = store.createHeadRegistry();
    await registry.load();
    const key = Buffer.alloc(32, 11);
    const options = { store, poolId: 'secure-v2', headRegistry: registry, dbName: 'app', poolEncryption: { key } };
    const db = await PortableBrightDb.open({ storage: await BrightChainV2Storage.openOrCreate(options) });
    const secret = 'bucket-secret-note';
    await db.collection('docs').insertMany([{ _id: 'a', note: secret }, { _id: 'b', note: secret }]);
    const ref = await db.putAttachment(Buffer.concat([Buffer.alloc(1_048_576, 9), Buffer.from(secret)]));
    await db.collection('docs').insertOne({ _id: 'file', _files: { f: { ...ref } } });
    expect(await db.collection('docs').findById('a')).toMatchObject({ note: secret });
    expect((await db.getAttachment(ref)).length).toBe(ref.size);
    const root = await db.root();
    db.close();

    // Nothing in the secure pool is named by a plaintext digest or contains the secret.
    if (fake) {
      let checked = 0;
      for (const [full, bytes] of fake.objects) {
        if (!full.includes('secure-v2')) continue;
        expect(bytes.includes(Buffer.from(secret))).toBe(false);
        expect(full).not.toContain(root);
        checked++;
      }
      expect(checked).toBeGreaterThan(5);
    }
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
