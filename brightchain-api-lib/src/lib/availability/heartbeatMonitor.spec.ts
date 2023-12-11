/**
 * @fileoverview Unit tests for HeartbeatMonitor
 *
 * **Feature: block-availability-discovery**
 *
 * This test suite verifies:
 * - Heartbeat interval timing
 * - Missed threshold detection
 * - Connectivity event emission
 *
 * **Validates: Requirements 7.1, 7.2, 7.5**
 */

import {
  ConnectivityEvent,
  HeartbeatConfig,
} from '@brightchain/brightchain-lib';
import { HeartbeatMonitor, IHeartbeatTransport } from './heartbeatMonitor';

/**
 * Mock transport for testing heartbeat functionality.
 */
class MockHeartbeatTransport implements IHeartbeatTransport {
  private responses: Map<string, { latency: number } | { error: Error }> =
    new Map();
  public pingCount: Map<string, number> = new Map();

  /**
   * Configure a peer to respond successfully with given latency.
   */
  setPeerResponse(peerId: string, latencyMs: number): void {
    this.responses.set(peerId, { latency: latencyMs });
  }

  /**
   * Configure a peer to fail with an error.
   */
  setPeerError(peerId: string, error: Error = new Error('Timeout')): void {
    this.responses.set(peerId, { error });
  }

  /**
   * Remove peer configuration (will cause timeout).
   */
  removePeerResponse(peerId: string): void {
    this.responses.delete(peerId);
  }

  async sendPing(peerId: string): Promise<number> {
    // Track ping count
    const count = this.pingCount.get(peerId) ?? 0;
    this.pingCount.set(peerId, count + 1);

    const response = this.responses.get(peerId);
    if (!response) {
      throw new Error('Peer not responding');
    }

    if ('error' in response) {
      throw response.error;
    }

    return response.latency;
  }

  /**
   * Get the number of pings sent to a peer.
   */
  getPingCount(peerId: string): number {
    return this.pingCount.get(peerId) ?? 0;
  }

  /**
   * Reset all ping counts.
   */
  resetPingCounts(): void {
    this.pingCount.clear();
  }
}

