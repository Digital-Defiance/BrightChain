import type {
  IAuditEntryParams,
  IAuditService,
} from '@brightchain/digitalburnbag-lib';
import {
  AccessOutcome,
  AccessorType,
  FileAuditOperationType,
  type IGlobalAuditConfig,
  type IRouteAuditConfig,
  type IVaultAccessAuditMetadata,
} from '@brightchain/digitalburnbag-lib';
import type { PlatformID } from '@digitaldefiance/ecies-lib';
import type { NextFunction, Request, Response } from 'express';

import { mapStatusToOutcome } from './access-outcome-mapper';
import { AuditRateLimiter } from './audit-rate-limiter';
import type { IAuthenticatedRequest } from './authentication';

/** Sentinel value for anonymous actor IDs */
export const ANONYMOUS_ACTOR_SENTINEL = '00000000-0000-0000-0000-000000000000';

/**
 * Dependencies injected into the middleware factory.
 */
export interface IVaultAccessAuditDeps<TID extends PlatformID> {
  auditService: IAuditService<TID>;
  globalConfig: IGlobalAuditConfig;
  /** Convert a string ID to the platform ID type */
  parseId: (id: string) => TID;
  /** Application error logger */
  logger: { error: (message: string, ...args: unknown[]) => void };
}

/**
 * Optional context that route handlers can attach to the request
 * to provide file-specific audit metadata (file ID, vault container ID,
 * seal break status, share link ID).
 */
export interface IVaultAuditContext {
  fileId?: string;
  vaultContainerId?: string;
  sealBroken?: boolean;
  shareLinkId?: string;
}

/**
 * Extended request type that includes optional vault audit context.
 */
export interface IVaultAuditRequest extends IAuthenticatedRequest {
  vaultAuditContext?: IVaultAuditContext;
}

/**
 * Factory function that creates the vault access audit middleware.
 *
 * Usage:
 *   const auditMw = createVaultAccessAuditMiddleware(deps);
 *   router.get('/icon', auditMw({ failuresOnly: false }), handleServeIcon);
 *
 * @throws Error if deps.auditService is null or undefined
 */
export function createVaultAccessAuditMiddleware<TID extends PlatformID>(
  deps: IVaultAccessAuditDeps<TID>,
): (
  routeConfig?: IRouteAuditConfig,
) => (req: Request, res: Response, next: NextFunction) => void {
  // Validate deps at factory creation time
  if (!deps.auditService) {
    throw new Error('auditService is required');
  }

  const rateLimiter = new AuditRateLimiter();

  return createAuditMiddlewareFromParts(deps, rateLimiter);
}

/**
 * Creates a deferred vault access audit middleware that activates only when
 * dependencies become available. This is useful when the audit service is
 * not yet wired at controller construction time.
 *
 * Usage:
 *   const [auditMw, setDeps] = createDeferredVaultAccessAuditMiddleware<TID>();
 *   // Use auditMw() in route definitions immediately (no-op until deps are set)
 *   router.get('/icon', auditMw(), handleServeIcon);
 *   // Later, when deps are available:
 *   setDeps({ auditService, globalConfig, parseId, logger });
 *
 * @returns A tuple of [middlewareFactory, setDeps] where setDeps activates the middleware.
 */
export function createDeferredVaultAccessAuditMiddleware<
  TID extends PlatformID,
>(): [
  (
    routeConfig?: IRouteAuditConfig,
  ) => (req: Request, res: Response, next: NextFunction) => void,
  (deps: IVaultAccessAuditDeps<TID>) => void,
] {
  let activeDeps: IVaultAccessAuditDeps<TID> | null = null;
  const rateLimiter = new AuditRateLimiter();

  const middlewareFactory = (
    routeConfig?: IRouteAuditConfig,
  ): ((req: Request, res: Response, next: NextFunction) => void) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!activeDeps) {
        // Deps not yet wired — pass through
        next();
        return;
      }
      // Delegate to the real middleware logic
      createAuditMiddlewareFromParts(activeDeps, rateLimiter)(routeConfig)(
        req,
        res,
        next,
      );
    };
  };

  const setDeps = (deps: IVaultAccessAuditDeps<TID>): void => {
    if (!deps.auditService) {
      throw new Error('auditService is required');
    }
    activeDeps = deps;
  };

  return [middlewareFactory, setDeps];
}

