import { createHash } from 'node:crypto';
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  BrightDbV2DiskStore,
  BrightDbV2DiskWriter,
  BrightDbV2MissingBlockError,
} from './disk-store';

const initialRoot = Buffer.from(
  '4244423201101112131415161718191a1b1c1d1e1f000000000000000000',
  'hex',
);

function changedRoot(clock: number): Buffer {
  const block = Buffer.from(initialRoot);
  block[block.length - 2] = clock;
  return block;
}

function digestOf(bytes: Uint8Array): string {
  return createHash('sha3-512').update(bytes).digest('hex');
}

const describePosix = process.platform === 'win32' ? describe.skip : describe;

describePosix('BrightDbV2DiskStore', () => {
  let directory: string;
  let path: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'brightdb-v2-'));
    path = join(directory, 'data');
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('uses portable file bytes and opens the winner of racing initialization', async () => {
    await mkdir(path);
    const [first, second] = await Promise.all([
      BrightDbV2DiskStore.openOrCreate(path, initialRoot, Buffer.alloc(16, 1)),
      BrightDbV2DiskStore.openOrCreate(
        path,
        changedRoot(1),
        Buffer.alloc(16, 2),
      ),
    ]);

    const digest = await first.readHead();
    expect(digest).toBe(await second.readHead());
    expect(first.writerId).toEqual(second.writerId);
    expect((await readdir(path)).sort()).toEqual([
      'FORMAT',
      'HEAD',
      'LOCK',
      'WRITER',
      'blocks',
    ]);
    expect(await readFile(join(path, 'FORMAT'), 'utf8')).toBe(
      'BrightDB storage 2\n',
    );
    expect(await readFile(join(path, 'HEAD'), 'utf8')).toBe(`${digest}\n`);
    expect(await readFile(join(path, 'WRITER'), 'utf8')).toBe(
      `${Buffer.from(first.writerId).toString('hex')}\n`,
    );
    expect(
      digestOf(
        await readFile(join(path, 'blocks', digest.slice(0, 2), digest)),
      ),
    ).toBe(digest);
  });

  it('refuses to initialize a nonempty legacy directory', async () => {
    await mkdir(path);
    await writeFile(join(path, 'head-registry.json'), '{}');

    await expect(
      BrightDbV2DiskStore.openOrCreate(path, initialRoot),
    ).rejects.toThrow('Unsupported');
    expect(await readdir(path)).toEqual(['head-registry.json']);
  });

  it('leaves the prior head in place after staging fails and releases the lock', async () => {
    const store = await BrightDbV2DiskStore.create(path, initialRoot);
    const oldHead = await store.readHead();
    const staged = changedRoot(1);
    let escapedWriter: BrightDbV2DiskWriter | undefined;
    await expect(
      store.withWriteLock(async (writer) => {
        escapedWriter = writer;
        await writer.writeBlock(staged);
        throw new Error('before publishing');
      }),
    ).rejects.toThrow('before publishing');

    const reopened = await BrightDbV2DiskStore.open(path);
    expect(await reopened.readHead()).toBe(oldHead);
    expect(await reopened.readBlock(digestOf(staged))).toEqual(staged);
    await expect(escapedWriter?.publishHead(digestOf(staged))).rejects.toThrow(
      'scope has ended',
    );
    await reopened.withWriteLock(async (writer) => {
      await writer.publishHead(await writer.writeBlock(staged));
    });
    expect(await (await BrightDbV2DiskStore.open(path)).readHead()).toBe(
      digestOf(staged),
    );
  });

  it('serializes independent writers and gives the next writer the published head', async () => {
    const first = await BrightDbV2DiskStore.create(path, initialRoot);
    const second = await BrightDbV2DiskStore.open(path);
    const staged = changedRoot(1);
    let releaseFirst: () => void = () => undefined;
    const continueFirst = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let signalFirstEntered: () => void = () => undefined;
    const firstEntered = new Promise<void>((resolve) => {
      signalFirstEntered = resolve;
    });

    const commitFirst = first.withWriteLock(async (writer) => {
      signalFirstEntered();
      await continueFirst;
      await writer.publishHead(await writer.writeBlock(staged));
    });
    await firstEntered;
    let secondEntered = false;
    const commitSecond = second.withWriteLock(async () => {
      secondEntered = true;
      expect(await second.readHead()).toBe(digestOf(staged));
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    try {
      expect(secondEntered).toBe(false);
    } finally {
      releaseFirst();
      await Promise.all([commitFirst, commitSecond]);
    }
    expect(secondEntered).toBe(true);
  });

  it('reports missing and corrupt blocks and refuses to reuse a corrupt block', async () => {
    const store = await BrightDbV2DiskStore.create(path, initialRoot);
    const digest = await store.readHead();
    const blockPath = join(path, 'blocks', digest.slice(0, 2), digest);
    await writeFile(blockPath, changedRoot(1));

    await expect(store.readBlock(digest)).rejects.toThrow('digest mismatch');
    await expect(
      store.withWriteLock((writer) => writer.writeBlock(initialRoot)),
    ).rejects.toThrow('digest mismatch');
    await rm(blockPath);
    await expect(BrightDbV2DiskStore.open(path)).rejects.toBeInstanceOf(
      BrightDbV2MissingBlockError,
    );
  });
  it('orders a block batch before head publication and drains parallel writes on failure', async () => {
    const store = await BrightDbV2DiskStore.create(path, initialRoot);
    const staged = changedRoot(1);
    await store.withWriteLock(async (writer) => {
      await Promise.all([
        writer.writeBlocks([staged, staged]),
        writer.publishHead(digestOf(staged)),
      ]);
    });
    expect(await store.readHead()).toBe(digestOf(staged));

    const other = changedRoot(2);
    await expect(
      store.withWriteLock(async (writer) => {
        await Promise.all([
          writer.writeBlocks([Buffer.alloc(0), other]),
          writer.publishHead(digestOf(other)),
        ]);
      }),
    ).rejects.toThrow('format limits');
    expect(await store.readHead()).toBe(digestOf(staged));
    expect(await store.readBlock(digestOf(other))).toEqual(other);
  });
});
