/**
 * @fileoverview Unit tests for BrightCalSubsystemPlugin.
 *
 * Tests:
 * 1. Plugin has name "brightcal" and isOptional true
 * 2. initialize() registers calendarEngine and eventEngine
 *    in the service container
 *
 * _Requirements: 11.1, 11.3, 11.4_
 */

import type { ISubsystemContext } from '@brightchain/brightchain-lib';
import { describe, expect, it, jest } from '@jest/globals';
import { BrightCalSubsystemPlugin } from '../brightCalSubsystemPlugin.ts';

// Mock the heavy dependencies so the test doesn't need a real DB or Express app.
// createCalendarRouter returns a result with stub controllers, middleware, and services.
jest.mock('../../router/calendarRouter', () => ({
  createCalendarRouter: jest.fn(() => ({
    controllers: {
      calendar: { router: jest.fn() },
      event: { router: jest.fn() },
      scheduling: { router: jest.fn() },
      booking: { router: jest.fn() },
      invitation: { router: jest.fn() },
      search: { router: jest.fn() },
      exportImport: { router: jest.fn() },
    },
    middleware: {
      caldav: { middleware: jest.fn(() => jest.fn()) },
    },
    services: {
      calendarEngine: { name: 'calendarEngine' },
      eventEngine: { name: 'eventEngine' },
    },
  })),
}));

jest.mock('../../controllers/holidayCatalogController', () => ({
  HolidayCatalogController: jest.fn().mockImplementation(() => ({
    router: jest.fn(),
  })),
}));

/**
 * Build a minimal mock ISubsystemContext for testing plugin initialization.
 * Tracks service registrations via a Map.
 */
function createMockContext(): {
  context: ISubsystemContext;
  registered: Map<string, unknown>;
  mockApiRouterUse: jest.Mock;
} {
  const registered = new Map<string, unknown>();
  const mockApiRouterUse = jest.fn();

  const context: ISubsystemContext = {
    services: {
      register: jest.fn((key: string, factory: () => unknown) => {
        registered.set(key, factory());
      }),
      get: jest.fn((key: string) => registered.get(key)),
      has: jest.fn((key: string) => registered.has(key)),
    },
    apiRouter: {
      router: {
        use: mockApiRouterUse,
      },
    },
    expressApp: {
      use: jest.fn(),
    } as unknown as ISubsystemContext['expressApp'],
    environment: {
      debug: false,
    },
    blockStore: {},
    memberStore: {},
    energyStore: {},
    brightDb: {},
    getModel: jest.fn(() => ({})),
    eventSystem: null,
  };

  return { context, registered, mockApiRouterUse };
}

describe('BrightCalSubsystemPlugin', () => {
  it('should have name "brightcal"', () => {
    const plugin = new BrightCalSubsystemPlugin();
    expect(plugin.name).toBe('brightcal');
  });

  it('should have isOptional set to true', () => {
    const plugin = new BrightCalSubsystemPlugin();
    expect(plugin.isOptional).toBe(true);
  });

  it('should not define a stop() method', () => {
    const plugin = new BrightCalSubsystemPlugin();
    expect(plugin.stop).toBeUndefined();
  });

  it('should register calendarEngine and eventEngine on initialize', async () => {
    const plugin = new BrightCalSubsystemPlugin();
    const { context, registered } = createMockContext();

    await plugin.initialize(context);

    expect(registered.has('calendarEngine')).toBe(true);
    expect(registered.has('eventEngine')).toBe(true);
  });

  it('should mount calendar routes on the API router', async () => {
    const plugin = new BrightCalSubsystemPlugin();
    const { context, mockApiRouterUse } = createMockContext();

    await plugin.initialize(context);

    // 7 controller routes + 1 HolidayCatalog = 8 use() calls on apiRouter
    expect(mockApiRouterUse).toHaveBeenCalledTimes(8);
    expect(mockApiRouterUse).toHaveBeenCalledWith(
      '/cal/calendars',
      expect.anything(),
    );
    expect(mockApiRouterUse).toHaveBeenCalledWith(
      '/cal/events',
      expect.anything(),
    );
    expect(mockApiRouterUse).toHaveBeenCalledWith(
      '/cal/holiday-catalog',
      expect.anything(),
    );

    // CalDAV is mounted on expressApp (not the API router)
    expect(context.expressApp.use).toHaveBeenCalledTimes(1);
    expect(context.expressApp.use).toHaveBeenCalledWith(
      '/caldav',
      expect.anything(),
    );
  });
});
