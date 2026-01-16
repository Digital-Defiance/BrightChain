/* eslint-disable @typescript-eslint/no-explicit-any */
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { ECIESService } from '@digitaldefiance/node-ecies-lib';
import {
  BackupCodeService,
  UserController as BaseUserController,
  Controller,
  JwtService,
  RoleService,
  UserService,
  IApplication as BaseIApplication,
} from '@digitaldefiance/node-express-suite';
import {
  ITokenRole,
  ITokenUser,
  IUserBase,
} from '@digitaldefiance/suite-core-lib';
import type { DefaultBackendIdType } from '../shared-types';

@Controller()
export class UserController<
  I extends string = DefaultBackendIdType,
  D extends Date = Date,
  S extends string = string,
  A extends string = string,
  TUser extends IUserBase<I, D, S, A> = IUserBase<I, D, S, A>,
  TTokenRole extends ITokenRole<I, D> = ITokenRole<I, D>,
  TTokenUser extends ITokenUser = ITokenUser,
  TApplication extends BaseIApplication<I> = BaseIApplication<I>,
  TLanguage extends CoreLanguageCode = CoreLanguageCode,
> extends BaseUserController<
  I,
  D,
  S,
  A,
  TUser,
  TTokenRole,
  TTokenUser,
  TApplication,
  TLanguage
> {
  constructor(
    application: TApplication,
    jwtService: JwtService<I, D, TTokenRole, TTokenUser, TApplication>,
    userService: UserService<
      any,
      I,
      D,
      S,
      A,
      any,
      any,
      any,
      TUser,
      TTokenRole,
      TApplication
    >,
    backupCodeService: BackupCodeService<I, D, TTokenRole, TApplication>,
    roleService: RoleService<I, D, TTokenRole>,
    eciesService: ECIESService,
  ) {
    super(
      application,
      jwtService,
      userService,
      backupCodeService,
      roleService,
      eciesService,
    );
  }
}
