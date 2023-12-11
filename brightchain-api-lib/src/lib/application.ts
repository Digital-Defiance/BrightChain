import {
  BlockSize,
  EnergyLedger,
  IAvailabilityService,
  IBackupCodeConstants,
  IDiscoveryProtocol,
  IReconciliationService,
  MemberStore,
  ServiceProvider,
  type IAppSubsystemPlugin,
  type ISubsystemContext,
} from '@brightchain/brightchain-lib';
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
import { BrightChatSubsystemPlugin } from './plugins/subsystems/brightChatSubsystemPlugin';
import { BrightHubSubsystemPlugin } from './plugins/subsystems/brightHubSubsystemPlugin';
import { BrightPassSubsystemPlugin } from './plugins/subsystems/brightPassSubsystemPlugin';
import { BrightTrustSubsystemPlugin } from './plugins/subsystems/brightTrustSubsystemPlugin';
import { BurnbagSubsystemPlugin } from './plugins/subsystems/burnbagSubsystemPlugin';
import { EmailSubsystemPlugin } from './plugins/subsystems/emailSubsystemPlugin';
import { ApiRouter } from './routers/api';
import { AppRouter } from './routers/app';
import { createTestEmailRouter } from './routers/testEmailRouter';
import {
  AuthService,
  BrightChainBackupCodeService,
  BrightChainSessionAdapter,
  PostfixEmailService,
  SecureKeyStorage,
  SESEmailService,
} from './services';
import { BrightChainAuthenticationProvider } from './services/brightchain-authentication-provider';
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

  // ── Subsystem plugin registry ──────────────────────────────────────────
  private readonly subsystemPlugins: IAppSubsystemPlugin[] = [];

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

    // Register subsystem plugins (initialized in insertion order during start())
    this.registerSubsystemPlugin(new EmailSubsystemPlugin());
    this.registerSubsystemPlugin(new BrightHubSubsystemPlugin());
    this.registerSubsystemPlugin(new BrightChatSubsystemPlugin());
    this.registerSubsystemPlugin(new BrightPassSubsystemPlugin());
    this.registerSubsystemPlugin(new BurnbagSubsystemPlugin());
    this.registerSubsystemPlugin(new BrightTrustSubsystemPlugin());
  }

  /**
   * Register a subsystem plugin. Plugins are initialized in insertion order
   * during start() and torn down in reverse order during stop().
   *
   * @throws Error if a plugin with the same name is already registered.
   */
  public registerSubsystemPlugin(plugin: IAppSubsystemPlugin): void {
    if (this.subsystemPlugins.some((p) => p.name === plugin.name)) {
      throw new Error(
        `Duplicate subsystem plugin name: "${plugin.name}" is already registered.`,
      );
    }
    this.subsystemPlugins.push(plugin);
  }

  /**
   * Initialize all registered subsystem plugins in insertion order.
   * Optional plugins log a warning on failure and continue;
   * non-optional plugins propagate the error and abort.
   */
  public async initializePlugins(context: ISubsystemContext): Promise<void> {
    for (const plugin of this.subsystemPlugins) {
      try {
        await plugin.initialize(context);
        debugLog(
          this.environment.debug,
          'log',
          `[ ready ] ${plugin.name} subsystem initialized`,
        );
      } catch (err) {
        if (plugin.isOptional !== false) {
          console.warn(
            `[ warning ] ${plugin.name} subsystem initialization failed, continuing:`,
            err,
          );
        } else {
          throw err;
        }
      }
    }
  }

  /**
   * Stop all registered subsystem plugins in reverse insertion order.
   * Errors are caught and logged; all plugins get a chance to clean up.
   */
  public async stopPlugins(): Promise<void> {
    for (let i = this.subsystemPlugins.length - 1; i >= 0; i--) {
      const plugin = this.subsystemPlugins[i];
      if (plugin.stop) {
        try {
          await plugin.stop();
        } catch (err) {
          console.warn(
            `[ warning ] ${plugin.name} subsystem stop failed:`,
            err,
          );
        }
      }
    }
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

    // ── Subsystem plugin initialization ──────────────────────────────
    // Iterate registered plugins in insertion order. Optional plugins
    // log a warning on failure and continue; non-optional plugins abort.
    const pluginContext: ISubsystemContext = {
      services: this.services,
      apiRouter: this.apiRouter,
      expressApp: this.expressApp,
      environment: this.environment,
      blockStore: this._plugin.blockStore,
      memberStore: this._plugin.memberStore,
      energyStore: this._plugin.energyStore,
      brightDb: this._plugin.brightDb,
      getModel: this.getModel.bind(this),
      eventSystem: this.eventSystem,
    };

    // ── Dynamic BrightCal plugin registration ────────────────────────
    // Load BrightCalSubsystemPlugin via dynamic import to avoid a
    // compile-time dependency on brightcal-api-lib (preserves the
    // !brightcal-api-lib negative dependency in project.json).
    // Use require() so the module is loaded in CJS mode where tsx
    // can resolve .ts files without ESM extension requirements.
    // The computed specifier prevents TypeScript from statically
    // resolving the import.
    try {
      const brightCalModuleName = ['@brightchain', 'brightcal-api-lib'].join(
        '/',
      );
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const brightCalModule = require(brightCalModuleName);
      // Handle CJS/ESM interop: named exports may be on the module
      // directly or nested under .default depending on the loader.
      const resolved = brightCalModule.BrightCalSubsystemPlugin
        ?? brightCalModule.default?.BrightCalSubsystemPlugin;
      if (!resolved) {
        throw new Error(
          'BrightCalSubsystemPlugin not found in module exports',
        );
      }
      this.registerSubsystemPlugin(new resolved());
    } catch (brightCalLoadErr) {
      console.warn(
        '[ warning ] Failed to load BrightCalSubsystemPlugin, continuing without calendar:',
        brightCalLoadErr,
      );
    }

    await this.initializePlugins(pluginContext);

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

    // ── Subsystem plugin teardown (reverse order) ─────────────────────────
    await this.stopPlugins();

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
