/**
 * @fileoverview AdminJouleController — admin-only operational adjustments to
 * a user's Joule resource-credit account.
 *
 * Until contribution / provider systems are in place we need a way for an
 * administrator to manually credit, debit, or absolutely adjust a user's
 * Joule balance.  This controller writes directly to the operational
 * {@link EnergyAccountStore} (Layer 2 projection); it does **not** go
 * through the operator-quorum grant path — that is `/operator/joule/grant`.
 *
 * ## Mount point
 *   Router mounts this at `/admin/joule`
 *
 * ## Endpoints
 *
 * ### GET /admin/joule/users/:userId/balance
 * Returns the user's current Joule account snapshot
 * (`balance`, `earned`, `spent`, `reserved`, `reputation`).  All bigint
 * fields are serialised as decimal microJoule strings.
 *
 * ### POST /admin/joule/users/:userId/credit
 * Body: `{ microJoules: "<decimal>", reason: "<string>", memo?: "<string>" }`
 * Increases `balance` and `earned` by the specified positive amount.
 *
 * ### POST /admin/joule/users/:userId/debit
 * Body: `{ microJoules: "<decimal>", reason: "<string>", memo?: "<string>" }`
 * Decreases `balance` and increases `spent` by the specified positive
 * amount.  Fails with 422 if it would overdraw the account.
 *
 * ### POST /admin/joule/users/:userId/adjust
 * Body: `{ targetMicroJoules: "<decimal>", reason: "<string>", memo?: "<string>" }`
 * Sets `balance` to the target by issuing the appropriate credit or debit.
 * Earned/spent counters are kept consistent with the implied delta.
 *
 * ### GET /admin/joule/users/:userId/events
 * Returns the persistent adjustment audit log for this user, most recent
 * first.  Events are stored in the shared `admin_joule_audit` collection,
 * which uses the same backend as the rest of the operational stores
 * (LevelDB / Mongo / S3 / Azure).  Cursor-paginated via
 * `?before=<ISO timestamp>&limit=<n>` (default 50, max 200); the response
 * carries `nextCursor` (or `null` when the page is the last one).
 *
 * ### Security
 * All routes require the `admin` role; the router mount applies this guard.
 *
 * @requirements joule-resource-credits spec, Req 4.x (admin operational
 *   adjustment).  Companion to the operator-quorum `/operator/joule/grant`
 *   flow; this is the manual operational projection path.
 */

import {
  AssetAccount,
  EnergyAccountStore,
  JOULE_ASSET_ID,
  ServiceProvider,
} from '@brightchain/brightchain-lib';
import type { BrightDb } from '@brightchain/db';
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
import { DefaultBackendIdType } from '../../shared-types';
import { BaseController } from '../base';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type AdminJouleApiResponse = IApiMessageResponse | ApiErrorResponse;

function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString(10) : value;
}

const REASON_MAX_LENGTH = 256;
const DEFAULT_EVENTS_PAGE_SIZE = 50;
const MAX_EVENTS_PAGE_SIZE = 200;
const ADMIN_JOULE_AUDIT_COLLECTION = 'admin_joule_audit';

/**
 * Working type used inside the controller. `deltaMicroJoules` and
 * `balanceAfterMicroJoules` are bigints; they are dehydrated to decimal
 * strings on persistence and on the wire.
 */
interface IAdminJouleEvent {
  /** Random UUID for the event itself (used as the document `_id`). */
  id: string;
  /** Target user id (string form), as passed in the URL. */
  userId: string;
  /** Action category. */
  action: 'credit' | 'debit' | 'adjust';
  /** Signed delta applied to balance, in microJoules. */
  deltaMicroJoules: bigint;
  /** Balance after the operation, in microJoules. */
  balanceAfterMicroJoules: bigint;
  /** Admin-supplied reason. */
  reason: string;
  /** Optional admin-supplied memo. */
  memo?: string;
  /** ID/username of the admin who performed the action. */
  performedBy: string;
  /** Wall-clock timestamp of the operation. */
  at: Date;
}

/**
 * Stored DTO — every value is a primitive serialisable type so that the
 * underlying Bson-style collection can persist it across any backend
 * (LevelDB / Mongo / S3 / Azure) without custom hydration.
 */
interface IAdminJouleAuditDoc extends Record<string, unknown> {
  _id: string;
  userId: string;
  action: 'credit' | 'debit' | 'adjust';
  deltaMicroJoules: string;
  balanceAfterMicroJoules: string;
  reason: string;
  memo?: string;
  performedBy: string;
  at: string;
}

