/**
 * @fileoverview Unit tests for BrightHubSubsystemPlugin.
 *
 * Tests:
 * 1. Plugin has name "brighthub"
 * 2. initialize() registers all 8 social service keys in the service container
 *
 * _Requirements: 6.1, 6.2, 6.3_
 */

import { describe, expect, it, jest } from '@jest/globals';
import type { ISubsystemContext } from '@brightchain/brightchain-lib';
import { BrightHubSubsystemPlugin } from '../brightHubSubsystemPlugin';

/**
 * Build a minimal mock ISubsystemContext for testing plugin initialization.
 * Tracks service registrations via a Map.
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
    environment: {
      debug: false,
    },
    blockStore: {},
    memberStore: {},
    energyStore: {},
    brightDb: {
      collection: jest.fn(() => ({
        find: jest.fn(() => ({
          limit: jest.fn(() => ({
            toArray: jest.fn(async () => []),
          })),
        })),
      })),
    },
    getModel: jest.fn(() => ({
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
    })),
    eventSystem: null,
  };

  return { context, registered };
}

describe('BrightHubSubsystemPlugin', () => {
  it('should have name "brighthub"', () => {
    const plugin = new BrightHubSubsystemPlugin();
    expect(plugin.name).toBe('brighthub');
  });

  it('should not have isOptional explicitly set (defaults to true via interface)', () => {
    const plugin = new BrightHubSubsystemPlugin();
    // isOptional is not explicitly set — the plugin lifecycle treats
    // undefined as true (optional), matching the design doc.
    expect(plugin.isOptional).toBeUndefined();
  });

  it('should not define a stop() method', () => {
    const plugin = new BrightHubSubsystemPlugin();
    expect(plugin.stop).toBeUndefined();
  });

  it('should register all 8 social service keys on initialize', async () => {
    const plugin = new BrightHubSubsystemPlugin();
    const { context, registered } = createMockContext();

    await plugin.initialize(context);

    const expectedKeys = [
      'postService',
      'threadService',
      'feedService',
      'messagingService',
      'notificationService',
      'connectionService',
      'discoveryService',
      'userProfileService',
    ];

    for (const key of expectedKeys) {
      expect(registered.has(key)).toBe(true);
    }
    expect(registered.size).toBe(expectedKeys.length);
  });

  it('should wire apiRouter when available', async () => {
    const plugin = new BrightHubSubsystemPlugin();
    const { context } = createMockContext();

    const mockRouter = {
      setBrightHubPostService: jest.fn(),
      setBrightHubThreadService: jest.fn(),
      setBrightHubFeedService: jest.fn(),
      setBrightHubMessagingService: jest.fn(),
      setBrightHubNotificationService: jest.fn(),
      setBrightHubConnectionService: jest.fn(),
      setBrightHubDiscoveryService: jest.fn(),
      setBrightHubUserProfileService: jest.fn(),
    };
    context.apiRouter = mockRouter;

    await plugin.initialize(context);

    expect(mockRouter.setBrightHubPostService).toHaveBeenCalled();
    expect(mockRouter.setBrightHubThreadService).toHaveBeenCalled();
    expect(mockRouter.setBrightHubFeedService).toHaveBeenCalled();
    expect(mockRouter.setBrightHubMessagingService).toHaveBeenCalled();
    expect(mockRouter.setBrightHubNotificationService).toHaveBeenCalled();
    expect(mockRouter.setBrightHubConnectionService).toHaveBeenCalled();
    expect(mockRouter.setBrightHubDiscoveryService).toHaveBeenCalled();
    expect(mockRouter.setBrightHubUserProfileService).toHaveBeenCalled();
  });

  it('should not wire apiRouter when null', async () => {
    const plugin = new BrightHubSubsystemPlugin();
    const { context, registered } = createMockContext();
    context.apiRouter = null;

    await plugin.initialize(context);

    // Services should still be registered even without apiRouter
    expect(registered.size).toBe(8);
  });
});
