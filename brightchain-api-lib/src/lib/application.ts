import {
  AliasRegistry,
  AuditLogService,
  BlockSize,
  BrightTrustStateMachine,
  ChannelService,
  ConversationService,
  EnergyLedger,
  GroupService,
  IAvailabilityService,
  IBackupCodeConstants,
  IdentitySealingPipeline,
  IdentityValidator,
  IDiscoveryProtocol,
  IReconciliationService,
  MembershipProofService,
  MemberStore,
  MemoryMessageMetadataStore,
  PermissionService,
  ServiceProvider,
  type IGossipService,
  type MessageCBLService,
} from '@brightchain/brightchain-lib';
import {
  BrightTrustDBName,
  BrightTrustPoolID,
} from '@brightchain/brightchain-lib/lib/db';
import { BrightDb } from '@brightchain/db';
import {
  createBurnbagDeps,
  type IBurnbagExternalDeps,
} from '@brightchain/digitalburnbag-api-lib';
import { BrightDBName, BrightDBPoolID } from '@brightchain/digitalburnbag-lib';
import { BrightDbApplication } from '@brightchain/node-express-suite';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  debugLog,
  DummyEmailService,
  IApplication,
  IConstants,
  IEmailService,
  KeyWrappingService,
  ServiceKeys,
  SystemUserService,
  UpnpManager,
} from '@digitaldefiance/node-express-suite';
import { BrightTrustGossipHandler } from './availability/brightTrustGossipHandler';
import { GossipService } from './availability/gossipService';
import { PoolDiscoveryService } from './availability/poolDiscoveryService';
import { Constants } from './constants';
import { SessionsController } from './controllers/api/sessions';
import { createBlockDocumentStore } from './datastore/block-document-store-factory';
import {
  DocumentCollection,
  DocumentRecord,
  DocumentStore,
} from './datastore/document-store';
import { EmailServices } from './enumerations/email-services';
import { Environment } from './environment';
import { Middlewares } from './middlewares';
import { BrightChainDatabasePlugin } from './plugins/brightchain-database-plugin';
import { configureBrightChainApp } from './plugins/configure-brightchain-app';
import { ApiRouter } from './routers/api';
import { AppRouter } from './routers/app';
import { createTestEmailRouter } from './routers/testEmailRouter';
import {
  AuthService,
  BrightChainBackupCodeService,
  BrightChainSessionAdapter,
  BrightTrustDatabaseAdapter,
  CLIOperatorPrompt,
  ConnectionService,
  ContentAwareBlocksService,
  ContentIngestionService,
  DiscoveryService,
  FeedService,
  IdentityExpirationScheduler,
  MessagingService,
  NotificationService,
  PostfixEmailService,
  PostService,
  SecureKeyStorage,
  SESEmailService,
  UserProfileService,
} from './services';
import { BrightChainAuthenticationProvider } from './services/brightchain-authentication-provider';
import { wrapCollection } from './services/brighthub/collectionAdapter';
import { createThreadService } from './services/brighthub/threadService';
import { createChatStorageProvider, ChatCollectionAdapter } from './services/brightchat/chatStorageAdapter';
import {
  BrightDbEmailMetadataStore,
  BRIGHTMAIL_EMAILS_COLLECTION,
  BRIGHTMAIL_ATTACHMENTS_COLLECTION,
  BRIGHTMAIL_READ_TRACKING_COLLECTION,
} from './services/brightmail/brightDbEmailMetadataStore';
import type { VaultMetadataDocument } from './services/brightpass';
import { ClientWebSocketServer } from './services/clientWebSocketServer';
import { EventNotificationSystem } from './services/eventNotificationSystem';
import { FakeEmailService } from './services/fakeEmailService';
import { MessagePassingService } from './services/messagePassingService';
import { WebSocketMessageServer } from './services/webSocketMessageServer';

/**
 * Application class for BrightChain.
 *
 * Extends the upstream Application from @digitaldefiance/node-express-suite,
 * inheriting HTTP/HTTPS server lifecycle, greenlock/Let's Encrypt support,
 * middleware initialization, and graceful shutdown.
 *
 * BrightChain-specific concerns (services, WebSocket, UPnP, EventNotificationSystem)
 * are initialized after the upstream start() completes.
 *
 * Database integration is handled by the BrightChainDatabasePlugin, registered
 * via configureBrightChainApp() during construction.
 */
export class App<TID extends PlatformID> extends BrightDbApplication<
  TID,
  Environment<TID>,
  IConstants,
  AppRouter<TID>
