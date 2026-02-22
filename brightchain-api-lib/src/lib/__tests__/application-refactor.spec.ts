/**
 * @fileoverview Unit tests for the refactored App class.
 *
 * Tests cover:
 * - App constructor accepts single Environment parameter (Req 3.3, 7.4)
 * - databasePlugin is set after construction (Req 3.3)
 * - Service registrations after start() (Req 3.4, 7.1)
 */
import { Application as UpstreamApplication } from '@digitaldefiance/node-express-suite';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { App } from '../application';
import { Environment } from '../environment';
import { BrightChainDatabasePlugin } from '../plugins/brightchain-database-plugin';
import type { DefaultBackendIdType } from '../shared-types';

// Ensure the disk store factory is registered
import '../factories/blockStoreFactory';

jest.setTimeout(60_000);

// ── Helpers ──────────────────────────────────────────────────────────────

let tmpDistDir: string;

/** Create a temporary dist directory structure for the upstream AppRouter. */
function setupDistDirs(): void {
  tmpDistDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bc-test-'));
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
  }
}

/** Set the minimum env vars the upstream Environment requires. */
function setRequiredEnvVars(): void {
  process.env['JWT_SECRET'] =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  process.env['MNEMONIC_HMAC_SECRET'] =
    'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
  process.env['MNEMONIC_ENCRYPTION_KEY'] =
    'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
  process.env['NODE_MNEMONIC'] =
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
  // Remove blockstore paths to force memory-backed config
  delete process.env['BRIGHTCHAIN_BLOCKSTORE_PATH'];
  delete process.env['BLOCKSTORE_PATH'];
  setupDistDirs();
}

function clearRequiredEnvVars(): void {
  delete process.env['JWT_SECRET'];
  delete process.env['MNEMONIC_HMAC_SECRET'];
  delete process.env['MNEMONIC_ENCRYPTION_KEY'];
  delete process.env['NODE_MNEMONIC'];
  delete process.env['API_DIST_DIR'];
  delete process.env['REACT_DIST_DIR'];
  delete process.env['BRIGHTCHAIN_BLOCKSTORE_PATH'];
  delete process.env['BLOCKSTORE_PATH'];
  teardownDistDirs();
}

function createTestEnvironment(): Environment<DefaultBackendIdType> {
  setRequiredEnvVars();
  return new Environment<DefaultBackendIdType>(undefined, true, true);
}

// ── 1. App constructor accepts single Environment parameter ──────────────

describe('App – constructor accepts single Environment parameter', () => {
  let env: Environment<DefaultBackendIdType>;
  let app: App<DefaultBackendIdType>;

  beforeAll(() => {
    env = createTestEnvironment();
    app = new App<DefaultBackendIdType>(env);
  });

  afterAll(() => {
    clearRequiredEnvVars();
  });

  it('constructs without throwing when given a valid Environment (Req 7.4)', () => {
    // If we got here, construction succeeded
    expect(app).toBeDefined();
  });

  it('is an instance of the upstream Application (Req 3.3)', () => {
    expect(app).toBeInstanceOf(UpstreamApplication);
  });

  it('stores the provided environment (Req 7.4)', () => {
    expect(app.environment).toBe(env);
  });

  it('exposes a db getter that returns a DocumentStore (Req 7.1)', () => {
    const db = app.db;
    expect(db).toBeDefined();
    expect(typeof db.collection).toBe('function');
  });
});

// ── 2. databasePlugin is set after construction ──────────────────────────

describe('App – databasePlugin is set after construction', () => {
  let env: Environment<DefaultBackendIdType>;
  let app: App<DefaultBackendIdType>;

  beforeAll(() => {
    env = createTestEnvironment();
    app = new App<DefaultBackendIdType>(env);
  });

  afterAll(() => {
    clearRequiredEnvVars();
  });

  it('databasePlugin is not null after construction (Req 3.3)', () => {
    // The upstream Application exposes databasePlugin via a public getter
    expect(app.databasePlugin).not.toBeNull();
  });

  it('databasePlugin is a BrightChainDatabasePlugin instance (Req 3.3)', () => {
    expect(app.databasePlugin).toBeInstanceOf(BrightChainDatabasePlugin);
  });

  it('databasePlugin is registered in the plugin manager (Req 3.3)', () => {
    const plugin = app.databasePlugin;
    expect(plugin).toBeDefined();
    expect(app.plugins.has(plugin!.name)).toBe(true);
  });
});

// ── 3. Service registrations after start() ───────────────────────────────

describe('App – service registrations after start()', () => {
  let env: Environment<DefaultBackendIdType>;
  let app: App<DefaultBackendIdType>;

  beforeAll(async () => {
    env = createTestEnvironment();
    app = new App<DefaultBackendIdType>(env);
    // Pass undefined to skip mongoose connection — plugin handles DB
    await app.start(undefined);
  }, 60_000);

  afterAll(async () => {
    try {
      await app.stop();
    } catch {
      // best-effort cleanup
    }
    clearRequiredEnvVars();
  }, 30_000);

  it('registers blockStore service (Req 7.1)', () => {
    expect(app.services.has('blockStore')).toBe(true);
  });

  it('registers db service (Req 7.1)', () => {
    expect(app.services.has('db')).toBe(true);
  });

  it('registers memberStore service (Req 7.1)', () => {
    expect(app.services.has('memberStore')).toBe(true);
  });

  it('registers energyStore service (Req 7.1)', () => {
    expect(app.services.has('energyStore')).toBe(true);
  });

  it('registers energyLedger service (Req 7.1)', () => {
    expect(app.services.has('energyLedger')).toBe(true);
  });

  it('registers emailService (Req 7.1)', () => {
    expect(app.services.has('emailService')).toBe(true);
  });

  it('registers auth service (Req 7.1)', () => {
    expect(app.services.has('auth')).toBe(true);
  });

  it('registers eventSystem service (Req 7.1)', () => {
    expect(app.services.has('eventSystem')).toBe(true);
  });

  it('app is ready after start (Req 3.4)', () => {
    expect(app.ready).toBe(true);
  });

  it('databasePlugin is connected after start (Req 3.4)', () => {
    const plugin =
      app.databasePlugin as BrightChainDatabasePlugin<DefaultBackendIdType>;
    expect(plugin.isConnected()).toBe(true);
  });
});

// ── 4. API surface compatibility ─────────────────────────────────────────

describe('App – API surface compatibility', () => {
  let app: App<DefaultBackendIdType>;

  beforeAll(() => {
    const env = createTestEnvironment();
    app = new App<DefaultBackendIdType>(env);
  });

  afterAll(() => {
    clearRequiredEnvVars();
  });

  const publicMethods = [
    'getController',
    'setController',
    'getApiRouter',
    'getEventSystem',
    'getWebSocketServer',
    'getClientWebSocketServer',
    'setMessagePassingService',
    'setDiscoveryProtocol',
    'setAvailabilityService',
    'setReconciliationService',
    'setPoolDiscoveryService',
  ] as const;

  it.each([...publicMethods])(
    'public method %s exists (Req 7.2)',
    (methodName) => {
      expect(typeof (app as never)[methodName]).toBe('function');
    },
  );
});