describe('HeartbeatMonitor Unit Tests', () => {
  let transport: MockHeartbeatTransport;
  let monitor: HeartbeatMonitor;
  let config: HeartbeatConfig;

  beforeEach(() => {
    transport = new MockHeartbeatTransport();
    config = {
      intervalMs: 100, // Short interval for testing
      timeoutMs: 50,
      missedThreshold: 3,
    };
    monitor = new HeartbeatMonitor(transport, config);
  });

  afterEach(() => {
    monitor.stop();
  });

  describe('Basic functionality', () => {
    it('should start and stop correctly', () => {
      expect(monitor.isRunning()).toBe(false);

      monitor.start();
      expect(monitor.isRunning()).toBe(true);

      monitor.stop();
      expect(monitor.isRunning()).toBe(false);
    });

    it('should not start twice', () => {
      monitor.start();
      monitor.start(); // Should be a no-op
      expect(monitor.isRunning()).toBe(true);
    });

    it('should not stop if not running', () => {
      monitor.stop(); // Should be a no-op
      expect(monitor.isRunning()).toBe(false);
    });

    it('should return correct config', () => {
      const returnedConfig = monitor.getConfig();
      expect(returnedConfig.intervalMs).toBe(config.intervalMs);
      expect(returnedConfig.timeoutMs).toBe(config.timeoutMs);
      expect(returnedConfig.missedThreshold).toBe(config.missedThreshold);
    });
  });

  describe('Peer management', () => {
    it('should add and remove peers', () => {
      monitor.addPeer('peer-1');
      monitor.addPeer('peer-2');

      expect(monitor.getMonitoredPeers()).toContain('peer-1');
      expect(monitor.getMonitoredPeers()).toContain('peer-2');
      expect(monitor.getMonitoredPeers().length).toBe(2);

      monitor.removePeer('peer-1');
      expect(monitor.getMonitoredPeers()).not.toContain('peer-1');
      expect(monitor.getMonitoredPeers()).toContain('peer-2');
      expect(monitor.getMonitoredPeers().length).toBe(1);
    });

    it('should not add duplicate peers', () => {
      monitor.addPeer('peer-1');
      monitor.addPeer('peer-1');

      expect(monitor.getMonitoredPeers().length).toBe(1);
    });

    it('should assume new peers are reachable', () => {
      monitor.addPeer('peer-1');
      expect(monitor.isPeerReachable('peer-1')).toBe(true);
    });

    it('should clear all peers', () => {
      monitor.addPeer('peer-1');
      monitor.addPeer('peer-2');
      monitor.clearPeers();

      expect(monitor.getMonitoredPeers().length).toBe(0);
    });
  });

  describe('Heartbeat interval timing', () => {
    /**
     * **Validates: Requirements 7.1**
     */
    it('should send heartbeats at configured interval', async () => {
      transport.setPeerResponse('peer-1', 10);
      monitor.addPeer('peer-1');

      monitor.start();

      // Wait for initial heartbeat + one interval
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should have sent at least 2 pings (initial + 1 interval)
      expect(transport.getPingCount('peer-1')).toBeGreaterThanOrEqual(2);

      monitor.stop();
    });

    it('should send initial heartbeat immediately on start', async () => {
      transport.setPeerResponse('peer-1', 10);
      monitor.addPeer('peer-1');

      monitor.start();

      // Wait a short time (less than interval)
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Should have sent at least 1 ping immediately
      expect(transport.getPingCount('peer-1')).toBeGreaterThanOrEqual(1);

      monitor.stop();
    });
  });

  describe('Missed threshold detection', () => {
    /**
     * **Validates: Requirements 7.2**
     */
    it('should mark peer as unreachable after missed threshold', async () => {
      transport.setPeerError('peer-1'); // Peer will fail all pings
      monitor.addPeer('peer-1');

      // Manually record missed heartbeats
      for (let i = 0; i < config.missedThreshold; i++) {
        // Simulate a failed heartbeat by calling the internal method indirectly
        // We'll use recordHeartbeatResponse to reset, then let it fail
      }

      // Start monitor and wait for enough failures
      monitor.start();

      // Wait for enough intervals to exceed threshold
      await new Promise((resolve) =>
        setTimeout(resolve, config.intervalMs * (config.missedThreshold + 1)),
      );

      expect(monitor.isPeerReachable('peer-1')).toBe(false);
      expect(monitor.getUnreachablePeers()).toContain('peer-1');

      monitor.stop();
    });

    it('should track missed count correctly', () => {
      monitor.addPeer('peer-1');

      // Initially no missed heartbeats
      expect(monitor.getMissedCount('peer-1')).toBe(0);
    });

    it('should reset missed count on successful heartbeat', () => {
      monitor.addPeer('peer-1');

      // Record a successful response
      monitor.recordHeartbeatResponse('peer-1', 10);

      expect(monitor.getMissedCount('peer-1')).toBe(0);
      expect(monitor.isPeerReachable('peer-1')).toBe(true);
    });

    it('should return 0 missed count for unknown peer', () => {
      expect(monitor.getMissedCount('unknown-peer')).toBe(0);
    });
  });

  describe('Connectivity event emission', () => {
    /**
     * **Validates: Requirements 7.5, 7.7**
     */
    it('should emit peer_connected when peer becomes reachable', () => {
      const events: ConnectivityEvent[] = [];
      monitor.onConnectivityChange((event) => events.push(event));

      monitor.addPeer('peer-1');

      // Simulate peer becoming unreachable first
      for (let i = 0; i < config.missedThreshold; i++) {
        // We need to manually trigger the missed heartbeat logic
        // by using the internal state. For this test, we'll use
        // a workaround by starting the monitor with a failing peer
      }

      // For this test, we'll directly test the recordHeartbeatResponse
      // after the peer was marked unreachable

      // First, let's create a scenario where peer is unreachable
      // by using a fresh monitor with a failing transport
      const failingTransport = new MockHeartbeatTransport();
      failingTransport.setPeerError('peer-1');
      const testMonitor = new HeartbeatMonitor(failingTransport, {
        ...config,
        intervalMs: 10,
        missedThreshold: 2,
      });

      const testEvents: ConnectivityEvent[] = [];
      testMonitor.onConnectivityChange((event) => testEvents.push(event));
      testMonitor.addPeer('peer-1');
      testMonitor.start();

      // Wait for peer to become unreachable
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          testMonitor.stop();

          // Now record a successful response
          testMonitor.recordHeartbeatResponse('peer-1', 10);

          // Should have emitted peer_disconnected and then peer_connected
          const connectedEvents = testEvents.filter(
            (e) => e.type === 'peer_connected',
          );
          expect(connectedEvents.length).toBeGreaterThanOrEqual(1);

          resolve();
        }, 50);
      });
    });

    it('should emit peer_disconnected when peer becomes unreachable', async () => {
      const events: ConnectivityEvent[] = [];

      transport.setPeerError('peer-1');
      monitor.addPeer('peer-1');
      monitor.onConnectivityChange((event) => events.push(event));

      monitor.start();

      // Wait for enough failures
      await new Promise((resolve) =>
        setTimeout(resolve, config.intervalMs * (config.missedThreshold + 1)),
      );

      monitor.stop();

      const disconnectedEvents = events.filter(
        (e) => e.type === 'peer_disconnected',
      );
      expect(disconnectedEvents.length).toBe(1);
      expect(disconnectedEvents[0].peerId).toBe('peer-1');
    });

    it('should emit all_disconnected when all peers become unreachable', async () => {
      const events: ConnectivityEvent[] = [];

      transport.setPeerError('peer-1');
      transport.setPeerError('peer-2');
      monitor.addPeer('peer-1');
      monitor.addPeer('peer-2');
      monitor.onConnectivityChange((event) => events.push(event));

      monitor.start();

      // Wait for enough failures
      await new Promise((resolve) =>
        setTimeout(resolve, config.intervalMs * (config.missedThreshold + 1)),
      );

      monitor.stop();

      const allDisconnectedEvents = events.filter(
        (e) => e.type === 'all_disconnected',
      );
      expect(allDisconnectedEvents.length).toBe(1);
    });

    it('should emit some_reconnected when exiting partition', async () => {
      const events: ConnectivityEvent[] = [];

      // Start with failing peer
      transport.setPeerError('peer-1');
      monitor.addPeer('peer-1');
      monitor.onConnectivityChange((event) => events.push(event));

      monitor.start();

      // Wait for partition
      await new Promise((resolve) =>
        setTimeout(resolve, config.intervalMs * (config.missedThreshold + 1)),
      );

      // Verify we're in partition
      expect(monitor.isInPartition()).toBe(true);

      // Now peer responds
      monitor.recordHeartbeatResponse('peer-1', 10);

      // Should have exited partition
      expect(monitor.isInPartition()).toBe(false);

      const reconnectedEvents = events.filter(
        (e) => e.type === 'some_reconnected',
      );
      expect(reconnectedEvents.length).toBe(1);

      monitor.stop();
    });

    it('should allow removing event handlers', () => {
      const events: ConnectivityEvent[] = [];
      const handler = (event: ConnectivityEvent) => events.push(event);

      monitor.onConnectivityChange(handler);
      monitor.offConnectivityChange(handler);

      // Trigger an event
      monitor.addPeer('peer-1');
      monitor.recordHeartbeatResponse('peer-1', 10);

      // Handler should not have been called
      expect(events.length).toBe(0);
    });
  });

  describe('Latency tracking', () => {
    it('should record and return latency', () => {
      monitor.addPeer('peer-1');
      monitor.recordHeartbeatResponse('peer-1', 42);

      expect(monitor.getLastLatency('peer-1')).toBe(42);
    });

    it('should return undefined for unknown peer latency', () => {
      expect(monitor.getLastLatency('unknown-peer')).toBeUndefined();
    });

    it('should update latency on each successful heartbeat', () => {
      monitor.addPeer('peer-1');

      monitor.recordHeartbeatResponse('peer-1', 10);
      expect(monitor.getLastLatency('peer-1')).toBe(10);

      monitor.recordHeartbeatResponse('peer-1', 20);
      expect(monitor.getLastLatency('peer-1')).toBe(20);
    });
  });

  describe('Reachable/Unreachable peer lists', () => {
    it('should correctly categorize peers', async () => {
      transport.setPeerResponse('peer-1', 10);
      transport.setPeerError('peer-2');

      monitor.addPeer('peer-1');
      monitor.addPeer('peer-2');

      monitor.start();

      // Wait for heartbeats
      await new Promise((resolve) =>
        setTimeout(resolve, config.intervalMs * (config.missedThreshold + 1)),
      );

      monitor.stop();

      expect(monitor.getReachablePeers()).toContain('peer-1');
      expect(monitor.getUnreachablePeers()).toContain('peer-2');
    });
  });

  describe('Partition mode', () => {
    it('should enter partition mode when all peers unreachable', async () => {
      transport.setPeerError('peer-1');
      monitor.addPeer('peer-1');

      expect(monitor.isInPartition()).toBe(false);

      monitor.start();

      // Wait for partition
      await new Promise((resolve) =>
        setTimeout(resolve, config.intervalMs * (config.missedThreshold + 1)),
      );

      expect(monitor.isInPartition()).toBe(true);

      monitor.stop();
    });

    it('should exit partition mode when peer reconnects', async () => {
      transport.setPeerError('peer-1');
      monitor.addPeer('peer-1');

      monitor.start();

      // Wait for partition
      await new Promise((resolve) =>
        setTimeout(resolve, config.intervalMs * (config.missedThreshold + 1)),
      );

      expect(monitor.isInPartition()).toBe(true);

      // Peer reconnects
      monitor.recordHeartbeatResponse('peer-1', 10);

      expect(monitor.isInPartition()).toBe(false);

      monitor.stop();
    });

    it('should not enter partition if no peers monitored', () => {
      // No peers added
      monitor.start();

      expect(monitor.isInPartition()).toBe(false);

      monitor.stop();
    });
  });

  describe('Edge cases', () => {
    it('should handle recording response for unknown peer', () => {
      // Should not throw
      monitor.recordHeartbeatResponse('unknown-peer', 10);

      // Peer should now be tracked
      expect(monitor.isPeerReachable('unknown-peer')).toBe(true);
      expect(monitor.getLastLatency('unknown-peer')).toBe(10);
    });

    it('should handle handler errors gracefully', async () => {
      const goodEvents: ConnectivityEvent[] = [];

      // Add a handler that throws
      monitor.onConnectivityChange(() => {
        throw new Error('Handler error');
      });

      // Add a good handler
      monitor.onConnectivityChange((event) => goodEvents.push(event));

      transport.setPeerError('peer-1');
      monitor.addPeer('peer-1');

      monitor.start();

      // Wait for events
      await new Promise((resolve) =>
        setTimeout(resolve, config.intervalMs * (config.missedThreshold + 1)),
      );

      monitor.stop();

      // Good handler should still receive events despite bad handler throwing
      expect(goodEvents.length).toBeGreaterThan(0);
    });
  });
});
