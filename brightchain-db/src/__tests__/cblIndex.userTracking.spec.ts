/**
 * CBLIndex – user-level tracking unit tests.
 *
 * Tests user collection support in addEntry/query, shareWith behavior,
 * and visibility-based query filtering via requestingUserId.
 *
 * Validates: Requirements 6.2, 6.3, 6.4, 6.5
 */

import type { ICBLIndexEntry } from '@brightchain/brightchain-lib';
import { CBLVisibility } from '@brightchain/brightchain-lib';
import { CBLIndex } from '../lib/cblIndex';
import { BrightChainDb } from '../lib/database';
import { InMemoryHeadRegistry } from '../lib/headRegistry';
import { MockBlockStore } from './helpers/mockBlockStore';

/** Create a fresh db + store + CBLIndex for each test. */
function makeCBLIndex(): {
  index: CBLIndex;
  store: MockBlockStore;
  db: BrightChainDb;
} {
  const store = new MockBlockStore();
  const registry = InMemoryHeadRegistry.createIsolated();
  const db = new BrightChainDb(store as never, {
    name: 'testdb',
    headRegistry: registry,
  });
  const index = new CBLIndex(db, store as never);
  return { index, store, db };
}

/** Seed two blocks in the store and return their IDs. */
async function seedBlocks(
  store: MockBlockStore,
): Promise<{ blockId1: string; blockId2: string }> {
  const blockId1 = 'block-aaa-111';
  const blockId2 = 'block-bbb-222';
  await store.put(blockId1, new Uint8Array([1, 2, 3]));
  await store.put(blockId2, new Uint8Array([4, 5, 6]));
  return { blockId1, blockId2 };
}

/** Build a minimal valid entry (without _id and sequenceNumber). */
function makeEntry(
  overrides: Partial<Omit<ICBLIndexEntry, '_id' | 'sequenceNumber'>> = {},
): Omit<ICBLIndexEntry, '_id' | 'sequenceNumber'> {
  return {
    magnetUrl:
      'magnet:?xt=urn:brightchain:cbl&bs=256&b1=block-aaa-111&b2=block-bbb-222',
    blockId1: 'block-aaa-111',
    blockId2: 'block-bbb-222',
    blockSize: 256,
    createdAt: new Date(),
    visibility: CBLVisibility.Private,
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════
// Requirement 6.3: userCollection support in addEntry and query
// ══════════════════════════════════════════════════════════════

describe('CBLIndex – userCollection (Req 6.3)', () => {
  it('should preserve userCollection field when adding an entry', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    const entry = await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:uc1',
        userCollection: 'My Reports',
        createdBy: 'alice',
      }),
    );

    expect(entry.userCollection).toBe('My Reports');
  });

  it('should filter entries by userCollection in query', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:uc-a',
        userCollection: 'Photos',
        createdBy: 'alice',
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:uc-b',
        userCollection: 'Documents',
        createdBy: 'alice',
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:uc-c',
        userCollection: 'Photos',
        createdBy: 'alice',
      }),
    );

    const results = await index.query({ userCollection: 'Photos' });
    expect(results).toHaveLength(2);
    expect(results.every((e) => e.userCollection === 'Photos')).toBe(true);
  });

  it('should return entries without userCollection when not filtering by it', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({ blockId1, blockId2, magnetUrl: 'magnet:uc-none' }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:uc-some',
        userCollection: 'Inbox',
      }),
    );

    const results = await index.query({});
    expect(results).toHaveLength(2);
  });

  it('should combine userCollection filter with createdBy filter', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:combo1',
        userCollection: 'Work',
        createdBy: 'alice',
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:combo2',
        userCollection: 'Work',
        createdBy: 'bob',
      }),
    );

    const results = await index.query({
      userCollection: 'Work',
      createdBy: 'alice',
    });
    expect(results).toHaveLength(1);
    expect(results[0].createdBy).toBe('alice');
  });
});

// ══════════════════════════════════════════════════════════════
// Requirement 6.4: shareWith – sharing without data duplication
// ══════════════════════════════════════════════════════════════