/**
 * Internal helper that creates the core audit middleware logic from deps and rate limiter.
 */
function createAuditMiddlewareFromParts<TID extends PlatformID>(
  deps: IVaultAccessAuditDeps<TID>,
  rateLimiter: AuditRateLimiter,
): (
  routeConfig?: IRouteAuditConfig,
) => (req: Request, res: Response, next: NextFunction) => void {
  return (routeConfig?: IRouteAuditConfig) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      // 1. Check if audit is enabled globally
      if (!deps.globalConfig.enabled) {
        next();
        return;
      }

      // 2. Check if audit is enabled for this route
      if (routeConfig && routeConfig.enabled === false) {
        next();
        return;
      }

      // 3. Capture pre-handler metadata (immutable request properties)
      const authReq = req as IVaultAuditRequest;
      const ipAddress = req.ip || '0.0.0.0';
      const httpMethod = req.method;
      const endpointPath = req.originalUrl || '';
      const userAgent = req.get('user-agent') ?? '';
      const isAuthenticated = !!authReq.memberContext?.memberId;
      const userId = authReq.memberContext?.memberId;

      // 4. Call next() to let the route handler execute
      next();

      // 5. Listen on res.on('finish', ...) for outcome
      res.on('finish', () => {
        // Read vault audit context here (after handler has run) so that
        // route handlers can attach file-specific metadata during execution.
        const context = authReq.vaultAuditContext;

        const statusCode = res.statusCode;
        const accessOutcome = mapStatusToOutcome(statusCode);

        // Check failuresOnly config
        if (
          routeConfig?.failuresOnly &&
          accessOutcome === AccessOutcome.Success
        ) {
          return;
        }

        // Check rate limit
        if (routeConfig?.rateLimit) {
          const routeKey = endpointPath;
          const allowed = rateLimiter.tryAcquire(
            routeKey,
            routeConfig.rateLimit.maxEntries,
            routeConfig.rateLimit.windowMs,
          );
          if (!allowed) {
            return;
          }
        }

        // Build metadata
        const metadata: IVaultAccessAuditMetadata = {
          accessorType: isAuthenticated
            ? AccessorType.Authenticated
            : AccessorType.Anonymous,
          accessOutcome,
          httpMethod,
          endpointPath,
          userAgent,
        };

        // Add optional context fields only if provided
        if (context?.vaultContainerId !== undefined) {
          metadata.vaultContainerId = context.vaultContainerId;
        }
        if (context?.fileId !== undefined) {
          metadata.fileId = context.fileId;
        }
        if (context?.sealBroken !== undefined) {
          metadata.sealBroken = context.sealBroken;
        }
        if (context?.shareLinkId !== undefined) {
          metadata.shareLinkId = context.shareLinkId;
        }

        // Add skipped entries count if rate limiting is active
        if (routeConfig?.rateLimit) {
          const skipped = rateLimiter.getAndResetSkipped(endpointPath);
          if (skipped > 0) {
            metadata.skippedEntries = skipped;
          }
        }

        // Determine actor and target IDs
        const actorId = isAuthenticated
          ? deps.parseId(userId!)
          : deps.parseId(ANONYMOUS_ACTOR_SENTINEL);

        const targetId = context?.fileId
          ? deps.parseId(context.fileId)
          : context?.vaultContainerId
            ? deps.parseId(context.vaultContainerId)
            : deps.parseId(ANONYMOUS_ACTOR_SENTINEL);

        // Build the audit entry params
        const entryParams: IAuditEntryParams<TID> = {
          operationType: FileAuditOperationType.VaultFileAccessed,
          actorId,
          targetId,
          targetType: 'file',
          ipAddress,
          metadata: metadata as unknown as Record<string, unknown>,
        };

        // Fire-and-forget async write
        deps.auditService.logOperation(entryParams).catch((err: unknown) => {
          deps.logger.error(
            `[VaultAccessAudit] Failed to write audit entry for ${httpMethod} ${endpointPath}: ${err instanceof Error ? err.message : String(err)}`,
          );
        });
      });
    };
  };
}
