/**
 * PersistentHeadRegistry – unit tests.
 *
 * Validates that the PersistentHeadRegistry correctly implements
 * the IHeadRegistry interface with write-through disk persistence,
 * file-level locking, and graceful handling of corrupt/missing files.
 */

import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  HeadRegistryOptions,
  PersistentHeadRegistry,
} from '../lib/headRegistry';

/** Create a unique temp directory for each test */
async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(join(tmpdir(), 'phr-test-'));
}

/** Clean up a temp directory */
async function cleanupDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
}

describe('PersistentHeadRegistry', () => {
  let dataDir: string;

  beforeEach(async () => {
    dataDir = await makeTempDir();
  });

  afterEach(async () => {
    await cleanupDir(dataDir);
  });

  function createRegistry(
    opts?: Partial<HeadRegistryOptions>,
  ): PersistentHeadRegistry {
    return PersistentHeadRegistry.create({ dataDir, ...opts });
  }

  describe('getHead / setHead', () => {
    it('should return undefined for an unset head', () => {
      const reg = createRegistry();
      expect(reg.getHead('db1', 'col1')).toBeUndefined();
    });

    it('should return the block ID after setHead', async () => {
      const reg = createRegistry();
      await reg.setHead('db1', 'col1', 'block-abc');
      expect(reg.getHead('db1', 'col1')).toBe('block-abc');
    });

    it('should overwrite an existing head', async () => {
      const reg = createRegistry();
      await reg.setHead('db1', 'col1', 'block-1');
      await reg.setHead('db1', 'col1', 'block-2');
      expect(reg.getHead('db1', 'col1')).toBe('block-2');
    });

    it('should isolate heads by dbName and collectionName', async () => {
      const reg = createRegistry();
      await reg.setHead('db1', 'col1', 'block-a');
      await reg.setHead('db1', 'col2', 'block-b');
      await reg.setHead('db2', 'col1', 'block-c');

      expect(reg.getHead('db1', 'col1')).toBe('block-a');
      expect(reg.getHead('db1', 'col2')).toBe('block-b');
      expect(reg.getHead('db2', 'col1')).toBe('block-c');
    });
  });

  describe('removeHead', () => {
    it('should remove an existing head', async () => {
      const reg = createRegistry();
      await reg.setHead('db1', 'col1', 'block-abc');
      await reg.removeHead('db1', 'col1');
      expect(reg.getHead('db1', 'col1')).toBeUndefined();
    });

    it('should not throw when removing a non-existent head', async () => {
      const reg = createRegistry();
      await expect(
        reg.removeHead('db1', 'nonexistent'),
      ).resolves.toBeUndefined();
    });

    it('should not affect other heads', async () => {
      const reg = createRegistry();
      await reg.setHead('db1', 'col1', 'block-a');
      await reg.setHead('db1', 'col2', 'block-b');
      await reg.removeHead('db1', 'col1');

      expect(reg.getHead('db1', 'col1')).toBeUndefined();
      expect(reg.getHead('db1', 'col2')).toBe('block-b');
    });
  });

  describe('clear', () => {
    it('should remove all heads', async () => {
      const reg = createRegistry();
      await reg.setHead('db1', 'col1', 'block-a');
      await reg.setHead('db2', 'col2', 'block-b');
      await reg.clear();

      expect(reg.getHead('db1', 'col1')).toBeUndefined();
      expect(reg.getHead('db2', 'col2')).toBeUndefined();
    });

    it('should not throw on an empty registry', async () => {
      const reg = createRegistry();
      await expect(reg.clear()).resolves.toBeUndefined();
    });

    it('should persist the empty state to disk', async () => {
      const reg = createRegistry();
      await reg.setHead('db1', 'col1', 'block-a');
      await reg.clear();

      // Load a fresh instance — should be empty
      const reg2 = createRegistry();
      await reg2.load();
      expect(reg2.getAllHeads().size).toBe(0);
    });
  });

  describe('getAllHeads', () => {
    it('should return an empty map when no heads are set', () => {
      const reg = createRegistry();
      const heads = reg.getAllHeads();
      expect(heads.size).toBe(0);
    });

    it('should return all heads with composite keys', async () => {
      const reg = createRegistry();
      await reg.setHead('db1', 'col1', 'block-a');
      await reg.setHead('db2', 'col2', 'block-b');

      const heads = reg.getAllHeads();
      expect(heads.size).toBe(2);
      expect(heads.get('db1:col1')).toBe('block-a');
      expect(heads.get('db2:col2')).toBe('block-b');
    });

    it('should return a copy (mutations do not affect the registry)', async () => {
      const reg = createRegistry();
      await reg.setHead('db1', 'col1', 'block-a');
      const heads = reg.getAllHeads();
      heads.set('db1:col1', 'tampered');

      expect(reg.getHead('db1', 'col1')).toBe('block-a');
    });
  });

  describe('persistence (write-through)', () => {
    it('should persist setHead to disk and reload in a new instance', async () => {
      const reg1 = createRegistry();
      await reg1.setHead('mydb', 'users', 'a1b2c3');
      await reg1.setHead('mydb', 'orders', 'f6e5d4');

      const reg2 = createRegistry();
      await reg2.load();
      expect(reg2.getHead('mydb', 'users')).toBe('a1b2c3');
      expect(reg2.getHead('mydb', 'orders')).toBe('f6e5d4');
    });

    it('should persist removeHead to disk', async () => {
      const reg1 = createRegistry();
      await reg1.setHead('db1', 'col1', 'block-a');
      await reg1.setHead('db1', 'col2', 'block-b');
      await reg1.removeHead('db1', 'col1');

      const reg2 = createRegistry();
      await reg2.load();
      expect(reg2.getHead('db1', 'col1')).toBeUndefined();
      expect(reg2.getHead('db1', 'col2')).toBe('block-b');
    });

    it('should write valid JSON to the file', async () => {
      const reg = createRegistry();
      await reg.setHead('db1', 'col1', 'block-abc');

      const filePath = join(dataDir, 'head-registry.json');
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed['db1:col1']).toBeDefined();
      expect(parsed['db1:col1'].blockId).toEqual('block-abc');
      expect(parsed['db1:col1'].timestamp).toBeDefined();
    });

    it('should use a custom file name when specified', async () => {
      const reg = createRegistry({ fileName: 'custom-heads.json' });
      await reg.setHead('db1', 'col1', 'block-abc');

      const filePath = join(dataDir, 'custom-heads.json');
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed['db1:col1']).toBeDefined();
      expect(parsed['db1:col1'].blockId).toEqual('block-abc');
      expect(parsed['db1:col1'].timestamp).toBeDefined();
    });
  });

  describe('load – corrupt/missing file handling', () => {
    it('should start empty when the file does not exist', async () => {
      const reg = createRegistry();
      await reg.load();
      expect(reg.getAllHeads().size).toBe(0);
    });

    it('should log warning and start empty when file contains invalid JSON', async () => {
      const filePath = join(dataDir, 'head-registry.json');
      await fs.writeFile(filePath, 'not valid json!!!', 'utf-8');

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const reg = createRegistry();
      await reg.load();

      expect(reg.getAllHeads().size).toBe(0);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load registry file'),
        expect.anything(),
      );
      warnSpy.mockRestore();
    });

    it('should log warning and start empty when file contains a JSON array', async () => {
      const filePath = join(dataDir, 'head-registry.json');
      await fs.writeFile(filePath, '["not", "an", "object"]', 'utf-8');

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const reg = createRegistry();
      await reg.load();

      expect(reg.getAllHeads().size).toBe(0);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('not a JSON object'),
        // no second arg for this path
      );
      warnSpy.mockRestore();
    });

    it('should log warning and start empty when file contains JSON null', async () => {
      const filePath = join(dataDir, 'head-registry.json');
      await fs.writeFile(filePath, 'null', 'utf-8');

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const reg = createRegistry();
      await reg.load();

      expect(reg.getAllHeads().size).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should skip non-string values in the JSON object', async () => {
      const filePath = join(dataDir, 'head-registry.json');
      await fs.writeFile(
        filePath,
        JSON.stringify({
          'db1:col1': 'valid-block-id',
          'db1:col2': 12345,
          'db1:col3': null,
          'db1:col4': { nested: true },
        }),
        'utf-8',
      );

      const reg = createRegistry();
      await reg.load();

      expect(reg.getAllHeads().size).toBe(1);
      expect(reg.getHead('db1', 'col1')).toBe('valid-block-id');
    });

    it('should start empty when file is empty (0 bytes)', async () => {
      const filePath = join(dataDir, 'head-registry.json');
      await fs.writeFile(filePath, '', 'utf-8');

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const reg = createRegistry();
      await reg.load();

      expect(reg.getAllHeads().size).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should replace previously loaded heads when load is called again', async () => {
      const reg = createRegistry();
      await reg.setHead('db1', 'col1', 'block-a');

      // Overwrite the file externally
      const filePath = join(dataDir, 'head-registry.json');
      await fs.writeFile(
        filePath,
        JSON.stringify({ 'db2:col2': 'block-b' }),
        'utf-8',
      );

      await reg.load();
      expect(reg.getHead('db1', 'col1')).toBeUndefined();
      expect(reg.getHead('db2', 'col2')).toBe('block-b');
    });
  });

  describe('file-level locking', () => {
    it('should handle concurrent setHead calls without corruption', async () => {
      const reg = createRegistry();

      // Fire multiple concurrent writes
      const promises: Promise<void>[] = [];
      for (let i = 0; i < 20; i++) {
        promises.push(reg.setHead('db1', `col${i}`, `block-${i}`));
      }
      await Promise.all(promises);

      // All 20 entries should be present
      const heads = reg.getAllHeads();
      expect(heads.size).toBe(20);
      for (let i = 0; i < 20; i++) {
        expect(heads.get(`db1:col${i}`)).toBe(`block-${i}`);
      }

      // Verify disk state matches
      const reg2 = createRegistry();
      await reg2.load();
      expect(reg2.getAllHeads().size).toBe(20);
    });

    it('should not leave stale lock files after operations', async () => {
      const reg = createRegistry();
      await reg.setHead('db1', 'col1', 'block-a');

      const lockPath = join(dataDir, 'head-registry.json.lock');
      await expect(fs.access(lockPath)).rejects.toThrow();
    });
  });

  describe('create factory', () => {
    it('should create independent instances', async () => {
      const dir1 = await makeTempDir();
      const dir2 = await makeTempDir();
      try {
        const r1 = PersistentHeadRegistry.create({ dataDir: dir1 });
        const r2 = PersistentHeadRegistry.create({ dataDir: dir2 });

        await r1.setHead('db1', 'col1', 'block-from-r1');
        await r2.load();
        expect(r2.getHead('db1', 'col1')).toBeUndefined();
      } finally {
        await cleanupDir(dir1);
        await cleanupDir(dir2);
      }
    });
  });
});
