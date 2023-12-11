/**
 * @fileoverview Property-based tests for the App subsystem plugin lifecycle.
 *
 * Tests Properties 3–7 from the app-subsystem-plugins design:
 *   Property 3: Initialize in registration order
 *   Property 4: Optional plugin failure is non-fatal
 *   Property 5: Non-optional plugin failure aborts start
 *   Property 6: Stop in reverse registration order
 *   Property 7: Stop errors are non-fatal
 *
 * Strategy: Use the extracted `initializePlugins()` and `stopPlugins()`
 * helper methods on App, which can be tested in isolation with mock plugins
 * and a mock ISubsystemContext — no DB or HTTP server needed.
 */

import type {
  IAppSubsystemPlugin,
  ISubsystemContext,
} from '@brightchain/brightchain-lib';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { App } from '../application';
import { Environment } from '../environment';
import type { DefaultBackendIdType } from '../shared-types';

// Ensure the disk store factory is registered
import '../factories/blockStoreFactory';

jest.setTimeout(180_000);

// ── Helpers ──────────────────────────────────────────────────────────────

let tmpDistDir: string | undefined;
const savedEnv: Record<string, string | undefined> = {};

function setupDistDirs(): void {
  tmpDistDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bc-lifecycle-'));
  const reactDist = path.join(tmpDistDir, 'dist', 'react');
  const apiDist = path.join(tmpDistDir, 'dist', 'api');
  fs.mkdirSync(reactDist, { recursive: true });
  fs.mkdirSync(apiDist, { recursive: true });
  fs.writeFileSync(path.join(reactDist, 'index.html'), '<html></html>');
  process.env['REACT_DIST_DIR'] = reactDist;
  process.env['API_DIST_DIR'] = apiDist;
}

function teardownDistDirs(): void {
  if (tmpDistDir) {
    fs.rmSync(tmpDistDir, { recursive: true, force: true });
    tmpDistDir = undefined;
  }
}

function setRequiredEnvVars(): void {
  const vars: Record<string, string> = {
    JWT_SECRET:
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    MNEMONIC_HMAC_SECRET:
      'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
    MNEMONIC_ENCRYPTION_KEY:
      'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
    SYSTEM_MNEMONIC:
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  };
  for (const [key, value] of Object.entries(vars)) {
    savedEnv[key] = process.env[key];
    process.env[key] = value;
  }
  savedEnv['BRIGHTCHAIN_BLOCKSTORE_PATH'] =
    process.env['BRIGHTCHAIN_BLOCKSTORE_PATH'];
  savedEnv['BLOCKSTORE_PATH'] = process.env['BLOCKSTORE_PATH'];
  savedEnv['DEV_DATABASE'] = process.env['DEV_DATABASE'];
  delete process.env['BRIGHTCHAIN_BLOCKSTORE_PATH'];
  delete process.env['BLOCKSTORE_PATH'];
  process.env['DEV_DATABASE'] = 'ephemeral-lifecycle-test';
  setupDistDirs();
}

function clearRequiredEnvVars(): void {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  teardownDistDirs();
}

/** Create a mock ISubsystemContext — no real services needed. */
function mockContext(): ISubsystemContext {
  return {
    services: {
      register: jest.fn(),
      get: jest.fn(),
      has: jest.fn().mockReturnValue(false),
    },
    apiRouter: null,
    expressApp: {} as ISubsystemContext['expressApp'],
    environment: {},
    blockStore: {},
    memberStore: {},
    energyStore: {},
    brightDb: {},
    getModel: jest.fn(),
    eventSystem: null,
  };
}

/** Create a fresh App instance for testing. */
function createTestApp(): App<DefaultBackendIdType> {
  const env = new Environment<DefaultBackendIdType>(undefined, true, true);
  return new App<DefaultBackendIdType>(env);
}

/**
 * Arbitrary that generates an array of 1–15 unique plugin name strings.
 */
const uniquePluginNamesArb = fc.uniqueArray(
  fc.stringMatching(/^[a-z][a-z0-9_-]{0,19}$/),
  { minLength: 1, maxLength: 15 },
);

