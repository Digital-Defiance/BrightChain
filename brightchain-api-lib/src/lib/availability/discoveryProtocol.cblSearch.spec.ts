/**
 * @fileoverview Unit tests for DiscoveryProtocol CBL metadata search
 *
 * Tests the searchCBLMetadata method added to IDiscoveryProtocol
 * for searching CBL index entries by file name, MIME type, and tags
 * across pool peers.
 *
 * @see Requirements 8.5
 */

import {
  CBLMetadataSearchQuery,
  CBLVisibility,
  ICBLIndexEntry,
} from '@brightchain/brightchain-lib';
import { DiscoveryProtocol, IPeerNetworkProvider } from './discoveryProtocol';

/**
 * Helper to create a minimal valid ICBLIndexEntry for testing.
 */
function makeEntry(overrides: Partial<ICBLIndexEntry> = {}): ICBLIndexEntry {
  return {
    _id: overrides._id ?? `entry-${Math.random().toString(36).slice(2, 10)}`,
    magnetUrl:
      overrides.magnetUrl ??
      `magnet:?xt=urn:brightchain:cbl&bs=256&b1=${Math.random().toString(16).slice(2)}&b2=${Math.random().toString(16).slice(2)}`,
    blockId1: overrides.blockId1 ?? 'aaa111',
    blockId2: overrides.blockId2 ?? 'bbb222',
    blockSize: overrides.blockSize ?? 256,
    createdAt: overrides.createdAt ?? new Date(),
    visibility: overrides.visibility ?? CBLVisibility.Public,
    sequenceNumber: overrides.sequenceNumber ?? 1,
    ...overrides,
  };
}

/**
 * Mock IPeerNetworkProvider that supports CBL metadata queries.
 */
class TestNetworkProvider implements IPeerNetworkProvider {
  private peers: string[] = [];
  private peerCBLEntries: Map<string, ICBLIndexEntry[]> = new Map();
  private failingPeers: Set<string> = new Set();

  constructor(peers: string[]) {
    this.peers = peers;
  }

  setPeerCBLEntries(peerId: string, entries: ICBLIndexEntry[]): void {
    this.peerCBLEntries.set(peerId, entries);
  }

  setPeerFailing(peerId: string): void {
    this.failingPeers.add(peerId);
  }

  getConnectedPeerIds(): string[] {
    return [...this.peers];
  }

  async getPeerBloomFilter(): Promise<{
    data: string;
    hashCount: number;
    bitCount: number;
    itemCount: number;
    mightContain: () => boolean;
  }> {
    return {
      data: '',
      hashCount: 7,
      bitCount: 1000,
      itemCount: 0,
      mightContain: () => false,
    };
  }

  async queryPeerForBlock(): Promise<boolean> {
    return false;
  }

  async queryPeerForCBLMetadata(
    peerId: string,
    _query: CBLMetadataSearchQuery,
    _timeoutMs: number,
  ): Promise<ICBLIndexEntry[]> {
    if (this.failingPeers.has(peerId)) {
      throw new Error(`Peer ${peerId} unreachable`);
    }
    return this.peerCBLEntries.get(peerId) ?? [];
  }
}

