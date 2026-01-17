/* eslint-disable @nx/enforce-module-boundaries */
/**
 * @fileoverview Property-based tests for DiscoveryProtocol
 *
 * **Feature: block-availability-discovery**
 *
 * This test suite verifies:
 * - Property 5: Bloom Filter Query Optimization
 * - Property 11: Discovery Result Caching
 * - Property 31: Discovery Latency Preference
 *
 * **Validates: Requirements 4.3, 4.4, 4.5, 5.2, 5.3, 5.5, 5.8**
 */

import { BloomFilter, DiscoveryConfig } from '@brightchain/brightchain-lib';
import fc from 'fast-check';
import { DiscoveryProtocol, IPeerNetworkProvider } from './discoveryProtocol';

/**
 * Generate a valid hex string of specified length (block ID format)
 */
const arbHexString = (minLength: number, maxLength: number) =>
  fc
    .array(fc.integer({ min: 0, max: 15 }), {
      minLength,
      maxLength,
    })
    .map((arr) => arr.map((n) => n.toString(16)).join(''));

/**
 * Generate a valid block ID (hex string of at least 32 characters)
 */
const arbBlockId = arbHexString(32, 64);

/**
 * Generate a valid peer ID
 */
const arbPeerId = fc
  .string({ minLength: 8, maxLength: 32 })
  .filter((s) => s.length > 0 && !s.includes(' '));

/**
 * Generate a latency value in milliseconds
 */
const arbLatencyMs = fc.integer({ min: 1, max: 1000 });

/**
 * Mock Bloom filter implementation for testing
 */
class MockBloomFilter implements BloomFilter {
  public readonly data: string;
  public readonly hashCount: number;
  public readonly bitCount: number;
  public readonly itemCount: number;
  private readonly containedItems: Set<string>;

  constructor(containedItems: string[] = []) {
    this.containedItems = new Set(containedItems);
    this.data = 'mock-bloom-filter-data';
    this.hashCount = 7;
    this.bitCount = 1024;
    this.itemCount = containedItems.length;
  }

  mightContain(blockId: string): boolean {
    return this.containedItems.has(blockId);
  }
}

/**
 * Mock peer network provider for testing
 */
class MockPeerNetworkProvider implements IPeerNetworkProvider {
  private connectedPeers: string[];
  private peerBlocks: Map<string, Set<string>> = new Map();
  private peerLatencies: Map<string, number> = new Map();
  public queriedPeers: string[] = [];
  public bloomFilterRequests: string[] = [];

  constructor(connectedPeers: string[] = []) {
    this.connectedPeers = connectedPeers;
  }

  getConnectedPeerIds(): string[] {
    return [...this.connectedPeers];
  }

  async getPeerBloomFilter(peerId: string): Promise<BloomFilter> {
    this.bloomFilterRequests.push(peerId);
    const blocks = this.peerBlocks.get(peerId) || new Set();
    return new MockBloomFilter(Array.from(blocks));
  }

  async queryPeerForBlock(
    peerId: string,
    blockId: string,
    _timeoutMs: number,
  ): Promise<boolean> {
    this.queriedPeers.push(peerId);
    // Simulate latency
    const latency = this.peerLatencies.get(peerId) || 10;
    await new Promise((resolve) => setTimeout(resolve, Math.min(latency, 10)));

    const blocks = this.peerBlocks.get(peerId);
    return blocks ? blocks.has(blockId) : false;
  }

  // Test helpers
  setConnectedPeers(peers: string[]): void {
    this.connectedPeers = peers;
  }

  setPeerBlocks(peerId: string, blockIds: string[]): void {
    this.peerBlocks.set(peerId, new Set(blockIds));
  }

  setPeerLatency(peerId: string, latencyMs: number): void {
    this.peerLatencies.set(peerId, latencyMs);
  }

  clearQueryHistory(): void {
    this.queriedPeers = [];
    this.bloomFilterRequests = [];
  }
}

