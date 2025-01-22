import {
  DefaultIdType,
  IRole,
  IRoleBackendObject,
  IRoleDTO,
  IRoleDocument,
} from '@BrightChain/brightchain-lib';
import { IApplication } from '../interfaces/application';
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
    role: IRoleDocument | Record<string, any>,
  ): IRoleDTO {
    return {
      ...(role instanceof Document ? role.toObject() : role),
      _id: (role._id instanceof Types.ObjectId
        ? role._id.toString()
        : role._id) as string,
      users: role.users.map((userId) =>
        userId instanceof Types.ObjectId ? userId.toString() : userId,
      ),
      fund:
        role.fund instanceof Types.ObjectId ? role.fund.toString() : role.fund,
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
    } as IRoleDTO;
  }

  /**
   * Given a Role DTO, reconstitute ids and dates
   * @param role The Role DTO
   * @returns An IRoleBackendObject
   */
  public static hydrateRoleDTOToBackend(role: IRoleDTO): IRoleBackendObject {
    return {
      ...role,
      _id: new Types.ObjectId(role._id),
      users: role.users.map((userId) => new Types.ObjectId(userId)),
      fund: new Types.ObjectId(role.fund),
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
   * Gets the name of the admin role for a fund
   * @param fundId The fund ID
   * @returns The role name
   */
  public adminRoleName(fundId: string): string {
    return `${fundId}-Admin`;
  }

  /**
   * Gets the name of the member role for a fund
   * @param fundId The fund ID
   * @returns The role name
   */
  public memberRoleName(fundId: string): string {
    return `${fundId}-Member`;
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
    const RoleModel = this.application.getModel<IRoleDocument>(ModelNames.Role);
    const role = new RoleModel(roleData);
    const savedRole = await role.save(session ? { session } : {});
    return savedRole;
  }

  /**
   * Adds a user to a role
   * @param roleId - The role id
   * @param userId - The user id
   * @param session Optional mongoose session
   */
  public async addUserToRole(
    roleId: DefaultIdType,
    userId: DefaultIdType,
    session?: ClientSession,
  ): Promise<void> {
    const RoleModel = this.application.getModel<IRoleDocument>(ModelNames.Role);
    await RoleModel.findByIdAndUpdate(
      roleId,
      { $addToSet: { users: userId } },
      { session },
    );
  }

  /**
   * Adds a user to a role or creates the role if it doesn't exist
   * @param roleData - The role data
   * @param userId - The user ID
   * @param session Optional mongoose session
   * @returns The role document
   */
  public async addUserOrCreateFundRole(
    roleData: IRole,
    userId: DefaultIdType,
    session?: ClientSession,
  ): Promise<IRoleDocument> {
    const RoleModel = this.application.getModel<IRoleDocument>(ModelNames.Role);
    const role = await RoleModel.findOne({
      name: roleData.name,
      fund: roleData.fund,
    }).session(session ?? null);
    if (!role) {
      return this.createRole({ ...roleData, users: [userId] }, session);
    }
    if (!role.users.includes(userId)) {
      role.users.push(userId);
      await role.save({ session });
    }
    return role;
  }

  /**
   * Removes a user from a role
   * @param roleId - The role id
   * @param userId - The user id
   * @param session Optional mongoose session
   */
  public async removeUserFromRole(
    roleId: DefaultIdType,
    userId: DefaultIdType,
    session?: ClientSession,
  ): Promise<void> {
    const RoleModel = this.application.getModel<IRoleDocument>(ModelNames.Role);
    await RoleModel.findByIdAndUpdate(
      roleId,
      { $pull: { users: userId } },
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
    roleId: DefaultIdType,
    deleter: DefaultIdType,
    hardDelete: boolean,
    session?: ClientSession,
  ): Promise<void> {
    const RoleModel = this.application.getModel<IRoleDocument>(ModelNames.Role);
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
   * Deletes all roles associated with a fund
   * @param fundId The fund ID
   * @param deleter The ID of the user deleting the role
   * @param hardDelete Whether to hard delete the roles
   * @param session The session to use for the operation
   */
  public async deleteRolesByFund(
    fundId: string,
    deleter: DefaultIdType,
    hardDelete: boolean,
    session?: ClientSession,
  ): Promise<void> {
    const RoleModel = this.application.getModel<IRoleDocument>(ModelNames.Role);
    if (hardDelete) {
      await RoleModel.deleteMany({ fund: fundId }).session(session ?? null);
    } else {
      await RoleModel.updateMany(
        { fund: fundId },
        { deletedAt: new Date(), deletedBy: deleter },
      ).session(session ?? null);
    }
  }

  /**
   * Gets all roles for a user
   * @param userId The user ID
   * @param session Optional mongoose session
   * @returns The roles the user is a member of
   */
  public async getUserRoles(userId: DefaultIdType, session?: ClientSession) {
    const RoleModel = this.application.getModel<IRoleDocument>(ModelNames.Role);
    return RoleModel.find({
      users: { $in: [userId] },
      deletedAt: { $exists: false },
    }).session(session ?? null);
  }
}
