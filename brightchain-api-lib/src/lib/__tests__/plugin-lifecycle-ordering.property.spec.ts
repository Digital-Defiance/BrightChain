/**
 * @fileoverview Property-based test for plugin lifecycle ordering.
 *
 * Feature: brightchain-plugin-architecture, Property 5: Plugin lifecycle ordering
 *
 * **Validates: Requirements 6.1**
 *
 * For any Application with a registered BrightChainDatabasePlugin, when start()
 * is called, the plugin's connect() must complete before init(app) is called.
 * This is verified by checking that during init(), isConnected() returns true
 * and all store accessors are available.
 *
 * Strategy: Create an App instance with mocked HTTP listen (to avoid real servers),
 * spy on the plugin's connect() and init() methods to record lifecycle ordering
 * and verify state invariants during init(). Use fast-check to vary environment
 * configuration across iterations.
 */

import * as fc from 'fast-check';
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import { App } from '../application';
import { Environment } from '../environment';
import { BrightChainDatabasePlugin } from '../plugins/brightchain-database-plugin';
import type { DefaultBackendIdType } from '../shared-types';

// Ensure the disk store factory is registered
import '../factories/blockStoreFactory';

jest.setTimeout(120_000);

// ── Helpers ──────────────────────────────────────────────────────────────

let tmpDistDir: string | undefined;

/** Create a temporary dist directory structure for the upstream AppRouter. */
function setupDistDirs(): void {
  tmpDistDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bc-lifecycle-'));
  const reactDist = path.join(tmpDistDir, 'dist', 'react');
  const apiDist = path.join(tmpDistDir, 'dist', 'api');
  const viewsDir = path.join(apiDist, 'views');
  fs.mkdirSync(reactDist, { recursive: true });
  fs.mkdirSync(viewsDir, { recursive: true });
  fs.writeFileSync(path.join(reactDist, 'index.html'), '<html></html>');
  fs.writeFileSync(
    path.join(viewsDir, 'index.ejs'),
    '<html><%- locals.title %></html>',
  );
  process.env['REACT_DIST_DIR'] = reactDist;
  process.env['API_DIST_DIR'] = apiDist;
}

function teardownDistDirs(): void {
  if (tmpDistDir) {
    fs.rmSync(tmpDistDir, { recursive: true, force: true });
    tmpDistDir = undefined;
  }
}

/** Saved env vars for cleanup. */
const savedEnv: Record<string, string | undefined> = {};

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

  // Save and remove blockstore paths to force memory-backed config
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

/**
 * Check whether all store accessors on the plugin return non-null values
 * without throwing.
 */
function checkAccessorsAvailable(
  plugin: BrightChainDatabasePlugin<DefaultBackendIdType>,
): boolean {
  try {
    return (
      plugin.blockStore != null &&
      plugin.memberStore != null &&
      plugin.energyStore != null &&
      plugin.brightChainDb != null &&
      plugin.database != null
    );
  } catch {
    return false;
  }
}

// ── Property 5: Plugin lifecycle ordering ────────────────────────────────