describe('CBLIndex – shareWith (Req 6.4)', () => {
  it('should add userId to sharedWith and set visibility to Shared', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);
    const magnetUrl = 'magnet:share1';

    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl,
        createdBy: 'alice',
        visibility: CBLVisibility.Private,
      }),
    );

    await index.shareWith(magnetUrl, 'bob');

    const entry = await index.getByMagnetUrl(magnetUrl);
    expect(entry).not.toBeNull();
    expect(entry!.sharedWith).toContain('bob');
    expect(entry!.visibility).toBe(CBLVisibility.Shared);
  });

  it('should allow sharing with multiple users', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);
    const magnetUrl = 'magnet:share-multi';

    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl,
        createdBy: 'alice',
      }),
    );

    await index.shareWith(magnetUrl, 'bob');
    await index.shareWith(magnetUrl, 'charlie');

    const entry = await index.getByMagnetUrl(magnetUrl);
    expect(entry!.sharedWith).toContain('bob');
    expect(entry!.sharedWith).toContain('charlie');
    expect(entry!.sharedWith).toHaveLength(2);
  });

  it('should not duplicate userId in sharedWith on repeated share', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);
    const magnetUrl = 'magnet:share-dup';

    await index.addEntry(
      makeEntry({ blockId1, blockId2, magnetUrl, createdBy: 'alice' }),
    );

    await index.shareWith(magnetUrl, 'bob');
    await index.shareWith(magnetUrl, 'bob');

    const entry = await index.getByMagnetUrl(magnetUrl);
    const bobCount = entry!.sharedWith!.filter((u) => u === 'bob').length;
    expect(bobCount).toBe(1);
  });

  it('should not duplicate underlying block data when sharing', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);
    const magnetUrl = 'magnet:share-nodup';

    await index.addEntry(
      makeEntry({ blockId1, blockId2, magnetUrl, createdBy: 'alice' }),
    );

    const blockCountAfterAdd = store.size;

    await index.shareWith(magnetUrl, 'bob');

    // Sharing creates a reference, not a copy of the CBL data.
    // The block store may grow by a small amount due to collection
    // metadata updates (findOne + updateOne), but should not grow
    // by a large amount that would indicate CBL data duplication.
    const blockCountAfterShare = store.size;
    expect(blockCountAfterShare - blockCountAfterAdd).toBeLessThanOrEqual(3);
  });

  it('should throw when sharing a non-existent entry', async () => {
    const { index } = makeCBLIndex();
    await expect(index.shareWith('magnet:nonexistent', 'bob')).rejects.toThrow(
      'CBL index entry not found',
    );
  });
});

// ══════════════════════════════════════════════════════════════
// Requirement 6.5: Visibility-based query filtering
// ══════════════════════════════════════════════════════════════

describe('CBLIndex – visibility-based access control (Req 6.5)', () => {
  it('should return only private entries created by the requesting user', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:priv-alice',
        createdBy: 'alice',
        visibility: CBLVisibility.Private,
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:priv-bob',
        createdBy: 'bob',
        visibility: CBLVisibility.Private,
      }),
    );

    const aliceResults = await index.query({ requestingUserId: 'alice' });
    expect(aliceResults).toHaveLength(1);
    expect(aliceResults[0].magnetUrl).toBe('magnet:priv-alice');

    const bobResults = await index.query({ requestingUserId: 'bob' });
    expect(bobResults).toHaveLength(1);
    expect(bobResults[0].magnetUrl).toBe('magnet:priv-bob');
  });

  it('should hide private entries from non-creators', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:priv-hidden',
        createdBy: 'alice',
        visibility: CBLVisibility.Private,
      }),
    );

    const results = await index.query({ requestingUserId: 'charlie' });
    expect(results).toHaveLength(0);
  });

  it('should return shared entries to the creator', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:shared-creator',
        createdBy: 'alice',
        visibility: CBLVisibility.Shared,
        sharedWith: ['bob'],
      }),
    );

    const results = await index.query({ requestingUserId: 'alice' });
    expect(results).toHaveLength(1);
    expect(results[0].magnetUrl).toBe('magnet:shared-creator');
  });

  it('should return shared entries to users in sharedWith', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:shared-bob',
        createdBy: 'alice',
        visibility: CBLVisibility.Shared,
        sharedWith: ['bob', 'charlie'],
      }),
    );

    const bobResults = await index.query({ requestingUserId: 'bob' });
    expect(bobResults).toHaveLength(1);

    const charlieResults = await index.query({ requestingUserId: 'charlie' });
    expect(charlieResults).toHaveLength(1);
  });

  it('should hide shared entries from users not in sharedWith and not the creator', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:shared-hidden',
        createdBy: 'alice',
        visibility: CBLVisibility.Shared,
        sharedWith: ['bob'],
      }),
    );

    const results = await index.query({ requestingUserId: 'dave' });
    expect(results).toHaveLength(0);
  });

  it('should return public entries to any user', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:public1',
        createdBy: 'alice',
        visibility: CBLVisibility.Public,
      }),
    );

    const aliceResults = await index.query({ requestingUserId: 'alice' });
    expect(aliceResults).toHaveLength(1);

    const strangerResults = await index.query({ requestingUserId: 'stranger' });
    expect(strangerResults).toHaveLength(1);
  });

  it('should correctly filter mixed visibility entries for a user', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    // Alice's private entry
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:mix-priv-alice',
        createdBy: 'alice',
        visibility: CBLVisibility.Private,
      }),
    );
    // Bob's private entry
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:mix-priv-bob',
        createdBy: 'bob',
        visibility: CBLVisibility.Private,
      }),
    );
    // Alice shared with Bob
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:mix-shared',
        createdBy: 'alice',
        visibility: CBLVisibility.Shared,
        sharedWith: ['bob'],
      }),
    );
    // Public entry by Charlie
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:mix-public',
        createdBy: 'charlie',
        visibility: CBLVisibility.Public,
      }),
    );

    // Alice should see: her private, the shared (as creator), and the public
    const aliceResults = await index.query({ requestingUserId: 'alice' });
    const aliceMagnets = aliceResults.map((e) => e.magnetUrl).sort();
    expect(aliceMagnets).toEqual([
      'magnet:mix-priv-alice',
      'magnet:mix-public',
      'magnet:mix-shared',
    ]);

    // Bob should see: his private, the shared (in sharedWith), and the public
    const bobResults = await index.query({ requestingUserId: 'bob' });
    const bobMagnets = bobResults.map((e) => e.magnetUrl).sort();
    expect(bobMagnets).toEqual([
      'magnet:mix-priv-bob',
      'magnet:mix-public',
      'magnet:mix-shared',
    ]);

    // Charlie should see: the public (his own), nothing else
    const charlieResults = await index.query({ requestingUserId: 'charlie' });
    const charlieMagnets = charlieResults.map((e) => e.magnetUrl).sort();
    expect(charlieMagnets).toEqual(['magnet:mix-public']);

    // Dave (no entries, not shared with) should see only the public
    const daveResults = await index.query({ requestingUserId: 'dave' });
    const daveMagnets = daveResults.map((e) => e.magnetUrl).sort();
    expect(daveMagnets).toEqual(['magnet:mix-public']);
  });

  it('should combine requestingUserId with other filters', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:combo-pool-a',
        createdBy: 'alice',
        visibility: CBLVisibility.Private,
        poolId: 'pool-a',
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:combo-pool-b',
        createdBy: 'alice',
        visibility: CBLVisibility.Private,
        poolId: 'pool-b',
      }),
    );

    const results = await index.query({
      requestingUserId: 'alice',
      poolId: 'pool-a',
    });
    expect(results).toHaveLength(1);
    expect(results[0].poolId).toBe('pool-a');
  });

  it('should return all entries when requestingUserId is not set', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:no-acl-priv',
        createdBy: 'alice',
        visibility: CBLVisibility.Private,
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:no-acl-shared',
        createdBy: 'bob',
        visibility: CBLVisibility.Shared,
        sharedWith: ['charlie'],
      }),
    );

    // Without requestingUserId, no visibility filtering is applied
    const results = await index.query({});
    expect(results).toHaveLength(2);
  });

  it('should combine requestingUserId with userCollection filter', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:uc-vis1',
        createdBy: 'alice',
        visibility: CBLVisibility.Private,
        userCollection: 'Work',
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:uc-vis2',
        createdBy: 'alice',
        visibility: CBLVisibility.Private,
        userCollection: 'Personal',
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:uc-vis3',
        createdBy: 'bob',
        visibility: CBLVisibility.Private,
        userCollection: 'Work',
      }),
    );

    // Alice querying her Work collection
    const results = await index.query({
      requestingUserId: 'alice',
      userCollection: 'Work',
    });
    expect(results).toHaveLength(1);
    expect(results[0].magnetUrl).toBe('magnet:uc-vis1');
  });
});

