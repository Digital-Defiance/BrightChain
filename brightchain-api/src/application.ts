import { debugLog, HandleableError } from '@BrightChain/brightchain-lib';
import express, { Application, NextFunction, Request, Response } from 'express';
import { Server } from 'http';
import { environment } from './environment';
import { IApplication } from './interfaces/application';
import { Middlewares } from './middlewares';
import { ApiRouter } from './routers/api';
import { AppRouter } from './routers/app';
import { handleError, sendApiMessageResponse } from './utils';

/**
 * Application class
 */
export class App implements IApplication {
  private static instance: App | null = null;
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
              : new HandleableError(err.message, { cause: err });
          handleError(handleableError, res, sendApiMessageResponse, next);
        },
      );

      this.server = this.expressApp.listen(
        environment.developer.port,
        environment.developer.host,
        () => {
          this._ready = true;
          debugLog(
            environment.developer.debug,
            'log',
            `[ ready ] http://${environment.developer.host}:${environment.developer.port}`,
          );
        },
      );
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
        environment.developer.debug,
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
      environment.developer.debug,
      'log',
      '[ stopped ] Application server and database connections',
    );
  }
}
