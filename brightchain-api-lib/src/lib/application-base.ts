/* eslint-disable @typescript-eslint/no-explicit-any */
import { BlockSize, MemoryBlockStore } from '@brightchain/brightchain-lib';
import {
  IBaseDocument,
  IConstants,
  PluginManager,
  ServiceContainer,
} from '@digitaldefiance/node-express-suite';
import { join } from 'path';
import { AppConstants } from './appConstants';
import { BlockDocumentStore } from './datastore/block-document-store';
import { DocumentStore } from './datastore/document-store';
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

  public get constants(): IConstants {
    return AppConstants;
  }

  public get db(): any {
    return this.documentStore;
  }

  private _services: ServiceContainer | undefined;
  public get services(): ServiceContainer {
    if (!this._services) {
      this._services = new ServiceContainer();
    }
    return this._services;
  }

  private _plugins: PluginManager | undefined;
  public get plugins(): PluginManager {
    if (!this._plugins) {
      this._plugins = new PluginManager();
    }
    return this._plugins;
  }

  public getModel<U extends IBaseDocument<any, any>>(modelName: string): U {
    // Get a collection from the in-memory document store
    const collection = this.documentStore.collection(modelName);
    return collection as unknown as U;
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

  constructor(environment: Environment, documentStore?: DocumentStore) {
    this._ready = false;
    this._environment = environment;
    this.documentStore =
      documentStore ??
      new BlockDocumentStore(new MemoryBlockStore(BlockSize.Small));
  }

  private readonly documentStore: DocumentStore;

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