function toAuditDoc(event: IAdminJouleEvent): IAdminJouleAuditDoc {
  const doc: IAdminJouleAuditDoc = {
    _id: event.id,
    userId: event.userId,
    action: event.action,
    deltaMicroJoules: event.deltaMicroJoules.toString(10),
    balanceAfterMicroJoules: event.balanceAfterMicroJoules.toString(10),
    reason: event.reason,
    performedBy: event.performedBy,
    at: event.at.toISOString(),
  };
  if (event.memo !== undefined) doc.memo = event.memo;
  return doc;
}

function fromAuditDoc(doc: IAdminJouleAuditDoc): Record<string, unknown> {
  return {
    id: doc._id,
    userId: doc.userId,
    action: doc.action,
    deltaMicroJoules: doc.deltaMicroJoules,
    balanceAfterMicroJoules: doc.balanceAfterMicroJoules,
    reason: doc.reason,
    memo: doc.memo,
    performedBy: doc.performedBy,
    at: doc.at,
  };
}

/** Shape of req.user as set by JWT middleware. */
interface IRequestUser {
  id?: string;
  memberId?: string;
  username?: string;
  roles?: string[];
}

function describeAdmin(user: IRequestUser | undefined): string {
  if (!user) return 'unknown';
  return user.username ?? user.memberId ?? user.id ?? 'unknown';
}

