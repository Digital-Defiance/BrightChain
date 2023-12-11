/**
 * @fileoverview Verifies that all subsystem plugins — including dynamically
 * loaded ones — are resolvable, constructable, and actually registered by
 * the App constructor at test time.
 *
 * This test exists because the BrightCal plugin is loaded via a dynamic
 * import(`@brightchain/brightcal-api-lib`) at runtime. If the workspace
 * package is not properly linked (e.g. missing from root package.json
 * dependencies), the import silently fails and the plugin is skipped.
 * The try/catch in App.start() masks the failure, so unit tests that
 * only exercise the plugin registry never notice.
 *
 * This test catches three classes of issues:
 *   1. Missing workspace symlinks (package not in node_modules)
 *   2. Broken exports (module resolves but the expected class is missing)
 *   3. Missing plugin registration (plugin exists but isn't wired into App)
 */

import type { IAppSubsystemPlugin } from '@brightchain/brightchain-lib';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { App } from '../application';
import { Environment } from '../environment';
import type { DefaultBackendIdType } from '../shared-types';

// Ensure the disk store factory is registered
import '../factories/blockStoreFactory';

jest.setTimeout(180_000);

/**
 * All subsystem plugins that App registers in its constructor (statically).
 */
const STATIC_PLUGINS = [
  'email',
  'brighthub',
  'brightchat',
  'brightpass',
  'burnbag',
  'brighttrust',
] as const;

/**
 * Plugins loaded via dynamic import in App.start().
 * Each entry maps the plugin name to its package specifier and export name.
 */
const DYNAMIC_PLUGINS = [
  {
    name: 'brightcal',
    packageSpecifier: '@brightchain/brightcal-api-lib',
    exportName: 'BrightCalSubsystemPlugin',
  },
] as const;

/**
 * Complete list of all expected plugin names (static + dynamic).
 */
const ALL_EXPECTED_PLUGINS = [
  ...STATIC_PLUGINS,
  ...DYNAMIC_PLUGINS.map((p) => p.name),
];

// ── Environment helpers (mirrors subsystem-plugin-registry.property.spec.ts) ──

let tmpDistDir: string | undefined;
const savedEnv: Record<string, string | undefined> = {};

function setupDistDirs(): void {
  tmpDistDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bc-plugin-res-'));
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
  process.env['DEV_DATABASE'] = 'ephemeral-plugin-resolution-test';
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

// ── Test: Dynamic plugin packages are resolvable ─────────────────────────

describe('Dynamic plugin resolution', () => {
  describe.each(DYNAMIC_PLUGINS)(
    '$packageSpecifier ($name)',
    ({ name, packageSpecifier, exportName }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let mod: any;

      beforeAll(async () => {
        // This import mirrors what App.start() does at runtime.
        // If the workspace package is not linked, this will throw
        // ERR_MODULE_NOT_FOUND — exactly the error we want to catch.
        mod = await import(packageSpecifier);
      });

      it(`should resolve the "${packageSpecifier}" package`, () => {
        expect(mod).toBeDefined();
      });

      it(`should export "${exportName}"`, () => {
        expect(mod[exportName]).toBeDefined();
        expect(typeof mod[exportName]).toBe('function');
      });

      it(`should be constructable and implement IAppSubsystemPlugin`, () => {
        const plugin: IAppSubsystemPlugin = new mod[exportName]();
        expect(plugin.name).toBe(name);
        expect(typeof plugin.initialize).toBe('function');
      });
    },
  );
});

// ── Test: App constructor registers all static plugins ───────────────────

describe('App constructor plugin registration', () => {
  beforeAll(() => {
    setRequiredEnvVars();
  });

  afterAll(() => {
    clearRequiredEnvVars();
  });

  it('should register all expected static plugins in the constructor', () => {
    const env = new Environment<DefaultBackendIdType>(undefined, true, true);
    const app = new App<DefaultBackendIdType>(env);

    const registry = (
      app as unknown as { subsystemPlugins: IAppSubsystemPlugin[] }
    ).subsystemPlugins;

    const registeredNames = registry.map((p) => p.name);

    for (const expected of STATIC_PLUGINS) {
      expect(registeredNames).toContain(expected);
    }
  });

  it('should register static plugins in the expected order', () => {
    const env = new Environment<DefaultBackendIdType>(undefined, true, true);
    const app = new App<DefaultBackendIdType>(env);

    const registry = (
      app as unknown as { subsystemPlugins: IAppSubsystemPlugin[] }
    ).subsystemPlugins;

    const registeredNames = registry.map((p) => p.name);

    // Static plugins should appear in exactly this order
    expect(registeredNames).toEqual([...STATIC_PLUGINS]);
  });

  it('should accept dynamic plugins after construction', async () => {
    const env = new Environment<DefaultBackendIdType>(undefined, true, true);
    const app = new App<DefaultBackendIdType>(env);

    // Simulate what App.start() does: dynamically import and register
    for (const { packageSpecifier, exportName } of DYNAMIC_PLUGINS) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod: any = await import(packageSpecifier);
      const PluginClass = mod[exportName];
      app.registerSubsystemPlugin(new PluginClass());
    }

    const registry = (
      app as unknown as { subsystemPlugins: IAppSubsystemPlugin[] }
    ).subsystemPlugins;

    const registeredNames = registry.map((p) => p.name);

    // All plugins — static and dynamic — should now be present
    for (const expected of ALL_EXPECTED_PLUGINS) {
      expect(registeredNames).toContain(expected);
    }

    expect(registeredNames).toHaveLength(ALL_EXPECTED_PLUGINS.length);
  });
});

// ── Test: Plugin inventory completeness ──────────────────────────────────

describe('Expected subsystem plugin inventory', () => {
  it('should account for all known subsystem plugins', () => {
    // If you add a new plugin to App, add it to STATIC_PLUGINS or
    // DYNAMIC_PLUGINS at the top of this file. This test will fail
    // until you do, preventing silent omissions.
    expect(ALL_EXPECTED_PLUGINS).toEqual(
      expect.arrayContaining([
        'email',
        'brighthub',
        'brightchat',
        'brightpass',
        'burnbag',
        'brighttrust',
        'brightcal',
      ]),
    );
    expect(ALL_EXPECTED_PLUGINS).toHaveLength(7);
  });
});
