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
import { SchemaCollection } from '../../enumerations/schema-collection';
import { IBrightChainApplication } from '../../interfaces/application';
import { DefaultBackendIdType } from '../../shared-types';
import {
  forbiddenError,
  handleError,
  notFoundError,
  validationError,
} from '../../utils/errorResponse';
import { BaseController } from '../base';

type AdminUserApiResponse = IApiMessageResponse | ApiErrorResponse;

interface AdminUserHandlers extends TypedHandlers {
  listUsers: ApiRequestHandler<AdminUserApiResponse>;
  updateUserStatus: ApiRequestHandler<AdminUserApiResponse>;
  updateUserRole: ApiRequestHandler<AdminUserApiResponse>;
  deleteUser: ApiRequestHandler<AdminUserApiResponse>;
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
 * ### PUT /api/admin/users/:userId/role
 * Change a user's role (Member ↔ Admin). System/Admin users only.
 *
 * ### DELETE /api/admin/users/:userId
 * Delete a user: removes their CBLs from MemberStore and DB records.
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
      routeConfig('put', '/:userId/role', {
        handlerKey: 'updateUserRole',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('delete', '/:userId', {
        handlerKey: 'deleteUser',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
    ];

    this.handlers = {
      listUsers: this.handleListUsers.bind(this),
      updateUserStatus: this.handleUpdateUserStatus.bind(this),
      updateUserRole: this.handleUpdateUserRole.bind(this),
      deleteUser: this.handleDeleteUser.bind(this),
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

      const usersCollection = brightDb.collection(SchemaCollection.User);

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
        _id: doc['_id'],
        username: doc['username'] ?? '',
        email: doc['email'] ?? '',
        accountStatus: doc['accountStatus'] ?? AccountStatus.Active,
        emailVerified: doc['emailVerified'] ?? false,
        lastLogin: doc['lastLogin'] ?? null,
        createdAt: doc['createdAt'] ?? null,
      }));

      // Enrich with role info from user-roles + roles collections
      let roleMap: Map<string, string> = new Map();
      try {
        const userRolesCollection = brightDb.collection(
          SchemaCollection.UserRole,
        );
        const rolesCollection = brightDb.collection(SchemaCollection.Role);

        const userIds = users.map((u) => u._id).filter(Boolean);
        if (userIds.length > 0) {
          const userRoleDocs = await userRolesCollection
            .find({ userId: { $in: userIds } } as never)
            .toArray();
          const roleIds = [
            ...new Set(
              userRoleDocs.map(
                (ur: Record<string, unknown>) => ur['roleId'] as string,
              ),
            ),
          ];
          if (roleIds.length > 0) {
            const roleDocs = await rolesCollection
              .find({ _id: { $in: roleIds } } as never)
              .toArray();
            const roleNameById = new Map(
              roleDocs.map((r: Record<string, unknown>) => [
                r['_id'] as string,
                r['name'] as string,
              ]),
            );
            roleMap = new Map(
              userRoleDocs.map((ur: Record<string, unknown>) => [
                ur['userId'] as string,
                roleNameById.get(ur['roleId'] as string) ?? 'Member',
              ]),
            );
          }
        }
      } catch {
        // Role lookup failed — continue without role info
      }

      const enrichedUsers = users.map((u) => ({
        ...u,
        roleName: roleMap.get(u._id as string) ?? 'Member',
      }));

      return {
        statusCode: 200,
        response: {
          message: 'OK',
          users: enrichedUsers,
          total,
          page,
          limit,
        } as IApiMessageResponse & {
          users: typeof enrichedUsers;
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

      const usersCollection = brightDb.collection(SchemaCollection.User);
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
            // Retrieve the public key via the dedicated lookup which
            // checks the users collection first, then falls back to CBL.
            // getMember() strips publicKey for CBL validation purposes,
            // so we need a separate lookup.
            const publicKeyHex =
              (await memberStore.getMemberPublicKeyHex(typedId)) ?? '';
            // Create a minimal users collection entry for this member
            const now = new Date().toISOString();
            const newUserDoc: Record<string, unknown> = {
              _id: userId,
              username: member.name ?? '',
              email: member.email?.toString() ?? '',
              publicKey: publicKeyHex,
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

  /**
   * PUT /api/admin/users/:userId/role
   * Body: { role: 'Admin' | 'Member' }
   *
   * Changes a user's role by updating the user-roles junction table.
   * Only System and Admin users can perform this action.
   * The system user's role cannot be changed.
   * An admin cannot change their own role.
   */
  private async handleUpdateUserRole(
    req: unknown,
  ): Promise<{ statusCode: number; response: AdminUserApiResponse }> {
    try {
      const request = req as {
        params?: { userId?: string };
        body?: { role?: string };
        memberContext?: { memberId: string; type: number };
      };
      const userId = request.params?.userId;
      const newRoleName = request.body?.role;
      const currentAdminId = request.memberContext?.memberId;

      if (!userId) {
        return validationError('userId is required');
      }

      if (!newRoleName) {
        return validationError('role is required');
      }

      // Only allow Admin or Member as target roles
      const allowedRoles = ['Admin', 'Member'];
      if (!allowedRoles.includes(newRoleName)) {
        return validationError('role must be Admin or Member', {
          allowedValues: allowedRoles,
        });
      }

      // Prevent admins from changing their own role
      if (currentAdminId && currentAdminId === userId) {
        return {
          statusCode: 403,
          response: {
            message: 'You cannot change your own role.',
          } as ApiErrorResponse,
        };
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

      // Verify user exists
      const usersCollection = brightDb.collection(SchemaCollection.User);
      const user = await usersCollection.findOne({ _id: userId });
      if (!user) {
        return notFoundError('User', userId);
      }

      // Look up the roles and user-roles collections
      let rolesCollection;
      let userRolesCollection;
      try {
        rolesCollection = brightDb.collection(SchemaCollection.Role);
        userRolesCollection = brightDb.collection(SchemaCollection.UserRole);
      } catch {
        return {
          statusCode: 503,
          response: {
            message: 'Role collections not initialized',
          } as ApiErrorResponse,
        };
      }

      // Check if the target user is the system user (cannot change)
      const existingUserRole = await userRolesCollection
        .find({ userId } as never)
        .toArray();
      if (existingUserRole.length > 0) {
        const existingRoleId = (existingUserRole[0] as Record<string, unknown>)[
          'roleId'
        ] as string;
        const existingRole = await rolesCollection.findOne({
          _id: existingRoleId,
        });
        if (
          existingRole &&
          (existingRole as Record<string, unknown>)['system'] === true
        ) {
          return {
            statusCode: 403,
            response: {
              message: 'The system user role cannot be changed.',
            } as ApiErrorResponse,
          };
        }
      }

      // Find the target role document
      const targetRole = await rolesCollection.findOne({
        name: newRoleName,
      } as never);
      if (!targetRole) {
        return notFoundError('Role', newRoleName);
      }
      const targetRoleId = (targetRole as Record<string, unknown>)[
        '_id'
      ] as string;

      // When demoting from Admin → Member, ensure this isn't the last admin
      if (newRoleName === 'Member' && existingUserRole.length > 0) {
        const existingRoleId = (existingUserRole[0] as Record<string, unknown>)[
          'roleId'
        ] as string;
        const existingRoleDoc = await rolesCollection.findOne({
          _id: existingRoleId,
        });
        const currentRoleName = existingRoleDoc
          ? ((existingRoleDoc as Record<string, unknown>)['name'] as string)
          : undefined;

        if (currentRoleName === 'Admin') {
          // Find the Admin role doc to count how many users have it
          const adminRole = await rolesCollection.findOne({
            name: 'Admin',
          } as never);
          if (adminRole) {
            const adminRoleId = (adminRole as Record<string, unknown>)[
              '_id'
            ] as string;
            const adminUserRoles = await userRolesCollection
              .find({ roleId: adminRoleId } as never)
              .toArray();
            if (adminUserRoles.length <= 1) {
              return {
                statusCode: 403,
                response: {
                  message:
                    'Cannot demote the last admin. Promote another user to admin first.',
                } as ApiErrorResponse,
              };
            }
          }
        }
      }

      // Update or insert the user-role junction
      if (existingUserRole.length > 0) {
        const existingDoc = existingUserRole[0] as Record<string, unknown>;
        await userRolesCollection.updateOne(
          { _id: existingDoc['_id'] as string },
          {
            $set: {
              roleId: targetRoleId,
              updatedBy: currentAdminId ?? userId,
              updatedAt: new Date().toISOString(),
            },
          },
        );
      } else {
        // No existing user-role — create one
        const now = new Date().toISOString();
        const newId =
          Math.random().toString(16).slice(2) +
          Math.random().toString(16).slice(2);
        await userRolesCollection.insertOne({
          _id: newId,
          userId,
          roleId: targetRoleId,
          createdBy: currentAdminId ?? userId,
          updatedBy: currentAdminId ?? userId,
          createdAt: now,
          updatedAt: now,
        } as never);
      }

      const userDoc = user as Record<string, unknown>;
      return {
        statusCode: 200,
        response: {
          message: 'OK',
          user: {
            id: userDoc['_id'],
            username: userDoc['username'] ?? '',
            email: userDoc['email'] ?? '',
            roleName: newRoleName,
          },
        } as IApiMessageResponse & { user: Record<string, unknown> },
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * DELETE /api/admin/users/:userId
   *
   * Permanently deletes a user: removes their CBLs from MemberStore,
   * their DB records (users, user-roles, user_settings), and their
   * member index entry.
   *
   * System users cannot be deleted.
   * An admin cannot delete themselves.
   */
  private async handleDeleteUser(
    req: unknown,
  ): Promise<{ statusCode: number; response: AdminUserApiResponse }> {
    try {
      const request = req as {
        params?: { userId?: string };
        memberContext?: { memberId: string; type: number };
      };
      const userId = request.params?.userId;
      const currentAdminId = request.memberContext?.memberId;

      if (!userId) {
        return validationError('userId is required');
      }

      // Prevent admins from deleting themselves
      if (currentAdminId && currentAdminId === userId) {
        return forbiddenError('You cannot delete your own account.');
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

      // Check if the target user is the system user (cannot delete)
      try {
        const userRolesCollection = brightDb.collection(
          SchemaCollection.UserRole,
        );
        const rolesCollection = brightDb.collection(SchemaCollection.Role);
        const existingUserRole = await userRolesCollection
          .find({ userId } as never)
          .toArray();
        if (existingUserRole.length > 0) {
          const existingRoleId = (
            existingUserRole[0] as Record<string, unknown>
          )['roleId'] as string;
          const existingRole = await rolesCollection.findOne({
            _id: existingRoleId,
          });
          if (
            existingRole &&
            (existingRole as Record<string, unknown>)['system'] === true
          ) {
            return forbiddenError('The system user cannot be deleted.');
          }
        }
      } catch {
        // Role lookup failed — continue (non-system user)
      }

      // Verify user exists in DB
      const usersCollection = brightDb.collection(SchemaCollection.User);
      const user = await usersCollection.findOne({ _id: userId });
      if (!user) {
        return notFoundError('User', userId);
      }

      const userDoc = user as Record<string, unknown>;
      const deletedUsername = (userDoc['username'] as string) ?? '';
      const deletedEmail = (userDoc['email'] as string) ?? '';

      // 1. Delete member from MemberStore (removes CBLs from in-memory indices)
      if (this.application.services.has('memberStore')) {
        try {
          const memberStore = this.application.services.get(
            'memberStore',
          ) as MemberStore;
          const sp = ServiceProvider.getInstance();
          const typedId = sp.idProvider.idFromString(userId);
          await memberStore.deleteMember(typedId);
        } catch {
          // Member may not exist in MemberStore (seeded user) — continue
        }
      }

      // 2. Delete member_index entry
      try {
        const memberIndexCollection = brightDb.collection('member_index');
        await memberIndexCollection.deleteOne({ _id: userId });
      } catch {
        // member_index may not exist or entry may not be present
      }

      // 3. Delete user-roles junction entries
      try {
        const userRolesCollection = brightDb.collection(
          SchemaCollection.UserRole,
        );
        await userRolesCollection.deleteMany({ userId } as never);
      } catch {
        // user-roles collection may not exist
      }

      // 4. Delete user_settings
      try {
        const settingsCollection = brightDb.collection(
          SchemaCollection.UserSettings,
        );
        await settingsCollection.deleteOne({ _id: userId });
      } catch {
        // user_settings collection may not exist
      }

      // 5. Delete the user document itself
      await usersCollection.deleteOne({ _id: userId });

      return {
        statusCode: 200,
        response: {
          message: 'OK',
          deletedUser: {
            id: userId,
            username: deletedUsername,
            email: deletedEmail,
          },
        } as IApiMessageResponse & {
          deletedUser: { id: string; username: string; email: string };
        },
      };
    } catch (error) {
      return handleError(error);
    }
  }
}