// ══════════════════════════════════════════════════════════════
// Requirement 6.2: querying all entries for a specific user
// ══════════════════════════════════════════════════════════════

describe('CBLIndex – user query with pagination (Req 6.2)', () => {
  it('should query all entries for a user with pagination', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    for (let i = 0; i < 5; i++) {
      await index.addEntry(
        makeEntry({
          blockId1,
          blockId2,
          magnetUrl: `magnet:user-page-${i}`,
          createdBy: 'alice',
          visibility: CBLVisibility.Private,
          createdAt: new Date(2025, 0, i + 1),
        }),
      );
    }

    const page1 = await index.query({
      requestingUserId: 'alice',
      createdBy: 'alice',
      limit: 2,
      offset: 0,
      sortBy: 'createdAt',
      sortOrder: 'asc',
    });
    const page2 = await index.query({
      requestingUserId: 'alice',
      createdBy: 'alice',
      limit: 2,
      offset: 2,
      sortBy: 'createdAt',
      sortOrder: 'asc',
    });
    const page3 = await index.query({
      requestingUserId: 'alice',
      createdBy: 'alice',
      limit: 2,
      offset: 4,
      sortBy: 'createdAt',
      sortOrder: 'asc',
    });

    expect(page1).toHaveLength(2);
    expect(page2).toHaveLength(2);
    expect(page3).toHaveLength(1);

    // No overlap between pages
    const allMagnets = [...page1, ...page2, ...page3].map((e) => e.magnetUrl);
    const uniqueMagnets = new Set(allMagnets);
    expect(uniqueMagnets.size).toBe(5);
  });

  it('should filter user entries by metadata', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:meta-pdf',
        createdBy: 'alice',
        visibility: CBLVisibility.Private,
        metadata: { fileName: 'report.pdf', mimeType: 'application/pdf' },
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:meta-img',
        createdBy: 'alice',
        visibility: CBLVisibility.Private,
        metadata: { fileName: 'photo.jpg', mimeType: 'image/jpeg' },
      }),
    );

    const results = await index.query({
      requestingUserId: 'alice',
      mimeType: 'application/pdf',
    });
    expect(results).toHaveLength(1);
    expect(results[0].metadata?.fileName).toBe('report.pdf');
  });
});
