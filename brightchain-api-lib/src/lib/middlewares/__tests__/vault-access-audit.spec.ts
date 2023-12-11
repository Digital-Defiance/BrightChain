/**
 * Unit Tests for Vault Access Audit Middleware
 *
 * Feature: vault-access-audit-logging
 *
 * Tests edge cases and specific scenarios:
 * - Seal broken flag in metadata (Req 1.9)
 * - Ledger write failure logs error and does not interrupt response (Req 5.8, 9.3)
 * - Response is sent before logOperation resolves (Req 5.4, 9.1)
 * - Factory throws on missing auditService dependency
 * - VaultFileAccessed operation type is used (Req 6.2)
 * - Missing req.ip falls back to '0.0.0.0'
 * - Missing user-agent stored as empty string
 */

import {
  FileAuditOperationType,
  type IAuditEntryParams,
  type IAuditService,
  type IVaultAccessAuditMetadata,
} from '@brightchain/digitalburnbag-lib';
import type { NextFunction, Request, Response } from 'express';
import {
  createVaultAccessAuditMiddleware,
  type IVaultAccessAuditDeps,
  type IVaultAuditRequest,
} from '../vault-access-audit';

// ─── Test Helpers ───────────────────────────────────────────────────────────

type CapturedEntry = IAuditEntryParams<string>;

