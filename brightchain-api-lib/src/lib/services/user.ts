import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  BackupCodeService,
  UserService as BaseUserService,
  IBaseDocument,
  IConstants,
  IEmailService,
  KeyWrappingService,
  RoleService,
} from '@digitaldefiance/node-express-suite';
import { ITokenRole, IUserBase } from '@digitaldefiance/suite-core-lib';
import { Environment } from '../environment';
import { IApplication } from '../interfaces/application';
import { DefaultBackendIdType } from '../shared-types';

export class UserService<
  T,
  D extends Date,
  S extends string,
  A extends string,
  I extends PlatformID = DefaultBackendIdType,
  TEnvironment extends Environment = Environment,
  TConstants extends IConstants = IConstants,
  TBaseDocument extends IBaseDocument<T, I> = IBaseDocument<T, I>,
  TUser extends IUserBase<I, D, S, A> = IUserBase<I, D, S, A>,
  TTokenRole extends ITokenRole<I, D> = ITokenRole<I, D>,
  TApplication extends IApplication<I> = IApplication<I>,
> extends BaseUserService<
  T,
  I,
  D,
  S,
  A,
  TEnvironment,
  TConstants,
  TBaseDocument,
  TUser,
  TTokenRole,
  TApplication
> {
  constructor(
    application: TApplication,
    roleService: RoleService<I, D, TTokenRole>,
    emailService: IEmailService,
    keyWrappingService: KeyWrappingService,
    backupCodeService: BackupCodeService<I, D, TTokenRole, TApplication>,
  ) {
    super(
      application,
      roleService,
      emailService,
      keyWrappingService,
      backupCodeService,
    );
  }
}
