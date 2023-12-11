/**
 * @fileoverview JouleOperatorController — authenticated operator REST endpoints
 * for crediting Joule to members and publishing new rate tables.
 *
 * ## Mount point
 *   Router mounts this at `/operator/joule`
 *
 * ## Endpoints
 *
 * ### POST /operator/joule/grant
 * Credits Joule to a member.  Body:
 * ```json
 * {
 *   "to": "<memberId string>",
 *   "microJoules": "<decimal bigint string>",
 *   "reason": "<string, max 256 chars>",
 *   "quorumSignatures": ["<hex sig>", ...],
 *   "memo": "<optional string>"
 * }
 * ```
 * Returns 202 `{ txId }` on success.
 *
 * ### POST /operator/joule/rate-table
 * Publishes a new rate table to the cache (and eventually to Layer 3).  Body:
 * ```json
 * {
 *   "version": <number>,
 *   "effectiveAt": <epoch ms>,
 *   "entries": { "compute": {...}, "storage": {...}, "network": {...}, "proofOfWork": {...} },
 *   "signedBy": "<optional operator id>"
 * }
 * ```
 * Returns 202 `{ txId }` on success.
 *
 * ### Security
 * Both routes require operator scope.  The controller validates
 * `req.user.roles` contains `'operator'` or `'admin'`.  Quorum signatures are
 * passed through to `JouleEarnService` or the rate-table writer; signature
 * verification is a Layer 3 concern.
 *
 * @requirements joule-resource-credits spec, Req 4.1, 1.2
 */

import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  IApiMessageResponse,
  IStatusCodeResponse,
  TypedHandlers,
  routeConfig,
} from '@digitaldefiance/node-express-suite';
import { IBrightChainApplication } from '../../interfaces/application';
import { JouleEarnService } from '../../joule/jouleEarnService';
import { RateTableCache } from '../../joule/rateTableCache';
import { DefaultBackendIdType } from '../../shared-types';
import { BaseController } from '../base';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Serialize bigint values as decimal strings for lossless JSON. */
function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString(10) : value;
}

/** Shape of req.user as set by JWT middleware. */
interface IRequestUser {
  id?: string;
  memberId?: string;
  roles?: string[];
}

function isOperator(user: IRequestUser | undefined): boolean {
  if (!user) return false;
  const roles = user.roles ?? [];
  return roles.includes('operator') || roles.includes('admin');
}

// ---------------------------------------------------------------------------
// Handler map
// ---------------------------------------------------------------------------

