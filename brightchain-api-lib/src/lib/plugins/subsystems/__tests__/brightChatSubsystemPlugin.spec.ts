/**
 * @fileoverview Unit tests for BrightChatSubsystemPlugin.
 *
 * Tests:
 * 1. Plugin has name "brightchat"
 * 2. initialize() registers all chat service keys in the service container
 * 3. initialize() wires apiRouter when available
 * 4. initialize() is a no-op when apiRouter is null
 *
 * _Requirements: 7.1, 7.2, 7.3_
 */

import { describe, expect, it, jest } from '@jest/globals';
import type { ISubsystemContext } from '@brightchain/brightchain-lib';

// Mock ServiceProvider singleton so the plugin can call getInstance()
// without needing a real ECIES service or ID provider.
jest.mock('@brightchain/brightchain-lib', () => {
  const actual =
    jest.requireActual<typeof import('@brightchain/brightchain-lib')>(
      '@brightchain/brightchain-lib',
    );
  return {
    ...actual,
    ServiceProvider: {
      getInstance: () => ({
        eciesService: {
          core: {
            generatePrivateKey: () => new Uint8Array(32),
            getPublicKey: () => new Uint8Array(33),
            computeSharedSecret: () => new Uint8Array(32),
            deriveSharedKey: () => new Uint8Array(32),
          },
        },
        idProvider: {
          parseSafe: () => 'valid',
          deserialize: () => new Uint8Array(16),
        },
      }),
    },
  };
});

// Mock BlockContentStoreAdapter to avoid needing real CBL/gossip deps
jest.mock('../../../services/brightchat/blockContentStoreAdapter', () => ({
  BlockContentStoreAdapter: jest.fn().mockImplementation(() => ({})),
}));

// Mock createChatStorageProvider to return a simple stub
jest.mock('../../../services/brightchat/chatStorageAdapter', () => ({
  createChatStorageProvider: jest.fn(() => ({})),
}));

import { BrightChatSubsystemPlugin } from '../brightChatSubsystemPlugin';

/**
 * Build a minimal mock ISubsystemContext for testing plugin initialization.
 * Tracks service registrations via a Map.
 */
function createMockContext(withRouter = true): {
  context: ISubsystemContext;
  registered: Map<string, unknown>;
  mockRouter: Record<string, jest.Mock>;
} {
  const registered = new Map<string, unknown>();

  const mockRouter = {
    setConversationService: jest.fn(),
    setGroupService: jest.fn(),
    setChannelService: jest.fn(),
    setPermissionService: jest.fn(),
    setServerService: jest.fn(),
  };

  const context: ISubsystemContext = {
    services: {
      register: jest.fn((key: string, factory: () => unknown) => {
        registered.set(key, factory());
      }),
      get: jest.fn((key: string) => registered.get(key)),
      has: jest.fn((key: string) => registered.has(key)),
    },
    apiRouter: withRouter ? mockRouter : null,
    expressApp: {} as ISubsystemContext['expressApp'],
    environment: {
      debug: false,
    },
    blockStore: {},
    memberStore: {
      getMemberPublicKeyHex: jest.fn(async () => 'aabbccdd'),
    },
    energyStore: {},
    brightDb: {},
    getModel: jest.fn(() => ({
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
    })),
    eventSystem: null,
  };

  return { context, registered, mockRouter };
}

describe('BrightChatSubsystemPlugin', () => {
  it('should have name "brightchat"', () => {
    const plugin = new BrightChatSubsystemPlugin();
    expect(plugin.name).toBe('brightchat');
  });

  it('should not have isOptional explicitly set (defaults to true via interface)', () => {
    const plugin = new BrightChatSubsystemPlugin();
    expect(plugin.isOptional).toBeUndefined();
  });

  it('should not define a stop() method', () => {
    const plugin = new BrightChatSubsystemPlugin();
    expect(plugin.stop).toBeUndefined();
  });

  it('should register all chat service keys on initialize', async () => {
    const plugin = new BrightChatSubsystemPlugin();
    const { context, registered } = createMockContext();

    await plugin.initialize(context);

    const expectedKeys = [
      'permissionService',
      'blockContentStore',
      'conversationService',
      'groupService',
      'channelService',
      'serverService',
      'ensureMemberPublicKey',
    ];

    for (const key of expectedKeys) {
      expect(registered.has(key)).toBe(true);
    }
    expect(registered.size).toBe(expectedKeys.length);
  });

  it('should wire apiRouter when available', async () => {
    const plugin = new BrightChatSubsystemPlugin();
    const { context, mockRouter } = createMockContext(true);

    await plugin.initialize(context);

    expect(mockRouter.setConversationService).toHaveBeenCalled();
    expect(mockRouter.setGroupService).toHaveBeenCalled();
    expect(mockRouter.setChannelService).toHaveBeenCalled();
    expect(mockRouter.setPermissionService).toHaveBeenCalled();
    expect(mockRouter.setServerService).toHaveBeenCalled();
  });

  it('should not register services when apiRouter is null', async () => {
    const plugin = new BrightChatSubsystemPlugin();
    const { context, registered } = createMockContext(false);

    await plugin.initialize(context);

    // When apiRouter is null, the plugin returns early without registering anything
    expect(registered.size).toBe(0);
  });
});
