/**
 * @fileoverview Shared BrightChain application setup function.
 *
 * Extracts the GUID provider configuration, constants updates, runtime
 * registration, and database plugin registration into a single reusable
 * function. Both the API server (`App`) and the init-user-db tool consume
 * this instead of duplicating the setup logic.
 *
 * @module plugins/configure-brightchain-app
 */

import { initializeBrightChain } from '@brightchain/brightchain-lib';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  GuidV4Provider,
  registerNodeRuntimeConfiguration,
} from '@digitaldefiance/node-ecies-lib';
import type {
  IApplication,
  IConstants,
} from '@digitaldefiance/node-express-suite';
import { AppConstants } from '../appConstants';
import type { Environment } from '../environment';
import { BrightChainDatabasePlugin } from './brightchain-database-plugin';

/**
 * Result returned by {@link configureBrightChainApp}.
 * Exposes the plugin so callers can retrieve store references after start().
 */
export interface ConfigureBrightChainResult<TID extends PlatformID> {
  plugin: BrightChainDatabasePlugin<TID>;
}

/**
 * Configure a BrightChain application with GUID-based IDs, runtime
 * constants, and the BrightChain database plugin.
 *
 * This function:
 * 1. Creates a {@link GuidV4Provider} and updates the constants with
 *    GUID byte-length values (`idProvider`, `MEMBER_ID_LENGTH`,
 *    `ECIES.MULTIPLE.RECIPIENT_ID_SIZE`, and conditionally
 *    `ENCRYPTION.RECIPIENT_ID_SIZE`).
 * 2. Calls `registerNodeRuntimeConfiguration('guid-config', constants)`.
 * 3. Creates a {@link BrightChainDatabasePlugin} and registers it on the
 *    application via `useDatabasePlugin()`.
 *
 * @param app - The Application instance (full `App`, plain `Application`, or `BaseApplication`)
 * @param environment - BrightChain environment configuration
 * @param constants - Constants to configure; defaults to {@link AppConstants}
 * @returns The created plugin for callers that need direct access
 */
export function configureBrightChainApp<TID extends PlatformID>(
  app: IApplication<TID>,
  environment: Environment<TID>,
  constants: IConstants = AppConstants,
): ConfigureBrightChainResult<TID> {
  // 1. Configure GUID provider and sync all derived constants
  const guidProvider = new GuidV4Provider();
  constants.idProvider = guidProvider;
  constants.MEMBER_ID_LENGTH = guidProvider.byteLength;
  constants.ECIES = {
    ...constants.ECIES,
    MULTIPLE: {
      ...constants.ECIES.MULTIPLE,
      RECIPIENT_ID_SIZE: guidProvider.byteLength,
    },
  };

  // Sync node-ecies-lib ENCRYPTION constants if present
  if ('ENCRYPTION' in constants && constants.ENCRYPTION) {
    constants.ENCRYPTION = {
      ...constants.ENCRYPTION,
      RECIPIENT_ID_SIZE: guidProvider.byteLength,
    };
  }

  // 2. Register node runtime configuration
  registerNodeRuntimeConfiguration('guid-config', constants);

  // 2b. Initialize BrightChain library (registers BRIGHTCHAIN_CONFIG_KEY
  //     config with GuidV4Provider and creates the ServiceProvider singleton
  //     so that getGlobalServiceProvider() works during seedWithRbac).
  initializeBrightChain();

  // 3. Create and register database plugin
  const plugin = new BrightChainDatabasePlugin<TID>(environment);

  // Application (HTTP) exposes useDatabasePlugin() which stores the plugin
  // reference AND registers it with the PluginManager. BaseApplication (CLI)
  // only has the PluginManager, so fall back to plugins.register().
  if (
    'useDatabasePlugin' in app &&
    typeof app.useDatabasePlugin === 'function'
  ) {
    app.useDatabasePlugin(plugin);
  } else {
    app.plugins.register(plugin);
  }

  return { plugin };
}