> {
  private controllers: Map<string, unknown> = new Map();
  private readonly keyStorage: SecureKeyStorage;
  private _preConnectionStore: DocumentStore | null = null;
  private _plugin: BrightChainDatabasePlugin<TID>;
  private apiRouter: ApiRouter<TID> | null = null;
  private eventSystem: EventNotificationSystem | null = null;
  private wsServer: WebSocketMessageServer | null = null;
  private clientWsServer: ClientWebSocketServer | null = null;
  private messagePassingService: MessagePassingService | null = null;
  private upnpManager: UpnpManager | null = null;

  // ── BrightTrust subsystem ──────────────────────────────────────────────
  private brightTrustDbAdapter: BrightTrustDatabaseAdapter<TID> | null = null;
  private brightTrustStateMachine: BrightTrustStateMachine<TID> | null = null;
  private identityExpirationScheduler: IdentityExpirationScheduler<TID> | null =
    null;
  private brightTrustGossipHandler: BrightTrustGossipHandler<TID> | null = null;
  private contentAwareBlocksService: ContentAwareBlocksService<TID> | null =
    null;

  constructor(environment: Environment<TID>) {
    super(
      environment,
      // apiRouterFactory — creates BrightChain's ApiRouter and captures the reference
      (app: IApplication<TID>) => {
        const router = new ApiRouter<TID>(app as App<TID>);
        // Capture the ApiRouter reference so BrightChain-specific service
        // wiring can use it after super.start() completes.
        (app as App<TID>).apiRouter = router;
        return router;
      },
      // cspConfig — undefined; BrightChain's Middlewares.init handles CSP
      undefined,
      // constants — use BrightChain-specific constants (Site: 'BrightChain', etc.)
      Constants,
      // appRouterFactory — creates BrightChain's AppRouter wrapping the ApiRouter
      (apiRouter) => new AppRouter<TID>(apiRouter as ApiRouter<TID>),
      // customInitMiddleware — wrap Middlewares.init to match upstream signature
      (app: Parameters<typeof Middlewares.init>[0]) => Middlewares.init(app),
      // No database param — BrightChainDatabasePlugin provides it
    );

    // Configure GUID provider, constants, runtime registration, and register plugin
    const { plugin } = configureBrightChainApp(this, environment);
    this._plugin = plugin;

    this.keyStorage = SecureKeyStorage.getInstance();
  }

  public override get db(): DocumentStore {
    // Prefer the plugin's document store (wraps the real BrightDb that
    // RBAC seeding and admin controllers also use). Fall back to a
    // lazy-initialized in-memory store only before the plugin is connected.
    try {
      const pluginDb = this._plugin.db;
      if (pluginDb) return pluginDb;
    } catch {
      // Plugin not connected yet — fall through to pre-connection store
    }
    // Lazy-init a temporary in-memory store for early callers (before plugin connects).
    // Once the plugin connects, this store is never reached again.
    if (!this._preConnectionStore) {
      this._preConnectionStore = createBlockDocumentStore({
        useMemory: true,
        blockSize: BlockSize.Medium,
      });
    }
    return this._preConnectionStore;
  }

  /**
   * Get a model or collection from the BrightChain document store by name.
   *
   * If a typed Model has been registered on the BrightDb instance
   * (via `db.model()`), returns that Model — giving callers automatic
   * hydration/dehydration. Otherwise falls back to a raw DocumentCollection.
   *
   * Overrides the upstream Mongoose-specific `getModel()`.
   */
  // @ts-expect-error — BrightChain returns DocumentCollection | Model, not mongoose Model
  public override getModel<U extends DocumentRecord>(
    modelName: string,
  ): DocumentCollection<U> {
    // Prefer a registered Model when available
    try {
      const db = this._plugin.brightDb;
      if (db.hasModel(modelName)) {
        // Return the Model instance — callers that know the typed shape
        // can cast to Model<TStored, TTyped>. The Model also exposes
        // .collection for raw access, so it's a superset of functionality.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return db.model(modelName) as any;
      }
    } catch {
      // Plugin not connected yet — fall through to document store
    }
    return this.db.collection<U>(modelName);
  }

  public override async start(dbUri?: string): Promise<void> {
    // Intercept expressApp.listen to capture the HTTP server reference.
    // The upstream Application creates the server internally via expressApp.listen(),
    // but stores it in a private field we cannot access from a subclass.
    const originalListen = this.expressApp.listen.bind(this.expressApp);
    this.expressApp.listen = ((...args: Parameters<typeof originalListen>) => {
      const server = originalListen(...args);
      this._httpServer = server;
      return server;
    }) as typeof this.expressApp.listen;

    // Mount the test email router BEFORE super.start() so it is registered
    // ahead of the upstream catch-all `/api` 404 handler that appRouter.init()
    // installs. FakeEmailService is a singleton — safe to reference early.
    if (this.environment.disableEmailSend) {
      this.expressApp.use(createTestEmailRouter());
      debugLog(
        this.environment.debug,
        'log',
        '[ ready ] TestEmailRouter pre-mounted (DISABLE_EMAIL_SEND=true)',
      );
    }

    // Delegate to upstream — handles: middleware init, router setup, error handler,
    // HTTP server on :port, greenlock/HTTPS on :443, dev-HTTPS, _ready = true
    // Pass undefined to skip mongoose connection.
    await super.start(dbUri);

    // Restore original listen to avoid side effects on subsequent calls
    this.expressApp.listen = originalListen;

    // Increase HTTP keep-alive timeout to prevent ECONNRESET errors.
    // Node.js defaults to 5s which can cause connection resets when clients
    // (e.g. axios) reuse connections after brief idle periods between requests.
    if (this._httpServer) {
      this._httpServer.keepAliveTimeout = 65_000; // 65s (> typical LB 60s)
      this._httpServer.headersTimeout = 66_000; // must be > keepAliveTimeout
    }

    // ── BrightChain-specific initialization ──────────────────────────
    // After super.start(), the plugin lifecycle is complete:
    //   plugin.connect() → brightchainDatabaseInit()
    //   plugin.init(app) → BrightChainAuthenticationProvider created
    //   (dev mode) initializeDevStore() → seedWithRbac()
    // Retrieve stores from the plugin instead of calling brightchainDatabaseInit() directly.

    // Production-mode member seeding: when DEV_DATABASE is NOT set, the upstream
    // lifecycle does not call initializeDevStore(). Only seed if the database
    // is completely empty (i.e. brightchain-inituserdb was never run).
    if (!this.environment.devDatabase) {
      await this._plugin.seedProductionIfEmpty();
    }

    await this.keyStorage.initializeFromEnvironment();

    const blockStore = this._plugin.blockStore;
    const brightDb = this._plugin.brightDb;
    const memberStore = this._plugin.memberStore;
    const energyStore = this._plugin.energyStore;

    const energyLedger = new EnergyLedger();

    // Use FakeEmailService when email sending is disabled (E2E test mode),
    // otherwise use the production SES-based EmailService.

    const emailServiceFactories: Record<EmailServices, () => IEmailService> = {
      // no-op mailer
      [EmailServices.Dummy]: () => new DummyEmailService<TID>(this),
      // sends mail with postfix
      [EmailServices.Postfix]: () => new PostfixEmailService<TID>(this),
      // sends mail with amazon ses
      [EmailServices.SES]: () => new SESEmailService<TID>(this),
      // captures mail for testing purposes
      [EmailServices.Fake]: () => FakeEmailService.getInstance(),
    };

    const emailService = this.environment.disableEmailSend
      ? FakeEmailService.getInstance()
      : emailServiceFactories[this.environment.emailService]();
    /* register with the service container so that
     * API router sets up email notifications correctly
     */
    this.services.register(ServiceKeys.EMAIL, () => emailService);

    debugLog(
      this.environment.debug,
      'log',
      `[ ready ] Email service configured: ${this.environment.emailService}`,
    );

    if (this.environment.disableEmailSend) {
      debugLog(
        this.environment.debug,
        'log',
        '[ ready ] FakeEmailService configured (DISABLE_EMAIL_SEND=true)',
      );
    }

    const authProvider = this._plugin.authenticationProvider as
      | BrightChainAuthenticationProvider<TID>
      | undefined;
    const authService = new AuthService<TID>(
      this,
      memberStore,
      energyStore,
      emailService,
      this.environment.jwtSecret,
      authProvider,
    );

    // Register services from plugin stores and additional services
    this.services.register('blockStore', () => blockStore);
    this.services.register('db', () => brightDb);
    this.services.register('memberStore', () => memberStore);
    this.services.register('energyStore', () => energyStore);
    this.services.register('energyLedger', () => energyLedger);
    this.services.register('auth', () => authService);

    // BrightChainBackupCodeService — singleton backed by MemberStore + crypto services
    const serviceProvider = ServiceProvider.getInstance<TID>();
    const eciesService = serviceProvider.eciesService;
    const keyWrappingService = new KeyWrappingService();
    const backupCodeService = new BrightChainBackupCodeService<TID>(
      memberStore as MemberStore<TID>,
      // Cast: ecies-lib ECIESService → node-ecies-lib ECIESService (structurally compatible at runtime)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      eciesService as any,
      keyWrappingService,
      Constants.BACKUP_CODES as IBackupCodeConstants,
    );
    this.services.register('backupCodeService', () => backupCodeService);

    // Wire system user into BrightChainBackupCodeService after seeding.
    // SystemUserService.getSystemUser() returns the node-ecies-lib Member
    // singleton (with encryptData/decryptData) that was initialized from
    // the SYSTEM_MNEMONIC env var during app startup.
    try {
      const systemUser = SystemUserService.getSystemUser(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.environment as any,
        this.constants,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      backupCodeService.setSystemUser(systemUser as any);
    } catch {
      // System user may not be available in minimal test environments
      console.warn(
        '[App] SystemUserService.getSystemUser() unavailable — backup code generation will fail until system user is set.',
      );
    }

    // BrightChainSessionAdapter — singleton backed by BrightDb
    const sessionAdapter = new BrightChainSessionAdapter(brightDb);
    this.services.register('sessionAdapter', () => sessionAdapter);

    // SessionsController — handles JWT token verification for authenticated routes
    const sessionsController = new SessionsController<TID>(this);
    this.setController('sessions', sessionsController);

    // EventNotificationSystem for WebSocket events
    this.eventSystem = new EventNotificationSystem();
    this.services.register('eventSystem', () => this.eventSystem);

    // WebSocket — attach to the captured HTTP server
    if (this._httpServer) {
      this.wsServer = new WebSocketMessageServer(
        this._httpServer,
        this.environment.production,
      );
      this.services.register('wsServer', () => this.wsServer);
      debugLog(
        this.environment.debug,
        'log',
        '[ ready ] WebSocket server initialized',
      );

      // Client-facing WebSocket server for Lumen protocol
      // @see Requirements 9.6, 11.3
      this.clientWsServer = new ClientWebSocketServer(
        this._httpServer,
        this.environment.jwtSecret,
      );
      this.services.register('clientWsServer', () => this.clientWsServer);

      // Wire EventNotificationSystem to broadcast through ClientWebSocketServer
      // This unifies all real-time event delivery through a single WebSocket connection
      this.eventSystem.setBroadcaster(this.clientWsServer);

      debugLog(
        this.environment.debug,
        'log',
        '[ ready ] Client WebSocket server initialized (unified event delivery)',
      );
    }

    // Wire EventNotificationSystem to SyncController via the apiRouter
    if (this.apiRouter) {
      this.apiRouter.setSyncEventSystem(this.eventSystem);

      // Provide the dashboard with the node's identity and its source so it
      // always reports a proper node ID, even before AvailabilityService is wired.
      this.apiRouter.setDashboardLocalNodeId(
        this.environment.nodeId,
        this.environment.nodeIdSource,
      );
    }

    // ── Email subsystem (MessagePassingService) initialization ──────
    // The MessagePassingService is required by the EmailController to handle
    // inbox queries, send/receive, thread views, etc. Without it, all email
    // endpoints return SERVICE_UNAVAILABLE (503).
    // We create a local instance with in-memory stores and a no-op gossip stub.
    // When a real GossipService is wired later (via setPoolDiscoveryService),
    // setMessagePassingService() can replace this with a fully-connected instance.
    // @see Requirements 14.1, 14.2
    try {
      const messageCBL = {
        createMessage: async () => ({
          messageId: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          contentBlockIds: [] as string[],
          magnetUrl: '',
        }),
        getMessageMetadata: async () => null,
        getMessageContent: async () => null,
      } as unknown as MessageCBLService;

      const messageMetadataStore = new MemoryMessageMetadataStore();
      const emailMetadataStore = new BrightDbEmailMetadataStore(
        this.getModel(BRIGHTMAIL_EMAILS_COLLECTION),
        this.getModel(BRIGHTMAIL_ATTACHMENTS_COLLECTION),
        this.getModel(BRIGHTMAIL_READ_TRACKING_COLLECTION),
      );

      // No-op gossip stub — real gossip is wired externally via setPoolDiscoveryService
      const gossipStubForEmail: IGossipService = {
        announceBlock: async () => {},
        announceRemoval: async () => {},
        announcePoolDeletion: async () => {},
        announceCBLIndexUpdate: async () => {},
        announceCBLIndexDelete: async () => {},
        announceHeadUpdate: async () => {},
        announceACLUpdate: async () => {},
        handleAnnouncement: async () => {},
        onAnnouncement: () => {},
        offAnnouncement: () => {},
        getPendingAnnouncements: () => [],
        flushAnnouncements: async () => {},
        start: () => {},
        stop: async () => {},
        getConfig: () => ({}) as ReturnType<IGossipService['getConfig']>,
        announceMessage: async () => {},
        sendDeliveryAck: async () => {},
        onMessageDelivery: () => {},
        offMessageDelivery: () => {},
        onDeliveryAck: () => {},
        offDeliveryAck: () => {},
        announceBrightTrustProposal: async () => {},
        announceBrightTrustVote: async () => {},
        onBrightTrustProposal: () => {},
        offBrightTrustProposal: () => {},
        onBrightTrustVote: () => {},
        offBrightTrustVote: () => {},
      };

      const mps = new MessagePassingService(
        messageCBL,
        messageMetadataStore as never,
        this.eventSystem,
        gossipStubForEmail,
      );
      mps.configureEmail(emailMetadataStore, {
        canonicalDomain: this.environment.emailDomain,
      });

      // Store on the App instance and register with the service container
      this.messagePassingService = mps;
      this.services.register('messagePassingService', () => mps);
      this.services.register('emailMetadataStore', () => emailMetadataStore);

      // Wire to both the messages controller and the email controller
      if (this.apiRouter) {
        this.apiRouter.setMessagePassingService(mps);
        this.apiRouter.setMessagePassingServiceForEmail(mps);

        // Wire user registry so verify-recipient can resolve local users.
        // Delegates to MemberStore.queryIndex({ email }) which checks both
        // the in-memory index and the DB-backed fallback path.
        this.apiRouter.setEmailUserRegistry({
          hasUser: async (email: string): Promise<boolean> => {
            try {
              // Extract the local part (username) from the email address.
              // The verify-recipient endpoint constructs "username@domain",
              // but users register with their real email (e.g. jessica@mulein.com),
              // not username@brightchain.org. Look up by username instead.
              const username = email.split('@')[0];
              const byName = await memberStore.queryIndex({ name: username });
              if (byName.length > 0) return true;
              // Fallback: also check by exact email in case someone registered
              // with username@domain as their actual email.
              const byEmail = await memberStore.queryIndex({ email });
              return byEmail.length > 0;
            } catch {
              return false;
            }
          },
        });
        this.apiRouter.setEmailDomain(this.environment.emailDomain);
      }

      debugLog(
        this.environment.debug,
        'log',
        '[ ready ] MessagePassingService initialized (email subsystem active)',
      );
    } catch (emailSubsystemErr) {
      console.warn(
        '[ warning ] Email subsystem initialization failed, email endpoints will return 503:',
        emailSubsystemErr,
      );
    }

    // ── BrightHub social services initialization ────────────────────
    if (this.apiRouter) {
      // BrightHub services expect a Collection<T> interface with
      // .findOne().exec(), .updateOne(filter, fields).exec() patterns.
      // BrightDb's DocumentCollection has a different API, so we wrap
      // each collection via CollectionAdapter (see collectionAdapter.ts).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const realApp = this as any;
      const appForCollections = {
        getModel<T>(name: string) {
          return wrapCollection<T>(realApp.getModel(name));
        },
      };
      const postService = new PostService(appForCollections);
      const threadService = createThreadService(appForCollections);
      const feedService = new FeedService(appForCollections);
      const messagingService = new MessagingService(appForCollections);
      const notificationService = new NotificationService(appForCollections);
      const connectionService = new ConnectionService(appForCollections);
      const discoveryService = new DiscoveryService(appForCollections);
      const userProfileService = new UserProfileService(appForCollections);

      this.services.register('postService', () => postService);
      this.services.register('threadService', () => threadService);
      this.services.register('feedService', () => feedService);
      this.services.register('messagingService', () => messagingService);
      this.services.register('notificationService', () => notificationService);
      this.services.register('connectionService', () => connectionService);
      this.services.register('discoveryService', () => discoveryService);
      this.services.register('userProfileService', () => userProfileService);

      // Wire notification service into services that create notifications
      postService.setNotificationService(notificationService);
      userProfileService.setNotificationService(notificationService);

      // Wire connection service into user profile service for block inheritance
      userProfileService.setConnectionService(connectionService);

      // Wire raw user search so searchUsers can find RBAC-seeded users
      // that live in the BrightDB Collection but not the BlockCollection.
      try {
        const db = this._plugin.brightDb;
        const usersCol = db.collection<{
          _id: string;
          username: string;
          email: string;
        }>('users');
        userProfileService.setRawUserSearch(async (query, limit) => {
          const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const pattern = new RegExp(escaped, 'i');
          const cursor = usersCol.find({
            $or: [
              { username: { $regex: pattern } },
              { email: { $regex: pattern } },
            ],
          } as never);
          const results = await cursor.limit(limit).toArray();
          return results.map((u) => ({
            _id: typeof u._id === 'string' ? u._id : String(u._id),
            username: u.username,
            email: u.email,
          }));
        });
      } catch {
        // BrightDB not available — raw user search disabled
      }

      this.apiRouter.setBrightHubPostService(postService);
      this.apiRouter.setBrightHubThreadService(threadService);
      this.apiRouter.setBrightHubFeedService(feedService);
      this.apiRouter.setBrightHubMessagingService(messagingService);
      this.apiRouter.setBrightHubNotificationService(notificationService);
      this.apiRouter.setBrightHubConnectionService(connectionService);
      this.apiRouter.setBrightHubDiscoveryService(discoveryService);
      this.apiRouter.setBrightHubUserProfileService(userProfileService);

      debugLog(
        this.environment.debug,
        'log',
        '[ ready ] BrightHub social services initialized',
      );
    }

    // ── BrightChat communication services initialization ────────────
    if (this.apiRouter) {
      const permissionService = new PermissionService();

      // Create a BrightDb-backed storage provider for BrightChat services.
      // Uses the same getModel pattern as BrightHub services so all data
      // flows through the single BrightDb instance.
      const chatStorageProvider = createChatStorageProvider(
        (name) => this.getModel(name),
      );

      const conversationService = new ConversationService(
        null,
        undefined,
        chatStorageProvider,
      );
      const groupService = new GroupService(
        permissionService,
        undefined,
        undefined,
        undefined,
        undefined,
        chatStorageProvider,
      );
      const channelService = new ChannelService(
        permissionService,
        undefined,
        undefined,
        undefined,
        undefined,
        chatStorageProvider,
      );

      // Wire group promotion handler so conversations can be promoted to groups
      conversationService.setGroupPromotionHandler(
        (conversationId, participants, newMemberIds, messages, requesterId) =>
          groupService.createGroupFromConversation(
            conversationId,
            participants,
            newMemberIds,
            messages,
            requesterId,
          ),
      );

      this.services.register('permissionService', () => permissionService);
      this.services.register('conversationService', () => conversationService);
      this.services.register('groupService', () => groupService);
      this.services.register('channelService', () => channelService);

      this.apiRouter.setConversationService(conversationService);
      this.apiRouter.setGroupService(groupService);
      this.apiRouter.setChannelService(channelService);
      this.apiRouter.setPermissionService(permissionService);

      debugLog(
        this.environment.debug,
        'log',
        '[ ready ] BrightChat communication services initialized',
      );
    }

    // ── BrightPass vault metadata collection ────────────────────────
    // Register a BrightDb-backed collection for BrightPass vault metadata.
    // BrightPassController retrieves this from the services container and
    // passes it to BrightPassService so vault index data flows through BrightDb.
    {
      const vaultMetadataCollection =
        new ChatCollectionAdapter<VaultMetadataDocument>(
          this.getModel('brightpass_vaults'),
          'id',
        );
      this.services.register(
        'vaultMetadataCollection',
        () => vaultMetadataCollection,
      );
    }

    // ── Digital Burnbag file platform initialization ──────────────
    // Wire burnbag controllers when the DigitalBurnbag feature is enabled.
    // mountDigitalBurnbagRoutes checks the feature flag internally, so we
    // just need to create the deps and call it.
    if (this.apiRouter) {
      try {
        const burnbagDb = new BrightDb(blockStore, {
          name: BrightDBName,
          poolId: BrightDBPoolID,
        });
        const idProv = ServiceProvider.getInstance<TID>().idProvider;
        const burnbagExternalDeps: IBurnbagExternalDeps<TID> = {
          generateId: idProv.generateTyped.bind(idProv) as () => TID,
          idToString: (id: TID) => idProv.idToString(id),
          parseId: (idString: string) => idProv.idFromString(idString),
          parseSafeId: (idString: string) => idProv.parseSafe(idString),
        };
        const burnbagDeps = createBurnbagDeps<TID>(
          burnbagDb,
          burnbagExternalDeps,
        );
        this.apiRouter.mountDigitalBurnbagRoutes(burnbagDeps);
        debugLog(
          this.environment.debug,
          'log',
          '[ ready ] Digital Burnbag file platform routes mounted',
        );
      } catch (burnbagErr) {
        console.warn(
          '[ warning ] Digital Burnbag initialization failed, continuing without burnbag:',
          burnbagErr,
        );
      }
    }

    // ── BrightTrust subsystem initialization ─────────────────────────────
    // Task 23.1: Initialize BrightTrustDatabaseAdapter with pool ID "BrightTrust-system"
    try {
      const brightTrustDb = new BrightDb(blockStore, {
        name: BrightTrustDBName,
        poolId: BrightTrustPoolID,
      });
      this.brightTrustDbAdapter = new BrightTrustDatabaseAdapter<TID>(
        brightTrustDb,
        ServiceProvider.getInstance<TID>().idProvider,
      );
      this.services.register(
        'brightTrustDbAdapter',
        () => this.brightTrustDbAdapter,
      );
      debugLog(
        this.environment.debug,
        'log',
        '[ ready ] BrightTrust database adapter initialized (pool: BrightTrust-system)',
      );

      // Task 23.2: Initialize BrightTrustStateMachine with dependencies
      const serviceProvider = ServiceProvider.getInstance<TID>();
      const sealingService = serviceProvider.sealingService;
      const eciesService = serviceProvider.eciesService;

      // AuditLogService needs a signing member — use the system member from
      // the plugin if available, otherwise defer audit log creation.
      // For now, create without block store persistence (audit entries go to DB only).
      const auditLogService = new AuditLogService<TID>(
        this.brightTrustDbAdapter,
        // The signing member is set when the node operator is configured.
        // At startup we pass null — appendEntry will skip signature generation.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        null as any,
        // ECIESService<TID> is runtime-compatible with ECIESService; cast needed
        // because AuditLogService imports the base ECIESService type.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eciesService as any,
      );
      this.services.register('auditLogService', () => auditLogService);

      // Create IdentitySealingPipeline for content ingestion
      const identitySealingPipeline = new IdentitySealingPipeline<TID>(
        this.brightTrustDbAdapter,
        sealingService,
        eciesService,
        () => this.brightTrustStateMachine!.getCurrentEpoch(),
        () => this.brightTrustDbAdapter!.getStatuteConfig(),
      );
      this.services.register(
        'identitySealingPipeline',
        () => identitySealingPipeline,
      );

      // Create AliasRegistry
      const aliasRegistry = new AliasRegistry<TID>(
        this.brightTrustDbAdapter,
        identitySealingPipeline,
        eciesService,
        () => this.brightTrustStateMachine!.getCurrentEpoch(),
      );
      this.services.register('aliasRegistry', () => aliasRegistry);

      // Create the BrightTrustStateMachine — central coordinator
      // GossipService is wired externally via setPoolDiscoveryService.
      // We pass a no-op stub until the real gossip service is available.
      // The BrightTrustGossipHandler (Task 23.4) bridges gossip ↔ state machine.
      const gossipStub = {
        announceBrightTrustProposal: async () => {},
        announceBrightTrustVote: async () => {},
        onBrightTrustProposal: () => {},
        offBrightTrustProposal: () => {},
        onBrightTrustVote: () => {},
        offBrightTrustVote: () => {},
      };
      this.brightTrustStateMachine = new BrightTrustStateMachine<TID>(
        this.brightTrustDbAdapter,
        sealingService,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        gossipStub as any,
        auditLogService,
        aliasRegistry,
      );
      this.services.register(
        'brightTrustStateMachine',
        () => this.brightTrustStateMachine,
      );
      debugLog(
        this.environment.debug,
        'log',
        '[ ready ] BrightTrust state machine initialized',
      );

      // Task 23.3: Start IdentityExpirationScheduler
      this.identityExpirationScheduler = new IdentityExpirationScheduler<TID>(
        this.brightTrustDbAdapter,
        auditLogService,
      );
      this.identityExpirationScheduler.start();
      this.services.register(
        'identityExpirationScheduler',
        () => this.identityExpirationScheduler,
      );
      debugLog(
        this.environment.debug,
        'log',
        '[ ready ] Identity expiration scheduler started',
      );

      // Task 23.4: Register gossip message handlers for BrightTrust_proposal and brightTrust_vote
      // The BrightTrustGossipHandler is created here but gossip service binding
      // happens when setBrightTrustGossipService() is called externally.
      // For now, store the state machine reference so it can be wired later.
      this.services.register(
        'brightTrustGossipHandlerFactory',
        () => (gossipService: GossipService) => {
          this.brightTrustGossipHandler = new BrightTrustGossipHandler<TID>(
            gossipService,
            this.brightTrustStateMachine!,
            this.brightTrustDbAdapter!,
          );
          this.brightTrustGossipHandler.start();
          this.services.register(
            'brightTrustGossipHandler',
            () => this.brightTrustGossipHandler,
          );
          debugLog(
            this.environment.debug,
            'log',
            '[ ready ] BrightTrust gossip handlers registered (brightTrust_proposal, brightTrust_vote)',
          );
        },
      );

      // Task 23.5: Wire content ingestion middleware (IdentityValidator + IdentitySealingPipeline)
      const membershipProofService = new MembershipProofService<TID>();
      const identityValidator = new IdentityValidator<TID>(
        this.brightTrustDbAdapter,
        eciesService,
        membershipProofService,
      );
      this.services.register('identityValidator', () => identityValidator);

      const contentIngestionService = new ContentIngestionService<TID>(
        identityValidator,
        identitySealingPipeline,
      );
      this.services.register(
        'contentIngestionService',
        () => contentIngestionService,
      );

      // CLIOperatorPrompt for interactive voting
      const operatorPrompt = new CLIOperatorPrompt();
      this.services.register('operatorPrompt', () => operatorPrompt);

      debugLog(
        this.environment.debug,
        'log',
        '[ ready ] BrightTrust subsystem fully initialized',
      );
    } catch (brightTrustErr) {
      console.warn(
        '[ warning ] BrightTrust subsystem initialization failed, continuing without brightTrust:',
        brightTrustErr,
      );
    }

    // UPnP port mapping (non-fatal on failure)
    try {
      if (this.environment.upnp?.enabled) {
        this.upnpManager = new UpnpManager(this.environment.upnp);
        await this.upnpManager.initialize();
        this.services.register('upnpManager', () => this.upnpManager);
        debugLog(
          this.environment.debug,
          'log',
          '[ ready ] UPnP port mapping initialized',
        );
      } else {
        debugLog(
          this.environment.debug,
          'log',
          '[ info ] UPnP port mapping disabled',
        );
      }
    } catch (upnpErr) {
      console.warn(
        '[ warning ] UPnP initialization failed, continuing without port mapping:',
        upnpErr,
      );
    }
  }

  public override async stop(): Promise<void> {
    // BrightChain-specific cleanup first, then delegate to upstream

    // ── BrightTrust subsystem shutdown ─────────────────────────────────────
    // Task 23.3: Stop ExpirationScheduler (graceful cleanup)
    if (this.identityExpirationScheduler) {
      debugLog(
        this.environment.debug,
        'log',
        '[ stopping ] Identity expiration scheduler',
      );
      this.identityExpirationScheduler.stop();
      this.identityExpirationScheduler = null;
    }

    // Task 23.4: Unregister gossip handlers
    if (this.brightTrustGossipHandler) {
      debugLog(
        this.environment.debug,
        'log',
        '[ stopping ] BrightTrust gossip handlers',
      );
      this.brightTrustGossipHandler.stop();
      this.brightTrustGossipHandler = null;
    }

    // Clean up BrightTrust references
    this.brightTrustStateMachine = null;
    this.brightTrustDbAdapter = null;
    this.contentAwareBlocksService = null;

    // Shutdown UPnP port mappings
    if (this.upnpManager) {
      debugLog(this.environment.debug, 'log', '[ stopping ] UPnP port mapping');
      await this.upnpManager.shutdown();
      this.upnpManager = null;
    }

    // Close WebSocket server
    if (this.wsServer) {
      debugLog(this.environment.debug, 'log', '[ stopping ] WebSocket server');
      await new Promise<void>((resolve) => {
        this.wsServer!.close(() => resolve());
      });
      this.wsServer = null;
    }

    // Close client WebSocket server
    if (this.clientWsServer) {
      debugLog(
        this.environment.debug,
        'log',
        '[ stopping ] Client WebSocket server',
      );
      await new Promise<void>((resolve) => {
        this.clientWsServer!.close(() => resolve());
      });
      this.clientWsServer = null;
    }

    // Clean up BrightChain services
    this.eventSystem = null;
    this.messagePassingService = null;
    this.apiRouter = null;
    this._httpServer = null;

    // Upstream handles: greenlockManager.stop(), server.close(), db disconnect, _ready = false
    await super.stop();
  }

  public getController<T = unknown>(name: string): T {
    return this.controllers.get(name) as T;
  }

  public setController(name: string, controller: unknown): void {
    this.controllers.set(name, controller);
  }

  /**
   * Get the API router instance.
   * Useful for setting up services after initialization.
   */
  public getApiRouter(): ApiRouter<TID> | null {
    return this.apiRouter;
  }

  /**
   * Get the EventNotificationSystem instance.
   * Useful for subscribing to events.
   */
  public getEventSystem(): EventNotificationSystem | null {
    return this.eventSystem;
  }

  /**
   * Get the WebSocketMessageServer instance.
   * Useful for sending messages to connected nodes.
   */
  public getWebSocketServer(): WebSocketMessageServer | null {
    return this.wsServer;
  }

  /**
   * Get the ClientWebSocketServer instance.
   * Used for Lumen client protocol connections.
   * @see Requirements 9.6, 11.3
   */
  public getClientWebSocketServer(): ClientWebSocketServer | null {
    return this.clientWsServer;
  }

  /**
   * Set the MessagePassingService for the application.
   * This should be called after the application is started and
   * all required dependencies (MessageCBLService, IMessageMetadataStore) are available.
   * @requirements 1.6
   */
  public setMessagePassingService(service: MessagePassingService): void {
    this.messagePassingService = service;
    this.services.register('messagePassingService', () => service);
    if (this.apiRouter) {
      this.apiRouter.setMessagePassingService(service);
      this.apiRouter.setMessagePassingServiceForEmail(service);
    }
  }

  /**
   * Set the DiscoveryProtocol for the application.
   * This should be called after the application is started and
   * the discovery protocol is initialized.
   * @requirements 3.3
   */
  public setDiscoveryProtocol(protocol: IDiscoveryProtocol): void {
    this.services.register('discoveryProtocol', () => protocol);
    if (this.apiRouter) {
      this.apiRouter.setDiscoveryProtocol(protocol);
    }
  }

  /**
   * Set the AvailabilityService for the application.
   * This should be called after the application is started and
   * the availability service is initialized.
   * @requirements 3.1, 3.2, 4.1, 4.2, 4.3
   */
  public setAvailabilityService(service: IAvailabilityService): void {
    this.services.register('availabilityService', () => service);
    if (this.apiRouter) {
      this.apiRouter.setAvailabilityService(service);
      this.apiRouter.setSyncAvailabilityService(service);
    }
  }

  /**
   * Set the ReconciliationService for the application.
   * This should be called after the application is started and
   * the reconciliation service is initialized.
   * @requirements 4.4
   */
  public setReconciliationService(service: IReconciliationService): void {
    this.services.register('reconciliationService', () => service);
    if (this.apiRouter) {
      this.apiRouter.setReconciliationService(service);
    }
  }

  /**
   * Set the PoolDiscoveryService and wire gossip handlers.
   * Registers the service, connects GossipService pool announcement/removal
   * handlers, and passes the service to the IntrospectionController via ApiRouter.
   *
   * @param poolDiscoveryService - The pool discovery service instance
   * @param gossipService - The gossip service to wire pool announcement handlers to
   * @see Requirements 7.1, 8.3
   */
  public setPoolDiscoveryService(
    poolDiscoveryService: PoolDiscoveryService,
    gossipService: GossipService,
  ): void {
    this.services.register('poolDiscoveryService', () => poolDiscoveryService);

    // Wire gossip pool announcement/removal handlers
    gossipService.onAnnouncement((announcement) => {
      if (announcement.type === 'pool_announce') {
        poolDiscoveryService.handlePoolAnnouncement(announcement);
      } else if (announcement.type === 'pool_remove' && announcement.poolId) {
        poolDiscoveryService.handlePoolRemoval(
          announcement.poolId,
          announcement.nodeId,
        );
      }
    });

    // Task 23.4: Wire BrightTrust gossip handlers when gossip service becomes available
    if (this.services.has('brightTrustGossipHandlerFactory')) {
      const gossipHandlerFactory = this.services.get<
        (gs: GossipService) => void
      >('brightTrustGossipHandlerFactory');
      if (gossipHandlerFactory) {
        gossipHandlerFactory(gossipService);
      }
    }

    // Pass to IntrospectionController via ApiRouter
    if (this.apiRouter) {
      this.apiRouter.setIntrospectionPoolDiscoveryService(poolDiscoveryService);
    }
  }
}
