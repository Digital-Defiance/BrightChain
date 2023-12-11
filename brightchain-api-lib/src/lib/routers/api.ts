import type { IWriteAclAuditLogger } from '@brightchain/brightchain-lib';
import {
  BrightChainFeatures,
  ChannelService,
  ConversationService,
  GroupService,
  IAvailabilityService,
  IBlockStore,
  IDiscoveryProtocol,
  IReconciliationService,
  NodeIdSource,
  PermissionService,
  ServerService,
} from '@brightchain/brightchain-lib';
import {
  IConnectionService,
  IDiscoveryService,
  IFeedService,
  IMessagingService,
  INotificationService,
  IPostService,
  IThreadService,
  IUserProfileService,
} from '@brightchain/brighthub-lib';
import {
  type IAllBurnbagControllerDeps,
  registerBurnbagRoutesOnRouter,
} from '@brightchain/digitalburnbag-api-lib';
import type { INotificationService as IBurnbagNotificationService } from '@brightchain/digitalburnbag-lib';
import { BrightDbApiRouter } from '@brightchain/node-express-suite';
import { IECIESConfig } from '@digitaldefiance/ecies-lib';
import { ECIESService, PlatformID } from '@digitaldefiance/node-ecies-lib';
import { KeyWrappingService } from '@digitaldefiance/node-express-suite';
import { AppConstants } from '../appConstants';
import type { IWriteAclApiManager } from '../auth/writeAclApiRouter';
import { PoolDiscoveryService } from '../availability/poolDiscoveryService';
import { AdminBlockController } from '../controllers/api/adminBlock';
import { AdminChatController } from '../controllers/api/adminChat';
import { AdminChatServersController } from '../controllers/api/adminChatServers';
import { AdminHubController } from '../controllers/api/adminHub';
import { AdminMailController } from '../controllers/api/adminMail';
import { AdminPassController } from '../controllers/api/adminPass';
import { AdminUserController } from '../controllers/api/adminUser';
import { BlocksController } from '../controllers/api/blocks';
import {
  BrightHubConnectionController,
  BrightHubMessagingController,
  BrightHubNotificationController,
  BrightHubPostController,
  BrightHubTimelineController,
} from '../controllers/api/brighthub';
import { BrightPassController } from '../controllers/api/brightpass';

import { BrightTrustController } from '../controllers/api/brightTrust';
import { CBLController } from '../controllers/api/cbl';
import { ChannelController } from '../controllers/api/channels';
import { ConversationController } from '../controllers/api/conversations';
import { DashboardController } from '../controllers/api/dashboard';
import { DocsController } from '../controllers/api/docs';
import { EmailController } from '../controllers/api/emails';
import { EnergyController } from '../controllers/api/energy';
import { GroupController } from '../controllers/api/groups';
import { HealthController } from '../controllers/api/health';
import { I18nController } from '../controllers/api/i18n';
import {
  IntrospectionController,
  IntrospectionControllerConfig,
} from '../controllers/api/introspection';
import { KeyStoreController } from '../controllers/api/keyStore';
import { MessagesController } from '../controllers/api/messages';
import { NodesController } from '../controllers/api/nodes';
import { SCBLController } from '../controllers/api/scbl';
import { ServerController } from '../controllers/api/servers';
import { SyncController } from '../controllers/api/sync';
import { UnifiedNotificationController } from '../controllers/api/unifiedNotifications';
import { UserController } from '../controllers/api/user';
import { UserSearchController } from '../controllers/api/userSearch';
import { IBrightChainApplication } from '../interfaces';
import { requireAuthWithRoles } from '../middlewares/authentication';
import { EventNotificationSystem } from '../services/eventNotificationSystem';
import { MessagePassingService } from '../services/messagePassingService';
import { SESEmailService } from '../services/sesEmail';
import { DefaultBackendIdType } from '../shared-types';
import { BrightChartRouter } from './brightchart';

/**
 * Router for the API.
 *
 * Extends BrightDbApiRouter (which provides base user auth routes) and adds
 * all BrightChain domain-specific controllers: blocks, energy, messaging,
 * channels, groups, BrightHub social, introspection, etc.
 *
 * The base BrightDbApiRouter mounts BrightDbUserController at /user.
 * This class replaces it with the domain-specific UserController that adds
 * backup codes and direct-challenge verification.
 */
export class ApiRouter<
  TID extends PlatformID = DefaultBackendIdType,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
