/**
 * Unit tests for PostImageController.
 *
 * Tests:
 * 1. Successful image serving with correct Content-Type, Cache-Control, ETag headers
 * 2. 404 for unknown fileId (resolveFile returns null)
 * 3. 304 when If-None-Match matches ETag
 * 4. 400 when fileId param is missing
 * 5. 404 when readFile throws "not found"
 * 6. Vault access audit middleware is applied to the route definition
 *
 * Validates: Requirements 9.1
 */

import {
  PostImageController,
  type IPostImageControllerDeps,
} from '../postImageController';

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Mock file-type module (required by transitive imports)
jest.mock('file-type', () => ({
  fileTypeFromBuffer: async () => null,
  fileTypeStream: async () => null,
}));

// ─── Constants ──────────────────────────────────────────────────────────────

const FILE_ID = 'a1b2c3d4-e5f6-4a90-abcd-ef1234567890';
const VAULT_CONTAINER_ID = 'c0000000-0000-4000-8000-000000000000';
const MIME_TYPE = 'image/png';
const FILE_BUFFER = Buffer.from('fake-image-data');

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Creates a minimal mock application that satisfies the BaseController
 * constructor requirements without needing a full application context.
 */
function createMockApplication() {
  return {
    services: new Map(),
    environment: { mongo: { useTransactions: false }, debug: false },
    constants: {},
    ready: true,
    plugins: {},
    db: undefined,
    getModel: () => ({}),
    getController: () => ({}),
    setController: () => {
      /* noop */
    },
  } as unknown;
}

/**
 * Creates mock dependencies for PostImageController.
 */
function createMockDeps(
  overrides: Partial<IPostImageControllerDeps> = {},
): IPostImageControllerDeps {
  return {
    fileService: {
      readFile: jest.fn().mockResolvedValue(FILE_BUFFER),
    },
    parseId: jest.fn().mockImplementation((id: string) => id),
    resolveFile: jest.fn().mockResolvedValue({
      vaultContainerId: VAULT_CONTAINER_ID,
      mimeType: MIME_TYPE,
    }),
    ...overrides,
  };
}

/**
 * Creates a PostImageController instance with handlers initialized,
 * and returns the serveImage handler for direct invocation.
 */
