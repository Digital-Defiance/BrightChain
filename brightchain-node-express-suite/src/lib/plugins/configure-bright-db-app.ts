/**
 * @fileoverview Generic BrightDB application configuration helper.
 *
 * Creates a BrightDbDatabasePlugin and registers it on the application.
 * Domain-specific setup (GUID provider, constants, initializeBrightChain)
 * is handled by the consuming library's configureBrightChainApp.
 *
 * @module plugins/configure-bright-db-app
 */

import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import type { IApplication } from '@digitaldefiance/node-express-suite';
import { BrightDbDatabasePlugin, type IBrightDbDatabasePluginOptions } from './bright-db-database-plugin';
import type { BrightDbEnvironment } from '../environment';

export interface ConfigureBrightDbAppResult<TID extends PlatformID> {
  plugin: BrightDbDatabasePlugin<TID>;
}

/**
 * Configure a generic BrightDB application with the database plugin.
 *
 * Creates a BrightDbDatabasePlugin and registers it on the application.
 * Domain-specific setup (GUID provider, constants, initializeBrightChain)
 * is handled by the consuming library's configureBrightChainApp.
 */
export function configureBrightDbApp<TID extends PlatformID>(
  app: IApplication<TID>,
  environment: BrightDbEnvironment<TID>,
  pluginOptions: IBrightDbDatabasePluginOptions = {},
): ConfigureBrightDbAppResult<TID> {
  const plugin = new BrightDbDatabasePlugin<TID>(environment, pluginOptions);

  if ('useDatabasePlugin' in app && typeof app.useDatabasePlugin === 'function') {
    app.useDatabasePlugin(plugin);
  } else {
    app.plugins.register(plugin);
  }

  return { plugin };
}
