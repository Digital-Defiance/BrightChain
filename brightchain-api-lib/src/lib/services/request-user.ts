import {
  IRequestUserDTO,
  ITokenRole,
  StringLanguage,
} from '@brightchain/brightchain-lib';
import { Types } from 'mongoose';
import { IUserDocument } from '../documents';
import { IRequestUserBackendObject } from '../interfaces/backend-objects/request-user';
import { DefaultBackendIdType } from '../shared-types';
import { RoleService } from './role';

export class RequestUserService {
  /**
   * Given a user document and an array of role documents, create the IRequestUser
   * @param userDoc
   * @returns
   */
  public static makeRequestUserDTO(
    userDoc: IUserDocument,
    roles: ITokenRole<DefaultBackendIdType>[],
  ): IRequestUserDTO {
    if (!userDoc._id) {
      throw new Error('User document is missing _id');
    }
    return {
      id: userDoc._id.toString(),
      email: userDoc.email,
      expireMemoryMnemonicSeconds: userDoc.expireMemoryMnemonicSeconds,
      expireMemoryWalletSeconds: userDoc.expireMemoryWalletSeconds,
      roles: roles.map((r) => RoleService.roleToRoleDTO(r)),
      username: userDoc.username,
      timezone: userDoc.timezone,
      ...(userDoc.lastLogin && { lastLogin: userDoc.lastLogin.toString() }),
      emailVerified: userDoc.emailVerified,
      siteLanguage: userDoc.siteLanguage as string,
    };
  }

  /**
   * Given a request user, reconstitute dates, objectids, and enums
   * @param requestUser a RequestUser DTO
   * @returns An IRequestUserBackendObject
   */
  public static hydrateRequestUser(
    requestUser: IRequestUserDTO,
  ): IRequestUserBackendObject {
    return {
      ...requestUser,
      id: new Types.ObjectId(requestUser.id),
      roles: requestUser.roles.map((r) =>
        RoleService.hydrateRoleDTOToBackend(r),
      ),
      ...(requestUser.lastLogin
        ? { lastLogin: new Date(requestUser.lastLogin) }
        : {}),
      siteLanguage: requestUser.siteLanguage as StringLanguage,
    } as IRequestUserBackendObject;
  }
}