function createControllerWithHandler(deps?: IPostImageControllerDeps) {
  const app = createMockApplication();
  const controller = new PostImageController(app as never);

  // Trigger route initialization so handlers are bound
  (
    controller as unknown as { initRouteDefinitions(): void }
  ).initRouteDefinitions();

  const mockDeps = deps ?? createMockDeps();
  controller.setDeps(mockDeps);

  const handler = (
    controller as unknown as {
      handlers: {
        serveImage: (req: unknown) => Promise<{
          statusCode: number;
          response: unknown;
        }>;
      };
    }
  ).handlers.serveImage;

  return { controller, handler, deps: mockDeps };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('PostImageController', () => {
  describe('handleServeImage', () => {
    it('returns 200 with correct headers for a valid fileId', async () => {
      const { handler } = createControllerWithHandler();

      const result = await handler({
        params: { fileId: FILE_ID },
        headers: {},
      });

      expect(result.statusCode).toBe(200);

      const response = result.response as Record<string, unknown>;
      expect(response._binary).toBe(true);
      expect(response._buffer).toEqual(FILE_BUFFER);

      const headers = response._headers as Record<string, string>;
      expect(headers['Content-Type']).toBe(MIME_TYPE);
      expect(headers['Cache-Control']).toBe(
        'public, max-age=31536000, immutable',
      );
      expect(headers['ETag']).toBe(`"${FILE_ID}"`);
    });

    it('returns 404 when resolveFile returns null (unknown fileId)', async () => {
      const deps = createMockDeps({
        resolveFile: jest.fn().mockResolvedValue(null),
      });
      const { handler } = createControllerWithHandler(deps);

      const result = await handler({
        params: { fileId: FILE_ID },
        headers: {},
      });

      expect(result.statusCode).toBe(404);

      const response = result.response as { error: { code: string } };
      expect(response.error.code).toBe('POST_IMAGE_NOT_FOUND');
    });

    it('returns 304 when If-None-Match matches the ETag', async () => {
      const { handler } = createControllerWithHandler();

      const result = await handler({
        params: { fileId: FILE_ID },
        headers: { 'if-none-match': `"${FILE_ID}"` },
      });

      expect(result.statusCode).toBe(304);

      const response = result.response as {
        _headers: Record<string, string>;
      };
      expect(response._headers.ETag).toBe(`"${FILE_ID}"`);
    });

    it('returns 400 when fileId param is missing', async () => {
      const { handler } = createControllerWithHandler();

      const result = await handler({
        params: {},
        headers: {},
      });

      expect(result.statusCode).toBe(400);

      const response = result.response as { error: { code: string } };
      expect(response.error.code).toBe('MISSING_FILE_ID');
    });

    it('returns 404 when readFile throws a "not found" error', async () => {
      const deps = createMockDeps({
        fileService: {
          readFile: jest.fn().mockRejectedValue(new Error('File not found')),
        },
      });
      const { handler } = createControllerWithHandler(deps);

      const result = await handler({
        params: { fileId: FILE_ID },
        headers: {},
      });

      expect(result.statusCode).toBe(404);

      const response = result.response as { error: { code: string } };
      expect(response.error.code).toBe('POST_IMAGE_NOT_FOUND');
    });

    it('returns 500 for unexpected errors', async () => {
      const deps = createMockDeps({
        fileService: {
          readFile: jest.fn().mockRejectedValue(new Error('Disk I/O failure')),
        },
      });
      const { handler } = createControllerWithHandler(deps);

      const result = await handler({
        params: { fileId: FILE_ID },
        headers: {},
      });

      expect(result.statusCode).toBe(500);

      const response = result.response as {
        error: { code: string; message: string };
      };
      expect(response.error.code).toBe('INTERNAL_ERROR');
      expect(response.error.message).toContain('Disk I/O failure');
    });

    it('calls resolveFile and readFile with correct arguments', async () => {
      const deps = createMockDeps();
      const { handler } = createControllerWithHandler(deps);

      await handler({
        params: { fileId: FILE_ID },
        headers: {},
      });

      expect(deps.resolveFile).toHaveBeenCalledWith(FILE_ID);
      expect(deps.parseId).toHaveBeenCalledWith(VAULT_CONTAINER_ID);
      expect(deps.parseId).toHaveBeenCalledWith(FILE_ID);
      expect(deps.fileService.readFile).toHaveBeenCalledWith(
        VAULT_CONTAINER_ID,
        FILE_ID,
      );
    });

    it('attaches vaultAuditContext to the request for audit middleware', async () => {
      const { handler } = createControllerWithHandler();

      const req = {
        params: { fileId: FILE_ID },
        headers: {},
      } as Record<string, unknown>;

      await handler(req);

      expect(req['vaultAuditContext']).toEqual({
        fileId: FILE_ID,
        vaultContainerId: VAULT_CONTAINER_ID,
      });
    });
  });

  describe('route definitions', () => {
    it('registers a GET /:fileId route with serveImage handler', () => {
      const app = createMockApplication();
      const controller = new PostImageController(app as never);

      (
        controller as unknown as { initRouteDefinitions(): void }
      ).initRouteDefinitions();

      const routeDefs = (
        controller as unknown as {
          routeDefinitions: Array<{
            method: string;
            path: string;
            handlerKey: string;
            middleware?: unknown[];
          }>;
        }
      ).routeDefinitions;

      expect(routeDefs).toHaveLength(1);
      expect(routeDefs[0].method).toBe('get');
      expect(routeDefs[0].path).toBe('/:fileId');
      expect(routeDefs[0].handlerKey).toBe('serveImage');
    });

    it('applies vault access audit middleware to the route', () => {
      const app = createMockApplication();
      const controller = new PostImageController(app as never);

      (
        controller as unknown as { initRouteDefinitions(): void }
      ).initRouteDefinitions();

      const routeDefs = (
        controller as unknown as {
          routeDefinitions: Array<{
            middleware?: unknown[];
          }>;
        }
      ).routeDefinitions;

      // The route should have middleware applied (the deferred audit middleware)
      expect(routeDefs[0].middleware).toBeDefined();
      expect(routeDefs[0].middleware!.length).toBeGreaterThanOrEqual(1);
      // The middleware should be a function (the deferred audit middleware factory output)
      expect(typeof routeDefs[0].middleware![0]).toBe('function');
    });

    it('configures the route as public (no authentication required)', () => {
      const app = createMockApplication();
      const controller = new PostImageController(app as never);

      (
        controller as unknown as { initRouteDefinitions(): void }
      ).initRouteDefinitions();

      const routeDefs = (
        controller as unknown as {
          routeDefinitions: Array<{
            useAuthentication: boolean;
            useCryptoAuthentication: boolean;
          }>;
        }
      ).routeDefinitions;

      expect(routeDefs[0].useAuthentication).toBe(false);
      expect(routeDefs[0].useCryptoAuthentication).toBe(false);
    });
  });

  describe('setAuditDeps', () => {
    it('wires audit deps after initRouteDefinitions', () => {
      const app = createMockApplication();
      const controller = new PostImageController(app as never);

      (
        controller as unknown as { initRouteDefinitions(): void }
      ).initRouteDefinitions();

      // setAuditDeps should not throw when called after init
      expect(() => {
        controller.setAuditDeps({
          auditService: { logOperation: jest.fn() },
          globalConfig: { enabled: true },
          parseId: (id: string) => id,
          logger: { error: jest.fn() },
        } as never);
      }).not.toThrow();
    });
  });

  describe('dependency initialization', () => {
    it('throws when handler is called without setDeps', async () => {
      const app = createMockApplication();
      const controller = new PostImageController(app as never);

      (
        controller as unknown as { initRouteDefinitions(): void }
      ).initRouteDefinitions();

      // Do NOT call setDeps — handler should throw via getDeps()
      const handler = (
        controller as unknown as {
          handlers: {
            serveImage: (req: unknown) => Promise<{
              statusCode: number;
              response: unknown;
            }>;
          };
        }
      ).handlers.serveImage;

      const result = await handler({
        params: { fileId: FILE_ID },
        headers: {},
      });

      // The error is caught by the try/catch in handleServeImage
      // and since "dependencies not initialized" doesn't contain "not found",
      // it returns 500
      expect(result.statusCode).toBe(500);
      const response = result.response as {
        error: { code: string; message: string };
      };
      expect(response.error.code).toBe('INTERNAL_ERROR');
      expect(response.error.message).toContain('dependencies not initialized');
    });
  });
});
