import { AppConstants, IECIESConfig } from '@brightchain/brightchain-lib';
import { UserController } from '../controllers/user';
import { IApplication } from '../interfaces/application';
import { BackupCodeService } from '../services/backupCode';
import { ECIESService } from '../services/ecies/service';
import { EmailService } from '../services/email';
import { JwtService } from '../services/jwt';
import { KeyWrappingService } from '../services/keyWrapping';
import { RoleService } from '../services/role';
import { UserService } from '../services/user';
import { BaseRouter } from './base';

/**
 * Router for the API
 */
export class ApiRouter extends BaseRouter {
  private readonly userController: UserController;
  private readonly jwtService: JwtService;
  private readonly emailService: EmailService;
  private readonly userService: UserService;
  private readonly roleService: RoleService;
  private readonly keyWrappingService: KeyWrappingService;
  private readonly eciesService: ECIESService;
  private readonly backupCodeService: BackupCodeService;
  /**
   * Constructor for the API router
   * @param connection The mongoose connection
   * @param getModel The function to get a mongoose model by name
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
      this.keyWrappingService,
      this.roleService,
    );

    this.userService = new UserService(
      application,
      this.roleService,
      this.emailService,
      this.keyWrappingService,
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
    this.router.use('/user', this.userController.router);
  }
}
