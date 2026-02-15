/**
 * @fileoverview Unit tests for the refactored App class that extends
 * upstream Application from @digitaldefiance/node-express-suite.
 *
 * Tests cover:
 * - 7.1: Constructor and inheritance
 * - 7.2: Start/stop lifecycle
 * - 7.3: API surface compatibility
 */
import {
  MongooseDocumentStore,
  Application as UpstreamApplication,
} from '@digitaldefiance/node-express-suite';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { App } from '../application';
import { Environment } from '../environment';
import { DefaultBackendIdType } from '../shared-types';
import {
  noOpDatabaseInitFunction,
  noOpInitResultHashFunction,
  noOpSchemaMapFactory,
} from '../upstream-stubs';

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
  setupDistDirs();
}

function clearRequiredEnvVars(): void {
  delete process.env['JWT_SECRET'];
  delete process.env['MNEMONIC_HMAC_SECRET'];
  delete process.env['MNEMONIC_ENCRYPTION_KEY'];
  delete process.env['NODE_MNEMONIC'];
  delete process.env['API_DIST_DIR'];
  delete process.env['REACT_DIST_DIR'];
  teardownDistDirs();
}

function createTestEnvironment(): Environment<DefaultBackendIdType> {
  setRequiredEnvVars();
  return new Environment<DefaultBackendIdType>(undefined, true, true);
}

// ── 7.1: Constructor and Inheritance ─────────────────────────────────────

describe('App – constructor and inheritance', () => {
  let env: Environment<DefaultBackendIdType>;
  let app: App<DefaultBackendIdType>;

  beforeAll(() => {
    env = createTestEnvironment();
    app = new App<DefaultBackendIdType>(env);
  });

  afterAll(() => {
    clearRequiredEnvVars();
  });

  it('App instance is instanceof upstream Application (Req 1.1)', () => {
    expect(app).toBeInstanceOf(UpstreamApplication);
  });

  it('App construction succeeds with a valid Environment (Req 1.2, 1.3)', () => {
    expect(app).toBeDefined();
    expect(app.environment).toBe(env);
  });

  it('noOpSchemaMapFactory returns empty object (Req 1.4, 6.1)', () => {
    const result = noOpSchemaMapFactory();
    expect(result).toEqual({});
  });

  it('noOpDatabaseInitFunction returns { success: true } (Req 1.5, 6.2)', async () => {
    const result = await noOpDatabaseInitFunction();
    expect(result).toEqual({ success: true });
  });

  it('noOpInitResultHashFunction returns "no-mongoose"', () => {
    expect(noOpInitResultHashFunction()).toBe('no-mongoose');
  });

  it('DocumentStore is accessible via db getter (Req 4.3)', () => {
    const db = app.db;
    expect(db).toBeDefined();
    // DocumentStore is an interface; verify it has the expected shape
    expect(typeof db.collection).toBe('function');
  });
});

// ── 7.2: Start/Stop Lifecycle ────────────────────────────────────────────

describe('App – start/stop lifecycle', () => {
  let env: Environment<DefaultBackendIdType>;
  let app: App<DefaultBackendIdType>;
  let _connectSpy: jest.SpyInstance;
  let _disconnectSpy: jest.SpyInstance;

  beforeAll(async () => {
    // Mock MongooseDocumentStore.connect/disconnect so the upstream
    // BaseApplication.start() doesn't try to reach a real MongoDB.
    _connectSpy = jest
      .spyOn(MongooseDocumentStore.prototype, 'connect')
      .mockResolvedValue(undefined);
    _disconnectSpy = jest
      .spyOn(MongooseDocumentStore.prototype, 'disconnect')
      .mockResolvedValue(undefined);

    env = createTestEnvironment();
    app = new App<DefaultBackendIdType>(env);

    jest.spyOn(UpstreamApplication.prototype, 'start');
    jest.spyOn(UpstreamApplication.prototype, 'stop');

    await app.start(undefined);
  }, 60_000);

  afterAll(async () => {
    try {
      await app.stop();
    } catch {
      // best-effort cleanup
    }
    jest.restoreAllMocks();
    clearRequiredEnvVars();
  }, 30_000);

  it('App.start() calls super.start() (Req 2.1)', () => {
    expect(UpstreamApplication.prototype.start).toHaveBeenCalled();
  });

  it('After start, BrightChain services are registered (Req 2.2, 2.3, 7.2)', () => {
    expect(app.services.has('memberStore')).toBe(true);
    expect(app.services.has('energyStore')).toBe(true);
    expect(app.services.has('energyLedger')).toBe(true);
    expect(app.services.has('emailService')).toBe(true);
    expect(app.services.has('auth')).toBe(true);
    expect(app.services.has('eventSystem')).toBe(true);
  });

  it('After start, ready is true (Req 2.7)', () => {
    expect(app.ready).toBe(true);
  });
});

describe('App – stop lifecycle', () => {
  let env: Environment<DefaultBackendIdType>;
  let app: App<DefaultBackendIdType>;

  beforeAll(async () => {
    jest
      .spyOn(MongooseDocumentStore.prototype, 'connect')
      .mockResolvedValue(undefined);
    jest
      .spyOn(MongooseDocumentStore.prototype, 'disconnect')
      .mockResolvedValue(undefined);

    env = createTestEnvironment();
    app = new App<DefaultBackendIdType>(env);

    jest.spyOn(UpstreamApplication.prototype, 'stop');

    await app.start(undefined);
    await app.stop();
  }, 60_000);

  afterAll(() => {
    jest.restoreAllMocks();
    clearRequiredEnvVars();
  });

  it('App.stop() calls super.stop() (Req 3.3)', () => {
    expect(UpstreamApplication.prototype.stop).toHaveBeenCalled();
  });

  it('After stop, eventSystem/apiRouter/wsServer are null (Req 3.4)', () => {
    expect(app.getEventSystem()).toBeNull();
    expect(app.getApiRouter()).toBeNull();
    expect(app.getWebSocketServer()).toBeNull();
  });

  it('After stop, ready is false (Req 3.5)', () => {
    expect(app.ready).toBe(false);
  });
});

// ── 7.3: API Surface Compatibility ──────────────────────────────────────

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
    'setMessagePassingService',
    'setDiscoveryProtocol',
    'setAvailabilityService',
    'setReconciliationService',
  ] as const;

  it.each([...publicMethods])(
    'public method %s exists (Req 7.1)',
    (methodName) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(typeof (app as any)[methodName]).toBe('function');
    },
  );
});