interface IJouleOperatorHandlers extends TypedHandlers {
  postGrant: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  postRateTable: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

/**
 * Operator-scoped Joule controller.
 *
 * Use `setEarnService()` and `setRateTableCache()` to inject dependencies
 * after construction.  Calls without those deps return 503.
 */
export class JouleOperatorController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  IApiMessageResponse | ApiErrorResponse,
  IJouleOperatorHandlers,
  CoreLanguageCode
> {
  private earnService: JouleEarnService | null = null;
  private rateTableCache: RateTableCache | null = null;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  // --------------------------------------------------------------------------
  // Dependency injection
  // --------------------------------------------------------------------------

  public setEarnService(svc: JouleEarnService): void {
    this.earnService = svc;
  }

  public setRateTableCache(cache: RateTableCache): void {
    this.rateTableCache = cache;
  }

  // --------------------------------------------------------------------------
  // Route definitions
  // --------------------------------------------------------------------------

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('post', '/grant', {
        handlerKey: 'postGrant',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Grant Joule credits to a member',
          description:
            'Requires operator or admin role.  Credits are submitted to Layer 3 ' +
            'via JouleEarnService.  Returns 202 with a transaction id.',
          tags: ['Joule', 'Operator'],
          responses: {
            202: { schema: 'JouleGrant', description: 'Grant submitted' },
            400: { schema: 'ApiError', description: 'Validation failure' },
            403: { schema: 'ApiError', description: 'Insufficient scope' },
          },
        },
      }),
      routeConfig('post', '/rate-table', {
        handlerKey: 'postRateTable',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Publish a new Joule rate table',
          description:
            'Requires operator or admin role.  Adds the table to the in-process ' +
            'cache.  Layer 3 persistence is Phase 5.',
          tags: ['Joule', 'Operator'],
          responses: {
            202: {
              schema: 'JouleRateTable',
              description: 'Rate table published',
            },
            400: { schema: 'ApiError', description: 'Validation failure' },
            403: { schema: 'ApiError', description: 'Insufficient scope' },
          },
        },
      }),
    ];

    this.handlers = {
      postGrant: this.handlePostGrant.bind(this),
      postRateTable: this.handlePostRateTable.bind(this),
    };
  }

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------

  private async handlePostGrant(
    req: Parameters<
      ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>
    >[0],
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    const user = (req as unknown as { user?: IRequestUser }).user;
    if (!isOperator(user)) {
      return {
        statusCode: 403,
        response: { message: 'Operator scope required', error: 'FORBIDDEN' },
      };
    }

    if (!this.earnService) {
      return {
        statusCode: 503,
        response: {
          message: 'JouleEarnService not available',
          error: 'SERVICE_UNAVAILABLE',
        },
      };
    }

    const body =
      (
        req as unknown as {
          body?: {
            to?: string;
            microJoules?: string;
            reason?: string;
            quorumSignatures?: string[];
            memo?: string;
          };
        }
      ).body ?? {};

    const {
      to,
      microJoules: microJoulesStr,
      reason,
      quorumSignatures,
      memo,
    } = body;

    if (!to || typeof to !== 'string') {
      return {
        statusCode: 400,
        response: {
          message: 'Missing or invalid "to" field',
          error: 'VALIDATION_ERROR',
        },
      };
    }
    if (!microJoulesStr || typeof microJoulesStr !== 'string') {
      return {
        statusCode: 400,
        response: {
          message:
            'Missing or invalid "microJoules" field (must be decimal string)',
          error: 'VALIDATION_ERROR',
        },
      };
    }
    if (!reason || typeof reason !== 'string') {
      return {
        statusCode: 400,
        response: {
          message: 'Missing or invalid "reason" field',
          error: 'VALIDATION_ERROR',
        },
      };
    }
    if (!Array.isArray(quorumSignatures)) {
      return {
        statusCode: 400,
        response: {
          message:
            'Missing or invalid "quorumSignatures" field (must be array)',
          error: 'VALIDATION_ERROR',
        },
      };
    }

    let microJoules: bigint;
    try {
      microJoules = BigInt(microJoulesStr);
    } catch {
      return {
        statusCode: 400,
        response: {
          message: '"microJoules" could not be parsed as a bigint',
          error: 'VALIDATION_ERROR',
        },
      };
    }

    try {
      // Encode `to` memberId as UTF-8 bytes (ledger uses raw bytes; full
      // checksum conversion is a Phase 5 concern).
      const toBytes = new TextEncoder().encode(to);
      // Decode base64-encoded signatures from the JSON body to Uint8Array.
      const sigBytes: Uint8Array[] = (quorumSignatures ?? []).map((sig) =>
        Buffer.from(sig, 'base64'),
      );
      const memoBytes: Uint8Array | undefined =
        typeof memo === 'string' ? Buffer.from(memo, 'utf8') : undefined;
      const txId = await this.earnService.grant(
        toBytes,
        microJoules,
        reason,
        sigBytes,
        memoBytes,
      );
      return {
        statusCode: 202,
        response: { message: 'Grant submitted', txId } as IApiMessageResponse,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[JouleOperatorController] postGrant error:', msg);
      const status = (err as { httpStatus?: number }).httpStatus ?? 400;
      return { statusCode: status, response: { message: msg, error: msg } };
    }
  }

  private async handlePostRateTable(
    req: Parameters<
      ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>
    >[0],
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    const user = (req as unknown as { user?: IRequestUser }).user;
    if (!isOperator(user)) {
      return {
        statusCode: 403,
        response: { message: 'Operator scope required', error: 'FORBIDDEN' },
      };
    }

    if (!this.rateTableCache) {
      return {
        statusCode: 503,
        response: {
          message: 'RateTableCache not available',
          error: 'SERVICE_UNAVAILABLE',
        },
      };
    }

    const body =
      (
        req as unknown as {
          body?: {
            version?: number;
            effectiveAt?: number;
            entries?: unknown;
            signedBy?: string;
          };
        }
      ).body ?? {};

    const { version, effectiveAt, entries, signedBy } = body;

    if (typeof version !== 'number') {
      return {
        statusCode: 400,
        response: {
          message: '"version" must be a number',
          error: 'VALIDATION_ERROR',
        },
      };
    }
    if (typeof effectiveAt !== 'number') {
      return {
        statusCode: 400,
        response: {
          message: '"effectiveAt" must be a number (epoch ms)',
          error: 'VALIDATION_ERROR',
        },
      };
    }
    if (!entries || typeof entries !== 'object') {
      return {
        statusCode: 400,
        response: {
          message: '"entries" must be an object',
          error: 'VALIDATION_ERROR',
        },
      };
    }

    try {
      const table = {
        version,
        effectiveAt,
        entries: entries as any,
        signedBy: typeof signedBy === 'string' ? [signedBy] : [],
      } as Parameters<RateTableCache['addRateTable']>[0];
      this.rateTableCache.addRateTable(table);
      const safe = JSON.parse(JSON.stringify(table, bigintReplacer));
      return {
        statusCode: 202,
        response: {
          message: 'Rate table published',
          table: safe,
        } as IApiMessageResponse,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[JouleOperatorController] postRateTable error:', msg);
      return { statusCode: 400, response: { message: msg, error: msg } };
    }
  }
}