describe('Feature: brightchain-plugin-architecture, Property 5: Plugin lifecycle ordering', () => {
  /**
   * **Validates: Requirements 6.1**
   *
   * For any Application with a registered BrightChainDatabasePlugin, when
   * start() is called, the plugin's connect() must complete before init(app)
   * is called. We verify:
   *
   * 1. connect() completed before init() started (ordering)
   * 2. During init(), isConnected() returns true
   * 3. During init(), all store accessors return non-null values
   *
   * We use fc.record to vary configuration parameters across iterations.
   * The lifecycle ordering is deterministic (upstream Application always calls
   * connect before initAll), but the property must hold for any valid
   * environment configuration. The parameter variation ensures fast-check
   * exercises the full iteration count.
   */
  it('connect() completes before init() is called, and during init() the plugin is fully connected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // Vary parameters to ensure fast-check runs the configured number
          // of iterations. The lifecycle ordering must hold regardless.
          seed: fc.boolean(),
          portOffset: fc.integer({ min: 0, max: 100 }),
        }),
        async () => {
          // Set env vars fresh for each iteration (App construction reads them)
          setRequiredEnvVars();

          const env = new Environment<DefaultBackendIdType>(
            undefined,
            true,
            true,
          );

          const app = new App<DefaultBackendIdType>(env);

          // Mock expressApp.listen to return a real http.Server (needed by
          // WebSocketMessageServer) without actually binding to a port.
          const mockServer = http.createServer();
          const listenSpy = jest
            .spyOn(app.expressApp, 'listen')
            .mockImplementation(((
              _port: number,
              _host: string,
              callback: () => void,
            ) => {
              if (callback) callback();
              return mockServer;
            }) as never);

          // Get the plugin registered during App construction
          const plugin =
            app.databasePlugin as BrightChainDatabasePlugin<DefaultBackendIdType>;
          expect(plugin).toBeDefined();

          // Instrument the plugin to record lifecycle events and state
          const lifecycleLog: Array<{
            event: 'connect-start' | 'connect-end' | 'init-start' | 'init-end';
            isConnected: boolean;
            accessorsAvailable: boolean;
          }> = [];

          const originalConnect = plugin.connect.bind(plugin);
          const originalInit = plugin.init.bind(plugin);

          jest
            .spyOn(plugin, 'connect')
            .mockImplementation(async (uri?: string) => {
              lifecycleLog.push({
                event: 'connect-start',
                isConnected: plugin.isConnected(),
                accessorsAvailable: false,
              });

              await originalConnect(uri);

              lifecycleLog.push({
                event: 'connect-end',
                isConnected: plugin.isConnected(),
                accessorsAvailable: checkAccessorsAvailable(plugin),
              });
            });

          jest
            .spyOn(plugin, 'init')
            .mockImplementation(
              async (initApp: Parameters<typeof plugin.init>[0]) => {
                // Record state at the moment init() is called
                lifecycleLog.push({
                  event: 'init-start',
                  isConnected: plugin.isConnected(),
                  accessorsAvailable: checkAccessorsAvailable(plugin),
                });

                await originalInit(initApp);

                lifecycleLog.push({
                  event: 'init-end',
                  isConnected: plugin.isConnected(),
                  accessorsAvailable: checkAccessorsAvailable(plugin),
                });
              },
            );

          try {
            await app.start(undefined);

            // ── Verify lifecycle ordering ──

            const connectEnd = lifecycleLog.find(
              (e) => e.event === 'connect-end',
            );
            const initStart = lifecycleLog.find(
              (e) => e.event === 'init-start',
            );

            // Both connect and init must have been called
            expect(connectEnd).toBeDefined();
            expect(initStart).toBeDefined();

            // connect-end must precede init-start in the log
            const connectEndIndex = lifecycleLog.indexOf(connectEnd!);
            const initStartIndex = lifecycleLog.indexOf(initStart!);
            expect(connectEndIndex).toBeLessThan(initStartIndex);

            // ── Verify state during init() ──

            // During init(), isConnected() must return true
            expect(initStart!.isConnected).toBe(true);

            // During init(), all store accessors must be available
            expect(initStart!.accessorsAvailable).toBe(true);

            // ── Verify final state ──

            // After start(), plugin should still be connected
            expect(plugin.isConnected()).toBe(true);

            // Verify the ordering sequence is exactly as expected
            const eventSequence = lifecycleLog.map((e) => e.event);
            expect(eventSequence).toEqual([
              'connect-start',
              'connect-end',
              'init-start',
              'init-end',
            ]);
          } finally {
            try {
              await app.stop();
            } catch {
              // best-effort cleanup
            }
            // Close the mock server if it's listening
            mockServer.close();
            listenSpy.mockRestore();
            clearRequiredEnvVars();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
