import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { constants } from 'node:fs';
import {
  link,
  lstat,
  mkdir,
  mkdtemp,
  open,
  readdir,
  rename,
  rm,
  unlink,
} from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import './node-hash';
import { digestPayload, MAX_DOCUMENT_BYTES } from './codec';
import {
  BrightDbV2CommitOutcomeUnknownError,
  BrightDbV2MissingBlockError,
  BrightDbV2StorageError,
  type BrightDbV2DiskWriter,
  type BrightDbV2Storage,
} from './storage';

// Re-exported so existing imports from this module keep working.
export {
  BrightDbV2CommitOutcomeUnknownError,
  BrightDbV2MissingBlockError,
  BrightDbV2StorageError,
  type BrightDbV2DiskWriter,
  type BrightDbV2Storage,
};
import {
  BrightDbV2DecryptionError,
  ENCRYPTION_MARKER,
  SEAL_OVERHEAD,
  type BrightDbV2BlockCipher,
} from './encryption';

const FORMAT = 'BrightDB storage 2\n';
const BLOCK_WRITE_CONCURRENCY = 16;
const DIGEST_LENGTH = 128;
const WRITER_ID_LENGTH = 16;
const HEX = /^[0-9a-f]+$/;

class UninitializedStoreError extends BrightDbV2StorageError {}
class StoreExistsError extends BrightDbV2StorageError {}

function isErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}

function isHex(value: string, length: number): boolean {
  return value.length === length && HEX.test(value);
}

function assertDigest(digest: string): void {
  if (!isHex(digest, DIGEST_LENGTH)) {
    throw new BrightDbV2StorageError('Invalid BrightDB v2 block digest');
  }
}

function assertWriterId(writerId: Uint8Array): void {
  if (
    writerId.byteLength !== WRITER_ID_LENGTH ||
    writerId.every((byte) => byte === 0)
  ) {
    throw new BrightDbV2StorageError(
      'BrightDB v2 requires a nonzero 16-byte writer ID',
    );
  }
}

async function readBoundedFile(path: string, maximum: number): Promise<Buffer> {
  const file = await open(
    path,
    constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
  );
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size < 1 || stat.size > maximum) {
      throw new BrightDbV2StorageError(`Invalid BrightDB v2 file: ${path}`);
    }
    const bytes = await file.readFile();
    if (bytes.byteLength !== stat.size) {
      throw new BrightDbV2StorageError(
        `BrightDB v2 file changed while reading: ${path}`,
      );
    }
    return bytes;
  } finally {
    await file.close();
  }
}

async function readHexLine(path: string, length: number): Promise<string> {
  const text = (await readBoundedFile(path, length + 1)).toString('latin1');
  const value = text.slice(0, -1);
  if (!text.endsWith('\n') || !isHex(value, length)) {
    throw new BrightDbV2StorageError(`Invalid BrightDB v2 record: ${path}`);
  }
  return value;
}

async function writeSyncedFile(
  path: string,
  bytes: string | Uint8Array,
): Promise<void> {
  const file = await open(path, 'wx', 0o600);
  try {
    await file.writeFile(bytes);
    await file.sync();
  } finally {
    await file.close();
  }
}

async function syncDirectory(path: string): Promise<void> {
  const directory = await open(
    path,
    constants.O_RDONLY | constants.O_DIRECTORY,
  );
  try {
    await directory.sync();
  } finally {
    await directory.close();
  }
}

async function requireDirectory(path: string): Promise<void> {
  if (!(await lstat(path)).isDirectory()) {
    throw new BrightDbV2StorageError(
      `Expected a BrightDB v2 directory: ${path}`,
    );
  }
}

function temporaryPath(directory: string): string {
  return join(directory, `.brightdb-${randomBytes(12).toString('hex')}.tmp`);
}

function runFlock(command: string, args: string[], fd: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const helper = spawn(command, args, {
      stdio: ['ignore', 'ignore', 'pipe', fd],
    });
    let stderr = '';
    helper.stderr?.setEncoding('utf8').on('data', (chunk: string) => {
      stderr += chunk;
    });
    helper.once('error', reject);
    helper.once('close', (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new BrightDbV2StorageError(
            `Could not acquire the BrightDB v2 write lock (${signal ?? code}): ${stderr.trim()}`,
          ),
        );
      }
    });
  });
}

