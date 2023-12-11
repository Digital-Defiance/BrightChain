/**
 * Property-Based Tests for Vault Access Audit Middleware
 *
 * Feature: vault-access-audit-logging
 *
 * Property 1: Authentication state determines accessor type and actor ID
 * Property 2: IP address passthrough
 * Property 3: Status code to access outcome mapping
 * Property 4: Metadata construction preserves request context
 * Property 5: Configuration filtering controls audit entry creation
 */

import {
  AccessOutcome,
  AccessorType,
  type IAuditEntryParams,
  type IAuditService,
  type IVaultAccessAuditMetadata,
} from '@brightchain/digitalburnbag-lib';
import type { NextFunction, Request, Response } from 'express';
import * as fc from 'fast-check';
import { mapStatusToOutcome } from '../access-outcome-mapper';
import {
  ANONYMOUS_ACTOR_SENTINEL,
  createVaultAccessAuditMiddleware,
  type IVaultAccessAuditDeps,
  type IVaultAuditRequest,
} from '../vault-access-audit';

// ─── Test Helpers ───────────────────────────────────────────────────────────

type CapturedEntry = IAuditEntryParams<string>;

function createMockAuditService(): {
  service: IAuditService<string>;
  entries: CapturedEntry[];
} {
  const entries: CapturedEntry[] = [];
  const service: IAuditService<string> = {
    logOperation: jest.fn((entry: CapturedEntry) => {
      entries.push(entry);
      return Promise.resolve();
    }),
    queryAuditLog: jest.fn().mockResolvedValue([]),
    exportAuditLog: jest
      .fn()
      .mockResolvedValue({ entries: [], merkleProofs: [] }),
    generateComplianceReport: jest.fn().mockResolvedValue({
      dateRange: { from: new Date(), to: new Date() },
      merkleProofs: [],
    }),
  };
  return { service, entries };
}

function createMockDeps(
  overrides?: Partial<IVaultAccessAuditDeps<string>>,
): IVaultAccessAuditDeps<string> {
  const { service } = createMockAuditService();
  return {
    auditService: service,
    globalConfig: { enabled: true },
    parseId: (id: string) => id,
    logger: { error: jest.fn() },
    ...overrides,
  };
}

interface MockReqOptions {
  ip?: string;
  method?: string;
  originalUrl?: string;
  userAgent?: string;
  memberId?: string;
  vaultAuditContext?: {
    fileId?: string;
    vaultContainerId?: string;
    sealBroken?: boolean;
    shareLinkId?: string;
  };
}

function createMockReq(opts: MockReqOptions = {}): IVaultAuditRequest {
  const headers: Record<string, string> = {};
  if (opts.userAgent !== undefined) {
    headers['user-agent'] = opts.userAgent;
  }
  return {
    ip: opts.ip ?? '127.0.0.1',
    method: opts.method ?? 'GET',
    originalUrl: opts.originalUrl ?? '/api/test',
    headers,
    get: (name: string) => {
      if (name.toLowerCase() === 'user-agent') {
        return headers['user-agent'];
      }
      return undefined;
    },
    memberContext: opts.memberId
      ? {
          memberId: opts.memberId,
          username: 'testuser',
          type: 'user' as never,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        }
      : undefined,
    vaultAuditContext: opts.vaultAuditContext,
  } as unknown as IVaultAuditRequest;
}

interface MockResResult {
  res: Response;
  emitFinish: () => void;
  setStatusCode: (code: number) => void;
}

function createMockRes(statusCode = 200): MockResResult {
  const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
  let currentStatusCode = statusCode;
  const res = {
    get statusCode() {
      return currentStatusCode;
    },
    on: (event: string, handler: (...args: unknown[]) => void) => {
      if (!listeners[event]) {
        listeners[event] = [];
      }
      listeners[event].push(handler);
      return res;
    },
  } as unknown as Response;

  return {
    res,
    emitFinish: () => {
      const handlers = listeners['finish'] || [];
      for (const handler of handlers) {
        handler();
      }
    },
    setStatusCode: (code: number) => {
      currentStatusCode = code;
    },
  };
}

/**
 * Run the middleware and trigger the finish event, returning captured entries.
 */
