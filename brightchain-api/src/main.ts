// Side-effect imports: register cloud store factories with BlockStoreFactory
// so that brightchainDatabaseInit can create them when BRIGHTCHAIN_BLOCKSTORE_TYPE
// is set to 'azure' or 's3'. Must happen before App.start().
import '@brightchain/azure-store';

import { App, Environment } from '@brightchain/brightchain-api-lib';
import { existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Locate the .env file by checking several conventional paths in priority order:
 * 1. Path from BRIGHTCHAIN_ENV_FILE env var (explicit override — highest priority)
 * 2. Next to the running script in dist/ (production: .env copied alongside binary)
 * 3. Workspace root .env (production: .env at repo/project root)
 * 4. brightchain-api/src/.env relative to cwd (dev / nx serve fallback — lowest priority)
 *
 * The dev source .env is intentionally last so it never shadows a production .env.
 * Returns undefined if none found (Environment will fall back to process.env).
 */
function findEnvFile(): string | undefined {
  const candidates = [
    // Explicit override — operators can set this to any path
    process.env['BRIGHTCHAIN_ENV_FILE']
      ? resolve(process.env['BRIGHTCHAIN_ENV_FILE'])
      : undefined,
    // Production: .env copied next to the compiled main.js in dist/
    resolve(__dirname, '.env'),
    // Production: .env at the workspace/project root
    resolve(process.cwd(), '.env'),
    // Dev fallback: source .env (nx serve / local development only)
    resolve(process.cwd(), 'brightchain-api', 'src', '.env'),
  ].filter((p): p is string => p !== undefined);
  return candidates.find((p) => existsSync(p));
}

async function bootstrap() {
  try {
    const envPath = findEnvFile();
    const env = new Environment(envPath);

    const app = new App(env);
    await app.start();
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();
