/* eslint-disable @typescript-eslint/no-explicit-any */
import { IECIESConfig } from '@digitaldefiance/ecies-lib';
import { ECIESService } from '@digitaldefiance/node-ecies-lib';
import {
  BackupCodeService,
  JwtService,
  RoleService,
} from '@digitaldefiance/node-express-suite';
import { AccountStatus } from '@digitaldefiance/suite-core-lib';
import { AppConstants } from '../appConstants';
import { UserController } from '../controllers/user';
import { IBrightChainUserBase } from '../documents/user';
import { IApplication } from '../interfaces/application';
import { StringLanguage } from '../interfaces/request-user';
import { EmailService } from '../services/email';
import { KeyWrappingService } from '../services/keyWrapping';
import { UserService } from '../services/user';
import { DefaultBackendIdType } from '../shared-types';
import { BaseRouter } from './base';

/**
 * Router for the API
 */
export class ApiRouter extends BaseRouter {
  private readonly userController: UserController;
  private readonly jwtService: JwtService;
  private readonly emailService: EmailService;
  private readonly userService: UserService<
    IBrightChainUserBase,
    DefaultBackendIdType,
    Date,
    StringLanguage,
    AccountStatus
  >;
  private readonly roleService: RoleService;
  private readonly keyWrappingService: KeyWrappingService;
  private readonly eciesService: ECIESService;
  private readonly backupCodeService: BackupCodeService;
  /**
   * Constructor for the API router
   */
  constructor(application: IApplication) {
    super(application);
    this.jwtService = new JwtService(application);
    this.roleService = new RoleService(application);
    this.emailService = new EmailService(application);
    this.keyWrappingService = new KeyWrappingService();
    const config: IECIESConfig = {
      curveName: AppConstants.ECIES.CURVE_NAME,
      primaryKeyDerivationPath: AppConstants.ECIES.PRIMARY_KEY_DERIVATION_PATH,
      mnemonicStrength: AppConstants.ECIES.MNEMONIC_STRENGTH,
      symmetricAlgorithm: AppConstants.ECIES.SYMMETRIC_ALGORITHM_CONFIGURATION,
      symmetricKeyBits: AppConstants.ECIES.SYMMETRIC.KEY_BITS,
      symmetricKeyMode: AppConstants.ECIES.SYMMETRIC.MODE,
    };
    this.eciesService = new ECIESService(config);
    this.backupCodeService = new BackupCodeService(
      application,
      this.eciesService,
      this.keyWrappingService as any,
      this.roleService,
    );

    this.userService = new UserService(
      application,
      this.roleService,
      this.emailService,
      this.keyWrappingService as any,
      this.backupCodeService,
    );
    this.userController = new UserController(
      application,
      this.jwtService,
      this.userService,
      this.backupCodeService,
      this.roleService,
      this.eciesService,
    );
    this.router.use('/user', this.userController.router as any);
  }
}
