import {
  GlobalActiveContext,
  IRole,
  IRoleBase,
  IRoleDTO,
  ITokenRole,
  ITokenRoleDTO,
  MemberType,
  ModelName,
  Role,
  StringLanguage,
  TranslationRegistry,
  omit,
} from '@brightchain/brightchain-lib';
import { ClientSession, Document, Types } from 'mongoose';
import { IUserDocument } from '../documents';
import { IRoleDocument } from '../documents/role';
import { IUserRoleDocument } from '../documents/user-role';
import { IApplication } from '../interfaces/application';
import { IRoleBackendObject } from '../interfaces/backend-objects/role';
import { DefaultBackendIdType } from '../shared-types';
import { BaseService } from './base';

/**
 * Service for managing roles
 */
export class RoleService extends BaseService {
  /**
   * Constructor for the role service
   * @param application The application object
   */
  constructor(application: IApplication) {
    super(application);
  }

  public static roleToRoleDTO(
    role:
      | ITokenRole<DefaultBackendIdType>
      | IRoleDocument
      | Partial<IRoleBase<DefaultBackendIdType>>,
  ): ITokenRoleDTO {
    return {
      ...(role instanceof Document ? role.toObject() : role),
      _id: (role._id instanceof Types.ObjectId
        ? role._id.toString()
        : role._id) as string,
      translatedName:
        'translatedName' in role ? role.translatedName : role.name,
      createdBy: (role.createdBy instanceof Date
        ? role.createdBy.toString()
        : role.createdBy) as string,
      updatedBy: (role.updatedBy instanceof Date
        ? role.updatedBy.toString()
        : role.updatedBy) as string,
      ...(role.deletedBy
        ? {
            deletedBy: (role.deletedBy instanceof Date
              ? role.deletedBy.toString()
              : role.deletedBy) as string,
          }
        : {}),
    } as ITokenRoleDTO;
  }

  /**
   * Given a Role DTO, reconstitute ids and dates
   * @param role The Role DTO
   * @returns An IRoleBackendObject
   */
  public static hydrateRoleDTOToBackend(
    role: ITokenRoleDTO,
  ): IRoleBackendObject {
    return {
      ...(omit<ITokenRoleDTO, 'translatedName'>(role, [
        'translatedName',
      ]) as IRoleDTO),
      _id: new Types.ObjectId(role._id),
      name: role.name as Role,
      createdAt: new Date(role.createdAt),
      createdBy: new Types.ObjectId(role.createdBy),
      updatedAt: new Date(role.updatedAt),
      updatedBy: new Types.ObjectId(role.updatedBy),
      ...(role.deletedAt ? { deletedAt: new Date(role.deletedAt) } : {}),
      ...(role.deletedBy
        ? {
            deletedBy: new Types.ObjectId(role.deletedBy),
          }
        : {}),
    } as IRoleBackendObject;
  }

  /**
   * Gets the role ID by name
   * @param roleName The name of the role
   * @returns The role ID or null if not found
   */
  public async getRoleIdByName(
    roleName: Role,
    session?: ClientSession,
  ): Promise<DefaultBackendIdType | null> {
    const RoleModel = this.application.getModel<IRoleDocument>(ModelName.Role);
    const role = await RoleModel.findOne({ name: roleName }, undefined, {
      session,
    }).select('_id');
    if (!role) {
      return null;
    }
    return role._id;
  }

  /**
   * Creates a new role
   * @param roleData The role data
   * @param session Optional mongoose session
   * @returns The created role document
   */
  public async createRole(
    roleData: IRole,
    session?: ClientSession | null,
  ): Promise<IRoleDocument> {
    const RoleModel = this.application.getModel<IRoleDocument>(ModelName.Role);
    const role = new RoleModel(roleData);
    const savedRole = await role.save(session ? { session } : {});
    return savedRole;
  }

  /**
   * Adds a user to a role
   * @param roleId - The role id
   * @param userId - The user id
   * @param createdBy - The user creating the relationship
   * @param session Optional mongoose session
   */
  public async addUserToRole(
    roleId: DefaultBackendIdType,
    userId: DefaultBackendIdType,
    createdBy: DefaultBackendIdType,
    session?: ClientSession,
    overrideId?: DefaultBackendIdType,
  ): Promise<IUserRoleDocument> {
    const UserRoleModel = this.application.getModel<IUserRoleDocument>(
      ModelName.UserRole,
    );

    // Check if the user-role relationship already exists (and is not deleted)
    const existingUserRole = await UserRoleModel.findOne({
      userId,
      roleId,
      deletedAt: { $exists: false },
    }).session(session ?? null);

    if (existingUserRole) {
      // Relationship already exists, no need to create it again
      return existingUserRole;
    }

    const userRole = new UserRoleModel({
      ...(overrideId ? { _id: overrideId } : {}),
      userId,
      roleId,
      createdBy,
      updatedBy: createdBy,
    });
    const result = await userRole.save({ session });
    return result;
  }

