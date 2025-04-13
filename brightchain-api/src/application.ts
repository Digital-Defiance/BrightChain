/* eslint-disable @nx/enforce-module-boundaries, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { SecureKeyStorage } from '@brightchain/brightchain-lib';
import { HandleableError } from '@digitaldefiance/i18n-lib';
import { debugLog } from '@digitaldefiance/node-express-suite';
import express, { Application, NextFunction, Request, Response } from 'express';
import { readdirSync, readFileSync } from 'fs';
import { Server } from 'http';
import { createServer } from 'https';
import { resolve } from 'path';
import { getEnvironment } from './environment';
import { IApplication } from './interfaces/application';
import { Middlewares } from './middlewares';
import { ApiRouter } from './routers/api';
import { AppRouter } from './routers/app';
import { handleError, sendApiMessageResponse } from './utils';

function locatePEMRoot(): string {
  const files = readdirSync(resolve(__dirname, '../..'));
  const pemFiles = files.filter(
    (file: string) =>
      file.match(/localhost\+\d+-key\.pem$/) ||
      file.match(/localhost\+\d+\.pem$/),
  );
  if (pemFiles.length < 2) {
    throw new HandleableError(
      new Error('PEM files not found in root directory'),
    );
  }
  const roots = pemFiles.map((file: string) => {
    const result = /(.*)\/(localhost\+\d+)(.*)\.pem/.exec(
      resolve(__dirname, '../..', file),
    );
    return result ? `${result[1]}/${result[2]}` : undefined;
  });
  if (roots.some((root) => root !== roots[0])) {
    throw new HandleableError(new Error('PEM roots do not match'));
  }
  return roots[0]!;
}

/**
 * Application class
 */
export class App implements IApplication {
  public readonly id: string = 'brightchain-app';

  public get db(): any {
    return null;
  }

  // Add missing interface methods
  public getController(name: string): any {
    // Placeholder implementation
    return null;
  }

  public get nodeAgent(): any {
    // Placeholder implementation
    return null;
  }

  public get clusterAgentPublicKeys(): any {
    // Placeholder implementation
    return [];
  }

  public getModel<T>(name: string): any {
    // Placeholder implementation
    return null;
  }
  private static instance: App | null = null;
  private readonly keyStorage: SecureKeyStorage;

  /**
   * Express application instance
   */
  public readonly expressApp: Application;
  /**
   * Flag indicating whether the application is ready to handle requests
   */
  private _ready: boolean;

  /**
   * HTTP server instance
   */
  private server: Server | null = null;

  public static getInstance(): App {
    if (!App.instance) {
      App.instance = new App();
    }
    return App.instance;
  }

  /**
   * Get whether the application is ready to handle requests
   */
  public get ready(): boolean {
    return this._ready;
  }

  constructor() {
    if (App.instance) {
      throw new Error('App instance already exists, use getInstance()');
    }
    this._ready = false;
    this.expressApp = express();
    this.server = null;
    this.keyStorage = SecureKeyStorage.getInstance();
  }

  /**
   * Start the application
   */
  public async start(): Promise<void> {
    try {
      if (this._ready) {
        console.error(
          'Failed to start the application:',
          'Application is already running',
        );
        process.exit(1);
      }
      await this.keyStorage.initializeFromEnvironment();

      // init all middlewares and routes
      Middlewares.init(this.expressApp);
      const apiRouter = new ApiRouter(this);
      const appRouter = new AppRouter(apiRouter);

      appRouter.init(this.expressApp);
      // if none of the above handle the request, pass it to error handler
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
              : new HandleableError(err, { cause: err });
          handleError(handleableError, res, sendApiMessageResponse, next);
        },
      );

      this.server = this.expressApp.listen(
        getEnvironment().developer.port,
        getEnvironment().developer.host,
        () => {
          this._ready = true;
          debugLog(
            getEnvironment().developer.debug,
            'log',
            `[ ready ] http://${getEnvironment().developer.host}:${getEnvironment().developer.port}`,
          );
        },
      );

      try {
        const result = locatePEMRoot();
        const certPath = resolve(result + '.pem');
        const keyPath = resolve(result + '-key.pem');
        const options = {
          key: readFileSync(keyPath),
          cert: readFileSync(certPath),
        };

        createServer(options, this.expressApp).listen(443, () => {
          console.log(
            `[ ready ] https://${getEnvironment().developer.host}:443`,
          );
        });
      } catch (err) {
        console.error('Failed to start HTTPS server:', err);
      }
    } catch (err) {
      console.error('Failed to start the application:', err);
      process.exit(1);
    }
  }

  /**
   * Stop the application
   */
  public async stop(): Promise<void> {
    if (this.server) {
      debugLog(
        getEnvironment().developer.debug,
        'log',
        '[ stopping ] Application server',
      );
      await new Promise<void>((resolve, reject) => {
        this.server?.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
      this.server = null;
    }

    this._ready = false;
    debugLog(
      getEnvironment().developer.debug,
      'log',
      '[ stopped ] Application server and database connections',
    );
  }
}
