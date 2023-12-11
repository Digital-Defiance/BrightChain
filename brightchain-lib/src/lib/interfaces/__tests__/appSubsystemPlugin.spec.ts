/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, expect, it } from '@jest/globals';
import type { Express } from 'express';
import type {
  IAppSubsystemPlugin,
  IServiceContainer,
  ISubsystemContext,
} from '../appSubsystemPlugin';

/**
 * Interface Type Compliance Tests for IAppSubsystemPlugin, ISubsystemContext,
 * and IServiceContainer.
 *
 * These tests verify that mock objects satisfying the interfaces compile
 * correctly and have the expected shape at runtime.
 */
describe('IAppSubsystemPlugin interface', () => {
  /** Helper: build a minimal mock IServiceContainer. */
  function createMockServiceContainer(): IServiceContainer {
    const store = new Map<string, () => unknown>();
    return {
      register<T>(key: string, factory: () => T, _overwrite?: boolean): void {
        store.set(key, factory);
      },
      get<T>(key: string): T {
        const factory = store.get(key);
        if (!factory) throw new Error(`No service: ${key}`);
        return factory() as T;
      },
      has(key: string): boolean {
        return store.has(key);
      },
    };
  }

  /** Helper: build a minimal mock ISubsystemContext. */
  function createMockContext(): ISubsystemContext {
    return {
      services: createMockServiceContainer(),
      apiRouter: null,
      expressApp: {} as Express,
      environment: { debug: false },
      blockStore: {},
      memberStore: {},
      energyStore: {},
      brightDb: {},
      getModel: (_name: string) => ({}),
      eventSystem: null,
    };
  }

  describe('IServiceContainer', () => {
    it('should support register, get, and has methods', () => {
      const container = createMockServiceContainer();

      container.register('testService', () => 'hello');
      expect(container.has('testService')).toBe(true);
      expect(container.has('missing')).toBe(false);
      expect(container.get<string>('testService')).toBe('hello');
    });

    it('should accept an optional overwrite parameter', () => {
      const container = createMockServiceContainer();

      container.register('svc', () => 1);
      container.register('svc', () => 2, true);
      expect(container.get<number>('svc')).toBe(2);
    });
  });

  describe('ISubsystemContext', () => {
    it('should have all required fields accessible', () => {
      const ctx = createMockContext();

      expect(ctx.services).toBeDefined();
      expect(ctx.apiRouter).toBeNull();
      expect(ctx.expressApp).toBeDefined();
      expect(ctx.environment).toBeDefined();
      expect(ctx.blockStore).toBeDefined();
      expect(ctx.memberStore).toBeDefined();
      expect(ctx.energyStore).toBeDefined();
      expect(ctx.brightDb).toBeDefined();
      expect(typeof ctx.getModel).toBe('function');
      expect(ctx.eventSystem).toBeNull();
    });

    it('getModel should return a value when called', () => {
      const ctx = createMockContext();
      const model = ctx.getModel('users');
      expect(model).toBeDefined();
    });
  });

  describe('IAppSubsystemPlugin shape', () => {
    it('should accept a minimal plugin with required fields only', () => {
      const plugin: IAppSubsystemPlugin = {
        name: 'test-plugin',
        initialize: async (_ctx: ISubsystemContext): Promise<void> => {
          // no-op
        },
      };

      expect(plugin.name).toBe('test-plugin');
      expect(typeof plugin.initialize).toBe('function');
      expect(plugin.isOptional).toBeUndefined();
      expect(plugin.stop).toBeUndefined();
    });

    it('should accept a plugin with isOptional set to true', () => {
      const plugin: IAppSubsystemPlugin = {
        name: 'optional-plugin',
        isOptional: true,
        initialize: async () => {},
      };

      expect(plugin.isOptional).toBe(true);
    });

    it('should accept a plugin with isOptional set to false', () => {
      const plugin: IAppSubsystemPlugin = {
        name: 'required-plugin',
        isOptional: false,
        initialize: async () => {},
      };

      expect(plugin.isOptional).toBe(false);
    });

    it('should accept a plugin with an optional stop method', () => {
      let stopped = false;
      const plugin: IAppSubsystemPlugin = {
        name: 'stoppable-plugin',
        isOptional: true,
        initialize: async () => {},
        stop: async () => {
          stopped = true;
        },
      };

      expect(typeof plugin.stop).toBe('function');
    });

    it('initialize should receive and use the context', async () => {
      const ctx = createMockContext();
      let receivedContext: ISubsystemContext | undefined;

      const plugin: IAppSubsystemPlugin = {
        name: 'context-user',
        async initialize(context: ISubsystemContext): Promise<void> {
          receivedContext = context;
          context.services.register('myService', () => 42);
        },
      };

      await plugin.initialize(ctx);

      expect(receivedContext).toBe(ctx);
      expect(ctx.services.has('myService')).toBe(true);
      expect(ctx.services.get<number>('myService')).toBe(42);
    });
  });
});