> extends BrightDbApiRouter<TID, any> {
  private readonly blocksController: BlocksController<TID>;
  private readonly brightPassController: BrightPassController<TID>;
  private readonly channelController: ChannelController<TID>;
  private readonly conversationController: ConversationController<TID>;
  private readonly dashboardController: DashboardController<TID>;
  private readonly docsController: DocsController<TID>;
  private readonly emailController: EmailController<TID>;
  private readonly energyController: EnergyController<TID>;
  private readonly groupController: GroupController<TID>;
  private readonly healthController: HealthController<TID>;
  private readonly i18nController: I18nController<TID>;
  private readonly keyStoreController: KeyStoreController<TID>;
  private readonly messagesController: MessagesController<TID>;
  private readonly nodesController: NodesController<TID>;
  private readonly brightTrustController: BrightTrustController<TID>;
  private readonly cblController: CBLController<TID>;
  private readonly scblController: SCBLController<TID>;
  private readonly serverController: ServerController<TID>;
  private readonly syncController: SyncController<TID>;
  private readonly userSearchController: UserSearchController<TID>;
  declare protected readonly userController: UserController<TID>;
  private readonly brightHubPostController: BrightHubPostController<TID>;
  private readonly brightHubMessagingController: BrightHubMessagingController<TID>;
  private readonly brightHubNotificationController: BrightHubNotificationController<TID>;
  private readonly brightHubConnectionController: BrightHubConnectionController<TID>;
  private readonly brightHubTimelineController: BrightHubTimelineController<TID>;
  private readonly unifiedNotificationController: UnifiedNotificationController<TID>;
  private readonly adminUserController: AdminUserController<TID>;
  private readonly adminBlockController: AdminBlockController<TID>;
  private readonly adminHubController: AdminHubController<TID>;
  private readonly adminChatController: AdminChatController<TID>;
  private readonly adminChatServersController: AdminChatServersController<TID>;
  private readonly adminPassController: AdminPassController<TID>;
  private readonly adminMailController: AdminMailController<TID>;
  private readonly brightchartRouter: BrightChartRouter<TID>;
  private introspectionController: IntrospectionController<TID> | null = null;
  private readonly brightchainApplication: IBrightChainApplication<TID>;
  private readonly emailService: SESEmailService<TID>;
  private readonly keyWrappingService: KeyWrappingService;
  private readonly eciesService: ECIESService<TID>;
  /**
   * Constructor for the API router
   */
  constructor(application: IBrightChainApplication<TID>) {
    super(application);
    this.brightchainApplication = application;
    this.emailService = new SESEmailService<TID>(application);
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

    this.blocksController = new BlocksController(application);
    this.brightPassController = new BrightPassController(application);
    this.channelController = new ChannelController(application);
    this.conversationController = new ConversationController(application);
    this.dashboardController = new DashboardController(application);
    this.docsController = new DocsController(application);
    this.emailController = new EmailController(application);
    this.energyController = new EnergyController(application);
    this.groupController = new GroupController(application);
    this.healthController = new HealthController(application);
    this.i18nController = new I18nController(application);
    this.keyStoreController = new KeyStoreController(application);
    this.messagesController = new MessagesController(application);
    this.nodesController = new NodesController(application);
    this.brightTrustController = new BrightTrustController(application);
    this.cblController = new CBLController(application);
    this.scblController = new SCBLController(application);
    this.serverController = new ServerController(application);
    this.syncController = new SyncController(application);
    this.userSearchController = new UserSearchController(application);

    // BrightHub controllers
    this.brightHubPostController = new BrightHubPostController(application);
    this.brightHubMessagingController = new BrightHubMessagingController(
      application,
    );
    this.brightHubNotificationController = new BrightHubNotificationController(
      application,
    );
    this.brightHubConnectionController = new BrightHubConnectionController(
      application,
    );
    this.brightHubTimelineController = new BrightHubTimelineController(
      application,
    );

    // Admin controllers
    this.adminUserController = new AdminUserController(application);
    this.adminBlockController = new AdminBlockController(application);
    this.adminHubController = new AdminHubController(application);
    this.adminChatController = new AdminChatController(application);
    this.adminChatServersController = new AdminChatServersController(application);
    this.adminPassController = new AdminPassController(application);
    this.adminMailController = new AdminMailController(application);

    // BrightChart router
    this.brightchartRouter = new BrightChartRouter(application);

    if (
      application.environment.enabledFeatures.some(
        (f) => f === BrightChainFeatures.BrightPass,
      )
    ) {
      this.router.use('/brightpass', this.brightPassController.router);
    }
    if (
      application.environment.enabledFeatures.some(
        (f) => f === BrightChainFeatures.BrightChat,
      )
    ) {
      this.router.use('/brightchat/channels', this.channelController.router);
      this.router.use(
        '/brightchat/conversations',
        this.conversationController.router,
      );
      this.router.use('/brightchat/groups', this.groupController.router);
      this.router.use('/brightchat/servers', this.serverController.router);
      this.router.use(
        '/brightchat/users/search',
        this.userSearchController.router,
      );
    }
    if (
      application.environment.enabledFeatures.some(
        (f) => f === BrightChainFeatures.BrightMail,
      )
    ) {
      this.router.use('/emails', this.emailController.router);
      this.router.use('/keys', this.keyStoreController.router);
    }
    if (
      application.environment.enabledFeatures.some(
        (f) => f === BrightChainFeatures.BrightHub,
      )
    ) {
      this.router.use('/brighthub/posts', this.brightHubPostController.router);
      this.router.use(
        '/brighthub/messages',
        this.brightHubMessagingController.router,
      );
      this.router.use(
        '/brighthub/notifications',
        this.brightHubNotificationController.router,
      );
      this.router.use('/brighthub', this.brightHubConnectionController.router);
      this.router.use('/brighthub', this.brightHubTimelineController.router);
    }
    if (
      application.environment.enabledFeatures.some(
        (f) => f === BrightChainFeatures.BrightChart,
      )
    ) {
      this.router.use('/brightchart', this.brightchartRouter.router);
    }

    this.router.use('/docs', this.docsController.router);
    this.router.use('/blocks', this.blocksController.router);
    // Unified notification aggregation controller
    this.unifiedNotificationController = new UnifiedNotificationController(
      application,
    );
    this.router.use('/i18n', this.i18nController.router);
    this.router.use('/energy', this.energyController.router);
    this.router.use('/health', this.healthController.router);
    this.router.use('/messages', this.messagesController.router);
    this.router.use('/nodes', this.nodesController.router);
    this.router.use('/brightTrust', this.brightTrustController.router);
    this.router.use('/cbl', this.cblController.router);
    this.router.use('/scbl', this.scblController.router);
    this.router.use('/sync', this.syncController.router);

    // Unified notification aggregation
    this.router.use(
      '/unified-notifications',
      this.unifiedNotificationController.router,
    );

    // Admin routes — all require admin role
    const adminAuth = requireAuthWithRoles(
      application.environment.jwtSecret,
      'admin',
    );
    this.router.use(
      '/admin/dashboard',
      ...adminAuth,
      this.dashboardController.router,
    );
    this.router.use(
      '/admin/users',
      ...adminAuth,
      this.adminUserController.router,
    );
    this.router.use(
      '/admin/blocks',
      ...adminAuth,
      this.adminBlockController.router,
    );
    this.router.use('/admin/hub', ...adminAuth, this.adminHubController.router);
    this.router.use(
      '/admin/chat',
      ...adminAuth,
      this.adminChatController.router,
    );
    this.router.use(
      '/admin/chat',
      ...adminAuth,
      this.adminChatServersController.router,
    );
    this.router.use(
      '/admin/pass',
      ...adminAuth,
      this.adminPassController.router,
    );
    this.router.use(
      '/admin/mail',
      ...adminAuth,
      this.adminMailController.router,
    );
  }

  /**
   * Factory override: creates the domain-specific UserController
   * (with backup codes, direct-challenge, BrightHub profile creation).
   */
  protected override createUserController(
    application: IBrightChainApplication<TID>,
  ): UserController<TID> {
    return new UserController<TID>(application);
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
    this.dashboardController.setAvailabilityService(service);
  }

  /**
   * Set the local node ID on the dashboard controller.
   * Called during app initialization so the dashboard always reports
   * a proper node identity even before AvailabilityService is wired.
   */
  public setDashboardLocalNodeId(nodeId: string, source?: NodeIdSource): void {
    this.dashboardController.setLocalNodeId(nodeId, source);
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

  /**
   * Set the block store for the sync controller.
   * This should be the local inner store for serving block data to remote nodes.
   * @requirements 1.1
   */
  public setSyncBlockStore(store: IBlockStore): void {
    this.syncController.setBlockStore(store);
  }

  // ─── Communication service injection ────────────────────────────────

  /**
   * Set the ConversationService for the DirectMessageController.
   * @requirements 1.1, 1.2, 1.3, 1.4, 1.5
   */
  public setConversationService(service: ConversationService): void {
    this.conversationController.setConversationService(service);
  }

  /**
   * Set the GroupService for the GroupController.
   * @requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
   */
  public setGroupService(service: GroupService): void {
    this.groupController.setGroupService(service);
  }

  /**
   * Set the ChannelService for the ChannelController.
   * @requirements 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5
   */
  public setChannelService(service: ChannelService): void {
    this.channelController.setChannelService(service);
  }

  /**
   * Set the ServerService for the ServerController.
   * @requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.1, 3.2, 3.3, 3.4
   */
  public setServerService(service: ServerService): void {
    this.serverController.setServerService(service);
  }

  /**
   * Set the PermissionService for both GroupController and ChannelController.
   * @requirements 6.1, 6.2, 6.3, 6.4
   */
  public setPermissionService(service: PermissionService): void {
    this.groupController.setPermissionService(service);
    this.channelController.setPermissionService(service);
  }

  /**
   * Set the MessagePassingService for the EmailController.
   * This should be called during application initialization after
   * all required dependencies are available.
   * @requirements 14.1, 14.2
   */
  public setMessagePassingServiceForEmail(
    service: MessagePassingService,
  ): void {
    this.emailController.setMessagePassingService(service);
    this.unifiedNotificationController.setMessagePassingService(service);
  }

  /**
   * Set the user registry for recipient verification on the EmailController.
   * The registry is used by the verify-recipient endpoint to check whether
   * a local user exists before accepting mail.
   */
  public setEmailUserRegistry(registry: {
    hasUser(email: string): Promise<boolean>;
  }): void {
    this.emailController.setUserRegistry(registry);
  }

  /**
   * Set the local email domain on the EmailController.
   * Used to construct full email addresses from usernames during
   * recipient verification.
   */
  public setEmailDomain(domain: string): void {
    this.emailController.setEmailDomain(domain);
  }

  /**
   * Get the DirectMessageController instance.
   */
  public getConversationController(): typeof this.conversationController {
    return this.conversationController;
  }

  /**
   * Get the GroupController instance.
   */
  public getGroupController(): typeof this.groupController {
    return this.groupController;
  }

  /**
   * Get the ChannelController instance.
   */
  public getChannelController(): typeof this.channelController {
    return this.channelController;
  }

  /**
   * Get the ServerController instance.
   */
  public getServerController(): ServerController<TID> {
    return this.serverController;
  }

  // ─── BrightHub service injection ─────────────────────────────────

  /**
   * Set the PostService for the BrightHub post controller.
   * @requirements 11.1-11.5
   */
  public setBrightHubPostService(service: IPostService): void {
    this.brightHubPostController.setPostService(service);
  }

  /**
   * Set the thread service on the post controller.
   * @requirements 2.2
   */
  public setBrightHubThreadService(service: IThreadService): void {
    this.brightHubPostController.setThreadService(service);
  }

  /**
   * Set the MessagingService for the BrightHub messaging controller.
   * @requirements 45.1-45.28
   */
  public setBrightHubMessagingService(service: IMessagingService): void {
    this.brightHubMessagingController.setMessagingService(service);
  }

  /**
   * Set the NotificationService for the BrightHub notification controller.
   * @requirements 57.1-57.12
   */
  public setBrightHubNotificationService(service: INotificationService): void {
    this.brightHubNotificationController.setNotificationService(service);
    this.unifiedNotificationController.setNotificationService(service);
  }

  /**
   * Set the NotificationService for the Burnbag module in the unified notification controller.
   */
  public setBurnbagNotificationService(
    service: IBurnbagNotificationService<TID>,
  ): void {
    this.unifiedNotificationController.setBurnbagNotificationService(service);
  }

  /**
   * Set the ConnectionService for the BrightHub connection controller.
   * @requirements 34.1-34.22
   */
  public setBrightHubConnectionService(service: IConnectionService): void {
    this.brightHubConnectionController.setConnectionService(service);
  }

  /**
   * Set the DiscoveryService for the BrightHub connection controller.
   * @requirements 34.10
   */
  public setBrightHubDiscoveryService(service: IDiscoveryService): void {
    this.brightHubConnectionController.setDiscoveryService(service);
  }

  /**
   * Set the UserProfileService for BrightHub controllers that need it.
   * @requirements 11.8, 34.1
   */
  public setBrightHubUserProfileService(service: IUserProfileService): void {
    this.brightHubConnectionController.setUserProfileService(service);
    this.brightHubTimelineController.setUserProfileService(service);
  }

  /**
   * Set the FeedService for the BrightHub timeline controller.
   * @requirements 11.6-11.11
   */
  public setBrightHubFeedService(service: IFeedService): void {
    this.brightHubTimelineController.setFeedService(service);
  }

  /**
   * Get the BrightHub post controller instance.
   */
  public getBrightHubPostController(): BrightHubPostController<TID> {
    return this.brightHubPostController;
  }

  /**
   * Get the BrightHub messaging controller instance.
   */
  public getBrightHubMessagingController(): BrightHubMessagingController<TID> {
    return this.brightHubMessagingController;
  }

  /**
   * Get the BrightHub notification controller instance.
   */
  public getBrightHubNotificationController(): BrightHubNotificationController<TID> {
    return this.brightHubNotificationController;
  }

  /**
   * Get the BrightHub connection controller instance.
   */
  public getBrightHubConnectionController(): BrightHubConnectionController<TID> {
    return this.brightHubConnectionController;
  }

  /**
   * Get the BrightHub timeline controller instance.
   */
  public getBrightHubTimelineController(): BrightHubTimelineController<TID> {
    return this.brightHubTimelineController;
  }

  // ─── Introspection controller wiring ────────────────────────────────

  /**
   * Initialize the IntrospectionController with its full config.
   * Called once all dependencies are available.
   * Mounts routes at `/introspection`.
   * @requirements 1.1, 1.4, 1.5
   */
  public initIntrospectionController(
    config: IntrospectionControllerConfig,
  ): void {
    this.introspectionController = new IntrospectionController(
      this.brightchainApplication,
      config,
    );
    this.router.use('/introspection', this.introspectionController.router);
  }

  /**
   * Update the IntrospectionController config after initialization.
   * Useful when individual dependencies become available incrementally.
   * @requirements 1.4, 1.5
   */
  public setIntrospectionConfig(config: IntrospectionControllerConfig): void {
    if (this.introspectionController) {
      this.introspectionController.setConfig(config);
    }
  }

  /**
   * Set the PoolDiscoveryService on the IntrospectionController.
   * Called by App.setPoolDiscoveryService after the service is wired.
   * @requirements 7.1, 8.3
   */
  public setIntrospectionPoolDiscoveryService(
    service: PoolDiscoveryService,
  ): void {
    if (this.introspectionController) {
      const currentConfig = this.introspectionController.getConfig();
      this.introspectionController.setConfig({
        ...currentConfig,
        poolDiscoveryService: service,
      });
    }
  }

  /**
   * Get the IntrospectionController instance.
   */
  public getIntrospectionController(): IntrospectionController<TID> | null {
    return this.introspectionController;
  }

  /**
   * Mount the Write ACL API router for managing Write ACLs.
   * Should be called during application initialization when a WriteAclManager
   * is available. The router is mounted at `/acl` alongside existing routes.
   *
   * @param aclManager - The WriteAclManager (or any IWriteAclApiManager) to delegate to
   * @param auditLogger - Optional WriteAclAuditLogger for logging ACL events
   * @see Write ACL Requirement 9.1
   */
  public mountWriteAclRouter(
    aclManager: IWriteAclApiManager,
    auditLogger?: IWriteAclAuditLogger,
  ): void {
    // Dynamic import to avoid circular dependency at module level
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createWriteAclApiRouter } = require('../auth/writeAclApiRouter');
    const writeAclRouter = createWriteAclApiRouter(aclManager, auditLogger);
    this.router.use('/', writeAclRouter);
  }

  /**
   * Mount Digital Burnbag file platform routes.
   * Only mounts when the DigitalBurnbag feature is enabled.
   * Routes are mounted at `/burnbag/*` (e.g. `/burnbag/upload`, `/burnbag/files`).
   *
   * @param deps - All controller dependencies for the burnbag platform
   */
  public mountDigitalBurnbagRoutes(deps: IAllBurnbagControllerDeps<TID>): void {
    if (
      !this.brightchainApplication.environment.enabledFeatures.some(
        (f) => f === BrightChainFeatures.DigitalBurnbag,
      )
    ) {
      return;
    }
    registerBurnbagRoutesOnRouter<TID>(
      this.router,
      this.brightchainApplication,
      deps,
      '/burnbag',
    );
  }
}