describe('DiscoveryProtocol.searchCBLMetadata', () => {
  const defaultConfig = {
    queryTimeoutMs: 5000,
    maxConcurrentQueries: 10,
    cacheTtlMs: 60000,
    bloomFilterFalsePositiveRate: 0.01,
    bloomFilterHashCount: 7,
  };

  it('returns empty results when no peers are connected', async () => {
    const provider = new TestNetworkProvider([]);
    const protocol = new DiscoveryProtocol(provider, defaultConfig);

    const result = await protocol.searchCBLMetadata({
      fileName: 'test.pdf',
    });

    expect(result.hits).toHaveLength(0);
    expect(result.queriedPeers).toBe(0);
    expect(result.query.fileName).toBe('test.pdf');
  });

  it('returns matching entries from a single peer', async () => {
    const provider = new TestNetworkProvider(['peer-1']);
    const entry = makeEntry({
      metadata: { fileName: 'report.pdf', mimeType: 'application/pdf' },
    });
    provider.setPeerCBLEntries('peer-1', [entry]);

    const protocol = new DiscoveryProtocol(provider, defaultConfig);
    const result = await protocol.searchCBLMetadata({
      fileName: 'report.pdf',
    });

    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].entry.magnetUrl).toBe(entry.magnetUrl);
    expect(result.hits[0].sourceNodeId).toBe('peer-1');
    expect(result.queriedPeers).toBe(1);
  });

  it('aggregates entries from multiple peers', async () => {
    const provider = new TestNetworkProvider(['peer-1', 'peer-2']);
    const entry1 = makeEntry({ magnetUrl: 'magnet:?unique1' });
    const entry2 = makeEntry({ magnetUrl: 'magnet:?unique2' });
    provider.setPeerCBLEntries('peer-1', [entry1]);
    provider.setPeerCBLEntries('peer-2', [entry2]);

    const protocol = new DiscoveryProtocol(provider, defaultConfig);
    const result = await protocol.searchCBLMetadata({ poolId: 'pool-a' });

    expect(result.hits).toHaveLength(2);
    const sourceNodes = result.hits.map((h) => h.sourceNodeId);
    expect(sourceNodes).toContain('peer-1');
    expect(sourceNodes).toContain('peer-2');
    expect(result.queriedPeers).toBe(2);
  });

  it('deduplicates entries by magnet URL across peers', async () => {
    const provider = new TestNetworkProvider(['peer-1', 'peer-2']);
    const sharedMagnet = 'magnet:?xt=urn:brightchain:cbl&shared';
    const entry1 = makeEntry({ magnetUrl: sharedMagnet });
    const entry2 = makeEntry({ magnetUrl: sharedMagnet });
    provider.setPeerCBLEntries('peer-1', [entry1]);
    provider.setPeerCBLEntries('peer-2', [entry2]);

    const protocol = new DiscoveryProtocol(provider, defaultConfig);
    const result = await protocol.searchCBLMetadata({});

    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].entry.magnetUrl).toBe(sharedMagnet);
    expect(result.queriedPeers).toBe(2);
  });

  it('handles peer query failures gracefully', async () => {
    const provider = new TestNetworkProvider(['peer-1', 'peer-2']);
    const entry = makeEntry({ magnetUrl: 'magnet:?good' });
    provider.setPeerCBLEntries('peer-2', [entry]);
    provider.setPeerFailing('peer-1');

    const protocol = new DiscoveryProtocol(provider, defaultConfig);
    const result = await protocol.searchCBLMetadata({
      mimeType: 'image/png',
    });

    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].sourceNodeId).toBe('peer-2');
    expect(result.queriedPeers).toBe(2);
  });

  it('passes the query through to the result', async () => {
    const provider = new TestNetworkProvider(['peer-1']);
    provider.setPeerCBLEntries('peer-1', []);

    const protocol = new DiscoveryProtocol(provider, defaultConfig);
    const query: CBLMetadataSearchQuery = {
      fileName: 'doc.txt',
      mimeType: 'text/plain',
      tags: ['important'],
      poolId: 'my-pool',
    };
    const result = await protocol.searchCBLMetadata(query);

    expect(result.query).toEqual(query);
  });

  it('reports duration in the result', async () => {
    const provider = new TestNetworkProvider(['peer-1']);
    provider.setPeerCBLEntries('peer-1', []);

    const protocol = new DiscoveryProtocol(provider, defaultConfig);
    const result = await protocol.searchCBLMetadata({});

    expect(typeof result.duration).toBe('number');
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('respects maxConcurrentQueries config', async () => {
    // Create many peers but limit concurrency to 2
    const peers = Array.from({ length: 5 }, (_, i) => `peer-${i}`);
    const provider = new TestNetworkProvider(peers);
    for (const peer of peers) {
      provider.setPeerCBLEntries(peer, [
        makeEntry({ magnetUrl: `magnet:?${peer}` }),
      ]);
    }

    const protocol = new DiscoveryProtocol(provider, {
      ...defaultConfig,
      maxConcurrentQueries: 2,
    });
    const result = await protocol.searchCBLMetadata({});

    // All peers should still be queried, just with limited concurrency
    expect(result.hits).toHaveLength(5);
    expect(result.queriedPeers).toBe(5);
  });
});
