/**
 * @fileoverview Unit tests for BurnbagSubsystemPlugin.
 *
 * Tests:
 * 1. Plugin has name "burnbag" and isOptional true
 * 2. initialize() calls mountDigitalBurnbagRoutes on the apiRouter
 * 3. initialize() does nothing when apiRouter is null
 *
 * _Requirements: 9.1, 9.2, 9.3_
 */

import { describe, expect, it, jest } from '@jest/globals';
import type { ISubsystemContext } from '@brightchain/brightchain-lib';
import { BurnbagSubsystemPlugin } from '../burnbagSubsystemPlugin';

/**
 * Build a minimal mock ISubsystemContext for testing plugin initialization.
 */
function createMockContext(
  withApiRouter = true,
): {
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
    apiRouter: withApiRouter
      ? {
          mountDigitalBurnbagRoutes: jest.fn(),
        }
      : null,
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

describe('BurnbagSubsystemPlugin', () => {
  it('should have name "burnbag"', () => {
    const plugin = new BurnbagSubsystemPlugin();
    expect(plugin.name).toBe('burnbag');
  });

  it('should have isOptional set to true', () => {
    const plugin = new BurnbagSubsystemPlugin();
    expect(plugin.isOptional).toBe(true);
  });

  it('should not define a stop() method', () => {
    const plugin = new BurnbagSubsystemPlugin();
    expect(plugin.stop).toBeUndefined();
  });

  it('should call mountDigitalBurnbagRoutes on initialize when apiRouter is available', async () => {
    const plugin = new BurnbagSubsystemPlugin();
    const { context } = createMockContext(true);

    await plugin.initialize(context);

    expect(context.apiRouter.mountDigitalBurnbagRoutes).toHaveBeenCalledTimes(
      1,
    );
  });

  it('should not throw when apiRouter is null', async () => {
    const plugin = new BurnbagSubsystemPlugin();
    const { context } = createMockContext(false);

    await expect(plugin.initialize(context)).resolves.toBeUndefined();
  });
});
