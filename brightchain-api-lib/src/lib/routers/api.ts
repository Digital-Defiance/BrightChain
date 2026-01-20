/* eslint-disable @typescript-eslint/no-explicit-any */
import { IECIESConfig } from '@digitaldefiance/ecies-lib';
import { ECIESService, PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  BackupCodeService,
  JwtService,
  KeyWrappingService,
  RoleService,
} from '@digitaldefiance/node-express-suite';
import { AppConstants } from '../appConstants';
import { BlocksController } from '../controllers/api/blocks';
import { CBLController } from '../controllers/api/cbl';
import { EnergyController } from '../controllers/api/energy';
import { I18nController } from '../controllers/api/i18n';
import { QuorumController } from '../controllers/api/quorum';
import { UserController } from '../controllers/api/user';
import { IBrightChainApplication } from '../interfaces';
import { EmailService } from '../services/email';
import { DefaultBackendIdType } from '../shared-types';
import { BaseRouter } from './base';

/**
 * Router for the API
 */
export class ApiRouter<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseRouter<TID> {
  private readonly blocksController: BlocksController<TID>;
  private readonly energyController: EnergyController<TID>;
  private readonly i18nController: I18nController<TID>;
  private readonly quorumController: QuorumController<TID>;
  private readonly cblController: CBLController<TID>;
  private readonly userController: UserController<TID>;
  private readonly jwtService: JwtService<TID>;
  private readonly emailService: EmailService<TID>;
  private readonly roleService: RoleService<TID>;
  private readonly keyWrappingService: KeyWrappingService;
  private readonly eciesService: ECIESService<TID>;
  private readonly backupCodeService: BackupCodeService<TID>;
  /**
   * Constructor for the API router
   */
  constructor(application: IBrightChainApplication<TID>) {
    super(application);
    this.jwtService = new JwtService<TID>(application);
    this.roleService = new RoleService<TID>(application);
    this.emailService = new EmailService<TID>(application);
    this.keyWrappingService = new KeyWrappingService();
    const config: IECIESConfig = {
      curveName: AppConstants.ECIES.CURVE_NAME,
      primaryKeyDerivationPath: AppConstants.ECIES.PRIMARY_KEY_DERIVATION_PATH,
      mnemonicStrength: AppConstants.ECIES.MNEMONIC_STRENGTH,
      symmetricAlgorithm: AppConstants.ECIES.SYMMETRIC_ALGORITHM_CONFIGURATION,
      symmetricKeyBits: AppConstants.ECIES.SYMMETRIC.KEY_BITS,
      symmetricKeyMode: AppConstants.ECIES.SYMMETRIC.MODE,
    };
    this.eciesService = new ECIESService<TID>(config);
    this.backupCodeService = new BackupCodeService<TID>(
      application,
      this.eciesService,
      this.keyWrappingService as any,
      this.roleService,
    );

    this.userController = new UserController<TID>(application);
    this.blocksController = new BlocksController(application);
    this.energyController = new EnergyController(application);
    this.i18nController = new I18nController(application);
    this.quorumController = new QuorumController(application);
    this.cblController = new CBLController(application);

    this.router.use('/user', this.userController.router);
    this.router.use('/blocks', this.blocksController.router);
    this.router.use('/i18n', this.i18nController.router);
    this.router.use('/energy', this.energyController.router);
    this.router.use('/quorum', this.quorumController.router);
    this.router.use('/cbl', this.cblController.router);
  }
}