async function runMiddleware(
  deps: IVaultAccessAuditDeps<string>,
  req: IVaultAuditRequest,
  statusCode: number,
  routeConfig?: Parameters<
    ReturnType<typeof createVaultAccessAuditMiddleware>
  >[0],
): Promise<CapturedEntry[]> {
  const entries: CapturedEntry[] = [];
  const originalLogOp = deps.auditService.logOperation;
  deps.auditService.logOperation = jest.fn((entry: CapturedEntry) => {
    entries.push(entry);
    return originalLogOp.call(deps.auditService, entry);
  });

  const factory = createVaultAccessAuditMiddleware(deps);
  const middleware = factory(routeConfig);
  const { res, emitFinish, setStatusCode } = createMockRes(statusCode);
  const next: NextFunction = jest.fn();

  middleware(req as unknown as Request, res, next);
  setStatusCode(statusCode);
  emitFinish();

  // Allow the fire-and-forget promise to resolve
  await new Promise((resolve) => setTimeout(resolve, 10));

  return entries;
}

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Vault Access Audit Property Tests', () => {
  /**
   * Property 3: Status code to access outcome mapping
   *
   * For any HTTP status code 100–599, mapStatusToOutcome returns exactly one
   * AccessOutcome: 2xx → Success, 403 → Denied, 404 → NotFound, 5xx → Error,
   * all others → Error.
   *
   * **Validates: Requirements 1.7, 4.1, 4.2, 4.3, 4.4, 5.3**
   */
  describe('Property 3: Status code to access outcome mapping', () => {
    it('maps any status code 100-599 to the correct AccessOutcome', () => {
      fc.assert(
        fc.property(fc.integer({ min: 100, max: 599 }), (statusCode) => {
          const outcome = mapStatusToOutcome(statusCode);

          // Verify it returns exactly one of the four AccessOutcome values
          expect(Object.values(AccessOutcome)).toContain(outcome);

          if (statusCode >= 200 && statusCode < 300) {
            expect(outcome).toBe(AccessOutcome.Success);
          } else if (statusCode === 403) {
            expect(outcome).toBe(AccessOutcome.Denied);
          } else if (statusCode === 404) {
            expect(outcome).toBe(AccessOutcome.NotFound);
          } else if (statusCode >= 500 && statusCode < 600) {
            expect(outcome).toBe(AccessOutcome.Error);
          } else {
            // 1xx, 3xx, 4xx (except 403/404) → Error
            expect(outcome).toBe(AccessOutcome.Error);
          }
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 1: Authentication state determines accessor type and actor ID
   *
   * For any request, if authenticated (user ID present), entry has
   * accessorType = 'authenticated' and actorId = userId; if not authenticated,
   * entry has accessorType = 'anonymous' and actorId = ANONYMOUS_ACTOR_SENTINEL.
   *
   * **Validates: Requirements 1.3, 1.4, 1.5, 2.1, 3.1, 3.2**
   */
  describe('Property 1: Authentication state determines accessor type and actor ID', () => {
    it('sets correct accessor type and actor ID based on auth state', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(),
          fc.uuid(),
          async (isAuthenticated, userId) => {
            const { service, entries } = createMockAuditService();
            const deps = createMockDeps({ auditService: service });

            const req = createMockReq({
              memberId: isAuthenticated ? userId : undefined,
            });

            const capturedEntries = await runMiddleware(deps, req, 200);

            expect(capturedEntries.length).toBe(1);
            const entry = capturedEntries[0];
            const metadata =
              entry.metadata as unknown as IVaultAccessAuditMetadata;

            if (isAuthenticated) {
              expect(metadata.accessorType).toBe(AccessorType.Authenticated);
              expect(entry.actorId).toBe(userId);
            } else {
              expect(metadata.accessorType).toBe(AccessorType.Anonymous);
              expect(entry.actorId).toBe(ANONYMOUS_ACTOR_SENTINEL);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 2: IP address passthrough
   *
   * For any IP address string (IPv4 or IPv6) set as req.ip, the audit entry's
   * ipAddress field is identical with no transformation.
   *
   * **Validates: Requirements 1.6, 2.2, 2.4, 3.3**
   */
  describe('Property 2: IP address passthrough', () => {
    it('preserves IPv4 and IPv6 addresses without transformation', async () => {
      await fc.assert(
        fc.asyncProperty(fc.oneof(fc.ipV4(), fc.ipV6()), async (ipAddress) => {
          const { service, entries } = createMockAuditService();
          const deps = createMockDeps({ auditService: service });

          const req = createMockReq({ ip: ipAddress });

          const capturedEntries = await runMiddleware(deps, req, 200);

          expect(capturedEntries.length).toBe(1);
          expect(capturedEntries[0].ipAddress).toBe(ipAddress);
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 4: Metadata construction preserves request context
   *
   * For any request with arbitrary method, path, user agent, and optional vault
   * context fields, the metadata contains all provided values unmutated and
   * omits unprovided fields.
   *
   * **Validates: Requirements 1.2, 1.8, 4.5, 6.5**
   */
  describe('Property 4: Metadata construction preserves request context', () => {
    it('preserves all request context fields in metadata', async () => {
      const httpMethodArb = fc.constantFrom(
        'GET',
        'POST',
        'PUT',
        'DELETE',
        'PATCH',
        'HEAD',
        'OPTIONS',
      );
      const pathArb = fc
        .array(
          fc.constantFrom('a', 'b', 'c', '/', '-', '_', '0', '1', '2', '3'),
          { minLength: 1, maxLength: 50 },
        )
        .map((chars) => '/' + chars.join(''));
      const userAgentArb = fc.string({ minLength: 0, maxLength: 100 });
      const optionalIdArb = fc.option(fc.uuid(), { nil: undefined });
      const optionalBoolArb = fc.option(fc.boolean(), { nil: undefined });

      await fc.assert(
        fc.asyncProperty(
          httpMethodArb,
          pathArb,
          userAgentArb,
          optionalIdArb, // fileId
          optionalIdArb, // vaultContainerId
          optionalBoolArb, // sealBroken
          optionalIdArb, // shareLinkId
          async (
            method,
            path,
            userAgent,
            fileId,
            vaultContainerId,
            sealBroken,
            shareLinkId,
          ) => {
            const { service } = createMockAuditService();
            const deps = createMockDeps({ auditService: service });

            const vaultAuditContext: Record<string, unknown> = {};
            if (fileId !== undefined) vaultAuditContext['fileId'] = fileId;
            if (vaultContainerId !== undefined)
              vaultAuditContext['vaultContainerId'] = vaultContainerId;
            if (sealBroken !== undefined)
              vaultAuditContext['sealBroken'] = sealBroken;
            if (shareLinkId !== undefined)
              vaultAuditContext['shareLinkId'] = shareLinkId;

            const hasContext = Object.keys(vaultAuditContext).length > 0;

            const req = createMockReq({
              method,
              originalUrl: path,
              userAgent,
              vaultAuditContext: hasContext
                ? (vaultAuditContext as {
                    fileId?: string;
                    vaultContainerId?: string;
                    sealBroken?: boolean;
                    shareLinkId?: string;
                  })
                : undefined,
            });

            const capturedEntries = await runMiddleware(deps, req, 200);

            expect(capturedEntries.length).toBe(1);
            const metadata = capturedEntries[0]
              .metadata as unknown as IVaultAccessAuditMetadata;

            // Core fields always present and unmutated
            expect(metadata.httpMethod).toBe(method);
            expect(metadata.endpointPath).toBe(path);
            expect(metadata.userAgent).toBe(userAgent);

            // Optional context fields: present if provided, absent if not
            if (fileId !== undefined) {
              expect(metadata.fileId).toBe(fileId);
            } else {
              expect(metadata.fileId).toBeUndefined();
            }
            if (vaultContainerId !== undefined) {
              expect(metadata.vaultContainerId).toBe(vaultContainerId);
            } else {
              expect(metadata.vaultContainerId).toBeUndefined();
            }
            if (sealBroken !== undefined) {
              expect(metadata.sealBroken).toBe(sealBroken);
            } else {
              expect(metadata.sealBroken).toBeUndefined();
            }
            if (shareLinkId !== undefined) {
              expect(metadata.shareLinkId).toBe(shareLinkId);
            } else {
              expect(metadata.shareLinkId).toBeUndefined();
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 5: Configuration filtering controls audit entry creation
   *
   * For any combination of global/route config:
   * (a) global disabled → no entry
   * (b) route disabled → no entry
   * (c) failuresOnly + 2xx → no entry
   * (d) both enabled + failuresOnly false → entry created
   *
   * **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**
   */
  describe('Property 5: Configuration filtering controls audit entry creation', () => {
    it('respects global and route configuration flags', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(), // globalEnabled
          fc.boolean(), // routeEnabled
          fc.boolean(), // failuresOnly
          fc.integer({ min: 200, max: 599 }), // statusCode
          async (globalEnabled, routeEnabled, failuresOnly, statusCode) => {
            const { service } = createMockAuditService();
            const deps = createMockDeps({
              auditService: service,
              globalConfig: { enabled: globalEnabled },
            });

            const req = createMockReq();

            const capturedEntries = await runMiddleware(deps, req, statusCode, {
              enabled: routeEnabled,
              failuresOnly,
            });

            const isSuccess = statusCode >= 200 && statusCode < 300;

            if (!globalEnabled) {
              // (a) global disabled → no entry
              expect(capturedEntries.length).toBe(0);
            } else if (!routeEnabled) {
              // (b) route disabled → no entry
              expect(capturedEntries.length).toBe(0);
            } else if (failuresOnly && isSuccess) {
              // (c) failuresOnly + 2xx → no entry
              expect(capturedEntries.length).toBe(0);
            } else {
              // (d) both enabled + (failuresOnly false OR non-2xx) → entry created
              expect(capturedEntries.length).toBe(1);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
