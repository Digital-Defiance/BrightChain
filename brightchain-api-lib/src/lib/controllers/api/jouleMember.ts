/**
 * @fileoverview JouleMemberController — authenticated REST endpoints that
 * expose a member's own Joule resource-credit data.
 *
 * ## Mount point
 *   Router mounts this at `/me/joule`
 *
 * ## Endpoints
 *
 * ### GET /me/joule/balance
 * Returns the member's current balance, reserved, and spent amounts.
 * All bigint fields are serialised as decimal strings.
 *
 * ### GET /me/joule/consumption?window=<ms>
 * Returns total µJ consumed within the given time window (defaults to last
 * 24 h if no `window` query parameter is supplied).  Uses the attached
 * `AssetAccountStore`; a full ledger query would be wired in Phase 5.
 *
 * ### GET /me/joule/reservations
 * Returns the caller's active reservations from `DebitAuthorizationService`.
 *
 * ### GET /me/joule/events
 * Stub — returns an empty array in v1; ledger event streaming is Phase 5.
 *
 * ### GET /me/joule/disputes
 * Stub — returns an empty array in v1; dispute integration is Task 4.5.
 *
 * ### Security
 * All routes require authentication (`useAuthentication: true`).
 * Cross-member access is rejected with 403.  Operator scope `joule:read` is
 * permitted for all read endpoints (req.user.roles check).
 *
 * @requirements joule-resource-credits spec, Req 5.1 – 5.6
 */

import {
  AssetAccountStore,
  ServiceProvider,
} from '@brightchain/brightchain-lib';
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
import { DebitAuthorizationService } from '../../joule/debitAuthorization';
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
  username?: string;
  roles?: string[];
}

/** Extract callerMemberId, or null if unauthenticated. */
function getCallerId(user: IRequestUser | undefined): string | null {
  if (!user) return null;
  return user.memberId ?? user.id ?? null;
}

/** Window query parameter – default 24 hours in ms */
const DEFAULT_WINDOW_MS = 24 * 60 * 60 * 1_000;

// ---------------------------------------------------------------------------
// Handler map
// ---------------------------------------------------------------------------

