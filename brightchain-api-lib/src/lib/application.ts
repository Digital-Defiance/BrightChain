import {
  AliasRegistry,
  AuditLogService,
  EnergyLedger,
  IAvailabilityService,
  IdentitySealingPipeline,
  IdentityValidator,
  IDiscoveryProtocol,
  IReconciliationService,
  MembershipProofService,
  QuorumStateMachine,
  ServiceProvider,
} from '@brightchain/brightchain-lib';
import { BrightChainDb } from '@brightchain/db';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  debugLog,
  IApplication,
  IConstants,
  UpnpManager,
  Application as UpstreamApplication,
} from '@digitaldefiance/node-express-suite';
import { Server } from 'http';
import { AppConstants } from './appConstants';
import { GossipService } from './availability/gossipService';
import { PoolDiscoveryService } from './availability/poolDiscoveryService';
import { QuorumGossipHandler } from './availability/quorumGossipHandler';
import { createBlockDocumentStore } from './datastore/block-document-store-factory';
import {
  DocumentCollection,
  DocumentRecord,
  DocumentStore,
} from './datastore/document-store';
import { Environment } from './environment';
import { Middlewares } from './middlewares';
import { BrightChainDatabasePlugin } from './plugins/brightchain-database-plugin';
import { configureBrightChainApp } from './plugins/configure-brightchain-app';
import { ApiRouter } from './routers/api';
import { AppRouter } from './routers/app';
import {
  AuthService,
  BackupCodeService,
  BrightChainSessionAdapter,
  CLIOperatorPrompt,
  ContentAwareBlocksService,
  ContentIngestionService,
  EmailService,
  IdentityExpirationScheduler,
  QuorumDatabaseAdapter,
  SecureKeyStorage,
} from './services';
import { BrightChainAuthenticationProvider } from './services/brightchain-authentication-provider';
import { ClientWebSocketServer } from './services/clientWebSocketServer';
import { EventNotificationSystem } from './services/eventNotificationSystem';
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
export class App<TID extends PlatformID> extends UpstreamApplication<
  TID,
  Environment<TID>,
  IConstants,
  AppRouter<TID>
