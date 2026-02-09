/**
 * @fileoverview Unit tests for validateGossipConfig
 *
 * Tests the validateGossipConfig function that validates all fanout and TTL
 * values in a GossipConfig are positive integers.
 *
 * @see Requirements 10.3, 10.4
 */

import {
  DEFAULT_GOSSIP_CONFIG,
  GossipConfig,
  validateGossipConfig,
} from './gossipService';

describe('validateGossipConfig', () => {
  describe('valid configurations', () => {
    it('should return true for DEFAULT_GOSSIP_CONFIG', () => {
      expect(validateGossipConfig(DEFAULT_GOSSIP_CONFIG)).toBe(true);
    });

    it('should return true for config with all positive integer values', () => {
      const config: GossipConfig = {
        fanout: 1,
        defaultTtl: 1,
        batchIntervalMs: 500,
        maxBatchSize: 50,
        messagePriority: {
          normal: { fanout: 2, ttl: 2 },
          high: { fanout: 3, ttl: 3 },
        },
      };
      expect(validateGossipConfig(config)).toBe(true);
    });

    it('should return true for large positive integer values', () => {
      const config: GossipConfig = {
        fanout: 100,
        defaultTtl: 50,
        batchIntervalMs: 10000,
        maxBatchSize: 1000,
        messagePriority: {
          normal: { fanout: 100, ttl: 100 },
          high: { fanout: 200, ttl: 200 },
        },
      };
      expect(validateGossipConfig(config)).toBe(true);
    });
  });

  describe('invalid base fanout', () => {
    it('should return false when fanout is 0', () => {
      const config: GossipConfig = {
        ...DEFAULT_GOSSIP_CONFIG,
        fanout: 0,
      };
      expect(validateGossipConfig(config)).toBe(false);
    });

    it('should return false when fanout is negative', () => {
      const config: GossipConfig = {
        ...DEFAULT_GOSSIP_CONFIG,
        fanout: -1,
      };
      expect(validateGossipConfig(config)).toBe(false);
    });

    it('should return false when fanout is a non-integer', () => {
      const config: GossipConfig = {
        ...DEFAULT_GOSSIP_CONFIG,
        fanout: 2.5,
      };
      expect(validateGossipConfig(config)).toBe(false);
    });
  });

  describe('invalid base defaultTtl', () => {
    it('should return false when defaultTtl is 0', () => {
      const config: GossipConfig = {
        ...DEFAULT_GOSSIP_CONFIG,
        defaultTtl: 0,
      };
      expect(validateGossipConfig(config)).toBe(false);
    });

    it('should return false when defaultTtl is negative', () => {
      const config: GossipConfig = {
        ...DEFAULT_GOSSIP_CONFIG,
        defaultTtl: -5,
      };
      expect(validateGossipConfig(config)).toBe(false);
    });

    it('should return false when defaultTtl is a non-integer', () => {
      const config: GossipConfig = {
        ...DEFAULT_GOSSIP_CONFIG,
        defaultTtl: 1.7,
      };
      expect(validateGossipConfig(config)).toBe(false);
    });
  });

  describe('invalid messagePriority.normal.fanout', () => {
    it('should return false when normal fanout is 0', () => {
      const config: GossipConfig = {
        ...DEFAULT_GOSSIP_CONFIG,
        messagePriority: {
          normal: { fanout: 0, ttl: 5 },
          high: { fanout: 7, ttl: 7 },
        },
      };
      expect(validateGossipConfig(config)).toBe(false);
    });

    it('should return false when normal fanout is negative', () => {
      const config: GossipConfig = {
        ...DEFAULT_GOSSIP_CONFIG,
        messagePriority: {
          normal: { fanout: -3, ttl: 5 },
          high: { fanout: 7, ttl: 7 },
        },
      };
      expect(validateGossipConfig(config)).toBe(false);
    });

    it('should return false when normal fanout is a non-integer', () => {
      const config: GossipConfig = {
        ...DEFAULT_GOSSIP_CONFIG,
        messagePriority: {
          normal: { fanout: 4.5, ttl: 5 },
          high: { fanout: 7, ttl: 7 },
        },
      };
      expect(validateGossipConfig(config)).toBe(false);
    });
  });

  describe('invalid messagePriority.normal.ttl', () => {
    it('should return false when normal ttl is 0', () => {
      const config: GossipConfig = {
        ...DEFAULT_GOSSIP_CONFIG,
        messagePriority: {
          normal: { fanout: 5, ttl: 0 },
          high: { fanout: 7, ttl: 7 },
        },
      };
      expect(validateGossipConfig(config)).toBe(false);
    });

    it('should return false when normal ttl is negative', () => {
      const config: GossipConfig = {
        ...DEFAULT_GOSSIP_CONFIG,
        messagePriority: {
          normal: { fanout: 5, ttl: -1 },
          high: { fanout: 7, ttl: 7 },
        },
      };
      expect(validateGossipConfig(config)).toBe(false);
    });
  });

  describe('invalid messagePriority.high.fanout', () => {
    it('should return false when high fanout is 0', () => {
      const config: GossipConfig = {
        ...DEFAULT_GOSSIP_CONFIG,
        messagePriority: {
          normal: { fanout: 5, ttl: 5 },
          high: { fanout: 0, ttl: 7 },
        },
      };
      expect(validateGossipConfig(config)).toBe(false);
    });

    it('should return false when high fanout is negative', () => {
      const config: GossipConfig = {
        ...DEFAULT_GOSSIP_CONFIG,
        messagePriority: {
          normal: { fanout: 5, ttl: 5 },
          high: { fanout: -2, ttl: 7 },
        },
      };
      expect(validateGossipConfig(config)).toBe(false);
    });
  });

  describe('invalid messagePriority.high.ttl', () => {
    it('should return false when high ttl is 0', () => {
      const config: GossipConfig = {
        ...DEFAULT_GOSSIP_CONFIG,
        messagePriority: {
          normal: { fanout: 5, ttl: 5 },
          high: { fanout: 7, ttl: 0 },
        },
      };
      expect(validateGossipConfig(config)).toBe(false);
    });

    it('should return false when high ttl is negative', () => {
      const config: GossipConfig = {
        ...DEFAULT_GOSSIP_CONFIG,
        messagePriority: {
          normal: { fanout: 5, ttl: 5 },
          high: { fanout: 7, ttl: -10 },
        },
      };
      expect(validateGossipConfig(config)).toBe(false);
    });
  });

  describe('default config values', () => {
    it('should have correct default messagePriority values', () => {
      expect(DEFAULT_GOSSIP_CONFIG.messagePriority.normal.fanout).toBe(5);
      expect(DEFAULT_GOSSIP_CONFIG.messagePriority.normal.ttl).toBe(5);
      expect(DEFAULT_GOSSIP_CONFIG.messagePriority.high.fanout).toBe(7);
      expect(DEFAULT_GOSSIP_CONFIG.messagePriority.high.ttl).toBe(7);
    });

    it('should have correct default base values', () => {
      expect(DEFAULT_GOSSIP_CONFIG.fanout).toBe(3);
      expect(DEFAULT_GOSSIP_CONFIG.defaultTtl).toBe(3);
    });
  });
});