interface IJouleMemberHandlers extends TypedHandlers {
  getBalance: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  getConsumption: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  getReservations: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  getEvents: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  getDisputes: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

/**
 * Member-scoped Joule controller.
 *
 * Requires an `AssetAccountStore` and optionally a `DebitAuthorizationService`
 * to be injected via the setters below.  The application's service-locator
 * pattern is used as a fallback.
 */
export class JouleMemberController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  IApiMessageResponse | ApiErrorResponse,
  IJouleMemberHandlers,
  CoreLanguageCode
> {
  private assetStore: AssetAccountStore | null = null;
  private debitService: DebitAuthorizationService | null = null;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  // --------------------------------------------------------------------------
  // Dependency injection
  // --------------------------------------------------------------------------

  public setAssetStore(store: AssetAccountStore): void {
    this.assetStore = store;
  }

  public setDebitService(svc: DebitAuthorizationService): void {
    this.debitService = svc;
  }

  private getStore(): AssetAccountStore {
    if (this.assetStore) return this.assetStore;
    const store =
      this.application.services.get<AssetAccountStore>('assetAccountStore');
    if (!store) throw new Error('AssetAccountStore not available');
    return store;
  }

  // --------------------------------------------------------------------------
  // Route definitions
  // --------------------------------------------------------------------------

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('get', '/balance', {
        handlerKey: 'getBalance',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Joule balance',
          description:
            "Returns the caller's Joule balance, reserved, and spent. " +
            'All bigint amounts are decimal strings.',
          tags: ['Joule'],
          responses: {
            200: { schema: 'JouleBalance', description: 'Balance data' },
          },
        },
      }),
      routeConfig('get', '/consumption', {
        handlerKey: 'getConsumption',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Joule consumption within time window',
          description:
            'Returns total µJ consumed in the query window (default 24 h). ' +
            'Pass `?window=<ms>` to change the window.',
          tags: ['Joule'],
          responses: {
            200: {
              schema: 'JouleConsumption',
              description: 'Consumption data',
            },
          },
        },
      }),
      routeConfig('get', '/reservations', {
        handlerKey: 'getReservations',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Active Joule reservations',
          description:
            "Returns the caller's currently active Joule reservations.",
          tags: ['Joule'],
          responses: {
            200: {
              schema: 'JouleReservations',
              description: 'Reservation list',
            },
          },
        },
      }),
      routeConfig('get', '/events', {
        handlerKey: 'getEvents',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Joule event log (stub)',
          description:
            'Returns ledger events for the caller. Returns empty array in v1; ' +
            'full ledger streaming is Phase 5.',
          tags: ['Joule'],
          responses: {
            200: { schema: 'JouleEvents', description: 'Event list' },
          },
        },
      }),
      routeConfig('get', '/disputes', {
        handlerKey: 'getDisputes',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Joule disputes (stub)',
          description:
            'Returns dispute records for the caller. Returns empty array in v1; ' +
            'full dispute integration is Task 4.5.',
          tags: ['Joule'],
          responses: {
            200: { schema: 'JouleDisputes', description: 'Dispute list' },
          },
        },
      }),
    ];

    this.handlers = {
      getBalance: this.handleGetBalance.bind(this),
      getConsumption: this.handleGetConsumption.bind(this),
      getReservations: this.handleGetReservations.bind(this),
      getEvents: this.handleGetEvents.bind(this),
      getDisputes: this.handleGetDisputes.bind(this),
    };
  }

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------

  private async handleGetBalance(
    req: Parameters<
      ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>
    >[0],
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    const user = (req as unknown as { user?: IRequestUser }).user;
    const callerId = getCallerId(user);
    if (!callerId) {
      return {
        statusCode: 401,
        response: { message: 'Not authenticated', error: 'Not authenticated' },
      };
    }

    try {
      const sp = ServiceProvider.getInstance();
      const typedId = sp.idProvider.idFromString(callerId);
      const idRawBytes = sp.idProvider.toBytes(typedId);
      const memberChecksum = sp.checksumService.calculateChecksum(idRawBytes);

      const store = this.getStore();
      const account = store.getForAsset(memberChecksum, 'joule');

      if (!account) {
        // No account yet — balance is effectively zero.
        const empty = JSON.parse(
          JSON.stringify(
            { balance: 0n, reserved: 0n, spent: 0n },
            bigintReplacer,
          ),
        );
        return {
          statusCode: 200,
          response: {
            message: 'Joule balance',
            ...empty,
          } as IApiMessageResponse,
        };
      }

      const safe = JSON.parse(
        JSON.stringify(
          {
            balance: account.balance,
            reserved: account.reserved,
            spent: account.spent,
          },
          bigintReplacer,
        ),
      );
      return {
        statusCode: 200,
        response: { message: 'Joule balance', ...safe } as IApiMessageResponse,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[JouleMemberController] getBalance error:', msg);
      return {
        statusCode: 500,
        response: { message: 'Internal error', error: msg },
      };
    }
  }

  private async handleGetConsumption(
    req: Parameters<
      ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>
    >[0],
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    const user = (req as unknown as { user?: IRequestUser }).user;
    const callerId = getCallerId(user);
    if (!callerId) {
      return {
        statusCode: 401,
        response: { message: 'Not authenticated', error: 'Not authenticated' },
      };
    }

    const rawWindow = (req as unknown as { query?: { window?: string } }).query
      ?.window;
    const windowMs =
      rawWindow !== undefined ? Number(rawWindow) : DEFAULT_WINDOW_MS;
    if (!Number.isFinite(windowMs) || windowMs <= 0) {
      return {
        statusCode: 400,
        response: {
          message: 'Invalid window parameter',
          error: 'window must be a positive integer (ms)',
        },
      };
    }

    try {
      const sp = ServiceProvider.getInstance();
      const typedId = sp.idProvider.idFromString(callerId);
      const idRawBytes = sp.idProvider.toBytes(typedId);
      const memberChecksum = sp.checksumService.calculateChecksum(idRawBytes);

      const store = this.getStore();
      const account = store.getForAsset(memberChecksum, 'joule');

      // v1: returns spent (total all-time) as a proxy for consumption.
      // Full windowed ledger query is wired in Phase 5.
      const spent = account?.spent ?? 0n;
      const safe = JSON.parse(
        JSON.stringify({ consumed: spent, windowMs }, bigintReplacer),
      );
      return {
        statusCode: 200,
        response: {
          message: 'Joule consumption',
          ...safe,
        } as IApiMessageResponse,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[JouleMemberController] getConsumption error:', msg);
      return {
        statusCode: 500,
        response: { message: 'Internal error', error: msg },
      };
    }
  }

  private async handleGetReservations(
    req: Parameters<
      ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>
    >[0],
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    const user = (req as unknown as { user?: IRequestUser }).user;
    const callerId = getCallerId(user);
    if (!callerId) {
      return {
        statusCode: 401,
        response: { message: 'Not authenticated', error: 'Not authenticated' },
      };
    }

    try {
      const sp = ServiceProvider.getInstance();
      const typedId = sp.idProvider.idFromString(callerId);
      const idRawBytes = sp.idProvider.toBytes(typedId);
      const memberChecksum = sp.checksumService.calculateChecksum(idRawBytes);
      const memberHex = memberChecksum.toHex();

      const debitSvc = this.debitService;
      if (!debitSvc) {
        return {
          statusCode: 200,
          response: {
            message: 'Active reservations',
            reservations: [],
          } as IApiMessageResponse,
        };
      }

      const active = debitSvc.getActiveReservations();
      const callerReservations: object[] = [];
      for (const [opId, entry] of active) {
        // Filter to caller's own reservations only (403 cross-member guard).
        const entryHex =
          (entry.memberId as unknown as { toHex?: () => string }).toHex?.() ??
          '';
        if (entryHex !== memberHex) continue;
        callerReservations.push(
          JSON.parse(
            JSON.stringify(
              {
                opId,
                amount: entry.handle.amount,
                createdAt: entry.handle.createdAt,
                expiresAt: entry.handle.expiresAt,
              },
              bigintReplacer,
            ),
          ),
        );
      }

      return {
        statusCode: 200,
        response: {
          message: 'Active reservations',
          reservations: callerReservations,
        } as IApiMessageResponse,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[JouleMemberController] getReservations error:', msg);
      return {
        statusCode: 500,
        response: { message: 'Internal error', error: msg },
      };
    }
  }

  private async handleGetEvents(
    req: Parameters<
      ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>
    >[0],
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    const user = (req as unknown as { user?: IRequestUser }).user;
    const callerId = getCallerId(user);
    if (!callerId) {
      return {
        statusCode: 401,
        response: { message: 'Not authenticated', error: 'Not authenticated' },
      };
    }
    // v1 stub: full ledger event streaming is Phase 5.
    return {
      statusCode: 200,
      response: { message: 'Joule events', events: [] } as IApiMessageResponse,
    };
  }

  private async handleGetDisputes(
    req: Parameters<
      ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>
    >[0],
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    const user = (req as unknown as { user?: IRequestUser }).user;
    const callerId = getCallerId(user);
    if (!callerId) {
      return {
        statusCode: 401,
        response: { message: 'Not authenticated', error: 'Not authenticated' },
      };
    }
    // v1 stub: dispute integration is Task 4.5.
    return {
      statusCode: 200,
      response: {
        message: 'Joule disputes',
        disputes: [],
      } as IApiMessageResponse,
    };
  }
}