> {
  private controllers: Map<string, unknown> = new Map();
  private readonly keyStorage: SecureKeyStorage;
  private readonly _brightchainDocumentStore: DocumentStore;
  private _plugin: BrightChainDatabasePlugin<TID>;
  private apiRouter: ApiRouter<TID> | null = null;
  private eventSystem: EventNotificationSystem | null = null;
  private wsServer: WebSocketMessageServer | null = null;
  private clientWsServer: ClientWebSocketServer | null = null;
  private messagePassingService: MessagePassingService | null = null;
  private upnpManager: UpnpManager | null = null;

  // ── Quorum subsystem ──────────────────────────────────────────────
  private quorumDbAdapter: QuorumDatabaseAdapter<TID> | null = null;
  private quorumStateMachine: QuorumStateMachine<TID> | null = null;
  private identityExpirationScheduler: IdentityExpirationScheduler<TID> | null =
    null;
  private quorumGossipHandler: QuorumGossipHandler<TID> | null = null;
  private contentAwareBlocksService: ContentAwareBlocksService<TID> | null =
    null;

  /**
   * Captured HTTP server reference for WebSocket attachment.
   * The upstream Application stores the server as a private field,
   * so we intercept expressApp.listen() to capture it here.
   */
  private _httpServer: Server | null = null;

  constructor(environment: Environment<TID>) {
    super(
      environment,
      // apiRouterFactory — creates BrightChain's ApiRouter
      (app: IApplication<TID>) => new ApiRouter<TID>(app as App<TID>),
      // cspConfig — undefined; BrightChain's Middlewares.init handles CSP
      undefined,
      // constants
      AppConstants,
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
    this._brightchainDocumentStore = createBlockDocumentStore({
      useMemory: true,
    });
  }

  /**
   * Get the BrightChain document store.
   * Overrides the upstream Mongoose-specific `db` getter since BrightChain
   * uses its own BlockDocumentStore instead of Mongoose.
   */
  // @ts-expect-error — BrightChain returns DocumentStore, not typeof mongoose
  public override get db(): DocumentStore {
    return this._brightchainDocumentStore;
  }

  /**
   * Get a model or collection from the BrightChain document store by name.
   *
   * If a typed Model has been registered on the BrightChainDb instance
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
      const db = this._plugin.brightChainDb;
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
    return this._brightchainDocumentStore.collection<U>(modelName);
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

    // Delegate to upstream — handles: middleware init, router setup, error handler,
    // HTTP server on :port, greenlock/HTTPS on :443, dev-HTTPS, _ready = true
    // Pass undefined to skip mongoose connection.
    await super.start(dbUri);

    // Restore original listen to avoid side effects on subsequent calls
    this.expressApp.listen = originalListen;

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
    const brightChainDb = this._plugin.brightChainDb;
    const memberStore = this._plugin.memberStore;
    const energyStore = this._plugin.energyStore;

    const energyLedger = new EnergyLedger();
    const emailService = new EmailService<TID>(this);
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
    this.services.register('db', () => brightChainDb);
    this.services.register('memberStore', () => memberStore);
    this.services.register('energyStore', () => energyStore);
    this.services.register('energyLedger', () => energyLedger);
    this.services.register('emailService', () => emailService);
    this.services.register('auth', () => authService);

    // BackupCodeService — singleton backed by MemberStore
    const backupCodeService = new BackupCodeService(memberStore);
    this.services.register('backupCodeService', () => backupCodeService);

    // BrightChainSessionAdapter — singleton backed by BrightChainDb
    const sessionAdapter = new BrightChainSessionAdapter(brightChainDb);
    this.services.register('sessionAdapter', () => sessionAdapter);

    // EventNotificationSystem for WebSocket events
    this.eventSystem = new EventNotificationSystem();
    this.services.register('eventSystem', () => this.eventSystem);

    // WebSocket — attach to the captured HTTP server
    if (this._httpServer) {
      this.wsServer = new WebSocketMessageServer(this._httpServer, false);
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
        this.eventSystem,
      );
      this.services.register('clientWsServer', () => this.clientWsServer);
      debugLog(
        this.environment.debug,
        'log',
        '[ ready ] Client WebSocket server initialized',
      );
    }

    // Wire EventNotificationSystem to SyncController via the apiRouter
    if (this.apiRouter) {
      this.apiRouter.setSyncEventSystem(this.eventSystem);
    }

    // ── Quorum subsystem initialization ─────────────────────────────
    // Task 23.1: Initialize QuorumDatabaseAdapter with pool ID "quorum-system"
    try {
      const quorumDb = new BrightChainDb(blockStore, {
        name: 'quorum-system',
        poolId: 'quorum-system',
      });
      this.quorumDbAdapter = new QuorumDatabaseAdapter<TID>(
        quorumDb,
        ServiceProvider.getInstance<TID>().idProvider,
      );
      this.services.register('quorumDbAdapter', () => this.quorumDbAdapter);
      debugLog(
        this.environment.debug,
        'log',
        '[ ready ] Quorum database adapter initialized (pool: quorum-system)',
      );

      // Task 23.2: Initialize QuorumStateMachine with dependencies
      const serviceProvider = ServiceProvider.getInstance<TID>();
      const sealingService = serviceProvider.sealingService;
      const eciesService = serviceProvider.eciesService;

      // AuditLogService needs a signing member — use the system member from
      // the plugin if available, otherwise defer audit log creation.
      // For now, create without block store persistence (audit entries go to DB only).
      const auditLogService = new AuditLogService<TID>(
        this.quorumDbAdapter,
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
        this.quorumDbAdapter,
        sealingService,
        eciesService,
        () => this.quorumStateMachine!.getCurrentEpoch(),
        () => this.quorumDbAdapter!.getStatuteConfig(),
      );
      this.services.register(
        'identitySealingPipeline',
        () => identitySealingPipeline,
      );

      // Create AliasRegistry
      const aliasRegistry = new AliasRegistry<TID>(
        this.quorumDbAdapter,
        identitySealingPipeline,
        eciesService,
        () => this.quorumStateMachine!.getCurrentEpoch(),
      );
      this.services.register('aliasRegistry', () => aliasRegistry);

      // Create the QuorumStateMachine — central coordinator
      // GossipService is wired externally via setPoolDiscoveryService.
      // We pass a no-op stub until the real gossip service is available.
      // The QuorumGossipHandler (Task 23.4) bridges gossip ↔ state machine.
      const gossipStub = {
        announceQuorumProposal: async () => {},
        announceQuorumVote: async () => {},
        onQuorumProposal: () => {},
        offQuorumProposal: () => {},
        onQuorumVote: () => {},
        offQuorumVote: () => {},
      };
      this.quorumStateMachine = new QuorumStateMachine<TID>(
        this.quorumDbAdapter,
        sealingService,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        gossipStub as any,
        auditLogService,
        aliasRegistry,
      );
      this.services.register(
        'quorumStateMachine',
        () => this.quorumStateMachine,
      );
      debugLog(
        this.environment.debug,
        'log',
        '[ ready ] Quorum state machine initialized',
      );

      // Task 23.3: Start IdentityExpirationScheduler
      this.identityExpirationScheduler = new IdentityExpirationScheduler<TID>(
        this.quorumDbAdapter,
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

      // Task 23.4: Register gossip message handlers for quorum_proposal and quorum_vote
      // The QuorumGossipHandler is created here but gossip service binding
      // happens when setQuorumGossipService() is called externally.
      // For now, store the state machine reference so it can be wired later.
      this.services.register(
        'quorumGossipHandlerFactory',
        () => (gossipService: GossipService) => {
          this.quorumGossipHandler = new QuorumGossipHandler<TID>(
            gossipService,
            this.quorumStateMachine!,
            this.quorumDbAdapter!,
          );
          this.quorumGossipHandler.start();
          this.services.register(
            'quorumGossipHandler',
            () => this.quorumGossipHandler,
          );
          debugLog(
            this.environment.debug,
            'log',
            '[ ready ] Quorum gossip handlers registered (quorum_proposal, quorum_vote)',
          );
        },
      );

      // Task 23.5: Wire content ingestion middleware (IdentityValidator + IdentitySealingPipeline)
      const membershipProofService = new MembershipProofService<TID>();
      const identityValidator = new IdentityValidator<TID>(
        this.quorumDbAdapter,
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
        '[ ready ] Quorum subsystem fully initialized',
      );
    } catch (quorumErr) {
      console.warn(
        '[ warning ] Quorum subsystem initialization failed, continuing without quorum:',
        quorumErr,
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

    // ── Quorum subsystem shutdown ─────────────────────────────────────
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
    if (this.quorumGossipHandler) {
      debugLog(
        this.environment.debug,
        'log',
        '[ stopping ] Quorum gossip handlers',
      );
      this.quorumGossipHandler.stop();
      this.quorumGossipHandler = null;
    }

    // Clean up quorum references
    this.quorumStateMachine = null;
    this.quorumDbAdapter = null;
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

    // Task 23.4: Wire quorum gossip handlers when gossip service becomes available
    if (this.services.has('quorumGossipHandlerFactory')) {
      const gossipHandlerFactory = this.services.get<
        (gs: GossipService) => void
      >('quorumGossipHandlerFactory');
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
