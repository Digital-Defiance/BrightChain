import type { MemberStore } from '@brightchain/brightchain-lib';
import { ServiceProvider } from '@brightchain/brightchain-lib';
import type { BrightDb } from '@brightchain/db';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  IApiMessageResponse,
  routeConfig,
  TypedHandlers,
} from '@digitaldefiance/node-express-suite';
import { AccountStatus } from '@digitaldefiance/suite-core-lib';
import { IBrightChainApplication } from '../../interfaces/application';
import { DefaultBackendIdType } from '../../shared-types';
import {
  handleError,
  notFoundError,
  validationError,
} from '../../utils/errorResponse';
import { BaseController } from '../base';

type AdminUserApiResponse = IApiMessageResponse | ApiErrorResponse;

interface AdminUserHandlers extends TypedHandlers {
  listUsers: ApiRequestHandler<AdminUserApiResponse>;
  updateUserStatus: ApiRequestHandler<AdminUserApiResponse>;
}

/**
 * Admin-only user management controller.
 *
 * Provides endpoints for listing users with optional status filtering
 * and updating user account status (lock/unlock).
 *
 * ## Endpoints
 *
 * ### GET /api/admin/users
 * Paginated user list with optional `?status=` filter.
 *
 * ### PUT /api/admin/users/:userId/status
 * Set accountStatus to Active or AdminLock only.
 *
 * @requirements 12.2, 12.3, 12.4, 12.5
 */
export class AdminUserController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  AdminUserApiResponse,
  AdminUserHandlers,
  CoreLanguageCode
> {
  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('get', '/', {
        handlerKey: 'listUsers',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('put', '/:userId/status', {
        handlerKey: 'updateUserStatus',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
    ];

    this.handlers = {
      listUsers: this.handleListUsers.bind(this),
      updateUserStatus: this.handleUpdateUserStatus.bind(this),
    };
  }

  /**
   * GET /api/admin/users?page=1&limit=20&status=Active
   */
  private async handleListUsers(
    req: unknown,
  ): Promise<{ statusCode: number; response: AdminUserApiResponse }> {
    try {
      const request = req as {
        query?: { page?: string; limit?: string; status?: string };
      };
      const page = Math.max(1, parseInt(request.query?.page ?? '1', 10) || 1);
      const limit = Math.min(
        100,
        Math.max(1, parseInt(request.query?.limit ?? '20', 10) || 20),
      );
      const statusFilter = request.query?.status;

      const brightDb = this.application.services.has('db')
        ? (this.application.services.get('db') as BrightDb)
        : undefined;
      if (!brightDb) {
        return {
          statusCode: 503,
          response: {
            message: 'Database unavailable',
          } as ApiErrorResponse,
        };
      }

      const usersCollection = brightDb.collection('users');

      // Build filter
      const filter: Record<string, unknown> = {};
      if (
        statusFilter &&
        Object.values(AccountStatus).includes(statusFilter as AccountStatus)
      ) {
        filter['accountStatus'] = statusFilter;
      }

      const total = await usersCollection.countDocuments(filter);
      const skip = (page - 1) * limit;
      const docs = await usersCollection
        .find(filter)
        .skip(skip)
        .limit(limit)
        .toArray();

      const users = docs.map((doc: Record<string, unknown>) => ({
        id: doc['_id'],
        username: doc['username'] ?? '',
        email: doc['email'] ?? '',
        accountStatus: doc['accountStatus'] ?? AccountStatus.Active,
        emailVerified: doc['emailVerified'] ?? false,
        lastLogin: doc['lastLogin'] ?? null,
        createdAt: doc['createdAt'] ?? null,
      }));

      return {
        statusCode: 200,
        response: {
          message: 'OK',
          users,
          total,
          page,
          limit,
        } as IApiMessageResponse & {
          users: typeof users;
          total: number;
          page: number;
          limit: number;
        },
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * PUT /api/admin/users/:userId/status
   * Body: { status: 'Active' | 'AdminLock' }
   */
  private async handleUpdateUserStatus(
    req: unknown,
  ): Promise<{ statusCode: number; response: AdminUserApiResponse }> {
    try {
      const request = req as {
        params?: { userId?: string };
        body?: { status?: string };
      };
      const userId = request.params?.userId;
      const newStatus = request.body?.status;

      if (!userId) {
        return validationError('userId is required');
      }

      if (!newStatus) {
        return validationError('status is required');
      }

      // Only allow Active or AdminLock
      if (
        newStatus !== AccountStatus.Active &&
        newStatus !== AccountStatus.AdminLock
      ) {
        return validationError('status must be Active or AdminLock', {
          allowedValues: [AccountStatus.Active, AccountStatus.AdminLock],
        });
      }

      const brightDb = this.application.services.has('db')
        ? (this.application.services.get('db') as BrightDb)
        : undefined;
      if (!brightDb) {
        return {
          statusCode: 503,
          response: {
            message: 'Database unavailable',
          } as ApiErrorResponse,
        };
      }

      const usersCollection = brightDb.collection('users');
      let user = await usersCollection.findOne({ _id: userId });

      // If user not in users collection, check member index and create
      // a users collection entry so admin can manage them.
      if (!user && this.application.services.has('memberStore')) {
        try {
          const memberStore = this.application.services.get(
            'memberStore',
          ) as MemberStore;
          const sp = ServiceProvider.getInstance();
          const typedId = sp.idProvider.idFromString(userId);
          const member = await memberStore.getMember(typedId);
          if (member) {
            // Create a minimal users collection entry for this member
            const now = new Date().toISOString();
            const newUserDoc: Record<string, unknown> = {
              _id: userId,
              username: member.name ?? '',
              email: member.email?.toString() ?? '',
              publicKey: member.publicKey
                ? Buffer.from(member.publicKey).toString('hex')
                : '',
              mnemonicRecovery: '',
              backupCodes: [],
              accountStatus: AccountStatus.Active,
              emailVerified: false,
              directChallenge: false,
              timezone: 'UTC',
              siteLanguage: 'en-US',
              darkMode: false,
              createdBy: userId,
              updatedBy: userId,
              createdAt: now,
              updatedAt: now,
            };
            try {
              await usersCollection.insertOne(newUserDoc as never);
              user = newUserDoc as unknown as typeof user;
            } catch {
              // Schema validation may reject — try without strict fields
              user = newUserDoc as unknown as typeof user;
            }
          }
        } catch {
          // Member not found in index either — will return 404 below
        }
      }

      if (!user) {
        return notFoundError('User', userId);
      }

      await usersCollection.updateOne(
        { _id: userId },
        { $set: { accountStatus: newStatus } },
      );

      const userDoc = user as Record<string, unknown>;
      return {
        statusCode: 200,
        response: {
          message: 'OK',
          user: {
            id: userDoc['_id'],
            username: userDoc['username'] ?? '',
            email: userDoc['email'] ?? '',
            accountStatus: newStatus,
            emailVerified: userDoc['emailVerified'] ?? false,
          },
        } as IApiMessageResponse & { user: Record<string, unknown> },
      };
    } catch (error) {
      return handleError(error);
    }
  }
}
