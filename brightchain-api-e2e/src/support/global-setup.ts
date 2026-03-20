/**
 * globalSetup runs in a standalone Node/ts-jest context where Jest's
 * moduleNameMapper does NOT apply.  We use tsconfig-paths to register
 * the workspace path aliases so that transitive @brightchain/* imports
 * resolve to the .ts source files.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { register } from 'tsconfig-paths';

// Read the workspace tsconfig to pick up paths / baseUrl.
// tsconfig.base.json is JSONC (trailing commas) so we strip them before parsing.
const workspaceRoot = resolve(__dirname, '..', '..', '..');
const tsconfigRaw = readFileSync(
  resolve(workspaceRoot, 'tsconfig.base.json'),
  'utf-8',
);
const tsconfig = JSON.parse(
  tsconfigRaw
    .replace(/\/\/.*$/gm, '') // remove line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // remove block comments
    .replace(/,\s*([\]}])/g, '$1'), // remove trailing commas
);

// Register path aliases for the lifetime of this process
register({
  baseUrl: workspaceRoot,
  paths: tsconfig.compilerOptions.paths,
});

// NOW it is safe to import workspace packages – their @brightchain/*
// transitive deps will resolve through tsconfig-paths.

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { App, Environment } = require('@brightchain/brightchain-api-lib');

declare global {
  var __BRIGHTCHAIN_APP__: ReturnType<typeof App> | undefined;

  var __TEARDOWN_MESSAGE__: string;
}

module.exports = async function () {
  console.log('\n[e2e] Starting BrightChain API server...\n');

  // Configure environment for in-memory / dev mode
  const port = process.env['PORT'] ?? '3001';
  process.env['DEV_DATABASE'] = 'e2e-test-pool';
  process.env['HOST'] = 'localhost';
  process.env['PORT'] = port;
  process.env['SERVER_URL'] = `http://localhost:${port}`;
  process.env['DEBUG'] = 'false';
  process.env['LETS_ENCRYPT_ENABLED'] = 'false';
  process.env['UPNP_ENABLED'] = 'false';
  process.env['USE_TRANSACTIONS'] = 'false';
  process.env['DISABLE_EMAIL_SEND'] = 'true';
  // Enable all features for e2e testing
  process.env['ENABLED_FEATURES'] =
    'BrightChat,BrightHub,BrightMail,BrightPass';
  process.env['JWT_SECRET'] =
    'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';
  process.env['MNEMONIC_HMAC_SECRET'] =
    '809ec1ae1ded0d2e89fabec3f9de33d26e3bb56871c3de91b035fd4671b90795';
  process.env['MNEMONIC_ENCRYPTION_KEY'] =
    '0fddee346b813a97483ee05939edba64dfb7dced822b42b9059f890b86ab496d';
  process.env['SYSTEM_MNEMONIC'] =
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

  // Point dist dirs at workspace dist (may not exist but env needs them)
  const workspaceRoot = resolve(__dirname, '..', '..', '..');
  process.env['API_DIST_DIR'] = resolve(
    workspaceRoot,
    'dist',
    'brightchain-api',
  );
  process.env['REACT_DIST_DIR'] = resolve(
    workspaceRoot,
    'dist',
    'brightchain-react',
  );

  // Ensure the React dist directory and a minimal index.html exist.
  // The AppRouter requires index.html at startup; without a real React
  // build we provide a placeholder so the API server can start.
  const reactDistDir = resolve(workspaceRoot, 'dist', 'brightchain-react');
  const indexHtmlPath = resolve(reactDistDir, 'index.html');
  if (!existsSync(indexHtmlPath)) {
    mkdirSync(reactDistDir, { recursive: true });
    writeFileSync(
      indexHtmlPath,
      '<!doctype html><html><head><title>E2E</title></head><body></body></html>',
    );
    console.log('[e2e] Created placeholder index.html for AppRouter');
  }

  // Create and start the App (no .env file — reads from process.env)
  const env = new Environment();
  const app = new App(env);

  await app.start();

  // Store reference for teardown
  globalThis.__BRIGHTCHAIN_APP__ = app;
  globalThis.__TEARDOWN_MESSAGE__ = '\n[e2e] Tearing down...\n';

  console.log(`[e2e] Server started on port ${port}`);
};