async function flockExclusive(fd: number): Promise<void> {
  if (process.platform === 'win32') {
    throw new BrightDbV2StorageError(
      'The BrightDB v2 disk profile requires POSIX flock',
    );
  }
  // Both helpers flock descriptor 3, which shares Node's open file description.
  // The lock remains held after the helper exits, until Node closes its handle.
  if (process.platform === 'linux') {
    try {
      await runFlock('flock', ['-x', '3'], fd);
      return;
    } catch (error) {
      if (!isErrorCode(error, 'ENOENT')) throw error;
    }
  }
  const script =
    'open(my $file, q(+<&=3)) or die "fd 3: $!"; ' +
    'flock($file, 2) or die "flock: $!";';
  try {
    await runFlock('/usr/bin/perl', ['-e', script], fd);
  } catch (error) {
    if (!isErrorCode(error, 'ENOENT')) throw error;
    throw new BrightDbV2StorageError(
      'BrightDB v2 writes require the flock command on Linux or system Perl with POSIX flock',
      { cause: error },
    );
  }
}

/** Durable, content-addressed storage using the BrightDB v2 POSIX disk profile. */
export class BrightDbV2DiskStore implements BrightDbV2Storage {
  private readonly blocksPath: string;

  private constructor(
    readonly path: string,
    private readonly localWriterId: Uint8Array,
    /** Present when blocks are encrypted at rest. */
    readonly cipher: BrightDbV2BlockCipher | null = null,
  ) {
    this.blocksPath = join(path, 'blocks');
  }

  /** The directory and file name a logical digest is stored under. */
  private blockLocation(digest: string): { directory: string; file: string } {
    const name = this.cipher ? this.cipher.physicalName(digest) : digest;
    return { directory: join(this.blocksPath, name.slice(0, 2)), file: name };
  }

  get writerId(): Uint8Array {
    return Uint8Array.from(this.localWriterId);
  }

  get encryptsAtRest(): boolean {
    return this.cipher !== null;
  }

  static async open(
    path: string,
    cipher: BrightDbV2BlockCipher | null = null,
  ): Promise<BrightDbV2DiskStore> {
    const directory = resolve(path);
    try {
      await requireDirectory(directory);
    } catch (error) {
      if (!isErrorCode(error, 'ENOENT')) throw error;
      throw new UninitializedStoreError(
        `BrightDB v2 directory does not exist: ${directory}`,
      );
    }

    const formatPath = join(directory, 'FORMAT');
    let marker: Buffer;
    try {
      marker = await readBoundedFile(formatPath, FORMAT.length);
    } catch (error) {
      if (isErrorCode(error, 'ENOENT')) {
        const entries = await readdir(directory);
        if (entries.length === 0) {
          throw new UninitializedStoreError(
            `BrightDB v2 directory is empty: ${directory}`,
          );
        }
        if (entries.includes('FORMAT')) {
          // An initializer may have replaced the previously empty directory
          // while this process was trying to read the marker.
          return this.open(directory, cipher);
        }
      }
      throw new BrightDbV2StorageError(
        `Unsupported or incomplete BrightDB store: ${directory}`,
        {
          cause: error,
        },
      );
    }
    if (marker.toString('latin1') !== FORMAT) {
      throw new BrightDbV2StorageError(
        `Unsupported BrightDB storage format: ${directory}`,
      );
    }

    const id = await readHexLine(
      join(directory, 'WRITER'),
      WRITER_ID_LENGTH * 2,
    );
    const writerId = Buffer.from(id, 'hex');
    assertWriterId(writerId);
    let encrypted = true;
    try {
      const marker = await readBoundedFile(
        join(directory, 'ENCRYPTION'),
        ENCRYPTION_MARKER.length,
      );
      if (marker.toString('latin1') !== ENCRYPTION_MARKER) {
        throw new BrightDbV2StorageError(
          `Unsupported BrightDB encryption profile: ${directory}`,
        );
      }
    } catch (error) {
      if (!isErrorCode(error, 'ENOENT')) throw error;
      encrypted = false;
    }
    if (encrypted && !cipher) {
      throw new BrightDbV2StorageError(
        `BrightDB directory is encrypted; open it with an encryption key: ${directory}`,
      );
    }
    if (!encrypted && cipher) {
      throw new BrightDbV2StorageError(
        `BrightDB directory is not encrypted; open it without an encryption key: ${directory}`,
      );
    }
    const store = new BrightDbV2DiskStore(directory, writerId, cipher);
    await requireDirectory(store.blocksPath);
    if (!(await lstat(join(directory, 'LOCK'))).isFile()) {
      throw new BrightDbV2StorageError(
        `Invalid BrightDB v2 lock file: ${directory}`,
      );
    }
    await store.readBlock(await store.readHead());
    return store;
  }

