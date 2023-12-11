/**
 * CLI Entry Point: seed:org-roles
 *
 * Populates the local BrightDb with sample organizations, healthcare
 * roles, and invitations for development. Uses the same bootstrap path
 * as the API server (configureBrightChainApp + BrightChainDatabasePlugin).
 *
 * Usage: yarn seed:org-roles
 */

// Side-effect import: register AzureBlobBlockStore factory
import '@brightchain/azure-store';

import {
  AppConstants,
  configureBrightChainApp,
  ConsoleSeedLogger,
  DefaultBackendIdType,
  Environment as BrightChainEnvironment,
  seedOrgRoles,
} from '@brightchain/brightchain-api-lib';
import { initializeBrightChain } from '@brightchain/brightchain-lib';
import {
  GuidV4Provider,
  registerNodeRuntimeConfiguration,
} from '@digitaldefiance/node-ecies-lib';
import {
  BaseApplication,
  createNoOpDatabase,
  type IConstants,
} from '@digitaldefiance/node-express-suite';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

async function main() {
  initializeBrightChain();

  // Pre-load .env so environment variables are available
  const envFilePath = join(__dirname, '.env');
  if (existsSync(envFilePath)) {
    const envContents = readFileSync(envFilePath, 'utf-8');
    for (const line of envContents.split('\n')) {
      const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"]*)"?\s*$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2];
      }
    }
  }

  // Configure GuidV4Provider before constructing Environment
  const guidProvider = new GuidV4Provider();
  const constants = AppConstants as IConstants;
  constants.idProvider = guidProvider;
  constants.MEMBER_ID_LENGTH = guidProvider.byteLength;
  constants.ECIES = {
    ...constants.ECIES,
    MULTIPLE: {
      ...constants.ECIES.MULTIPLE,
      RECIPIENT_ID_SIZE: guidProvider.byteLength,
    },
  };
  if ('ENCRYPTION' in constants && constants.ENCRYPTION) {
    constants.ENCRYPTION = {
      ...constants.ENCRYPTION,
      RECIPIENT_ID_SIZE: guidProvider.byteLength,
    };
  }
  registerNodeRuntimeConfiguration('guid-config', constants);

  const env = new BrightChainEnvironment(envFilePath, true, true, constants);

  const app = new BaseApplication<DefaultBackendIdType, unknown, IConstants>(
    env,
    createNoOpDatabase(),
    AppConstants,
  );

  const { plugin } = configureBrightChainApp(app, env, constants, {
    skipAutoSeed: true,
  });

  await plugin.connect();
  await app.plugins.initAll(app);

  try {
    const logger = new ConsoleSeedLogger();
    await seedOrgRoles(plugin.brightDb, logger);
    console.log('[seed:org-roles] Done.');
  } catch (err) {
    console.error(
      `[seed:org-roles] ERROR: ${err instanceof Error ? err.message : String(err)}`,
    );
    await app.plugins.stopAll();
    process.exit(1);
  }

  await app.plugins.stopAll();
  process.exit(0);
}

main().catch((err) => {
  console.error(
    `[seed:org-roles] ERROR: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
});
