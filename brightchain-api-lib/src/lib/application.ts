/* eslint-disable @nx/enforce-module-boundaries */
import { StringName, translate } from '@brightchain/brightchain-lib';
import { HandleableError } from '@digitaldefiance/i18n-lib';
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
import { Middlewares } from './middlewares';
import { ApiRouter } from './routers/api';
import { AppRouter } from './routers/app';

/**
 * Application class
 */
export class App extends BaseApplication {
  public readonly expressApp: Application;
  private server: Server | null = null;

  constructor(environment: Environment) {
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
  }

  public override async start(): Promise<void> {
    await super.start(true);
    try {
      Middlewares.init(this.expressApp);
      const apiRouter = new ApiRouter(this);
      const appRouter = new AppRouter(apiRouter);

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
                    err.message || translate(StringName.Error_UnexpectedError),
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
}
