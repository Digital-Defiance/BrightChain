import { App, Environment } from '@brightchain/brightchain-api-lib';
import { existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Locate the .env file by checking several conventional paths:
 * 1. Next to the running script (works when .env is copied to dist)
 * 2. brightchain-api/src/.env relative to workspace root (dev / nx serve)
 * 3. Workspace root .env
 * Returns undefined if none found (Environment will fall back to process.env).
 */
function findEnvFile(): string | undefined {
  const candidates = [
    resolve(__dirname, '.env'),
    resolve(process.cwd(), 'brightchain-api', 'src', '.env'),
    resolve(process.cwd(), '.env'),
  ];
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
