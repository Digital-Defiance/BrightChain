/**
 * @fileoverview Persistence conformance: S3BlockStore + CloudHeadRegistry.
 *
 * Hits a REAL S3-compatible endpoint. Skips unless opted in via env vars.
 *
 * ── LocalStack (local, no cost) ───────────────────────────────────────────
 *   S3_CONFORMANCE_TEST=1
 *   AWS_S3_ENDPOINT=http://localhost:4566
 *   AWS_ACCESS_KEY_ID=test
 *   AWS_SECRET_ACCESS_KEY=test
 *   AWS_REGION=us-east-1
 *
 * Creates a randomly-named bucket, runs the suite, empties + deletes it.
 */

import {
  BlockSize,
  initializeBrightChain,
  PooledMemoryBlockStore,
  resetInitialization,
} from '@brightchain/brightchain-lib';
import { BrightDb } from '@brightchain/db';
import { randomUUID } from 'crypto';
import {
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';
import { S3BlockStore } from '../stores/s3BlockStore';

// ─── Gate ───────────────────────────────────────────────────────────────────

const ENABLED = process.env['S3_CONFORMANCE_TEST'] === '1';
const ACCESS_KEY = process.env['AWS_ACCESS_KEY_ID'];
const SECRET_KEY = process.env['AWS_SECRET_ACCESS_KEY'];
const REGION = process.env['AWS_REGION'] || 'us-east-1';
const ENDPOINT = process.env['AWS_S3_ENDPOINT'];

const describeOrSkip =
  ENABLED && ACCESS_KEY && SECRET_KEY ? describe : describe.skip;

async function destroyBucket(client: S3Client, bucket: string): Promise<void> {
  let token: string | undefined;
  do {
    const list = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }),
    );
    if (list.Contents) {
      for (const obj of list.Contents) {
        if (obj.Key) {
          await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: obj.Key }));
        }
      }
    }
    token = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (token);
  await client.send(new DeleteBucketCommand({ Bucket: bucket }));
}

jest.setTimeout(120_000);

describeOrSkip('Conformance: S3BlockStore + CloudHeadRegistry (REAL)', () => {
  const bucketName = `bc-conformance-${randomUUID().slice(0, 8)}`;
  let s3Store: S3BlockStore;
  let memStore: PooledMemoryBlockStore;
  let s3Client: S3Client;

  beforeAll(async () => {
    initializeBrightChain();

    const cfg: Record<string, unknown> = { region: REGION };
    if (ENDPOINT) { cfg['endpoint'] = ENDPOINT; cfg['forcePathStyle'] = true; }
    if (ACCESS_KEY && SECRET_KEY) {
      cfg['credentials'] = { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY };
    }
    s3Client = new S3Client(cfg);

    console.log(`[S3 Conformance] Creating bucket "${bucketName}" ...`);
    await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
    console.log(`[S3 Conformance] Bucket "${bucketName}" created.`);

    s3Store = new S3BlockStore({
      region: REGION,
      containerOrBucketName: bucketName,
      supportedBlockSizes: [BlockSize.Small],
      accessKeyId: ACCESS_KEY!,
      secretAccessKey: SECRET_KEY!,
      ...(ENDPOINT ? { endpoint: ENDPOINT } : {}),
    });
    memStore = new PooledMemoryBlockStore(BlockSize.Small);
  });

  afterAll(async () => {
    console.log(`[S3 Conformance] Destroying bucket "${bucketName}" ...`);
    try {
      await destroyBucket(s3Client, bucketName);
      console.log(`[S3 Conformance] Bucket "${bucketName}" destroyed.`);
    } catch (err) {
      console.warn(
        `[S3 Conformance] Failed to destroy bucket:`,
        err instanceof Error ? err.message : err,
      );
    }
    resetInitialization();
  });

  it('should persist user doc via CloudHeadRegistry across restart', async () => {
    const memberId = 'e95903ff6a9347229b845fc9aaf53bc8';

    const registry1 = s3Store.createHeadRegistry();
    const db1 = new BrightDb(memStore, { name: 'conform', headRegistry: registry1 });
    await db1.connect();
    await db1.collection('users').insertOne({
      _id: memberId, username: 'jessica', email: 'jessica@example.com',
    } as never);

    const registry2 = s3Store.createHeadRegistry();
    await registry2.load();
    const db2 = new BrightDb(memStore, { name: 'conform', headRegistry: registry2 });
    await db2.connect();

    const found = await db2.collection('users').findOne({ username: 'jessica' } as never);
    expect(found).not.toBeNull();
    expect((found as any)._id).toBe(memberId);
  });

  it('should persist full registration → login chain across restart', async () => {
    const memberId = 'ff001122334455667788990011223344';

    const registry1 = s3Store.createHeadRegistry();
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

    const registry2 = s3Store.createHeadRegistry();
    await registry2.load();
    const db2 = new BrightDb(memStore, { name: 'conform', headRegistry: registry2 });
    await db2.connect();

    const userDoc = await db2.collection('users').findOne({ username: 'alice' } as never);
    expect(userDoc).not.toBeNull();

    const indexDoc = await db2.collection('member_index').findOne({
      id: (userDoc as any)._id.replace(/-/g, ''),
    } as never);
    expect(indexDoc).not.toBeNull();
  });

  it('should persist updates across restart', async () => {
    const registry1 = s3Store.createHeadRegistry();
    const db1 = new BrightDb(memStore, { name: 'conform', headRegistry: registry1 });
    await db1.connect();
    await db1.collection('users').insertOne({
      _id: 'upd_s3', username: 'updatable', email: 'old@test.com',
    } as never);
    await db1.collection('users').updateOne(
      { _id: 'upd_s3' } as never,
      { $set: { email: 'new@test.com' } } as never,
    );

    const registry2 = s3Store.createHeadRegistry();
    await registry2.load();
    const db2 = new BrightDb(memStore, { name: 'conform', headRegistry: registry2 });
    await db2.connect();

    const found = await db2.collection('users').findOne({ _id: 'upd_s3' } as never);
    expect((found as any).email).toBe('new@test.com');
  });

  it('should persist deletes across restart', async () => {
    const registry1 = s3Store.createHeadRegistry();
    const db1 = new BrightDb(memStore, { name: 'conform', headRegistry: registry1 });
    await db1.connect();
    const col = db1.collection('del_test');
    await col.insertMany([
      { _id: 'dk1', v: 'keep' },
      { _id: 'dk2', v: 'remove' },
    ] as never);
    await col.deleteOne({ _id: 'dk2' } as never);

    const registry2 = s3Store.createHeadRegistry();
    await registry2.load();
    const db2 = new BrightDb(memStore, { name: 'conform', headRegistry: registry2 });
    await db2.connect();

    expect(await db2.collection('del_test').findById('dk1')).not.toBeNull();
    expect(await db2.collection('del_test').findById('dk2')).toBeNull();
  });
});
