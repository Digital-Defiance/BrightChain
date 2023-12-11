/**
 * @fileoverview Property-based tests for the App subsystem plugin registry.
 *
 * Tests Property 1 (insertion order) and Property 2 (duplicate rejection)
 * from the app-subsystem-plugins design.
 *
 * Strategy: Create a minimal App instance (no start() needed) and exercise
 * registerSubsystemPlugin() with fast-check generated plugin arrays.
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
  tmpDistDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bc-registry-'));
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
  process.env['DEV_DATABASE'] = 'ephemeral-registry-test';
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

/** Create a mock plugin with the given name. */
function mockPlugin(name: string): IAppSubsystemPlugin {
  return {
    name,
    isOptional: true,
    initialize: async (_ctx: ISubsystemContext) => {
      /* no-op */
    },
  };
}

/**
 * Names of plugins pre-registered by the App constructor.
 * Tests must avoid generating these names to prevent collisions.
 */
const BUILTIN_PLUGIN_NAMES = new Set([
  'email',
  'brighthub',
  'brightchat',
  'brightpass',
  'burnbag',
  'brighttrust',
]);

/**
 * Arbitrary that generates an array of 1–20 unique plugin name strings.
 * Names are non-empty alphanumeric strings to avoid edge cases with
 * whitespace or special characters.
 * Filters out names that collide with built-in plugins registered by the App constructor.
 */
const uniquePluginNamesArb = fc.uniqueArray(
  fc
    .stringMatching(/^[a-z][a-z0-9_-]{0,29}$/)
    .filter((name) => !BUILTIN_PLUGIN_NAMES.has(name)),
  {
    minLength: 1,
    maxLength: 20,
  },
);

// ── Property 1: Registry preserves insertion order ───────────────────────

describe('Feature: app-subsystem-plugins, Property 1: Registry preserves insertion order', () => {
  beforeAll(() => {
    setRequiredEnvVars();
  });

  afterAll(() => {
    clearRequiredEnvVars();
  });

  /**
   * **Validates: Requirements 2.1, 2.2, 2.4**
   *
   * For any sequence of uniquely-named plugins registered via
   * registerSubsystemPlugin, the internal plugin registry SHALL contain
   * those plugins in exactly the order they were registered.
   */
  it('preserves insertion order for any sequence of uniquely-named plugins', () => {
    fc.assert(
      fc.property(uniquePluginNamesArb, (names) => {
        // Fresh app per iteration to avoid cross-contamination
        const env = new Environment<DefaultBackendIdType>(
          undefined,
          true,
          true,
        );
        const testApp = new App<DefaultBackendIdType>(env);

        // Access the private registry to capture the pre-registered count
        const registry = (
          testApp as unknown as { subsystemPlugins: IAppSubsystemPlugin[] }
        ).subsystemPlugins;
        const builtinCount = registry.length;

        const plugins = names.map(mockPlugin);
        for (const plugin of plugins) {
          testApp.registerSubsystemPlugin(plugin);
        }

        // Total length = built-in plugins + newly registered plugins
        expect(registry.length).toBe(builtinCount + plugins.length);
        // Newly registered plugins appear after built-ins, in insertion order
        for (let i = 0; i < plugins.length; i++) {
          expect(registry[builtinCount + i].name).toBe(plugins[i].name);
          expect(registry[builtinCount + i]).toBe(plugins[i]); // same reference
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ── Property 2: Duplicate name rejection ─────────────────────────────────

describe('Feature: app-subsystem-plugins, Property 2: Duplicate name rejection', () => {
  beforeAll(() => {
    setRequiredEnvVars();
  });

  afterAll(() => {
    clearRequiredEnvVars();
  });

  /**
   * **Validates: Requirements 2.3**
   *
   * For any string name, if a plugin with that name is already registered,
   * calling registerSubsystemPlugin with another plugin bearing the same
   * name SHALL throw an error.
   */
  it('throws on duplicate plugin name registration', () => {
    fc.assert(
      fc.property(
        fc
          .stringMatching(/^[a-z][a-z0-9_-]{0,29}$/)
          .filter((name) => !BUILTIN_PLUGIN_NAMES.has(name)),
        (name) => {
          const env = new Environment<DefaultBackendIdType>(
            undefined,
            true,
            true,
          );
          const testApp = new App<DefaultBackendIdType>(env);

          // Capture the pre-registered count from the App constructor
          const registry = (
            testApp as unknown as { subsystemPlugins: IAppSubsystemPlugin[] }
          ).subsystemPlugins;
          const builtinCount = registry.length;

          const plugin1 = mockPlugin(name);
          const plugin2 = mockPlugin(name);

          // First registration succeeds
          testApp.registerSubsystemPlugin(plugin1);

          // Second registration with same name throws
          expect(() => testApp.registerSubsystemPlugin(plugin2)).toThrow(
            `Duplicate subsystem plugin name: "${name}" is already registered.`,
          );

          // Registry still has exactly the built-in plugins + one new plugin
          expect(registry.length).toBe(builtinCount + 1);
          expect(registry[builtinCount]).toBe(plugin1);
        },
      ),
      { numRuns: 100 },
    );
  });
});
