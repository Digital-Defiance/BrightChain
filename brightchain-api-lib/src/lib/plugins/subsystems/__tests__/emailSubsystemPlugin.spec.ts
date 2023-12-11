/**
 * @fileoverview Unit tests for EmailSubsystemPlugin.
 *
 * Tests:
 * 1. Plugin has name "email" and isOptional true
 * 2. initialize() registers messagePassingService and emailMetadataStore
 *    in the service container
 *
 * _Requirements: 5.1, 5.2, 5.3_
 */

import { describe, expect, it, jest } from '@jest/globals';
import type { ISubsystemContext } from '@brightchain/brightchain-lib';
import { EmailSubsystemPlugin } from '../emailSubsystemPlugin';

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
      emailDomain: 'test.brightchain.org',
      debug: false,
    },
    blockStore: {},
    memberStore: {
      queryIndex: jest.fn(async () => []),
    },
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

describe('EmailSubsystemPlugin', () => {
  it('should have name "email"', () => {
    const plugin = new EmailSubsystemPlugin();
    expect(plugin.name).toBe('email');
  });

  it('should have isOptional set to true', () => {
    const plugin = new EmailSubsystemPlugin();
    expect(plugin.isOptional).toBe(true);
  });

  it('should not define a stop() method', () => {
    const plugin = new EmailSubsystemPlugin();
    expect(plugin.stop).toBeUndefined();
  });

  it('should register messagePassingService and emailMetadataStore on initialize', async () => {
    const plugin = new EmailSubsystemPlugin();
    const { context, registered } = createMockContext();

    await plugin.initialize(context);

    expect(registered.has('messagePassingService')).toBe(true);
    expect(registered.has('emailMetadataStore')).toBe(true);
  });

  it('should call getModel for email collections during initialize', async () => {
    const plugin = new EmailSubsystemPlugin();
    const { context } = createMockContext();

    await plugin.initialize(context);

    // BrightDbEmailMetadataStore requires 3 collections
    expect(context.getModel).toHaveBeenCalledTimes(3);
  });

  it('should wire apiRouter when available', async () => {
    const plugin = new EmailSubsystemPlugin();
    const { context } = createMockContext();

    const mockRouter = {
      setMessagePassingService: jest.fn(),
      setMessagePassingServiceForEmail: jest.fn(),
      setEmailUserRegistry: jest.fn(),
      setEmailDomain: jest.fn(),
    };
    context.apiRouter = mockRouter;

    await plugin.initialize(context);

    expect(mockRouter.setMessagePassingService).toHaveBeenCalled();
    expect(mockRouter.setMessagePassingServiceForEmail).toHaveBeenCalled();
    expect(mockRouter.setEmailUserRegistry).toHaveBeenCalled();
    expect(mockRouter.setEmailDomain).toHaveBeenCalledWith(
      'test.brightchain.org',
    );
  });
});