// ── Property 3: Initialize in registration order ─────────────────────────

describe('Feature: app-subsystem-plugins, Property 3: Initialize in registration order', () => {
  beforeAll(() => {
    setRequiredEnvVars();
  });

  afterAll(() => {
    clearRequiredEnvVars();
  });

  /**
   * **Validates: Requirements 3.1**
   *
   * For any sequence of registered plugins, when initializePlugins()
   * completes, the initialize method of each plugin SHALL have been
   * called in the same order the plugins were registered.
   */
  it('calls initialize in registration order for any plugin sequence', async () => {
    await fc.assert(
      fc.asyncProperty(uniquePluginNamesArb, async (names) => {
        const testApp = createTestApp();
        const callOrder: string[] = [];

        const plugins: IAppSubsystemPlugin[] = names.map((name) => ({
          name,
          isOptional: true,
          initialize: async (_ctx: ISubsystemContext) => {
            callOrder.push(name);
          },
        }));

        for (const plugin of plugins) {
          testApp.registerSubsystemPlugin(plugin);
        }

        await testApp.initializePlugins(mockContext());

        expect(callOrder).toEqual(names);
      }),
      { numRuns: 100 },
    );
  });
});

// ── Property 4: Optional plugin failure is non-fatal ─────────────────────

describe('Feature: app-subsystem-plugins, Property 4: Optional plugin failure is non-fatal', () => {
  beforeAll(() => {
    setRequiredEnvVars();
  });

  afterAll(() => {
    clearRequiredEnvVars();
  });

  /**
   * **Validates: Requirements 1.4, 3.2, 12.3**
   *
   * For any set of registered plugins where some plugins have isOptional
   * set to true or undefined and their initialize methods throw errors,
   * all remaining plugins in the sequence SHALL still have their
   * initialize methods called, and initializePlugins() SHALL complete
   * without throwing.
   */
  it('continues past optional plugin failures and calls all plugins', async () => {
    await fc.assert(
      fc.asyncProperty(
        uniquePluginNamesArb,
        fc.infiniteStream(fc.boolean()),
        async (names, throwStream) => {
          const testApp = createTestApp();
          const called: string[] = [];
          const throwIterator = throwStream[Symbol.iterator]();

          // Randomly assign isOptional as true or undefined (both are non-fatal)
          const plugins: IAppSubsystemPlugin[] = names.map((name) => {
            const shouldThrow = throwIterator.next().value;
            return {
              name,
              isOptional: Math.random() > 0.5 ? true : undefined,
              initialize: async (_ctx: ISubsystemContext) => {
                called.push(name);
                if (shouldThrow) {
                  throw new Error(`${name} failed`);
                }
              },
            };
          });

          for (const plugin of plugins) {
            testApp.registerSubsystemPlugin(plugin);
          }

          // Should NOT throw even when some plugins fail
          await testApp.initializePlugins(mockContext());

          // All plugins should have been attempted
          expect(called).toEqual(names);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Property 5: Non-optional plugin failure aborts start ─────────────────

describe('Feature: app-subsystem-plugins, Property 5: Non-optional plugin failure aborts start', () => {
  beforeAll(() => {
    setRequiredEnvVars();
  });

  afterAll(() => {
    clearRequiredEnvVars();
  });

  /**
   * **Validates: Requirements 3.3**
   *
   * For any sequence of registered plugins, if a plugin with isOptional
   * set to false has its initialize method throw an error, then
   * initializePlugins() SHALL propagate that error, and no subsequent
   * plugin's initialize method SHALL be called.
   */
  it('aborts on non-optional plugin failure and skips subsequent plugins', async () => {
    const atLeast2Names = fc.uniqueArray(
      fc.stringMatching(/^[a-z][a-z0-9_-]{0,19}$/),
      { minLength: 2, maxLength: 15 },
    );

    await fc.assert(
      fc.asyncProperty(atLeast2Names, fc.nat(), async (names, rawIdx) => {
        const failIdx = rawIdx % names.length;
        const testApp = createTestApp();
        const called: string[] = [];

        const plugins: IAppSubsystemPlugin[] = names.map((name, i) => ({
          name,
          isOptional: i === failIdx ? false : true,
          initialize: async (_ctx: ISubsystemContext) => {
            called.push(name);
            if (i === failIdx) {
              throw new Error(`${name} fatal`);
            }
          },
        }));

        for (const plugin of plugins) {
          testApp.registerSubsystemPlugin(plugin);
        }

        await expect(testApp.initializePlugins(mockContext())).rejects.toThrow(
          `${names[failIdx]} fatal`,
        );

        // Only plugins up to and including the failing one should have been called
        expect(called).toEqual(names.slice(0, failIdx + 1));
      }),
      { numRuns: 100 },
    );
  });
});

// ── Property 6: Stop in reverse registration order ───────────────────────

describe('Feature: app-subsystem-plugins, Property 6: Stop in reverse registration order', () => {
  beforeAll(() => {
    setRequiredEnvVars();
  });

  afterAll(() => {
    clearRequiredEnvVars();
  });

  /**
   * **Validates: Requirements 4.1**
   *
   * For any sequence of registered plugins that define a stop method,
   * when stopPlugins() is called, the stop methods SHALL be invoked
   * in reverse registration order.
   */
  it('calls stop in reverse registration order', async () => {
    await fc.assert(
      fc.asyncProperty(
        uniquePluginNamesArb,
        fc.infiniteStream(fc.boolean()),
        async (names, hasStopStream) => {
          const testApp = createTestApp();
          const stopOrder: string[] = [];
          const hasStopIterator = hasStopStream[Symbol.iterator]();

          const plugins: IAppSubsystemPlugin[] = names.map((name) => {
            const hasStop = hasStopIterator.next().value;
            const plugin: IAppSubsystemPlugin = {
              name,
              isOptional: true,
              initialize: async () => {
                /* no-op */
              },
            };
            if (hasStop) {
              plugin.stop = async () => {
                stopOrder.push(name);
              };
            }
            return plugin;
          });

          for (const plugin of plugins) {
            testApp.registerSubsystemPlugin(plugin);
          }

          await testApp.stopPlugins();

          // Only plugins with stop() should appear, in reverse registration order
          const expectedOrder = names
            .filter((_, i) => plugins[i].stop !== undefined)
            .reverse();
          expect(stopOrder).toEqual(expectedOrder);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Property 7: Stop errors are non-fatal ────────────────────────────────

describe('Feature: app-subsystem-plugins, Property 7: Stop errors are non-fatal', () => {
  beforeAll(() => {
    setRequiredEnvVars();
  });

  afterAll(() => {
    clearRequiredEnvVars();
  });

  /**
   * **Validates: Requirements 4.2, 4.3**
   *
   * For any set of registered plugins where some plugins' stop methods
   * throw errors, all other plugins that define a stop method SHALL
   * still have their stop methods called.
   */
  it('calls all stop methods even when some throw', async () => {
    await fc.assert(
      fc.asyncProperty(
        uniquePluginNamesArb,
        fc.infiniteStream(fc.boolean()),
        async (names, throwStream) => {
          const testApp = createTestApp();
          const stopCalled: string[] = [];
          const throwIterator = throwStream[Symbol.iterator]();

          const plugins: IAppSubsystemPlugin[] = names.map((name) => {
            const shouldThrow = throwIterator.next().value;
            return {
              name,
              isOptional: true,
              initialize: async () => {
                /* no-op */
              },
              stop: async () => {
                stopCalled.push(name);
                if (shouldThrow) {
                  throw new Error(`${name} stop failed`);
                }
              },
            };
          });

          for (const plugin of plugins) {
            testApp.registerSubsystemPlugin(plugin);
          }

          // Should NOT throw even when some stop() methods fail
          await testApp.stopPlugins();

          // All plugins should have had their stop() called (reverse order)
          expect(stopCalled).toEqual([...names].reverse());
        },
      ),
      { numRuns: 100 },
    );
  });
});
