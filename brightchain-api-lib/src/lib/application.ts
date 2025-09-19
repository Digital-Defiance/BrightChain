import {
  debugLog,
  HandleableError,
  StringName,
  translate,
} from '@brightchain/brightchain-lib';
import express, { Application, NextFunction, Request, Response } from 'express';
import { readFileSync } from 'fs';
import { Server } from 'http';
import { createServer } from 'https';
import { resolve } from 'path';
import { BaseApplication } from './application-base';
import { Environment } from './environment';
import { Middlewares } from './middlewares';
import { ApiRouter } from './routers/api';
import { AppRouter } from './routers/app';
import { handleError, sendApiMessageResponse } from './utils';

/**
 * Application class
 */
export class App extends BaseApplication {
  public readonly expressApp: Application;
  private server: Server | null = null;

  constructor(environment: Environment) {
    super(environment);
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
                  err.message || translate(StringName.Common_UnexpectedError),
                  { cause: err },
                );
          handleError(handleableError, res, sendApiMessageResponse, next);
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
                    `[ ${translate(
                      StringName.Common_Ready,
                      undefined,
                      undefined,
                      'admin',
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
