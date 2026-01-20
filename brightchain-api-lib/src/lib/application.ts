import {
  BlockSize,
  EnergyAccountStore,
  EnergyLedger,
  MemberStore,
  StringNames,
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

/**
 * Application class
 */
export class App<TID extends PlatformID> extends BaseApplication<TID> {
  public readonly expressApp: Application;
  private server: Server | null = null;
  private controllers: Map<string, unknown> = new Map();
  private readonly keyStorage: SecureKeyStorage;

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

      Middlewares.init(this.expressApp);
      const apiRouter = new ApiRouter<TID>(this);
      const appRouter = new AppRouter<TID>(apiRouter);

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
                    err.message || translate(StringNames.Error_UnexpectedError),
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
}
