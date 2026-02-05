import {
  BlockSize,
  BrightChainStrings,
  EnergyAccountStore,
  EnergyLedger,
  IAvailabilityService,
  IDiscoveryProtocol,
  IReconciliationService,
  MemberStore,
  translate,
} from '@brightchain/brightchain-lib';
import { HandleableError } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  debugLog,
  handleError,
  sendApiMessageResponse,
} from '@digitaldefiance/node-express-suite';
import {
  getSuiteCoreTranslation,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';
/* eslint-disable @typescript-eslint/no-explicit-any */
import express, { Application, NextFunction, Request, Response } from 'express';
import { readFileSync } from 'fs';
import { Server } from 'http';
import { createServer } from 'https';
import { resolve } from 'path';
import { BaseApplication } from './application-base';
import { createBlockDocumentStore } from './datastore/block-document-store-factory';
import { Environment } from './environment';
import { BlockStoreFactory } from './factories/blockStoreFactory';
import { Middlewares } from './middlewares';
import { ApiRouter } from './routers/api';
import { AppRouter } from './routers/app';
import { AuthService, EmailService, SecureKeyStorage } from './services';
import { EventNotificationSystem } from './services/eventNotificationSystem';
import { MessagePassingService } from './services/messagePassingService';
import { WebSocketMessageServer } from './services/webSocketMessageServer';

/**
 * Application class
 */
export class App<TID extends PlatformID> extends BaseApplication<TID> {
  public readonly expressApp: Application;
  private server: Server | null = null;
  private controllers: Map<string, unknown> = new Map();
  private readonly keyStorage: SecureKeyStorage;
  private apiRouter: ApiRouter<TID> | null = null;
  private eventSystem: EventNotificationSystem | null = null;
  private wsServer: WebSocketMessageServer | null = null;
  private messagePassingService: MessagePassingService | null = null;

  constructor(environment: Environment<TID>) {
    super(
      environment,
      createBlockDocumentStore({
        storePath: environment.blockStorePath,
        blockSize: environment.blockStoreBlockSize,
        useMemory: environment.useMemoryDocumentStore,
      }),
    );
    this.expressApp = express();
    this.server = null;
    this.keyStorage = SecureKeyStorage.getInstance();
  }

  public override async start(): Promise<void> {
    await super.start(true);
    try {
      if (this._ready) {
        console.error(
          'Failed to start the application:',
          'Application is already running',
        );
        process.exit(1);
      }
      await this.keyStorage.initializeFromEnvironment();

      // Initialize services
      const blockStore = BlockStoreFactory.createMemoryStore({
        blockSize: BlockSize.Small,
      });
      const memberStore = new MemberStore(blockStore);
      const energyStore = new EnergyAccountStore();
      const energyLedger = new EnergyLedger();
      const emailService = new EmailService<TID>(this);
      const authService = new AuthService<TID>(
        this,
        memberStore,
        energyStore,
        emailService,
        this.environment.jwtSecret,
      );

      // Register services
      this.services.register('memberStore', () => memberStore);
      this.services.register('energyStore', () => energyStore);
      this.services.register('energyLedger', () => energyLedger);
      this.services.register('emailService', () => emailService);
      this.services.register('auth', () => authService);

      // Initialize EventNotificationSystem for WebSocket events
      // @requirements 5.1, 5.2, 5.4
      this.eventSystem = new EventNotificationSystem();
      this.services.register('eventSystem', () => this.eventSystem);

      Middlewares.init(this.expressApp);
      const apiRouter = new ApiRouter<TID>(this);
      this.apiRouter = apiRouter;
      const appRouter = new AppRouter<TID>(apiRouter);

      // Wire EventNotificationSystem to SyncController for replication events
      // @requirements 4.5
      apiRouter.setSyncEventSystem(this.eventSystem);

      appRouter.init(this.expressApp);
      this.expressApp.use(
        (
          err: HandleableError | Error,
          req: Request,
          res: Response,
          next: NextFunction,
        ) => {
          const handleableError =
            err instanceof HandleableError
              ? err
              : new HandleableError(
                  new Error(
                    err.message ||
                      translate(BrightChainStrings.Error_Unexpected_Error),
                  ),
                  { cause: err },
                );
          handleError(
            handleableError,
            res as any,
            sendApiMessageResponse,
            next,
          );
        },
      );

      const serversReady: Promise<void>[] = [];
      serversReady.push(
        new Promise<void>((resolve) => {
          this.server = this.expressApp.listen(
            this.environment.port,
            this.environment.host,
            () => {
              debugLog(
                this.environment.debug,
                'log',
                `[ ready ] http://${this.environment.host}:${this.environment.port}`,
              );

              // Initialize WebSocket server after HTTP server is ready
              // @requirements 5.1
              if (this.server) {
                this.wsServer = new WebSocketMessageServer(this.server, false);
                this.services.register('wsServer', () => this.wsServer);
                debugLog(
                  this.environment.debug,
                  'log',
                  '[ ready ] WebSocket server initialized',
                );
              }

              resolve();
            },
          );
        }),
      );

      if (this.environment.httpsDevCertRoot) {
        try {
          const certPath = resolve(this.environment.httpsDevCertRoot + '.pem');
          const keyPath = resolve(
            this.environment.httpsDevCertRoot + '-key.pem',
          );
          const options = {
            key: readFileSync(keyPath),
            cert: readFileSync(certPath),
          };

          serversReady.push(
            new Promise<void>((resolve) => {
              createServer(options, this.expressApp).listen(
                this.environment.httpsDevPort,
                () => {
                  console.log(
                    `[ ${getSuiteCoreTranslation(
                      SuiteCoreStringKey.Common_Ready,
                    )} ] https://${this.environment.host}:${
                      this.environment.httpsDevPort
                    }`,
                  );
                  resolve();
                },
              );
            }),
          );
        } catch (err) {
          console.error('Failed to start HTTPS server:', err);
        }
      }

      await Promise.all(serversReady);
      this._ready = true;
    } catch (err) {
      console.error('Failed to start the application:', err);
      if (process.env['NODE_ENV'] === 'test') {
        throw err;
      }
      process.exit(1);
    }
  }

  public override async stop(): Promise<void> {
    // Close WebSocket server first
    if (this.wsServer) {
      debugLog(
        this.environment.debug,
        'log',
        '[ stopping ] WebSocket server',
      );
      await new Promise<void>((resolve) => {
        this.wsServer!.close(() => resolve());
      });
      this.wsServer = null;
    }

    if (this.server) {
      debugLog(
        this.environment.debug,
        'log',
        '[ stopping ] Application server',
      );
      await new Promise<void>((resolve, reject) => {
        this.server!.closeAllConnections?.();
        this.server!.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
      this.server = null;
    }

    // Clean up other services
    this.eventSystem = null;
    this.messagePassingService = null;
    this.apiRouter = null;

    await super.stop();
    this._ready = false;
    debugLog(
      this.environment.debug,
      'log',
      '[ stopped ] Application server and database connections',
    );
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
}
