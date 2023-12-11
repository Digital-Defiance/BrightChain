/**
 * @fileoverview Unit tests for BrightTrustSubsystemPlugin.
 *
 * Tests:
 * 1. Plugin has name "brighttrust" and isOptional true
 * 2. Plugin defines a stop() method
 * 3. initialize() registers all BrightTrust service keys in a mock service container
 * 4. stop() calls scheduler stop and gossip handler stop
 *
 * _Requirements: 10.1, 10.2, 10.3, 10.5_
 */

import { describe, expect, it, jest } from '@jest/globals';
import type { ISubsystemContext } from '@brightchain/brightchain-lib';
import { BrightTrustSubsystemPlugin } from '../brightTrustSubsystemPlugin';

/**
 * Build a minimal mock ISubsystemContext for testing plugin initialization.
 */
function createMockContext(): {
  context: ISubsystemContext;
  registered: Map<string, unknown>;
} {
  const registered = new Map<string, unknown>();

  const context: ISubsystemContext = {
    services: {
      register: jest.fn((key: string, factory: () => unknown) => {
        registered.set(key, factory());
      }),
      get: jest.fn((key: string) => registered.get(key)),
      has: jest.fn((key: string) => registered.has(key)),
    },
    apiRouter: null,
    expressApp: {} as ISubsystemContext['expressApp'],
    environment: { debug: false },
    blockStore: {},
    memberStore: {},
    energyStore: {},
    brightDb: {},
    getModel: jest.fn(() => ({
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      updateOne: jest.fn(),
    })),
    eventSystem: null,
  };

  return { context, registered };
}

describe('BrightTrustSubsystemPlugin', () => {
  it('should have name "brighttrust"', () => {
    const plugin = new BrightTrustSubsystemPlugin();
    expect(plugin.name).toBe('brighttrust');
  });

  it('should have isOptional set to true', () => {
    const plugin = new BrightTrustSubsystemPlugin();
    expect(plugin.isOptional).toBe(true);
  });

  it('should define a stop() method', () => {
    const plugin = new BrightTrustSubsystemPlugin();
    expect(typeof plugin.stop).toBe('function');
  });

  it('should register all BrightTrust service keys on initialize', async () => {
    const plugin = new BrightTrustSubsystemPlugin();
    const { context, registered } = createMockContext();

    await plugin.initialize(context);

    const expectedKeys = [
      'brightTrustDbAdapter',
      'auditLogService',
      'identitySealingPipeline',
      'aliasRegistry',
      'brightTrustStateMachine',
      'identityExpirationScheduler',
      'brightTrustGossipHandlerFactory',
      'identityValidator',
      'contentIngestionService',
      'operatorPrompt',
    ];

    for (const key of expectedKeys) {
      expect(registered.has(key)).toBe(true);
    }
  });

  it('should stop scheduler and gossip handler on stop()', async () => {
    const plugin = new BrightTrustSubsystemPlugin();
    const { context, registered } = createMockContext();

    await plugin.initialize(context);

    // Simulate the gossip handler factory being called (as setPoolDiscoveryService would)
    const factory = registered.get('brightTrustGossipHandlerFactory') as (
      gs: unknown,
    ) => void;
    const mockGossipService = {
      onBrightTrustProposal: jest.fn(),
      onBrightTrustVote: jest.fn(),
      offBrightTrustProposal: jest.fn(),
      offBrightTrustVote: jest.fn(),
    };
    factory(mockGossipService);

    // Access the scheduler and gossip handler via the service container
    const scheduler = registered.get('identityExpirationScheduler') as {
      stop: () => void;
    };
    const gossipHandler = registered.get('brightTrustGossipHandler') as {
      stop: () => void;
    };

    // Spy on stop methods
    const schedulerStopSpy = jest.spyOn(scheduler, 'stop' as never);
    const gossipStopSpy = jest.spyOn(gossipHandler, 'stop' as never);

    await plugin.stop();

    expect(schedulerStopSpy).toHaveBeenCalled();
    expect(gossipStopSpy).toHaveBeenCalled();
  });

  it('should handle stop() gracefully when scheduler and gossip handler are not set', async () => {
    const plugin = new BrightTrustSubsystemPlugin();
    // Call stop without initialize — should not throw
    await expect(plugin.stop()).resolves.toBeUndefined();
  });
});