function parseMicroJoules(raw: unknown): bigint | null {
  if (typeof raw !== 'string' || raw.trim().length === 0) return null;
  // Accept optional leading sign so adjust/debit can pass negative values
  // when they really want to.  Each handler validates sign separately.
  if (!/^-?\d+$/.test(raw.trim())) return null;
  try {
    return BigInt(raw.trim());
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Handler map
// ---------------------------------------------------------------------------

interface IAdminJouleHandlers extends TypedHandlers {
  getBalance: ApiRequestHandler<AdminJouleApiResponse>;
  postCredit: ApiRequestHandler<AdminJouleApiResponse>;
  postDebit: ApiRequestHandler<AdminJouleApiResponse>;
  postAdjust: ApiRequestHandler<AdminJouleApiResponse>;
  getEvents: ApiRequestHandler<AdminJouleApiResponse>;
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

/**
 * Admin-scoped Joule controller.
 *
 * Performs operational credits / debits / adjustments against the
 * `EnergyAccountStore` registered as the `'energyStore'` application
 * service.  Persists an audit row per action into the
 * `admin_joule_audit` collection on the shared `'db'` service.
 */
export class AdminJouleController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  AdminJouleApiResponse,
  IAdminJouleHandlers,
  CoreLanguageCode
> {
  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  // --------------------------------------------------------------------------
  // Route definitions
  // --------------------------------------------------------------------------

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('get', '/users/:userId/balance', {
        handlerKey: 'getBalance',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: "Read a user's Joule account snapshot (admin)",
          tags: ['Joule', 'Admin'],
          responses: {},
        },
      }),
      routeConfig('post', '/users/:userId/credit', {
        handlerKey: 'postCredit',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Credit Joule to a user (admin operational adjustment)',
          tags: ['Joule', 'Admin'],
          responses: {},
        },
      }),
      routeConfig('post', '/users/:userId/debit', {
        handlerKey: 'postDebit',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Debit Joule from a user (admin operational adjustment)',
          tags: ['Joule', 'Admin'],
          responses: {},
        },
      }),
      routeConfig('post', '/users/:userId/adjust', {
        handlerKey: 'postAdjust',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: "Set a user's Joule balance to an exact value (admin)",
          tags: ['Joule', 'Admin'],
          responses: {},
        },
      }),
      routeConfig('get', '/users/:userId/events', {
        handlerKey: 'getEvents',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary:
            "Read the persistent admin audit log for a user's Joule account (cursor paginated)",
          tags: ['Joule', 'Admin'],
          responses: {},
        },
      }),
    ];

    this.handlers = {
      getBalance: this.handleGetBalance.bind(this),
      postCredit: this.handlePostCredit.bind(this),
      postDebit: this.handlePostDebit.bind(this),
      postAdjust: this.handlePostAdjust.bind(this),
      getEvents: this.handleGetEvents.bind(this),
    };
  }

  // --------------------------------------------------------------------------
  // Internals
  // --------------------------------------------------------------------------

  private getStore(): EnergyAccountStore | null {
    if (!this.application.services.has('energyStore')) return null;
    return this.application.services.get<EnergyAccountStore>('energyStore');
  }

  /**
   * Lazily resolve the persistent audit collection.  Returns null when the
   * `'db'` service is not registered (unit tests, partial bootstraps), in
   * which case audit recording is silently skipped — credit/debit/adjust
   * still succeed against the EnergyAccountStore.
   */
  private getAuditCollection() {
    if (!this.application.services.has('db')) return null;
    const db = this.application.services.get<BrightDb>('db');
    return db.collection<IAdminJouleAuditDoc>(ADMIN_JOULE_AUDIT_COLLECTION);
  }

  /** Resolve a userId-string to its on-store member checksum. */
  private resolveMemberChecksum(userId: string) {
    const sp = ServiceProvider.getInstance();
    const typedId = sp.idProvider.idFromString(userId);
    const idRawBytes = sp.idProvider.toBytes(typedId);
    return sp.checksumService.calculateChecksum(idRawBytes);
  }

  private snapshot(account: AssetAccount): Record<string, unknown> {
    return JSON.parse(
      JSON.stringify(
        {
          assetId: account.assetId,
          memberId: account.memberId.toHex(),
          balance: account.balance,
          earned: account.earned,
          spent: account.spent,
          reserved: account.reserved,
          available: account.availableBalance,
          reputation: account.reputation,
          createdAt: account.createdAt.toISOString(),
          lastUpdated: account.lastUpdated.toISOString(),
        },
        bigintReplacer,
      ),
    );
  }

  /**
   * Best-effort audit-log write.  Failures are logged but never propagated
   * — the credit/debit/adjust has already succeeded against the
   * EnergyAccountStore and the user-visible response should not be
   * blocked by an audit-store outage.
   */
  private async recordEvent(event: IAdminJouleEvent): Promise<void> {
    const collection = this.getAuditCollection();
    if (!collection) return;
    try {
      await collection.insertOne(toAuditDoc(event));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        '[AdminJouleController] failed to persist audit event id=%s userId=%s: %s',
        event.id,
        event.userId,
        msg,
      );
    }
  }

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------

  private async handleGetBalance(
    req: Parameters<ApiRequestHandler<AdminJouleApiResponse>>[0],
  ): Promise<IStatusCodeResponse<AdminJouleApiResponse>> {
    const userId = (req as unknown as { params?: { userId?: string } }).params
      ?.userId;
    if (!userId) {
      return {
        statusCode: 400,
        response: { message: 'userId is required', error: 'VALIDATION_ERROR' },
      };
    }

    const store = this.getStore();
    if (!store) {
      return {
        statusCode: 503,
        response: {
          message: 'EnergyAccountStore not available',
          error: 'SERVICE_UNAVAILABLE',
        },
      };
    }

    try {
      const memberChecksum = this.resolveMemberChecksum(userId);
      const account = await store.getOrCreate(memberChecksum);
      return {
        statusCode: 200,
        response: {
          message: 'Joule account snapshot',
          assetId: JOULE_ASSET_ID,
          account: this.snapshot(account),
        } as IApiMessageResponse,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[AdminJouleController] getBalance error:', msg);
      return {
        statusCode: 500,
        response: { message: 'Internal error', error: msg },
      };
    }
  }

  private async applyDelta(
    req: Parameters<ApiRequestHandler<AdminJouleApiResponse>>[0],
    action: 'credit' | 'debit',
  ): Promise<IStatusCodeResponse<AdminJouleApiResponse>> {
    const userId = (req as unknown as { params?: { userId?: string } }).params
      ?.userId;
    if (!userId) {
      return {
        statusCode: 400,
        response: { message: 'userId is required', error: 'VALIDATION_ERROR' },
      };
    }

    const body =
      (
        req as unknown as {
          body?: {
            microJoules?: unknown;
            reason?: unknown;
            memo?: unknown;
          };
        }
      ).body ?? {};

    const amount = parseMicroJoules(body.microJoules);
    if (amount === null) {
      return {
        statusCode: 400,
        response: {
          message: '"microJoules" must be a decimal string',
          error: 'VALIDATION_ERROR',
        },
      };
    }
    if (amount <= 0n) {
      return {
        statusCode: 400,
        response: {
          message: '"microJoules" must be > 0',
          error: 'VALIDATION_ERROR',
        },
      };
    }

    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (reason.length === 0) {
      return {
        statusCode: 400,
        response: {
          message: '"reason" is required',
          error: 'VALIDATION_ERROR',
        },
      };
    }
    if (reason.length > REASON_MAX_LENGTH) {
      return {
        statusCode: 400,
        response: {
          message: `"reason" must be ≤ ${REASON_MAX_LENGTH} chars`,
          error: 'VALIDATION_ERROR',
        },
      };
    }

    const memo =
      typeof body.memo === 'string' && body.memo.length > 0
        ? body.memo.slice(0, 1024)
        : undefined;

    const store = this.getStore();
    if (!store) {
      return {
        statusCode: 503,
        response: {
          message: 'EnergyAccountStore not available',
          error: 'SERVICE_UNAVAILABLE',
        },
      };
    }

    const adminUser = (req as unknown as { user?: IRequestUser }).user;

    try {
      const memberChecksum = this.resolveMemberChecksum(userId);
      const account = await store.getOrCreate(memberChecksum);
      const before = account.balance;

      if (action === 'credit') {
        account.credit(amount);
      } else {
        // debit: AssetAccount.charge requires balance >= amount; surface a
        // 422 if the operation would overdraw.
        if (amount > account.balance) {
          return {
            statusCode: 422,
            response: {
              message:
                'Debit would overdraw account; use adjust if you really want to drive the balance to zero.',
              error: 'INSUFFICIENT_BALANCE',
              balance: account.balance.toString(10),
              requested: amount.toString(10),
            } as ApiErrorResponse,
          };
        }
        account.charge(amount);
      }

      // Persist via the EnergyAccountStore typed-collection write-through.
      await store.set(memberChecksum, account);

      const event: IAdminJouleEvent = {
        id: globalThis.crypto.randomUUID(),
        userId,
        action,
        deltaMicroJoules: action === 'credit' ? amount : -amount,
        balanceAfterMicroJoules: account.balance,
        reason,
        memo,
        performedBy: describeAdmin(adminUser),
        at: new Date(),
      };
      await this.recordEvent(event);

      console.info(
        '[AdminJouleController] %s %s µJ for user=%s by=%s reason=%s before=%s after=%s',
        action,
        amount.toString(10),
        userId,
        event.performedBy,
        JSON.stringify(reason),
        before.toString(10),
        account.balance.toString(10),
      );

      return {
        statusCode: 200,
        response: {
          message: action === 'credit' ? 'Credited' : 'Debited',
          account: this.snapshot(account),
          event: JSON.parse(JSON.stringify(event, bigintReplacer)),
        } as IApiMessageResponse,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[AdminJouleController] ${action} error:`,
        msg,
        err instanceof Error ? err.stack : '',
      );
      return {
        statusCode: 400,
        response: { message: msg, error: msg },
      };
    }
  }

  private handlePostCredit(
    req: Parameters<ApiRequestHandler<AdminJouleApiResponse>>[0],
  ): Promise<IStatusCodeResponse<AdminJouleApiResponse>> {
    return this.applyDelta(req, 'credit');
  }

  private handlePostDebit(
    req: Parameters<ApiRequestHandler<AdminJouleApiResponse>>[0],
  ): Promise<IStatusCodeResponse<AdminJouleApiResponse>> {
    return this.applyDelta(req, 'debit');
  }

  private async handlePostAdjust(
    req: Parameters<ApiRequestHandler<AdminJouleApiResponse>>[0],
  ): Promise<IStatusCodeResponse<AdminJouleApiResponse>> {
    const userId = (req as unknown as { params?: { userId?: string } }).params
      ?.userId;
    if (!userId) {
      return {
        statusCode: 400,
        response: { message: 'userId is required', error: 'VALIDATION_ERROR' },
      };
    }

    const body =
      (
        req as unknown as {
          body?: {
            targetMicroJoules?: unknown;
            reason?: unknown;
            memo?: unknown;
          };
        }
      ).body ?? {};

    const target = parseMicroJoules(body.targetMicroJoules);
    if (target === null) {
      return {
        statusCode: 400,
        response: {
          message: '"targetMicroJoules" must be a decimal string',
          error: 'VALIDATION_ERROR',
        },
      };
    }
    if (target < 0n) {
      return {
        statusCode: 400,
        response: {
          message: '"targetMicroJoules" must be >= 0',
          error: 'VALIDATION_ERROR',
        },
      };
    }

    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (reason.length === 0) {
      return {
        statusCode: 400,
        response: {
          message: '"reason" is required',
          error: 'VALIDATION_ERROR',
        },
      };
    }
    if (reason.length > REASON_MAX_LENGTH) {
      return {
        statusCode: 400,
        response: {
          message: `"reason" must be ≤ ${REASON_MAX_LENGTH} chars`,
          error: 'VALIDATION_ERROR',
        },
      };
    }
    const memo =
      typeof body.memo === 'string' && body.memo.length > 0
        ? body.memo.slice(0, 1024)
        : undefined;

    const store = this.getStore();
    if (!store) {
      return {
        statusCode: 503,
        response: {
          message: 'EnergyAccountStore not available',
          error: 'SERVICE_UNAVAILABLE',
        },
      };
    }

    const adminUser = (req as unknown as { user?: IRequestUser }).user;

    try {
      const memberChecksum = this.resolveMemberChecksum(userId);
      const account = await store.getOrCreate(memberChecksum);
      const before = account.balance;
      const delta = target - before;

      if (delta > 0n) {
        account.credit(delta);
      } else if (delta < 0n) {
        const debit = -delta;
        if (debit > account.balance) {
          return {
            statusCode: 422,
            response: {
              message:
                'Adjust delta exceeds current balance; reservations may be in flight.',
              error: 'INSUFFICIENT_BALANCE',
              balance: account.balance.toString(10),
              requested: debit.toString(10),
            } as ApiErrorResponse,
          };
        }
        account.charge(debit);
      }

      await store.set(memberChecksum, account);

      const event: IAdminJouleEvent = {
        id: globalThis.crypto.randomUUID(),
        userId,
        action: 'adjust',
        deltaMicroJoules: delta,
        balanceAfterMicroJoules: account.balance,
        reason,
        memo,
        performedBy: describeAdmin(adminUser),
        at: new Date(),
      };
      await this.recordEvent(event);

      console.info(
        '[AdminJouleController] adjust user=%s by=%s reason=%s before=%s after=%s delta=%s',
        userId,
        event.performedBy,
        JSON.stringify(reason),
        before.toString(10),
        account.balance.toString(10),
        delta.toString(10),
      );

      return {
        statusCode: 200,
        response: {
          message: 'Adjusted',
          account: this.snapshot(account),
          event: JSON.parse(JSON.stringify(event, bigintReplacer)),
        } as IApiMessageResponse,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[AdminJouleController] adjust error:', msg);
      return {
        statusCode: 400,
        response: { message: msg, error: msg },
      };
    }
  }

  private async handleGetEvents(
    req: Parameters<ApiRequestHandler<AdminJouleApiResponse>>[0],
  ): Promise<IStatusCodeResponse<AdminJouleApiResponse>> {
    const params = (req as unknown as { params?: { userId?: string } }).params;
    const userId = params?.userId;
    if (!userId) {
      return {
        statusCode: 400,
        response: { message: 'userId is required', error: 'VALIDATION_ERROR' },
      };
    }

    const query =
      (req as unknown as { query?: Record<string, unknown> }).query ?? {};

    let limit = DEFAULT_EVENTS_PAGE_SIZE;
    const rawLimit = query['limit'];
    if (typeof rawLimit === 'string' && rawLimit.length > 0) {
      const parsed = Number.parseInt(rawLimit, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        limit = Math.min(parsed, MAX_EVENTS_PAGE_SIZE);
      }
    }

    // Cursor-based pagination.  `before` is the ISO timestamp of the oldest
    // event seen by the client; we return the next page strictly older than
    // it.  This keeps pages stable as new events are appended.
    const before =
      typeof query['before'] === 'string' &&
      (query['before'] as string).length > 0
        ? (query['before'] as string)
        : undefined;

    const collection = this.getAuditCollection();
    if (!collection) {
      // No persistent backend — return an empty page rather than crashing.
      return {
        statusCode: 200,
        response: {
          message: 'Joule admin events',
          userId,
          events: [],
          nextCursor: null,
        } as IApiMessageResponse,
      };
    }

    try {
      const filter: Record<string, unknown> = { userId };
      if (before) filter['at'] = { $lt: before };

      // Fetch limit+1 so we can detect whether more pages exist without a
      // separate count query.
      const docs = (await collection
        .find(filter as never)
        .sort({ at: -1 } as never)
        .limit(limit + 1)
        .toArray()) as IAdminJouleAuditDoc[];

      const hasMore = docs.length > limit;
      const page = hasMore ? docs.slice(0, limit) : docs;
      const events = page.map(fromAuditDoc);
      const nextCursor =
        hasMore && page.length > 0 ? page[page.length - 1].at : null;

      return {
        statusCode: 200,
        response: {
          message: 'Joule admin events',
          userId,
          events,
          nextCursor,
        } as IApiMessageResponse,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[AdminJouleController] getEvents error:', msg);
      return {
        statusCode: 500,
        response: { message: 'Internal error', error: msg },
      };
    }
  }
}
