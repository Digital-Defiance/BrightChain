/**
 * @fileoverview Unit tests for BrightNexusSubsystemPlugin.
 */

import type { ISubsystemContext } from '@brightchain/brightchain-lib';
import { describe, expect, it, jest } from '@jest/globals';
import { BrightNexusSubsystemPlugin } from '../brightNexusSubsystemPlugin';

function createMockContext(withApiRouter = true): ISubsystemContext {
  return {
    services: {
      register: jest.fn(),
      get: jest.fn(),
      has: jest.fn(() => false),
    },
    apiRouter: withApiRouter
      ? { mountBrightNexusRoutes: jest.fn() }
      : null,
    expressApp: {} as ISubsystemContext['expressApp'],
    environment: { debug: false },
    blockStore: {},
    memberStore: {},
    energyStore: {},
    brightDb: {},
    getModel: jest.fn(),
    eventSystem: null,
  };
}

describe('BrightNexusSubsystemPlugin', () => {
  it('should have name "brightnexus"', () => {
    const plugin = new BrightNexusSubsystemPlugin();
    expect(plugin.name).toBe('brightnexus');
  });

  it('should have isOptional set to true', () => {
    const plugin = new BrightNexusSubsystemPlugin();
    expect(plugin.isOptional).toBe(true);
  });

  it('should call mountBrightNexusRoutes when apiRouter is available', async () => {
    const plugin = new BrightNexusSubsystemPlugin();
    const context = createMockContext(true);

    await plugin.initialize(context);

    expect(context.apiRouter?.mountBrightNexusRoutes).toHaveBeenCalledTimes(1);
  });

  it('should not throw when apiRouter is null', async () => {
    const plugin = new BrightNexusSubsystemPlugin();
    const context = createMockContext(false);

    await expect(plugin.initialize(context)).resolves.toBeUndefined();
  });
});