  static async create(
    path: string,
    initialRoot: Uint8Array,
    writerId: Uint8Array = randomBytes(WRITER_ID_LENGTH),
    cipher: BrightDbV2BlockCipher | null = null,
  ): Promise<BrightDbV2DiskStore> {
    const directory = resolve(path);
    const id = Uint8Array.from(writerId);
    assertWriterId(id);
    const root = Buffer.from(initialRoot);
    const parent = dirname(directory);
    const createdParent = await mkdir(parent, { recursive: true });
    const stage = await mkdtemp(join(parent, '.brightdb-init-'));
    try {
      const store = new BrightDbV2DiskStore(stage, id, cipher);
      await mkdir(store.blocksPath, { mode: 0o700 });
      await writeSyncedFile(join(stage, 'LOCK'), '');
      await writeSyncedFile(
        join(stage, 'WRITER'),
        `${Buffer.from(id).toString('hex')}\n`,
      );
      if (cipher) await writeSyncedFile(join(stage, 'ENCRYPTION'), ENCRYPTION_MARKER);
      await writeSyncedFile(join(stage, 'FORMAT'), FORMAT);
      const dirty = new Set<string>();
      const head = await store.installBlock(root, dirty);
      await store.publishHead(head, dirty);

      // POSIX rename can replace an empty directory, but cannot replace a
      // nonempty target. A racing initializer therefore cannot replace a winner.
      try {
        await rename(stage, directory);
      } catch (error) {
        if (isErrorCode(error, 'EEXIST') || isErrorCode(error, 'ENOTEMPTY')) {
          throw new StoreExistsError(
            `BrightDB directory is not empty: ${directory}`,
            {
              cause: error,
            },
          );
        }
        throw error;
      }
      await syncDirectory(parent);
      if (createdParent !== undefined) {
        const existingAncestor = dirname(createdParent);
        for (let ancestor = dirname(parent); ; ancestor = dirname(ancestor)) {
          await syncDirectory(ancestor);
          if (ancestor === existingAncestor) break;
        }
      }
      return new BrightDbV2DiskStore(directory, id, cipher);
    } finally {
      await rm(stage, { recursive: true, force: true });
    }
  }

  static async openOrCreate(
    path: string,
    initialRoot: Uint8Array,
    writerId?: Uint8Array,
    cipher: BrightDbV2BlockCipher | null = null,
  ): Promise<BrightDbV2DiskStore> {
    try {
      return await this.open(path, cipher);
    } catch (error) {
      if (!(error instanceof UninitializedStoreError)) throw error;
    }
    try {
      return await this.create(path, initialRoot, writerId, cipher);
    } catch (error) {
      if (!(error instanceof StoreExistsError)) throw error;
      return this.open(path, cipher);
    }
  }

  async readHead(): Promise<string> {
    if (!this.cipher) return readHexLine(join(this.path, 'HEAD'), DIGEST_LENGTH);
    const sealed = await readBoundedFile(join(this.path, 'HEAD'), this.cipher.sealedHeadBytes);
    try {
      return this.cipher.openHead(sealed);
    } catch (error) {
      if (error instanceof BrightDbV2DecryptionError) {
        throw new BrightDbV2StorageError(`Cannot decrypt HEAD: ${error.message}`, { cause: error });
      }
      throw error;
    }
  }

  async readBlock(digest: string): Promise<Uint8Array> {
    assertDigest(digest);
    const { directory, file } = this.blockLocation(digest);
    let bytes: Buffer;
    try {
      bytes = await readBoundedFile(
        join(directory, file),
        MAX_DOCUMENT_BYTES + (this.cipher ? SEAL_OVERHEAD : 0),
      );
    } catch (error) {
      if (!isErrorCode(error, 'ENOENT')) throw error;
      throw new BrightDbV2MissingBlockError(digest, { cause: error });
    }
    if (this.cipher) {
      try {
        bytes = this.cipher.open(digest, bytes);
      } catch (error) {
        if (error instanceof BrightDbV2DecryptionError) {
          throw new BrightDbV2StorageError(
            `BrightDB v2 block cannot be decrypted: ${digest} (${error.message})`,
            { cause: error },
          );
        }
        throw error;
      }
    }
    if (digestPayload(bytes) !== digest) {
      throw new BrightDbV2StorageError(
        `BrightDB v2 block digest mismatch: ${digest}`,
      );
    }
    return bytes;
  }

