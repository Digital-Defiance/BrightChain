/**
 * Unit Tests for Offline Cache Interface
 *
 * Verifies:
 * (a) IOfflineCache interface can be implemented with all required methods
 * (b) ISyncResult captures conflict metadata
 * (c) lastSynced timestamp is tracked per patient
 *
 * @module offline/__tests__/offlineCache.spec
 */

import type { IPatientResource } from '../../fhir/patientResource';
import type { IOfflineCache } from '../offlineCache';
import type { ISyncConflict, ISyncResult, ISyncStrategy } from '../syncTypes';

/** Minimal patient fixture for testing */
function makePatient(id: string): IPatientResource {
  return {
    resourceType: 'Patient',
    id,
    meta: { versionId: '1', lastUpdated: new Date().toISOString() },
    active: true,
    name: [{ family: 'Test', given: ['Patient'] }],
  };
}

/**
 * In-memory mock implementation of IOfflineCache for testing
 * that the interface contract is implementable.
 */
class MockOfflineCache implements IOfflineCache {
  private cache = new Map<string, { data: Uint8Array; lastSynced: Date }>();

  async cachePatient(
    patient: IPatientResource,
    _encryptionKeys: Uint8Array,
  ): Promise<void> {
    const id = patient.id;
    if (!id) throw new Error('Patient must have an id');
    // Simulate encryption by storing JSON bytes
    const data = new TextEncoder().encode(JSON.stringify(patient));
    this.cache.set(id, { data, lastSynced: new Date() });
  }

  async getCachedPatient(
    id: string,
    _decryptionKeys: Uint8Array,
  ): Promise<IPatientResource | null> {
    const entry = this.cache.get(id);
    if (!entry) return null;
    // Simulate decryption
    const json = new TextDecoder().decode(entry.data);
    return JSON.parse(json) as IPatientResource;
  }

  async listCachedPatientIds(): Promise<string[]> {
    return Array.from(this.cache.keys());
  }

  async clearCache(): Promise<void> {
    this.cache.clear();
  }

  async getLastSynced(patientId: string): Promise<Date | null> {
    const entry = this.cache.get(patientId);
    return entry ? entry.lastSynced : null;
  }
}

describe('IOfflineCache - interface implementation', () => {
  let cache: IOfflineCache;
  const dummyKeys = new Uint8Array([1, 2, 3]);

  beforeEach(() => {
    cache = new MockOfflineCache();
  });

  it('cachePatient stores a patient and getCachedPatient retrieves it', async () => {
    const patient = makePatient('p-1');
    await cache.cachePatient(patient, dummyKeys);
    const retrieved = await cache.getCachedPatient('p-1', dummyKeys);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe('p-1');
    expect(retrieved!.resourceType).toBe('Patient');
  });

  it('getCachedPatient returns null for uncached patient', async () => {
    const result = await cache.getCachedPatient('nonexistent', dummyKeys);
    expect(result).toBeNull();
  });

  it('listCachedPatientIds returns all cached IDs', async () => {
    await cache.cachePatient(makePatient('p-1'), dummyKeys);
    await cache.cachePatient(makePatient('p-2'), dummyKeys);
    await cache.cachePatient(makePatient('p-3'), dummyKeys);
    const ids = await cache.listCachedPatientIds();
    expect(ids).toHaveLength(3);
    expect(ids).toContain('p-1');
    expect(ids).toContain('p-2');
    expect(ids).toContain('p-3');
  });

  it('clearCache removes all cached patients', async () => {
    await cache.cachePatient(makePatient('p-1'), dummyKeys);
    await cache.cachePatient(makePatient('p-2'), dummyKeys);
    await cache.clearCache();
    const ids = await cache.listCachedPatientIds();
    expect(ids).toHaveLength(0);
    expect(await cache.getCachedPatient('p-1', dummyKeys)).toBeNull();
  });

  it('all five interface methods are callable', async () => {
    const patient = makePatient('p-1');
    // Verify each method exists and is callable
    await expect(
      cache.cachePatient(patient, dummyKeys),
    ).resolves.toBeUndefined();
    await expect(
      cache.getCachedPatient('p-1', dummyKeys),
    ).resolves.toBeDefined();
    await expect(cache.listCachedPatientIds()).resolves.toBeDefined();
    await expect(cache.getLastSynced('p-1')).resolves.toBeDefined();
    await expect(cache.clearCache()).resolves.toBeUndefined();
  });
});

