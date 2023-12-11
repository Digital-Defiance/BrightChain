/**
 * InMemoryHeadRegistry – unit tests.
 *
 * Validates that the InMemoryHeadRegistry correctly implements
 * the IHeadRegistry interface with pure in-memory behavior.
 */

import { InMemoryHeadRegistry } from '../lib/headRegistry';

describe('InMemoryHeadRegistry', () => {
  let registry: InMemoryHeadRegistry;

  beforeEach(() => {
    registry = InMemoryHeadRegistry.createIsolated();
  });

  describe('getHead / setHead', () => {
    it('should return undefined for an unset head', () => {
      expect(registry.getHead('db1', 'col1')).toBeUndefined();
    });

    it('should return the block ID after setHead', async () => {
      await registry.setHead('db1', 'col1', 'block-abc');
      expect(registry.getHead('db1', 'col1')).toBe('block-abc');
    });

    it('should overwrite an existing head', async () => {
      await registry.setHead('db1', 'col1', 'block-1');
      await registry.setHead('db1', 'col1', 'block-2');
      expect(registry.getHead('db1', 'col1')).toBe('block-2');
    });

    it('should isolate heads by dbName and collectionName', async () => {
      await registry.setHead('db1', 'col1', 'block-a');
      await registry.setHead('db1', 'col2', 'block-b');
      await registry.setHead('db2', 'col1', 'block-c');

      expect(registry.getHead('db1', 'col1')).toBe('block-a');
      expect(registry.getHead('db1', 'col2')).toBe('block-b');
      expect(registry.getHead('db2', 'col1')).toBe('block-c');
    });
  });

  describe('removeHead', () => {
    it('should remove an existing head', async () => {
      await registry.setHead('db1', 'col1', 'block-abc');
      await registry.removeHead('db1', 'col1');
      expect(registry.getHead('db1', 'col1')).toBeUndefined();
    });

    it('should not throw when removing a non-existent head', async () => {
      await expect(
        registry.removeHead('db1', 'nonexistent'),
      ).resolves.toBeUndefined();
    });

    it('should not affect other heads', async () => {
      await registry.setHead('db1', 'col1', 'block-a');
      await registry.setHead('db1', 'col2', 'block-b');
      await registry.removeHead('db1', 'col1');

      expect(registry.getHead('db1', 'col1')).toBeUndefined();
      expect(registry.getHead('db1', 'col2')).toBe('block-b');
    });
  });

  describe('clear', () => {
    it('should remove all heads', async () => {
      await registry.setHead('db1', 'col1', 'block-a');
      await registry.setHead('db2', 'col2', 'block-b');
      await registry.clear();

      expect(registry.getHead('db1', 'col1')).toBeUndefined();
      expect(registry.getHead('db2', 'col2')).toBeUndefined();
    });

    it('should not throw on an empty registry', async () => {
      await expect(registry.clear()).resolves.toBeUndefined();
    });
  });

  describe('load', () => {
    it('should be a no-op that resolves', async () => {
      await expect(registry.load()).resolves.toBeUndefined();
    });

    it('should not affect existing heads', async () => {
      await registry.setHead('db1', 'col1', 'block-a');
      await registry.load();
      expect(registry.getHead('db1', 'col1')).toBe('block-a');
    });
  });

  describe('getAllHeads', () => {
    it('should return an empty map when no heads are set', () => {
      const heads = registry.getAllHeads();
      expect(heads.size).toBe(0);
    });

    it('should return all heads with composite keys', async () => {
      await registry.setHead('db1', 'col1', 'block-a');
      await registry.setHead('db2', 'col2', 'block-b');

      const heads = registry.getAllHeads();
      expect(heads.size).toBe(2);
      expect(heads.get('db1:col1')).toBe('block-a');
      expect(heads.get('db2:col2')).toBe('block-b');
    });

    it('should return a copy (mutations do not affect the registry)', async () => {
      await registry.setHead('db1', 'col1', 'block-a');
      const heads = registry.getAllHeads();
      heads.set('db1:col1', 'tampered');

      expect(registry.getHead('db1', 'col1')).toBe('block-a');
    });
  });

  describe('createIsolated', () => {
    it('should create independent instances', async () => {
      const r1 = InMemoryHeadRegistry.createIsolated();
      const r2 = InMemoryHeadRegistry.createIsolated();

      await r1.setHead('db1', 'col1', 'block-from-r1');
      expect(r2.getHead('db1', 'col1')).toBeUndefined();
    });
  });
});