  async withWriteLock<T>(
    write: (writer: BrightDbV2DiskWriter) => Promise<T>,
  ): Promise<T> {
    const file = await open(
      join(this.path, 'LOCK'),
      constants.O_RDWR | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
    try {
      if (!(await file.stat()).isFile()) {
        throw new BrightDbV2StorageError(
          `Invalid BrightDB v2 lock file: ${this.path}`,
        );
      }
      await flockExclusive(file.fd);
      const dirty = new Set<string>();
      let active = true;
      let pending: Promise<unknown> = Promise.resolve();
      const run = <R>(operation: () => Promise<R>): Promise<R> => {
        if (!active) {
          return Promise.reject(
            new BrightDbV2StorageError(
              'BrightDB v2 write lock scope has ended',
            ),
          );
        }
        const next = pending.then(operation);
        pending = next;
        // Keep a handler on every operation in case the callback exits while it
        // is pending. A failed operation prevents any queued publication.
        void next.catch(() => undefined);
        return next;
      };
      try {
        const result = await write({
          writeBlock: (payload) => {
            const bytes = Buffer.from(payload);
            return run(() => this.installBlock(bytes, dirty));
          },
          writeBlocks: (payloads) =>
            run(() => this.installBlocks(payloads, dirty)),
          syncBlocks: () => run(() => this.syncBlocks(dirty)),
          publishHead: (digest) => run(() => this.publishHead(digest, dirty)),
        });
        active = false;
        await pending;
        return result;
      } finally {
        active = false;
        await pending.catch(() => undefined);
      }
    } finally {
      await file.close();
    }
  }

  private async installBlocks(
    payloads: Iterable<Uint8Array>,
    dirty: Set<string>,
  ): Promise<void> {
    const batch: Buffer[] = [];
    for (const payload of payloads) {
      batch.push(Buffer.from(payload));
      if (batch.length === BLOCK_WRITE_CONCURRENCY) {
        await this.installBatch(batch, dirty);
        batch.length = 0;
      }
    }
    await this.installBatch(batch, dirty);
  }

  private async installBatch(
    batch: Buffer[],
    dirty: Set<string>,
  ): Promise<void> {
    const results = await Promise.allSettled(
      batch.map((bytes) => this.installBlock(bytes, dirty)),
    );
    for (const result of results) {
      if (result.status === 'rejected') throw result.reason;
    }
  }

  private async installBlock(
    bytes: Buffer,
    dirty: Set<string>,
  ): Promise<string> {
    if (bytes.byteLength < 1 || bytes.byteLength > MAX_DOCUMENT_BYTES) {
      throw new BrightDbV2StorageError(
        'BrightDB v2 block payload exceeds format limits',
      );
    }
    const digest = digestPayload(bytes);
    const { directory, file } = this.blockLocation(digest);
    try {
      await this.readBlock(digest);
      dirty.add(directory);
      return digest;
    } catch (error) {
      if (!(error instanceof BrightDbV2MissingBlockError)) throw error;
    }

    try {
      await mkdir(directory, { mode: 0o700 });
    } catch (error) {
      if (!isErrorCode(error, 'EEXIST')) throw error;
      await requireDirectory(directory);
    }
    const temporary = temporaryPath(directory);
    try {
      await writeSyncedFile(temporary, this.cipher ? this.cipher.seal(digest, bytes) : bytes);
      try {
        await link(temporary, join(directory, file));
      } catch (error) {
        if (!isErrorCode(error, 'EEXIST')) throw error;
      }
      await this.readBlock(digest);
    } finally {
      await rm(temporary, { force: true });
    }
    dirty.add(directory);
    return digest;
  }

  private async syncBlocks(dirty: Set<string>): Promise<void> {
    for (const directory of dirty) {
      await syncDirectory(directory);
    }
    await syncDirectory(this.blocksPath);
    dirty.clear();
  }

  /** The file name a logical digest is stored under (the digest itself, or its keyed name when encrypted). */
  fileNameOf(digest: string): string {
    return this.blockLocation(digest).file;
  }

  /** Every file under blocks/, including leftover temporary files, with size and modification time. */
  async listBlockFiles(): Promise<Array<{ name: string; bytes: number; modifiedMs: number }>> {
    const out: Array<{ name: string; bytes: number; modifiedMs: number }> = [];
    for (const prefix of await readdir(this.blocksPath)) {
      const directory = join(this.blocksPath, prefix);
      for (const name of await readdir(directory)) {
        const stat = await lstat(join(directory, name));
        if (stat.isFile()) out.push({ name, bytes: stat.size, modifiedMs: stat.mtimeMs });
      }
    }
    return out;
  }

  /** Remove one block file by its on-disk name. The caller must hold the write lock. */
  async deleteBlockFile(name: string): Promise<void> {
    const directory = join(this.blocksPath, name.startsWith('.') ? '' : name.slice(0, 2));
    if (name.startsWith('.')) {
      // A leftover temporary file may sit in any prefix directory.
      for (const prefix of await readdir(this.blocksPath)) {
        await unlink(join(this.blocksPath, prefix, name)).catch(() => undefined);
      }
      return;
    }
    if (!/^[0-9a-f]{128}$/u.test(name)) {
      throw new BrightDbV2StorageError('Invalid block file name');
    }
    await unlink(join(directory, name));
  }

  /**
   * Re-encrypt one block under the cipher's current data key, replacing the file
   * atomically (temporary file, fsync, rename). The name does not change. Returns
   * whether the block was rewritten. The caller must hold the write lock.
   */
  async resealBlock(digest: string): Promise<boolean> {
    assertDigest(digest);
    if (!this.cipher) throw new BrightDbV2StorageError('Re-sealing needs an encrypted store');
    const { directory, file } = this.blockLocation(digest);
    const path = join(directory, file);
    const sealed = await readBoundedFile(path, MAX_DOCUMENT_BYTES + SEAL_OVERHEAD);
    const next = this.cipher.reseal(digest, sealed);
    if (next === null) return false;
    const temporary = temporaryPath(directory);
    try {
      await writeSyncedFile(temporary, next);
      await rename(temporary, path);
      await syncDirectory(directory);
    } catch (error) {
      await unlink(temporary).catch(() => undefined);
      throw error;
    }
    await this.readBlock(digest); // verify the new file decrypts to the right digest
    return true;
  }

  get isEncrypted(): boolean {
    return this.cipher !== null;
  }

  /** Whether a block is sealed with an older data key than the current one. */
  async needsReseal(digest: string): Promise<boolean> {
    assertDigest(digest);
    if (!this.cipher) return false;
    const { directory, file } = this.blockLocation(digest);
    const sealed = await readBoundedFile(join(directory, file), MAX_DOCUMENT_BYTES + SEAL_OVERHEAD);
    return sealed[0] !== this.cipher.currentKeyVersion;
  }

  /** Whether HEAD is sealed with an older data key than the current one. */
  async headNeedsReseal(): Promise<boolean> {
    if (!this.cipher) return false;
    const sealed = await readBoundedFile(join(this.path, 'HEAD'), this.cipher.sealedHeadBytes);
    return sealed[0] !== this.cipher.currentKeyVersion;
  }

  /** Whether a block file exists. It does not read or verify the block. */
  async hasBlock(digest: string): Promise<boolean> {
    assertDigest(digest);
    try {
      const { directory, file } = this.blockLocation(digest);
      const stat = await lstat(join(directory, file));
      return stat.isFile();
    } catch (error) {
      if (isErrorCode(error, 'ENOENT')) return false;
      throw error;
    }
  }

  private async publishHead(digest: string, dirty: Set<string>): Promise<void> {
    await this.readBlock(digest);
    dirty.add(this.blockLocation(digest).directory);
    await this.syncBlocks(dirty);

    const temporary = temporaryPath(this.path);
    try {
      await writeSyncedFile(
        temporary,
        this.cipher ? this.cipher.sealHead(digest) : `${digest}\n`,
      );
      await rename(temporary, join(this.path, 'HEAD'));
      try {
        await syncDirectory(this.path);
      } catch (error) {
        throw new BrightDbV2CommitOutcomeUnknownError(
          'BrightDB v2 head was replaced but directory sync failed; reopen to determine the commit outcome',
          { cause: error },
        );
      }
    } catch (error) {
      await unlink(temporary).catch(() => undefined);
      throw error;
    }
  }
}