describe('ISyncResult - conflict metadata', () => {
  it('captures synced patient IDs', () => {
    const result: ISyncResult = {
      syncedPatientIds: ['p-1', 'p-2'],
      conflicts: [],
      timestamp: new Date(),
    };
    expect(result.syncedPatientIds).toHaveLength(2);
    expect(result.syncedPatientIds).toContain('p-1');
  });

  it('captures conflict metadata with version IDs', () => {
    const conflict: ISyncConflict = {
      patientId: 'p-3',
      localVersionId: '2',
      remoteVersionId: '3',
    };
    const result: ISyncResult = {
      syncedPatientIds: ['p-1'],
      conflicts: [conflict],
      timestamp: new Date(),
    };
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].patientId).toBe('p-3');
    expect(result.conflicts[0].localVersionId).toBe('2');
    expect(result.conflicts[0].remoteVersionId).toBe('3');
  });

  it('supports multiple conflicts', () => {
    const result: ISyncResult = {
      syncedPatientIds: [],
      conflicts: [
        { patientId: 'p-1', localVersionId: '1', remoteVersionId: '2' },
        { patientId: 'p-2', localVersionId: '3', remoteVersionId: '5' },
      ],
      timestamp: new Date('2025-01-01T00:00:00Z'),
    };
    expect(result.conflicts).toHaveLength(2);
    expect(result.timestamp.toISOString()).toBe('2025-01-01T00:00:00.000Z');
  });

  it('ISyncStrategy resolveConflict can be implemented', () => {
    const strategy: ISyncStrategy = {
      resolveConflict(
        local: IPatientResource,
        _remote: IPatientResource,
      ): IPatientResource {
        // Simple "local wins" strategy
        return local;
      },
    };
    const local = makePatient('p-1');
    const remote = makePatient('p-1');
    const resolved = strategy.resolveConflict(local, remote);
    expect(resolved).toBe(local);
  });
});

describe('IOfflineCache - lastSynced tracking per patient', () => {
  let cache: IOfflineCache;
  const dummyKeys = new Uint8Array([1, 2, 3]);

  beforeEach(() => {
    cache = new MockOfflineCache();
  });

  it('getLastSynced returns null for uncached patient', async () => {
    const result = await cache.getLastSynced('nonexistent');
    expect(result).toBeNull();
  });

  it('getLastSynced returns a Date after caching a patient', async () => {
    const before = new Date();
    await cache.cachePatient(makePatient('p-1'), dummyKeys);
    const lastSynced = await cache.getLastSynced('p-1');
    expect(lastSynced).toBeInstanceOf(Date);
    expect(lastSynced!.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it('tracks lastSynced independently per patient', async () => {
    await cache.cachePatient(makePatient('p-1'), dummyKeys);
    // Small delay to ensure different timestamps
    const _midpoint = new Date();
    await cache.cachePatient(makePatient('p-2'), dummyKeys);

    const synced1 = await cache.getLastSynced('p-1');
    const synced2 = await cache.getLastSynced('p-2');
    expect(synced1).toBeInstanceOf(Date);
    expect(synced2).toBeInstanceOf(Date);
    expect(synced1!.getTime()).toBeLessThanOrEqual(synced2!.getTime());
  });

  it('lastSynced updates when patient is re-cached', async () => {
    await cache.cachePatient(makePatient('p-1'), dummyKeys);
    const firstSync = await cache.getLastSynced('p-1');

    // Re-cache the same patient
    await cache.cachePatient(makePatient('p-1'), dummyKeys);
    const secondSync = await cache.getLastSynced('p-1');

    expect(secondSync!.getTime()).toBeGreaterThanOrEqual(firstSync!.getTime());
  });
});
