import {
  EnergyLedger,
  IAvailabilityService,
  IDiscoveryProtocol,
  IReconciliationService,
} from '@brightchain/brightchain-lib';
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
import { AuthService, EmailService, SecureKeyStorage } from './services';
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
   * Get a collection from the BrightChain document store by name.
   * Overrides the upstream Mongoose-specific `getModel()` to delegate
   * to the BlockDocumentStore's collection() method.
   */
  // @ts-expect-error — BrightChain returns DocumentCollection, not mongoose Model
  public override getModel<U extends DocumentRecord>(
    modelName: string,
  ): DocumentCollection<U> {
    return this._brightchainDocumentStore.collection<U>(modelName);
  }

  public override async start(mongoUri?: string): Promise<void> {
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
    await super.start(mongoUri);

    // Restore original listen to avoid side effects on subsequent calls
    this.expressApp.listen = originalListen;

    // ── BrightChain-specific initialization ──────────────────────────
    // After super.start(), the plugin lifecycle is complete:
    //   plugin.connect() → brightchainDatabaseInit()
    //   plugin.init(app) → BrightChainAuthenticationProvider created
    // Retrieve stores from the plugin instead of calling brightchainDatabaseInit() directly.

    await this.keyStorage.initializeFromEnvironment();

    const blockStore = this._plugin.blockStore;
    const documentStore = this._plugin.documentStore;
    const memberStore = this._plugin.memberStore;
    const energyStore = this._plugin.energyStore;

    const energyLedger = new EnergyLedger();
    const emailService = new EmailService<TID>(this);
    const authService = new AuthService<TID>(
      this,
      memberStore,
      energyStore,
      emailService,
      this.environment.jwtSecret,
    );

    // Register services from plugin stores and additional services
    this.services.register('blockStore', () => blockStore);
    this.services.register('db', () => documentStore);
    this.services.register('memberStore', () => memberStore);
    this.services.register('energyStore', () => energyStore);
    this.services.register('energyLedger', () => energyLedger);
    this.services.register('emailService', () => emailService);
    this.services.register('auth', () => authService);

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

    // Pass to IntrospectionController via ApiRouter
    if (this.apiRouter) {
      this.apiRouter.setIntrospectionPoolDiscoveryService(poolDiscoveryService);
    }
  }
}
