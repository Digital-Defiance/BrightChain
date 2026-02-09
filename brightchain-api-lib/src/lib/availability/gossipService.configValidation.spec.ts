/**
 * @fileoverview Unit tests for GossipService constructor config validation
 *
 * Tests that the GossipService constructor validates config and throws
 * InvalidGossipConfigError for non-positive fanout/TTL values.
 *
 * @see Requirements 10.3, 10.4
 */

import {
  BlockAnnouncement,
  DEFAULT_GOSSIP_CONFIG,
  GossipConfig,
} from '@brightchain/brightchain-lib';
import {
  GossipService,
  InvalidGossipConfigError,
  IPeerProvider,
} from './gossipService';

/**
 * Mock peer provider for testing
 */
class MockPeerProvider implements IPeerProvider {
  getLocalNodeId(): string {
    return 'test-node';
  }

  getConnectedPeerIds(): string[] {
    return ['peer-1'];
  }

  async sendAnnouncementBatch(
    _peerId: string,
    _announcements: BlockAnnouncement[],
  ): Promise<void> {
    // no-op
  }

  async getPeerPublicKey(_peerId: string): Promise<Buffer | null> {
    return null;
  }
}

describe('GossipService Constructor Config Validation', () => {
  let peerProvider: MockPeerProvider;

  beforeEach(() => {
    peerProvider = new MockPeerProvider();
  });

  describe('valid configurations', () => {
    it('should accept DEFAULT_GOSSIP_CONFIG', () => {
      expect(
        () => new GossipService(peerProvider, DEFAULT_GOSSIP_CONFIG),
      ).not.toThrow();
    });

    it('should accept config with all positive integer fanout/TTL values', () => {
      const config: GossipConfig = {
        fanout: 2,
        defaultTtl: 2,
        batchIntervalMs: 500,
        maxBatchSize: 50,
        messagePriority: {
          normal: { fanout: 4, ttl: 4 },
          high: { fanout: 8, ttl: 8 },
        },
      };
      expect(() => new GossipService(peerProvider, config)).not.toThrow();
    });

    it('should accept config with minimum valid values (fanout=1, ttl=1)', () => {
      const config: GossipConfig = {
        fanout: 1,
        defaultTtl: 1,
        batchIntervalMs: 100,
        maxBatchSize: 1,
        messagePriority: {
          normal: { fanout: 1, ttl: 1 },
          high: { fanout: 1, ttl: 1 },
        },
      };
      expect(() => new GossipService(peerProvider, config)).not.toThrow();
    });
  });

  describe('invalid configurations - throws InvalidGossipConfigError', () => {
    it('should throw when base fanout is 0', () => {
      const config: GossipConfig = {
        ...DEFAULT_GOSSIP_CONFIG,
        fanout: 0,
      };
      expect(() => new GossipService(peerProvider, config)).toThrow(
        InvalidGossipConfigError,
      );
    });

    it('should throw when base fanout is negative', () => {
      const config: GossipConfig = {
        ...DEFAULT_GOSSIP_CONFIG,
        fanout: -1,
      };
      expect(() => new GossipService(peerProvider, config)).toThrow(
        InvalidGossipConfigError,
      );
    });

    it('should throw when base defaultTtl is 0', () => {
      const config: GossipConfig = {
        ...DEFAULT_GOSSIP_CONFIG,
        defaultTtl: 0,
      };
      expect(() => new GossipService(peerProvider, config)).toThrow(
        InvalidGossipConfigError,
      );
    });

    it('should throw when base defaultTtl is negative', () => {
      const config: GossipConfig = {
        ...DEFAULT_GOSSIP_CONFIG,
        defaultTtl: -3,
      };
      expect(() => new GossipService(peerProvider, config)).toThrow(
        InvalidGossipConfigError,
      );
    });

    it('should throw when normal priority fanout is 0', () => {
      const config: GossipConfig = {
        ...DEFAULT_GOSSIP_CONFIG,
        messagePriority: {
          normal: { fanout: 0, ttl: 5 },
          high: { fanout: 7, ttl: 7 },
        },
      };
      expect(() => new GossipService(peerProvider, config)).toThrow(
        InvalidGossipConfigError,
      );
    });

    it('should throw when normal priority ttl is 0', () => {
      const config: GossipConfig = {
        ...DEFAULT_GOSSIP_CONFIG,
        messagePriority: {
          normal: { fanout: 5, ttl: 0 },
          high: { fanout: 7, ttl: 7 },
        },
      };
      expect(() => new GossipService(peerProvider, config)).toThrow(
        InvalidGossipConfigError,
      );
    });

    it('should throw when high priority fanout is 0', () => {
      const config: GossipConfig = {
        ...DEFAULT_GOSSIP_CONFIG,
        messagePriority: {
          normal: { fanout: 5, ttl: 5 },
          high: { fanout: 0, ttl: 7 },
        },
      };
      expect(() => new GossipService(peerProvider, config)).toThrow(
        InvalidGossipConfigError,
      );
    });

    it('should throw when high priority ttl is 0', () => {
      const config: GossipConfig = {
        ...DEFAULT_GOSSIP_CONFIG,
        messagePriority: {
          normal: { fanout: 5, ttl: 5 },
          high: { fanout: 7, ttl: 0 },
        },
      };
      expect(() => new GossipService(peerProvider, config)).toThrow(
        InvalidGossipConfigError,
      );
    });

    it('should throw when fanout is a non-integer', () => {
      const config: GossipConfig = {
        ...DEFAULT_GOSSIP_CONFIG,
        fanout: 2.5,
      };
      expect(() => new GossipService(peerProvider, config)).toThrow(
        InvalidGossipConfigError,
      );
    });

    it('should include descriptive error message', () => {
      const config: GossipConfig = {
        ...DEFAULT_GOSSIP_CONFIG,
        fanout: -1,
      };
      expect(() => new GossipService(peerProvider, config)).toThrow(
        /positive integers/,
      );
    });
  });

  describe('error type', () => {
    it('InvalidGossipConfigError should have correct name', () => {
      const error = new InvalidGossipConfigError('test message');
      expect(error.name).toBe('InvalidGossipConfigError');
      expect(error.message).toBe('test message');
      expect(error).toBeInstanceOf(Error);
    });
  });
});