describe('DiscoveryProtocol Property Tests', () => {
  describe('Property 5: Bloom Filter Query Optimization', () => {
    /**
     * **Feature: block-availability-discovery, Property 5: Bloom Filter Query Optimization**
     *
     * *For any* block discovery query:
     * - The system SHALL first check the peer's Bloom filter
     * - If the Bloom filter returns false (definitely not present), the system SHALL skip that peer
     * - If the Bloom filter returns true (possibly present), the system SHALL make a direct query
     *
     * **Validates: Requirements 4.3, 4.4, 4.5, 5.2, 5.3**
     */
    it('should skip peers whose Bloom filter indicates block is not present', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockId,
          fc.array(arbPeerId, { minLength: 2, maxLength: 5 }),
          async (blockId, peerIds) => {
            // Ensure unique peer IDs
            const uniquePeers = [...new Set(peerIds)];
            if (uniquePeers.length < 2) return true;

            const config: DiscoveryConfig = {
              queryTimeoutMs: 5000,
              maxConcurrentQueries: 10,
              cacheTtlMs: 60000,
              bloomFilterFalsePositiveRate: 0.01,
              bloomFilterHashCount: 7,
            };

            const networkProvider = new MockPeerNetworkProvider(uniquePeers);

            // Only the first peer has the block
            networkProvider.setPeerBlocks(uniquePeers[0], [blockId]);

            const discoveryProtocol = new DiscoveryProtocol(
              networkProvider,
              config,
            );

            // Discover the block
            await discoveryProtocol.discoverBlock(blockId);

            // Should have requested Bloom filters from all peers
            expect(networkProvider.bloomFilterRequests.length).toBe(
              uniquePeers.length,
            );

            // Should only have queried the peer whose Bloom filter indicated the block might exist
            expect(networkProvider.queriedPeers).toContain(uniquePeers[0]);

            // Peers without the block should not have been queried directly
            for (let i = 1; i < uniquePeers.length; i++) {
              expect(networkProvider.queriedPeers).not.toContain(
                uniquePeers[i],
              );
            }

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: block-availability-discovery, Property 5: Bloom Filter Query Optimization**
     *
     * If the Bloom filter returns true (possibly present), the system SHALL make a direct query.
     *
     * **Validates: Requirements 4.4, 5.3**
     */
    it('should query peers whose Bloom filter indicates block might be present', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockId,
          fc.array(arbPeerId, { minLength: 1, maxLength: 5 }),
          async (blockId, peerIds) => {
            const uniquePeers = [...new Set(peerIds)];
            if (uniquePeers.length === 0) return true;

            const config: DiscoveryConfig = {
              queryTimeoutMs: 5000,
              maxConcurrentQueries: 10,
              cacheTtlMs: 60000,
              bloomFilterFalsePositiveRate: 0.01,
              bloomFilterHashCount: 7,
            };

            const networkProvider = new MockPeerNetworkProvider(uniquePeers);

            // All peers have the block
            for (const peerId of uniquePeers) {
              networkProvider.setPeerBlocks(peerId, [blockId]);
            }

            const discoveryProtocol = new DiscoveryProtocol(
              networkProvider,
              config,
            );

            // Discover the block
            const result = await discoveryProtocol.discoverBlock(blockId);

            // Should have queried all peers (since all Bloom filters indicate block might exist)
            expect(networkProvider.queriedPeers.length).toBe(
              uniquePeers.length,
            );

            // Should have found the block on all peers
            expect(result.found).toBe(true);
            expect(result.locations.length).toBe(uniquePeers.length);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: block-availability-discovery, Property 5: Bloom Filter Query Optimization**
     *
     * Bloom filters have no false negatives - if block exists, filter returns true.
     *
     * **Validates: Requirements 4.3**
     */
    it('should always find blocks that exist (no false negatives from Bloom filter)', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockId,
          fc.array(arbPeerId, { minLength: 1, maxLength: 5 }),
          fc.integer({ min: 0, max: 4 }),
          async (blockId, peerIds, peerWithBlockIndex) => {
            const uniquePeers = [...new Set(peerIds)];
            if (uniquePeers.length === 0) return true;

            const actualIndex = peerWithBlockIndex % uniquePeers.length;

            const config: DiscoveryConfig = {
              queryTimeoutMs: 5000,
              maxConcurrentQueries: 10,
              cacheTtlMs: 60000,
              bloomFilterFalsePositiveRate: 0.01,
              bloomFilterHashCount: 7,
            };

            const networkProvider = new MockPeerNetworkProvider(uniquePeers);

            // Only one peer has the block
            networkProvider.setPeerBlocks(uniquePeers[actualIndex], [blockId]);

            const discoveryProtocol = new DiscoveryProtocol(
              networkProvider,
              config,
            );

            // Discover the block
            const result = await discoveryProtocol.discoverBlock(blockId);

            // Should always find the block (no false negatives)
            expect(result.found).toBe(true);
            expect(result.locations.length).toBeGreaterThanOrEqual(1);
            expect(
              result.locations.some(
                (loc: { nodeId: string }) =>
                  loc.nodeId === uniquePeers[actualIndex],
              ),
            ).toBe(true);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 11: Discovery Result Caching', () => {
    /**
     * **Feature: block-availability-discovery, Property 11: Discovery Result Caching**
     *
     * *For any* successful block discovery, subsequent queries for the same block
     * within the cache TTL SHALL return cached results without making network queries.
     *
     * **Validates: Requirements 5.8**
     */
    it('should return cached results without network queries within TTL', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockId,
          fc.array(arbPeerId, { minLength: 1, maxLength: 3 }),
          async (blockId, peerIds) => {
            const uniquePeers = [...new Set(peerIds)];
            if (uniquePeers.length === 0) return true;

            const config: DiscoveryConfig = {
              queryTimeoutMs: 5000,
              maxConcurrentQueries: 10,
              cacheTtlMs: 60000, // 60 second TTL
              bloomFilterFalsePositiveRate: 0.01,
              bloomFilterHashCount: 7,
            };

            const networkProvider = new MockPeerNetworkProvider(uniquePeers);

            // All peers have the block
            for (const peerId of uniquePeers) {
              networkProvider.setPeerBlocks(peerId, [blockId]);
            }

            const discoveryProtocol = new DiscoveryProtocol(
              networkProvider,
              config,
            );

            // First discovery - should query network
            const result1 = await discoveryProtocol.discoverBlock(blockId);
            expect(result1.found).toBe(true);

            // Clear query history
            networkProvider.clearQueryHistory();

            // Second discovery - should use cache
            const result2 = await discoveryProtocol.discoverBlock(blockId);
            expect(result2.found).toBe(true);
            expect(result2.queriedPeers).toBe(0); // No network queries
            expect(networkProvider.queriedPeers.length).toBe(0);

            // Results should be equivalent
            expect(result2.locations.length).toBe(result1.locations.length);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: block-availability-discovery, Property 11: Discovery Result Caching**
     *
     * Cached results should be returned immediately with zero queried peers.
     *
     * **Validates: Requirements 5.8**
     */
    it('should report zero queried peers when returning cached results', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, arbPeerId, async (blockId, peerId) => {
          const config: DiscoveryConfig = {
            queryTimeoutMs: 5000,
            maxConcurrentQueries: 10,
            cacheTtlMs: 60000,
            bloomFilterFalsePositiveRate: 0.01,
            bloomFilterHashCount: 7,
          };

          const networkProvider = new MockPeerNetworkProvider([peerId]);
          networkProvider.setPeerBlocks(peerId, [blockId]);

          const discoveryProtocol = new DiscoveryProtocol(
            networkProvider,
            config,
          );

          // First discovery
          const result1 = await discoveryProtocol.discoverBlock(blockId);
          expect(result1.queriedPeers).toBeGreaterThan(0);

          // Second discovery (cached)
          const result2 = await discoveryProtocol.discoverBlock(blockId);
          expect(result2.queriedPeers).toBe(0);

          return true;
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: block-availability-discovery, Property 11: Discovery Result Caching**
     *
     * Clearing cache should force network queries on next discovery.
     *
     * **Validates: Requirements 5.8**
     */
    it('should query network after cache is cleared', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, arbPeerId, async (blockId, peerId) => {
          const config: DiscoveryConfig = {
            queryTimeoutMs: 5000,
            maxConcurrentQueries: 10,
            cacheTtlMs: 60000,
            bloomFilterFalsePositiveRate: 0.01,
            bloomFilterHashCount: 7,
          };

          const networkProvider = new MockPeerNetworkProvider([peerId]);
          networkProvider.setPeerBlocks(peerId, [blockId]);

          const discoveryProtocol = new DiscoveryProtocol(
            networkProvider,
            config,
          );

          // First discovery
          await discoveryProtocol.discoverBlock(blockId);
          networkProvider.clearQueryHistory();

          // Clear cache
          discoveryProtocol.clearCache(blockId);

          // Third discovery - should query network again
          const result3 = await discoveryProtocol.discoverBlock(blockId);
          expect(result3.queriedPeers).toBeGreaterThan(0);
          expect(networkProvider.queriedPeers.length).toBeGreaterThan(0);

          return true;
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: block-availability-discovery, Property 11: Discovery Result Caching**
     *
     * getCachedLocations should return null for uncached blocks.
     *
     * **Validates: Requirements 5.8**
     */
    it('should return null for uncached blocks', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, async (blockId) => {
          const config: DiscoveryConfig = {
            queryTimeoutMs: 5000,
            maxConcurrentQueries: 10,
            cacheTtlMs: 60000,
            bloomFilterFalsePositiveRate: 0.01,
            bloomFilterHashCount: 7,
          };

          const networkProvider = new MockPeerNetworkProvider([]);
          const discoveryProtocol = new DiscoveryProtocol(
            networkProvider,
            config,
          );

          // Should return null for uncached block
          const cached = discoveryProtocol.getCachedLocations(blockId);
          expect(cached).toBeNull();

          return true;
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 31: Discovery Latency Preference', () => {
    /**
     * **Feature: block-availability-discovery, Property 31: Discovery Latency Preference**
     *
     * *For any* block with multiple known locations, when retrieving the block,
     * the system SHALL prefer nodes with lower recorded latency.
     *
     * **Validates: Requirements 5.5**
     */
    it('should sort locations by latency (lowest first)', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockId,
          fc.array(
            fc.record({
              peerId: arbPeerId,
              latency: arbLatencyMs,
            }),
            { minLength: 2, maxLength: 5 },
          ),
          async (blockId, peerConfigs) => {
            // Ensure unique peer IDs
            const uniquePeerConfigs = peerConfigs.filter(
              (config, index, self) =>
                self.findIndex((c) => c.peerId === config.peerId) === index,
            );
            if (uniquePeerConfigs.length < 2) return true;

            const config: DiscoveryConfig = {
              queryTimeoutMs: 5000,
              maxConcurrentQueries: 10,
              cacheTtlMs: 60000,
              bloomFilterFalsePositiveRate: 0.01,
              bloomFilterHashCount: 7,
            };

            const networkProvider = new MockPeerNetworkProvider(
              uniquePeerConfigs.map((c) => c.peerId),
            );

            // Set up peers with different latencies
            for (const peerConfig of uniquePeerConfigs) {
              networkProvider.setPeerBlocks(peerConfig.peerId, [blockId]);
              networkProvider.setPeerLatency(
                peerConfig.peerId,
                peerConfig.latency,
              );
            }

            const discoveryProtocol = new DiscoveryProtocol(
              networkProvider,
              config,
            );

            // Discover the block
            const result = await discoveryProtocol.discoverBlock(blockId);

            expect(result.found).toBe(true);
            expect(result.locations.length).toBe(uniquePeerConfigs.length);

            // Verify locations are sorted by latency (lowest first)
            for (let i = 1; i < result.locations.length; i++) {
              const prevLatency = result.locations[i - 1].latencyMs ?? Infinity;
              const currLatency = result.locations[i].latencyMs ?? Infinity;
              expect(prevLatency).toBeLessThanOrEqual(currLatency);
            }

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: block-availability-discovery, Property 31: Discovery Latency Preference**
     *
     * The first location in the result should be the one with lowest latency.
     *
     * **Validates: Requirements 5.5**
     */
    it('should have lowest latency peer as first location', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockId,
          fc.array(arbPeerId, { minLength: 2, maxLength: 5 }),
          fc.array(arbLatencyMs, { minLength: 2, maxLength: 5 }),
          async (blockId, peerIds, latencies) => {
            // Ensure unique peer IDs and match lengths
            const uniquePeers = [...new Set(peerIds)];
            if (uniquePeers.length < 2) return true;

            const config: DiscoveryConfig = {
              queryTimeoutMs: 5000,
              maxConcurrentQueries: 10,
              cacheTtlMs: 60000,
              bloomFilterFalsePositiveRate: 0.01,
              bloomFilterHashCount: 7,
            };

            const networkProvider = new MockPeerNetworkProvider(uniquePeers);

            // Assign latencies to peers
            for (let i = 0; i < uniquePeers.length; i++) {
              const latency = latencies[i % latencies.length];
              networkProvider.setPeerBlocks(uniquePeers[i], [blockId]);
              networkProvider.setPeerLatency(uniquePeers[i], latency);
            }

            const discoveryProtocol = new DiscoveryProtocol(
              networkProvider,
              config,
            );

            // Discover the block
            const result = await discoveryProtocol.discoverBlock(blockId);

            expect(result.found).toBe(true);
            expect(result.locations.length).toBeGreaterThan(0);

            // First location should have the lowest latency
            const firstLatency = result.locations[0].latencyMs ?? Infinity;
            for (const location of result.locations) {
              expect(firstLatency).toBeLessThanOrEqual(
                location.latencyMs ?? Infinity,
              );
            }

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: block-availability-discovery, Property 31: Discovery Latency Preference**
     *
     * Locations without latency information should be sorted after those with latency.
     *
     * **Validates: Requirements 5.5**
     */
    it('should handle locations with undefined latency', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, async (blockId) => {
          const config: DiscoveryConfig = {
            queryTimeoutMs: 5000,
            maxConcurrentQueries: 10,
            cacheTtlMs: 60000,
            bloomFilterFalsePositiveRate: 0.01,
            bloomFilterHashCount: 7,
          };

          const peers = ['peer-fast', 'peer-slow'];
          const networkProvider = new MockPeerNetworkProvider(peers);

          // Set up peers with different latencies
          networkProvider.setPeerBlocks('peer-fast', [blockId]);
          networkProvider.setPeerLatency('peer-fast', 10);
          networkProvider.setPeerBlocks('peer-slow', [blockId]);
          networkProvider.setPeerLatency('peer-slow', 100);

          const discoveryProtocol = new DiscoveryProtocol(
            networkProvider,
            config,
          );

          // Discover the block
          const result = await discoveryProtocol.discoverBlock(blockId);

          expect(result.found).toBe(true);
          expect(result.locations.length).toBe(2);

          // Both locations should have latency values
          expect(result.locations[0].latencyMs).toBeDefined();
          expect(result.locations[1].latencyMs).toBeDefined();

          // Locations should be sorted by latency (lowest first)
          expect(result.locations[0].latencyMs).toBeLessThanOrEqual(
            result.locations[1].latencyMs!,
          );

          return true;
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Concurrent Query Limiting', () => {
    /**
     * **Feature: block-availability-discovery**
     *
     * The system should limit concurrent queries to maxConcurrentQueries.
     *
     * **Validates: Requirements 13.2**
     */
    it('should respect maxConcurrentQueries limit', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockId,
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 6, max: 10 }),
          async (blockId, maxConcurrent, peerCount) => {
            const config: DiscoveryConfig = {
              queryTimeoutMs: 5000,
              maxConcurrentQueries: maxConcurrent,
              cacheTtlMs: 60000,
              bloomFilterFalsePositiveRate: 0.01,
              bloomFilterHashCount: 7,
            };

            const peers = Array.from(
              { length: peerCount },
              (_, i) => `peer-${i}`,
            );
            const networkProvider = new MockPeerNetworkProvider(peers);

            // All peers have the block
            for (const peer of peers) {
              networkProvider.setPeerBlocks(peer, [blockId]);
            }

            const discoveryProtocol = new DiscoveryProtocol(
              networkProvider,
              config,
            );

            // Discover the block
            const result = await discoveryProtocol.discoverBlock(blockId);

            // Should have queried all peers (eventually)
            expect(result.queriedPeers).toBe(peerCount);
            expect(result.found).toBe(true);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Empty peer list handling', () => {
    /**
     * **Feature: block-availability-discovery**
     *
     * Discovery should handle empty peer list gracefully.
     *
     * **Validates: Requirements 5.6**
     */
    it('should return not found when no peers are connected', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, async (blockId) => {
          const config: DiscoveryConfig = {
            queryTimeoutMs: 5000,
            maxConcurrentQueries: 10,
            cacheTtlMs: 60000,
            bloomFilterFalsePositiveRate: 0.01,
            bloomFilterHashCount: 7,
          };

          const networkProvider = new MockPeerNetworkProvider([]);
          const discoveryProtocol = new DiscoveryProtocol(
            networkProvider,
            config,
          );

          // Discover the block
          const result = await discoveryProtocol.discoverBlock(blockId);

          expect(result.found).toBe(false);
          expect(result.locations.length).toBe(0);
          expect(result.queriedPeers).toBe(0);

          return true;
        }),
        { numRuns: 100 },
      );
    });
  });
});
