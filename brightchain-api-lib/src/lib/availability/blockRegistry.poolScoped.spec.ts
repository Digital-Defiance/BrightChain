/**
 * @fileoverview Unit tests for BlockRegistry pool-scoped functionality
 *
 * Tests the pool-aware addLocal/removeLocal and pool-scoped export methods
 * on the real BlockRegistry implementation.
 *
 * **Validates: Requirements 3.5, 4.5**
 */

import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { BlockRegistry } from './blockRegistry';

describe('BlockRegistry pool-scoped support', () => {
  let registry: BlockRegistry;
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'block-registry-pool-test-'));
    registry = new BlockRegistry('test-node', tempDir, 'small');
  });

  describe('addLocal with poolId', () => {
    it('should add a block with pool association', () => {
      registry.addLocal('block-1', 'pool-A');
      expect(registry.hasLocal('block-1')).toBe(true);
      expect(registry.getLocalCount()).toBe(1);
    });

    it('should add a block without pool association (backward compat)', () => {
      registry.addLocal('block-1');
      expect(registry.hasLocal('block-1')).toBe(true);
      expect(registry.getLocalCount()).toBe(1);
    });

    it('should track pool association in pool-scoped manifest', () => {
      registry.addLocal('block-1', 'pool-A');
      registry.addLocal('block-2', 'pool-B');
      registry.addLocal('block-3', 'pool-A');

      const manifest = registry.exportPoolScopedManifest();
      expect(manifest.pools.size).toBe(2);
      expect(manifest.pools.get('pool-A')?.sort()).toEqual(
        ['block-1', 'block-3'].sort(),
      );
      expect(manifest.pools.get('pool-B')).toEqual(['block-2']);
    });

    it('should group blocks without poolId under __default__', () => {
      registry.addLocal('block-1');
      registry.addLocal('block-2', 'pool-A');

      const manifest = registry.exportPoolScopedManifest();
      expect(manifest.pools.size).toBe(2);
      expect(manifest.pools.get('__default__')).toEqual(['block-1']);
      expect(manifest.pools.get('pool-A')).toEqual(['block-2']);
    });
  });

  describe('removeLocal with poolId', () => {
    it('should remove a block and its pool association', () => {
      registry.addLocal('block-1', 'pool-A');
      registry.addLocal('block-2', 'pool-A');
      registry.removeLocal('block-1', 'pool-A');

      expect(registry.hasLocal('block-1')).toBe(false);
      expect(registry.hasLocal('block-2')).toBe(true);

      const manifest = registry.exportPoolScopedManifest();
      expect(manifest.pools.get('pool-A')).toEqual(['block-2']);
    });

    it('should remove a block even without poolId param', () => {
      registry.addLocal('block-1', 'pool-A');
      registry.removeLocal('block-1');

      expect(registry.hasLocal('block-1')).toBe(false);
      const manifest = registry.exportPoolScopedManifest();
      expect(manifest.pools.size).toBe(0);
    });
  });

  describe('exportPoolScopedBloomFilter', () => {
    it('should return empty filters for empty registry', () => {
      const result = registry.exportPoolScopedBloomFilter();
      expect(result.filters.size).toBe(0);
      expect(result.globalFilter).toBeDefined();
      expect(result.globalFilter.itemCount).toBe(0);
    });

    it('should create per-pool filters with poolId:blockId keys', () => {
      registry.addLocal('block-1', 'pool-A');
      registry.addLocal('block-2', 'pool-B');

      const result = registry.exportPoolScopedBloomFilter();
      expect(result.filters.size).toBe(2);

      const filterA = result.filters.get('pool-A');
      expect(filterA).toBeDefined();
      expect(filterA?.mightContain('pool-A:block-1')).toBe(true);
      expect(filterA?.mightContain('pool-B:block-1')).toBe(false);

      const filterB = result.filters.get('pool-B');
      expect(filterB).toBeDefined();
      expect(filterB?.mightContain('pool-B:block-2')).toBe(true);
      expect(filterB?.mightContain('pool-A:block-2')).toBe(false);
    });

    it('should include a global filter for backward compatibility', () => {
      registry.addLocal('block-1', 'pool-A');
      registry.addLocal('block-2', 'pool-B');

      const result = registry.exportPoolScopedBloomFilter();
      expect(result.globalFilter.mightContain('block-1')).toBe(true);
      expect(result.globalFilter.mightContain('block-2')).toBe(true);
      expect(result.globalFilter.mightContain('nonexistent')).toBe(false);
    });
  });

  describe('exportPoolScopedManifest', () => {
    it('should return empty pools for empty registry', () => {
      const manifest = registry.exportPoolScopedManifest();
      expect(manifest.pools.size).toBe(0);
      expect(manifest.nodeId).toBe('test-node');
      expect(manifest.generatedAt).toBeInstanceOf(Date);
      expect(manifest.checksum).toBeDefined();
    });

    it('should group blocks by pool correctly', () => {
      registry.addLocal('b1', 'p1');
      registry.addLocal('b2', 'p1');
      registry.addLocal('b3', 'p2');

      const manifest = registry.exportPoolScopedManifest();
      expect(manifest.pools.size).toBe(2);
      expect(manifest.pools.get('p1')?.sort()).toEqual(['b1', 'b2']);
      expect(manifest.pools.get('p2')).toEqual(['b3']);
    });

    it('should produce a checksum that changes when blocks change', () => {
      registry.addLocal('b1', 'p1');
      const checksum1 = registry.exportPoolScopedManifest().checksum;

      registry.addLocal('b2', 'p1');
      const checksum2 = registry.exportPoolScopedManifest().checksum;

      expect(checksum1).not.toBe(checksum2);
    });

    it('should include nodeId in the manifest', () => {
      const manifest = registry.exportPoolScopedManifest();
      expect(manifest.nodeId).toBe('test-node');
    });
  });

  describe('clear', () => {
    it('should clear pool associations along with blocks', () => {
      registry.addLocal('block-1', 'pool-A');
      registry.addLocal('block-2', 'pool-B');
      registry.clear();

      expect(registry.getLocalCount()).toBe(0);
      const manifest = registry.exportPoolScopedManifest();
      expect(manifest.pools.size).toBe(0);
    });
  });
});
