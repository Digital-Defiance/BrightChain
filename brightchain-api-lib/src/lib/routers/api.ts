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
import { DocsController } from '../controllers/api/docs';
import { EnergyController } from '../controllers/api/energy';
import { HealthController } from '../controllers/api/health';
import { I18nController } from '../controllers/api/i18n';
import { MessagesController } from '../controllers/api/messages';
import { NodesController } from '../controllers/api/nodes';
import { QuorumController } from '../controllers/api/quorum';
import { SCBLController } from '../controllers/api/scbl';
import { SyncController } from '../controllers/api/sync';
import { UserController } from '../controllers/api/user';
import { IBrightChainApplication } from '../interfaces';
import { EmailService } from '../services/email';
import { EventNotificationSystem } from '../services/eventNotificationSystem';
import { MessagePassingService } from '../services/messagePassingService';
import { DefaultBackendIdType } from '../shared-types';
import { BaseRouter } from './base';
import { IAvailabilityService, IDiscoveryProtocol, IReconciliationService } from '@brightchain/brightchain-lib';

/**
 * Router for the API
 */
export class ApiRouter<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseRouter<TID> {
  private readonly blocksController: BlocksController<TID>;
  private readonly docsController: DocsController<TID>;
  private readonly energyController: EnergyController<TID>;
  private readonly healthController: HealthController<TID>;
  private readonly i18nController: I18nController<TID>;
  private readonly messagesController: MessagesController<TID>;
  private readonly nodesController: NodesController<TID>;
  private readonly quorumController: QuorumController<TID>;
  private readonly cblController: CBLController<TID>;
  private readonly scblController: SCBLController<TID>;
  private readonly syncController: SyncController<TID>;
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
    this.docsController = new DocsController(application);
    this.energyController = new EnergyController(application);
    this.healthController = new HealthController(application);
    this.i18nController = new I18nController(application);
    this.messagesController = new MessagesController(application);
    this.nodesController = new NodesController(application);
    this.quorumController = new QuorumController(application);
    this.cblController = new CBLController(application);
    this.scblController = new SCBLController(application);
    this.syncController = new SyncController(application);

    this.router.use('/user', this.userController.router);
    this.router.use('/blocks', this.blocksController.router);
    this.router.use('/docs', this.docsController.router);
    this.router.use('/i18n', this.i18nController.router);
    this.router.use('/energy', this.energyController.router);
    this.router.use('/health', this.healthController.router);
    this.router.use('/messages', this.messagesController.router);
    this.router.use('/nodes', this.nodesController.router);
    this.router.use('/quorum', this.quorumController.router);
    this.router.use('/cbl', this.cblController.router);
    this.router.use('/scbl', this.scblController.router);
    this.router.use('/sync', this.syncController.router);
  }

  /**
   * Set the MessagePassingService for the messages controller.
   * This should be called during application initialization after
   * all required dependencies are available.
   * @requirements 1.6
   */
  public setMessagePassingService(service: MessagePassingService): void {
    this.messagesController.setMessageService(service);
  }

  /**
   * Set the DiscoveryProtocol for the nodes controller.
   * This should be called during application initialization after
   * all required dependencies are available.
   * @requirements 3.3
   */
  public setDiscoveryProtocol(protocol: IDiscoveryProtocol): void {
    this.nodesController.setDiscoveryProtocol(protocol);
  }

  /**
   * Set the AvailabilityService for the nodes controller.
   * This should be called during application initialization after
   * all required dependencies are available.
   * @requirements 3.1, 3.2
   */
  public setAvailabilityService(service: IAvailabilityService): void {
    this.nodesController.setAvailabilityService(service);
  }

  /**
   * Get the NodesController instance.
   * Useful for checking node registration status.
   */
  public getNodesController(): NodesController<TID> {
    return this.nodesController;
  }

  /**
   * Get the SyncController instance.
   * Useful for setting up sync-related services.
   */
  public getSyncController(): SyncController<TID> {
    return this.syncController;
  }

  /**
   * Set the AvailabilityService for the sync controller.
   * This should be called during application initialization after
   * all required dependencies are available.
   * @requirements 4.1, 4.2, 4.3
   */
  public setSyncAvailabilityService(service: IAvailabilityService): void {
    this.syncController.setAvailabilityService(service);
  }

  /**
   * Set the ReconciliationService for the sync controller.
   * This should be called during application initialization after
   * all required dependencies are available.
   * @requirements 4.4
   */
  public setReconciliationService(service: IReconciliationService): void {
    this.syncController.setReconciliationService(service);
  }

  /**
   * Set the EventNotificationSystem for the sync controller.
   * This enables WebSocket event emission for replication events.
   * @requirements 4.5
   */
  public setSyncEventSystem(eventSystem: EventNotificationSystem): void {
    this.syncController.setEventSystem(eventSystem);
  }
}
