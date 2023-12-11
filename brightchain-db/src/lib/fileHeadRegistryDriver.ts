import type {
  HeadRecord,
  IHeadRegistryDriver,
} from '@brightchain/brightchain-lib';
import { promises as fs } from 'fs';
import { dirname, join } from 'path';

/**
 * FileHeadRegistryDriver — one JSON file per key, atomic tmp+rename writes.
 *
 * Files are stored in a two-level hierarchy to avoid filesystem scalability
 * problems with large databases:
 *
 *   <dir>/<encodedDbName>/<encodedCollName>.json
 *
 * Each database gets its own subdirectory; within that directory there is one
 * file per collection.  Per-db subdirs are created lazily on first write.
 * There is no global lock — concurrent writes to different keys are fully
 * independent.  Atomicity per key is achieved by writing to a `.tmp` sibling
 * and then renaming it over the target.
 *
 * Key format:  `"dbName:collectionName"`
 * Segment encoding: ASCII non-`[a-z0-9.-]` → `_pc_<lowercase hex>`; non-ASCII
 * via `encodeURIComponent` with `%HH` rewritten to `_pc_<lowercase hh>`.
 * The encoded form is lowercase-only so keys differing only in letter case
 * round-trip correctly on case-insensitive filesystems (APFS, NTFS).
 */
export class FileHeadRegistryDriver implements IHeadRegistryDriver {
  private readonly dir: string;
  private dirReady: Promise<void> | undefined;

  constructor(options: { dir: string }) {
    this.dir = options.dir;
  }

  /** Ensure the top-level directory exists (runs at most once). */
  private ensureDir(): Promise<void> {
    if (!this.dirReady) {
      this.dirReady = fs
        .mkdir(this.dir, { recursive: true })
        .then(() => undefined);
    }
    return this.dirReady;
  }

  /**
   * Encode a single name segment (dbName or collectionName) for filesystem use.
   *
   * The encoded form is restricted to `[a-z0-9._-]` plus the escape prefix
   * `_pc_<lowercase-hex>`, so it is safe on case-insensitive filesystems
   * (APFS default on macOS, NTFS by default on Windows). Without this,
   * keys differing only in case (e.g. `"E:a"` vs `"e:a"`) would collide
   * and silently overwrite each other on disk.
   *
   * Encoding rules:
   *   - ASCII chars not in `[a-z0-9.-]` (including uppercase letters and
   *     `_`) are emitted as `_pc_HH` where `HH` is the lowercase 2-digit
   *     hex of the code point.
   *   - Non-ASCII chars are passed through `encodeURIComponent` and the
   *     resulting `%HH` escapes are rewritten to `_pc_<lowercase hh>`.
   */
  private encodeSegment(segment: string): string {
    return segment.replace(/[^a-z0-9.\-]/g, (c) => {
      const code = c.charCodeAt(0);
      if (code < 128) {
        return '_pc_' + code.toString(16).padStart(2, '0');
      }
      return encodeURIComponent(c).replace(
        /%([0-9A-Fa-f]{2})/g,
        (_m, hex: string) => '_pc_' + hex.toLowerCase(),
      );
    });
  }

  /** Decode an encoded path segment back to the original name. */
  private decodeSegment(encoded: string): string {
    return decodeURIComponent(
      encoded.replace(/_pc_([0-9a-f]{2})/gi, (_m, hex: string) => '%' + hex),
    );
  }

  /**
   * Convert a registry key ("dbName:collectionName") to an absolute file path.
   * Layout: <dir>/<encodedDbName>/<encodedCollName>.json
   */
  private keyToPath(key: string): string {
    const colon = key.indexOf(':');
    const dbName = colon === -1 ? key : key.slice(0, colon);
    const collName = colon === -1 ? '' : key.slice(colon + 1);
    return join(
      this.dir,
      this.encodeSegment(dbName),
      this.encodeSegment(collName) + '.json',
    );
  }

  /** Reconstruct the registry key from encoded directory name and file basename. */
  private pathToKey(encodedDb: string, encodedColl: string): string {
    return `${this.decodeSegment(encodedDb)}:${this.decodeSegment(encodedColl)}`;
  }

  async readRecord(key: string): Promise<HeadRecord | null> {
    await this.ensureDir();
    const filePath = this.keyToPath(key);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed: unknown = JSON.parse(content);
      if (
        parsed !== null &&
        typeof parsed === 'object' &&
        'blockId' in parsed &&
        typeof (parsed as Record<string, unknown>)['blockId'] === 'string' &&
        'timestamp' in parsed &&
        typeof (parsed as Record<string, unknown>)['timestamp'] === 'string'
      ) {
        return parsed as HeadRecord;
      }
      return null;
    } catch (err: unknown) {
      const error = err as NodeJS.ErrnoException;
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async writeRecord(key: string, record: HeadRecord): Promise<void> {
    await this.ensureDir();
    const filePath = this.keyToPath(key);
    await fs.mkdir(dirname(filePath), { recursive: true });
    const tmpPath = filePath + '.tmp';
    await fs.writeFile(tmpPath, JSON.stringify(record), 'utf-8');
    await fs.rename(tmpPath, filePath);
  }

  async deleteRecord(key: string): Promise<void> {
    await this.ensureDir();
    const filePath = this.keyToPath(key);
    try {
      await fs.unlink(filePath);
    } catch (err: unknown) {
      const error = err as NodeJS.ErrnoException;
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async listKeys(): Promise<string[]> {
    await this.ensureDir();
    let dbDirs: string[];
    try {
      dbDirs = await fs.readdir(this.dir);
    } catch {
      return [];
    }
    const keys: string[] = [];
    await Promise.all(
      dbDirs.map(async (encodedDb) => {
        const dbPath = join(this.dir, encodedDb);
        let stat: import('fs').Stats;
        try {
          stat = await fs.stat(dbPath);
        } catch {
          return;
        }
        if (!stat.isDirectory()) return;
        let files: string[];
        try {
          files = await fs.readdir(dbPath);
        } catch {
          return;
        }
        for (const file of files) {
          if (file.endsWith('.json') && !file.endsWith('.tmp.json')) {
            keys.push(this.pathToKey(encodedDb, file.slice(0, -5)));
          }
        }
      }),
    );
    return keys;
  }
}
