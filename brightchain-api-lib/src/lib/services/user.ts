import { Types } from '@digitaldefiance/mongoose-types';
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

export class UserService<
  T,
  I extends Types.ObjectId | string,
  D extends Date,
  S extends string,
  A extends string,
  _TEnvironment extends Environment = Environment,
  _TConstants extends IConstants = IConstants,
  _TBaseDocument extends IBaseDocument<T, I> = IBaseDocument<T, I>,
  TUser extends IUserBase<I, D, S, A> = IUserBase<I, D, S, A>,
  TTokenRole extends ITokenRole<I, D> = ITokenRole<I, D>,
  TApplication extends IApplication = IApplication,
> extends BaseUserService<
  T,
  I,
  D,
  S,
  A,
  _TEnvironment,
  _TConstants,
  _TBaseDocument,
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
    idConverter?: (id: string) => I,
    idGenerator?: () => I,
  ) {
    super(
      application,
      roleService,
      emailService,
      keyWrappingService,
      backupCodeService,
      idConverter,
      idGenerator,
    );
  }
}