  /**
   * Removes a user from a role
   * @param roleId - The role id
   * @param userId - The user id
   * @param deletedBy - The user removing the relationship
   * @param session Optional mongoose session
   */
  public async removeUserFromRole(
    roleId: DefaultBackendIdType,
    userId: DefaultBackendIdType,
    deletedBy: DefaultBackendIdType,
    session?: ClientSession,
  ): Promise<void> {
    const UserRoleModel = this.application.getModel<IUserRoleDocument>(
      ModelName.UserRole,
    );
    await UserRoleModel.findOneAndUpdate(
      { userId, roleId, deletedAt: { $exists: false } },
      { deletedAt: new Date(), deletedBy },
      { session },
    );
  }

  /**
   * Deletes a role by ID
   * @param roleId The role ID
   * @param deleter The ID of the user deleting the role
   * @param hardDelete Whether to hard delete the role
   * @param session Optional mongoose session
   */
  public async deleteRole(
    roleId: DefaultBackendIdType,
    deleter: DefaultBackendIdType,
    hardDelete: boolean,
    session?: ClientSession,
  ): Promise<void> {
    const RoleModel = this.application.getModel<IRoleDocument>(ModelName.Role);
    if (hardDelete) {
      await RoleModel.findByIdAndDelete(roleId).session(session ?? null);
    } else {
      await RoleModel.findByIdAndUpdate(roleId, {
        deletedAt: new Date(),
        deletedBy: deleter,
      }).session(session ?? null);
    }
  }

  /**
   * Gets all roles for a user
   * @param userId The user ID
   * @param session Optional mongoose session
   * @returns The roles the user is a member of
   */
  public async getUserRoles(
    userId: DefaultBackendIdType,
    session?: ClientSession,
  ): Promise<IRoleDocument[]> {
    const UserRoleModel = this.application.getModel<IUserRoleDocument>(
      ModelName.UserRole,
    );
    const RoleModel = this.application.getModel<IRoleDocument>(ModelName.Role);

    const userRoles = await UserRoleModel.find({
      userId,
      deletedAt: { $exists: false },
    })
      .select('roleId')
      .lean()
      .session(session ?? null);

    const roleIds = userRoles.map((ur) => ur.roleId);
    return RoleModel.find({
      _id: { $in: roleIds },
      deletedAt: { $exists: false },
    })
      .lean()
      .session(session ?? null);
  }

  /**
   * Gets all users for a role
   * @param roleId The role ID
   * @param session Optional mongoose session
   * @returns The user IDs that are members of the role
   */
  public async getRoleUsers(
    roleId: DefaultBackendIdType,
    session?: ClientSession,
  ): Promise<DefaultBackendIdType[]> {
    const UserRoleModel = this.application.getModel<IUserRoleDocument>(
      ModelName.UserRole,
    );
    const userRoles = await UserRoleModel.find({
      roleId,
      deletedAt: { $exists: false },
    }).session(session ?? null);

    return userRoles.map((ur) => ur.userId);
  }

  /** Convert roles to translated TokenRoles */
  public rolesToTokenRoles(
    roles: Array<IRoleBackendObject>,
    overrideLanguage?: StringLanguage,
  ): Array<ITokenRole<DefaultBackendIdType>> {
    return roles.map((role) => {
      // Find the enum value by matching the role name with enum keys
      const roleTranslation = TranslationRegistry.translate(
        Role,
        role.name,
        overrideLanguage ?? GlobalActiveContext.language,
      );
      return {
        ...role,
        translatedName: roleTranslation,
      } as ITokenRole<DefaultBackendIdType>;
    });
  }

  public async isUserAdmin(
    userDoc: IUserDocument,
    session?: ClientSession,
    providedRoles?: Array<IRoleDocument>,
  ): Promise<boolean> {
    const roles =
      providedRoles ?? (await this.getUserRoles(userDoc._id, session));
    if (roles.filter((r) => r.admin).length > 0) {
      return true;
    }
    return false;
  }

  public async isUserMember(
    userDoc: IUserDocument,
    session?: ClientSession,
    providedRoles?: Array<IRoleDocument>,
  ): Promise<boolean> {
    const roles =
      providedRoles ?? (await this.getUserRoles(userDoc._id, session));
    if (roles.filter((r) => r.member).length > 0) {
      return true;
    }
    return false;
  }

  public async isUserChild(
    userDoc: IUserDocument,
    session?: ClientSession,
    providedRoles?: Array<IRoleDocument>,
  ): Promise<boolean> {
    const roles =
      providedRoles ?? (await this.getUserRoles(userDoc._id, session));
    if (roles.filter((r) => r.child).length > 0) {
      return true;
    }
    return false;
  }

  public async isUserSystem(
    userDoc: IUserDocument,
    session?: ClientSession,
    providedRoles?: Array<IRoleDocument>,
  ): Promise<boolean> {
    const roles =
      providedRoles ?? (await this.getUserRoles(userDoc._id, session));
    if (roles.filter((r) => r.system).length > 0) {
      return true;
    }
    return false;
  }

  public async getMemberType(
    userDoc: IUserDocument,
    session?: ClientSession,
    providedRoles?: Array<IRoleDocument>,
  ): Promise<MemberType> {
    const roles =
      providedRoles ?? (await this.getUserRoles(userDoc._id, session));
    if (await this.isUserSystem(userDoc, session, roles)) {
      return MemberType.System;
    } else if (await this.isUserAdmin(userDoc, session, roles)) {
      return MemberType.Admin;
    } else if (await this.isUserMember(userDoc, session, roles)) {
      return MemberType.User;
    } else {
      return MemberType.Anonymous;
    }
  }
}
