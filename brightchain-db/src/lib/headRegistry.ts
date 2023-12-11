import { DriverBackedHeadRegistry } from '@brightchain/brightchain-lib';
import { promises as fs } from 'fs';
import { join } from 'path';
import { FileHeadRegistryDriver } from './fileHeadRegistryDriver';

// Re-export InMemoryHeadRegistry from brightchain-lib for backward compatibility
export { InMemoryHeadRegistry } from '@brightchain/brightchain-lib/lib/db/inMemoryHeadRegistry';

/**
 * Options for creating a PersistentHeadRegistry.
 */
export interface HeadRegistryOptions {
  /** Path to the directory where the registry data is stored */
  dataDir: string;
  /**
   * @deprecated No longer used. Previously controlled the monolithic JSON
   * file name. Per-key storage is now used; this option is accepted but
   * ignored to preserve backward-compatibility with existing call sites.
   */
  fileName?: string;
}

/**
 * Persistent HeadRegistry backed by per-key JSON files via FileHeadRegistryDriver.
 *
 * Each (dbName, collectionName) pair is stored as an independent file under
 * `<dataDir>/__heads/`.  Writes are O(1) per key — there is no global lock
 * and no full-collection rewrite.
 *
 * If the old monolithic `head-registry.json` is found in `dataDir` on the
 * first `load()`, its contents are migrated to per-key files and then the
 * old file is renamed to `head-registry.json.migrated` so it is not loaded
 * again.
 */
export class PersistentHeadRegistry extends DriverBackedHeadRegistry {
  private readonly dataDir: string;
  private readonly legacyFilePath: string;

  constructor(options: HeadRegistryOptions) {
    const driver = new FileHeadRegistryDriver({
      dir: join(options.dataDir, '__heads'),
    });
    super(driver);
    this.dataDir = options.dataDir;
    this.legacyFilePath = join(options.dataDir, 'head-registry.json');
  }

  /** Load per-key files, migrating the legacy monolithic file if present. */
  override async load(): Promise<void> {
    await this.migrateLegacyFile();
    await super.load();
  }

  /**
   * If the legacy single-JSON registry file exists, read all entries from it,
   * write them as individual per-key files via the driver, then rename the
   * old file to `.migrated` so it is not processed again.
   */
  private async migrateLegacyFile(): Promise<void> {
    let content: string;
    try {
      content = await fs.readFile(this.legacyFilePath, 'utf-8');
    } catch (err: unknown) {
      const error = err as NodeJS.ErrnoException;
      if (error.code === 'ENOENT') {
        return; // Nothing to migrate
      }
      throw error;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.warn(
        `[PersistentHeadRegistry] Legacy file is not valid JSON, skipping migration: ${this.legacyFilePath}`,
      );
      return;
    }

    if (
      parsed === null ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed)
    ) {
      console.warn(
        `[PersistentHeadRegistry] Legacy file is not a JSON object, skipping migration: ${this.legacyFilePath}`,
      );
      return;
    }

    const record = parsed as Record<string, unknown>;
    const migrations: Array<Promise<void>> = [];

    for (const [key, value] of Object.entries(record)) {
      if (typeof value === 'string') {
        // Legacy plain-blockId format
        migrations.push(
          this.getDriver().writeRecord(key, {
            blockId: value,
            timestamp: new Date(0).toISOString(),
          }),
        );
      } else if (
        value !== null &&
        typeof value === 'object' &&
        'blockId' in value &&
        typeof (value as Record<string, unknown>)['blockId'] === 'string'
      ) {
        const entry = value as Record<string, unknown>;
        const ts =
          typeof entry['timestamp'] === 'string'
            ? entry['timestamp']
            : new Date(0).toISOString();
        migrations.push(
          this.getDriver().writeRecord(key, {
            blockId: entry['blockId'] as string,
            timestamp: ts,
          }),
        );
      }
    }

    await Promise.all(migrations);

    // Rename the old file so it is not migrated again
    try {
      await fs.rename(this.legacyFilePath, this.legacyFilePath + '.migrated');
    } catch {
      // Non-fatal: the driver-backed files are the source of truth now
    }

    console.info(
      `[PersistentHeadRegistry] Migrated ${migrations.length} entries from legacy file: ${this.legacyFilePath}`,
    );
  }

  /**
   * Expose the driver so the migration step can call writeRecord.
   * @internal
   */
  private getDriver(): FileHeadRegistryDriver {
    // DriverBackedHeadRegistry exposes driver as protected — cast is safe
    // because we always construct with a FileHeadRegistryDriver.
    return this.driver as FileHeadRegistryDriver;
  }

  /** Factory method for test isolation. */
  static create(options: HeadRegistryOptions): PersistentHeadRegistry {
    return new PersistentHeadRegistry(options);
  }
}
