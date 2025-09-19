// Avoid importing from the barrel (../index) here to prevent circular deps
import { join } from 'path';
import { Environment } from './environment';
import { IApplication } from './interfaces/application';

/**
 * Base Application class with core functionality
 */
export class BaseApplication implements IApplication {
  private _environment: Environment;
  public get environment(): Environment {
    return this._environment;
  }

  public reloadEnvironment(path?: string, override = true): void {
    this._environment = new Environment(path, false, override);
  }

  public static get distDir(): string {
    const cwd = process.cwd();
    const distPath = join(cwd, 'dist');
    return distPath;
  }

  /**
   * Flag indicating whether the application is ready to handle requests
   */
  protected _ready: boolean;

  /**
   * Get whether the application is ready to handle requests
   */
  public get ready(): boolean {
    return this._ready;
  }

  constructor(environment: Environment) {
    this._ready = false;
    this._environment = environment;
  }

  /**
   * Start the application and connect to the database
   */
  public async start(delayReady?: boolean): Promise<void> {
    if (this._ready) {
      console.error(
        'Failed to start the application:',
        'Application is already running',
      );
      const err = new Error('Application is already running');
      if (process.env['NODE_ENV'] === 'test') {
        throw err;
      }
      process.exit(1);
    }
    this._ready = delayReady ? false : true;
  }

  /**
   * Stop the application
   */
  public async stop(): Promise<void> {
    this._ready = false;
  }
}