function createMockAuditService(
  logImpl?: (entry: CapturedEntry) => Promise<void>,
): {
  service: IAuditService<string>;
  entries: CapturedEntry[];
} {
  const entries: CapturedEntry[] = [];
  const service: IAuditService<string> = {
    logOperation: jest.fn((entry: CapturedEntry) => {
      entries.push(entry);
      if (logImpl) {
        return logImpl(entry);
      }
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

function createMockReq(
  opts: {
    ip?: string | undefined;
    method?: string;
    originalUrl?: string;
    userAgent?: string | undefined;
    memberId?: string;
    vaultAuditContext?: {
      fileId?: string;
      vaultContainerId?: string;
      sealBroken?: boolean;
      shareLinkId?: string;
    };
  } = {},
): IVaultAuditRequest {
  const headers: Record<string, string> = {};
  if (opts.userAgent !== undefined) {
    headers['user-agent'] = opts.userAgent;
  }
  return {
    ip: opts.ip,
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

function createMockRes(statusCode = 200): {
  res: Response;
  emitFinish: () => void;
  setStatusCode: (code: number) => void;
} {
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

// ─── Unit Tests ─────────────────────────────────────────────────────────────

describe('Vault Access Audit Middleware - Unit Tests', () => {
  describe('Factory validation', () => {
    it('throws on missing auditService dependency', () => {
      expect(() => {
        createVaultAccessAuditMiddleware({
          auditService: null as unknown as IAuditService<string>,
          globalConfig: { enabled: true },
          parseId: (id: string) => id,
          logger: { error: jest.fn() },
        });
      }).toThrow('auditService is required');
    });

    it('throws on undefined auditService dependency', () => {
      expect(() => {
        createVaultAccessAuditMiddleware({
          auditService: undefined as unknown as IAuditService<string>,
          globalConfig: { enabled: true },
          parseId: (id: string) => id,
          logger: { error: jest.fn() },
        });
      }).toThrow('auditService is required');
    });
  });

  describe('VaultFileAccessed operation type', () => {
    it('uses FileAuditOperationType.VaultFileAccessed in the entry', async () => {
      const { service, entries } = createMockAuditService();
      const deps = createMockDeps({ auditService: service });

      const factory = createVaultAccessAuditMiddleware(deps);
      const middleware = factory();
      const req = createMockReq();
      const { res, emitFinish } = createMockRes(200);
      const next: NextFunction = jest.fn();

      middleware(req as unknown as Request, res, next);
      emitFinish();

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(entries.length).toBe(1);
      expect(entries[0].operationType).toBe(
        FileAuditOperationType.VaultFileAccessed,
      );
    });
  });

  describe('Seal broken flag', () => {
    it('includes sealBroken: true in metadata when context has sealBroken', async () => {
      const { service, entries } = createMockAuditService();
      const deps = createMockDeps({ auditService: service });

      const factory = createVaultAccessAuditMiddleware(deps);
      const middleware = factory();
      const req = createMockReq({
        vaultAuditContext: { sealBroken: true },
      });
      const { res, emitFinish } = createMockRes(200);
      const next: NextFunction = jest.fn();

      middleware(req as unknown as Request, res, next);
      emitFinish();

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(entries.length).toBe(1);
      const metadata = entries[0]
        .metadata as unknown as IVaultAccessAuditMetadata;
      expect(metadata.sealBroken).toBe(true);
    });
  });

  describe('Ledger write failure handling', () => {
    it('logs error and does not interrupt response when logOperation rejects', async () => {
      const logError = jest.fn();
      const { service } = createMockAuditService(() =>
        Promise.reject(new Error('Ledger write failed')),
      );
      const deps = createMockDeps({
        auditService: service,
        logger: { error: logError },
      });

      const factory = createVaultAccessAuditMiddleware(deps);
      const middleware = factory();
      const req = createMockReq();
      const { res, emitFinish } = createMockRes(200);
      const next: NextFunction = jest.fn();

      middleware(req as unknown as Request, res, next);

      // next() was called — response is not blocked
      expect(next).toHaveBeenCalled();

      emitFinish();

      // Wait for the async catch handler
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(logError).toHaveBeenCalledWith(
        expect.stringContaining('Ledger write failed'),
      );
    });
  });

  describe('Async write timing', () => {
    it('calls next() before logOperation resolves', async () => {
      let logOperationResolved = false;
      const { service } = createMockAuditService(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              logOperationResolved = true;
              resolve();
            }, 100);
          }),
      );
      const deps = createMockDeps({ auditService: service });

      const factory = createVaultAccessAuditMiddleware(deps);
      const middleware = factory();
      const req = createMockReq();
      const { res, emitFinish } = createMockRes(200);
      const next: NextFunction = jest.fn();

      middleware(req as unknown as Request, res, next);

      // next() is called synchronously — response can proceed
      expect(next).toHaveBeenCalled();
      expect(logOperationResolved).toBe(false);

      emitFinish();

      // logOperation is still pending at this point
      expect(logOperationResolved).toBe(false);

      // Wait for it to resolve
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(logOperationResolved).toBe(true);
    });
  });

  describe('Missing req.ip fallback', () => {
    it('falls back to 0.0.0.0 when req.ip is undefined', async () => {
      const { service, entries } = createMockAuditService();
      const deps = createMockDeps({ auditService: service });

      const factory = createVaultAccessAuditMiddleware(deps);
      const middleware = factory();
      const req = createMockReq({ ip: undefined });
      const { res, emitFinish } = createMockRes(200);
      const next: NextFunction = jest.fn();

      middleware(req as unknown as Request, res, next);
      emitFinish();

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(entries.length).toBe(1);
      expect(entries[0].ipAddress).toBe('0.0.0.0');
    });
  });

  describe('Missing user-agent', () => {
    it('stores empty string when user-agent header is absent', async () => {
      const { service, entries } = createMockAuditService();
      const deps = createMockDeps({ auditService: service });

      const factory = createVaultAccessAuditMiddleware(deps);
      const middleware = factory();
      // Don't set userAgent — header will be absent
      const req = createMockReq({});
      const { res, emitFinish } = createMockRes(200);
      const next: NextFunction = jest.fn();

      middleware(req as unknown as Request, res, next);
      emitFinish();

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(entries.length).toBe(1);
      const metadata = entries[0]
        .metadata as unknown as IVaultAccessAuditMetadata;
      expect(metadata.userAgent).toBe('');
    });
  });
});
