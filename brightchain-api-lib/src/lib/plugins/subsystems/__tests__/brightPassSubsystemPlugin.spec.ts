/**
 * @fileoverview Unit tests for BrightPassSubsystemPlugin.
 *
 * Tests:
 * 1. Plugin has name "brightpass"
 * 2. initialize() registers vaultMetadataCollection in the service container
 *
 * _Requirements: 8.1, 8.2_
 */

import { describe, expect, it, jest } from '@jest/globals';
import type { ISubsystemContext } from '@brightchain/brightchain-lib';
import { BrightPassSubsystemPlugin } from '../brightPassSubsystemPlugin';

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

describe('BrightPassSubsystemPlugin', () => {
  it('should have name "brightpass"', () => {
    const plugin = new BrightPassSubsystemPlugin();
    expect(plugin.name).toBe('brightpass');
  });

  it('should not define a stop() method', () => {
    const plugin = new BrightPassSubsystemPlugin();
    expect(plugin.stop).toBeUndefined();
  });

  it('should register vaultMetadataCollection on initialize', async () => {
    const plugin = new BrightPassSubsystemPlugin();
    const { context, registered } = createMockContext();

    await plugin.initialize(context);

    expect(registered.has('vaultMetadataCollection')).toBe(true);
  });

  it('should call getModel with brightpass_vaults during initialize', async () => {
    const plugin = new BrightPassSubsystemPlugin();
    const { context } = createMockContext();

    await plugin.initialize(context);

    expect(context.getModel).toHaveBeenCalledWith('brightpass_vaults');
  });
});
