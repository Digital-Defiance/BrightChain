/**
 * UserSearchController — REST API for searching users (BrightChat DM creation).
 *
 * Routes:
 *   GET /   — Search users by display name (partial, case-insensitive)
 *
 * Mounted at `/brightchat/users/search` in the API router.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import {
  ISearchUsersResponse,
  MemberStore,
} from '@brightchain/brightchain-lib';
import type { BrightDb } from '@brightchain/db';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  IStatusCodeResponse,
  TypedHandlers,
  routeConfig,
} from '@digitaldefiance/node-express-suite';
import { IBrightChainApplication } from '../../interfaces/application';
import { DefaultBackendIdType } from '../../shared-types';
import { handleError, unauthorizedError } from '../../utils/errorResponse';
import { BaseController } from '../base';

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_USER_LIMIT = 20;

// ─── Pure filtering logic (exported for PBT) ───────────────────────────────

/**
 * Represents a user record for search purposes.
 */
export interface IUserSearchRecord {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

/**
 * Pure function: filters users by query (case-insensitive partial match on displayName),
 * excludes the requesting user, and caps results at the given limit.
 *
 * Extracted for direct property-based testing (Properties 5 & 6).
 *
 * @param users       - The full list of user records to filter
 * @param query       - The search query string (empty string returns all)
 * @param requestingUserId - The ID of the requesting user to exclude
 * @param limit       - Maximum number of results to return
 * @returns Filtered array of user records
 */
export function filterUsersForSearch(
  users: IUserSearchRecord[],
  query: string,
  requestingUserId: string,
  limit: number = DEFAULT_USER_LIMIT,
): IUserSearchRecord[] {
  let filtered = users.filter((u) => u.id !== requestingUserId);

  if (query) {
    const lowerQuery = query.toLowerCase();
    filtered = filtered.filter((u) =>
      u.displayName.toLowerCase().includes(lowerQuery),
    );
  }

  return filtered.slice(0, limit);
}

// ─── Handler types ──────────────────────────────────────────────────────────

type UserSearchApiResponse = ISearchUsersResponse | ApiErrorResponse;

interface UserSearchHandlers extends TypedHandlers {
  searchUsers: ApiRequestHandler<UserSearchApiResponse>;
  batchLookup: ApiRequestHandler<UserSearchApiResponse>;
}

interface UserSearchQuery {
  query: { query?: string };
}

interface BatchLookupBody {
  body: { ids?: string[] };
}

// ─── Controller ─────────────────────────────────────────────────────────────

/**
 * Controller for user search (BrightChat DM creation flow).
 *
 * @requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */
export class UserSearchController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  UserSearchApiResponse,
  UserSearchHandlers,
  CoreLanguageCode
> {
  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  protected initRouteDefinitions(): void {
    const auth = {
      useAuthentication: true,
      useCryptoAuthentication: false,
    };

    this.routeDefinitions = [
      routeConfig('get', '/', {
        ...auth,
        handlerKey: 'searchUsers',
      }),
      routeConfig('post', '/batch', {
        ...auth,
        handlerKey: 'batchLookup',
      }),
    ];

    this.handlers = {
      searchUsers: this.handleSearchUsers.bind(this),
      batchLookup: this.handleBatchLookup.bind(this),
    };
  }

  /**
   * Extract the authenticated user ID from the request.
   * Returns null if no authenticated user (handler returns 401).
   */
  private getRequestingUserId(req: unknown): string | null {
    const user = (req as { user?: { id?: string } }).user;
    if (user && typeof user.id === 'string') return user.id;
    return null;
  }

  /**
   * GET / — Search users by display name.
   *
   * @requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
   */
  private async handleSearchUsers(
    req: unknown,
  ): Promise<IStatusCodeResponse<UserSearchApiResponse>> {
    try {
      // Require authentication (Req 7.5)
      const requestingUserId = this.getRequestingUserId(req);
      if (!requestingUserId) {
        return unauthorizedError('Authentication required');
      }

      const { query } = (req as UserSearchQuery).query;
      const searchQuery = query ?? '';

      // Require a non-empty search query — don't return all users
      // until a friends/contacts system is in place (Req 7.2)
      if (!searchQuery.trim()) {
        return {
          statusCode: 200,
          response: {
            status: 'success',
            data: { users: [] },
          },
        };
      }

      // Fetch candidate users from DB or MemberStore
      const users = await this.fetchUsers(searchQuery);

      // Apply pure filtering logic (Req 7.2, 7.3, 7.6)
      const results = filterUsersForSearch(
        users,
        searchQuery,
        requestingUserId,
        DEFAULT_USER_LIMIT,
      );

      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: { users: results },
        },
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * Fetch user records from the database or MemberStore.
   * Uses BrightDb 'users' collection with regex matching when a query is provided,
   * or returns up to DEFAULT_USER_LIMIT users when no query is given.
   *
   * Falls back to MemberStore.queryIndex() when DB is not available.
   */
  private async fetchUsers(
    searchQuery: string,
  ): Promise<IUserSearchRecord[]> {
    // Try DB-backed search first (supports partial matching)
    const brightDb = this.application.services.has('db')
      ? (this.application.services.get('db') as BrightDb)
      : undefined;

    if (brightDb) {
      return this.searchViaDb(brightDb, searchQuery);
    }

    // Fallback: use MemberStore in-memory index
    return this.searchViaMemberStore();
  }

  /**
   * Search users via direct DB access (supports partial matching).
   */
  private async searchViaDb(
    brightDb: BrightDb,
    searchQuery: string,
  ): Promise<IUserSearchRecord[]> {
    const usersCol = brightDb.collection<{
      _id?: string;
      username: string;
      email: string;
      displayName?: string;
    }>('users');

    // Build query filter
    let filter: Record<string, unknown> = {};
    if (searchQuery) {
      const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(escaped, 'i');
      filter = { username: { $regex: pattern } };
    }

    const cursor = usersCol.find(filter as never);
    const results = await cursor.limit(DEFAULT_USER_LIMIT + 1).toArray();

    return results.map((u) => ({
      id: typeof u._id === 'string' ? u._id : String(u._id),
      displayName: u.displayName ?? u.username,
      avatarUrl: undefined,
    }));
  }

  /**
   * Fallback: search users via MemberStore.queryIndex().
   * Note: MemberStore only supports exact name matching, so partial
   * matching is handled by the pure filterUsersForSearch function.
   */
  private async searchViaMemberStore(): Promise<IUserSearchRecord[]> {
    const memberStore =
      this.application.services.get<MemberStore<TID>>('memberStore');
    if (!memberStore) {
      return [];
    }

    // Fetch all members up to a reasonable limit
    const members = await memberStore.queryIndex({
      limit: DEFAULT_USER_LIMIT * 2,
    });

    const idProvider = this.application.services.get('idProvider') as
      | { toString(id: TID, encoding: string): string }
      | undefined;

    return members.map((m) => ({
      id: idProvider ? idProvider.toString(m.id, 'hex') : String(m.id),
      displayName: String(m.id), // MemberStore references don't carry displayName
      avatarUrl: undefined,
    }));
  }

  /**
   * POST /batch — Look up display names for a list of user IDs.
   * Returns { users: [{ id, displayName, avatarUrl }] } for each found ID.
   * Unknown IDs are omitted from the response.
   */
  private async handleBatchLookup(
    req: unknown,
  ): Promise<IStatusCodeResponse<UserSearchApiResponse>> {
    try {
      const requestingUserId = this.getRequestingUserId(req);
      if (!requestingUserId) {
        return unauthorizedError('Authentication required');
      }

      const { ids } = (req as BatchLookupBody).body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return {
          statusCode: 200,
          response: { status: 'success', data: { users: [] } },
        };
      }

      // Cap at 50 IDs per request
      const lookupIds = ids.slice(0, 50);

      const brightDb = this.application.services.has('db')
        ? (this.application.services.get('db') as BrightDb)
        : undefined;

      if (!brightDb) {
        return {
          statusCode: 200,
          response: { status: 'success', data: { users: [] } },
        };
      }

      const usersCol = brightDb.collection<{
        _id?: string;
        username: string;
        displayName?: string;
      }>('users');

      const users: IUserSearchRecord[] = [];
      for (const id of lookupIds) {
        if (typeof id !== 'string') continue;
        const doc = await usersCol.findOne({ _id: id } as never);
        if (doc) {
          users.push({
            id: typeof doc._id === 'string' ? doc._id : String(doc._id),
            displayName: doc.displayName ?? doc.username,
            avatarUrl: undefined,
          });
        }
      }

      return {
        statusCode: 200,
        response: { status: 'success', data: { users } },
      };
    } catch (error) {
      return handleError(error);
    }
  }
}
