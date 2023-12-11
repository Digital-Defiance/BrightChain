/**
 * @fileoverview Test utility for creating an in-memory BrightDB plugin instance.
 *
 * Useful for integration tests that need a connected BrightDB instance
 * without requiring a real block store on disk.
 *
 * @module create-test-app
 */

import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { BrightDbEnvironment } from './environment';
import { BrightDbDatabasePlugin } from './plugins/bright-db-database-plugin';

export interface CreateTestAppResult<TID extends PlatformID> {
  plugin: BrightDbDatabasePlugin<TID>;
  environment: BrightDbEnvironment<TID>;
  teardown: () => Promise<void>;
}

/**
 * Create a test-friendly BrightDB plugin with in-memory configuration.
 * Useful for integration tests that need a connected BrightDB instance.
 */
export async function createTestApp<TID extends PlatformID>(
  envOverrides?: Record<string, string>,
): Promise<CreateTestAppResult<TID>> {
  // Set up in-memory environment
  const envVars: Record<string, string> = {
    USE_MEMORY_DOCSTORE: 'true',
    DEV_DATABASE: 'test-pool',
    NODE_ENV: 'test',
    ...envOverrides,
  };

  // Set env vars temporarily
  const originalEnv: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(envVars)) {
    originalEnv[key] = process.env[key];
    process.env[key] = value;
  }

  const environment = new BrightDbEnvironment<TID>();

  // Restore env vars
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  const plugin = new BrightDbDatabasePlugin<TID>(environment);
  await plugin.connect();

  const teardown = async () => {
    await plugin.disconnect();
  };

  return { plugin, environment, teardown };
}
