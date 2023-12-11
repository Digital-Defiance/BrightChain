import type { Application as ExpressApp } from 'express';

/**
 * Minimal service container interface for plugin use.
 * Matches the ServiceContainer API from node-express-suite.
 */
export interface IServiceContainer {
  register<T>(key: string, factory: () => T, overwrite?: boolean): void;
  get<T>(key: string): T;
  has(key: string): boolean;
}

/**
 * Narrowed set of App resources passed to subsystem plugins during
 * initialization. Uses broad/interface types so the definition can
 * live in brightchain-lib without importing concrete api-lib classes.
 */
export interface ISubsystemContext {
  /** The ServiceContainer for registering and resolving services. */
  services: IServiceContainer;

  /**
   * The ApiRouter instance, or null if not available.
   * Plugins that wire routes should guard on this being non-null.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiRouter: any | null;

  /** The Express application instance for mounting middleware/routes. */
  expressApp: ExpressApp;

  /** Environment configuration. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  environment: any;

  /** Block store from BrightChainDatabasePlugin. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blockStore: any;

  /** Member store from BrightChainDatabasePlugin. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  memberStore: any;

  /** Energy store from BrightChainDatabasePlugin. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  energyStore: any;

  /** BrightDb instance from BrightChainDatabasePlugin. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  brightDb: any;

  /**
   * Get a model/collection from the document store by name.
   * Equivalent to App.getModel().
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getModel(name: string): any;

  /** The EventNotificationSystem instance, or null. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eventSystem: any | null;
}

/**
 * Shared interface for App subsystem plugins.
 * Implemented by each subsystem to encapsulate its initialization and teardown.
 */
export interface IAppSubsystemPlugin {
  /** Unique name identifying this subsystem (e.g., "email", "brighthub"). */
  readonly name: string;

  /**
   * Whether initialization failure should be non-fatal.
   * When true (default), errors are logged and the App continues starting.
   * When false, errors propagate and abort App.start().
   */
  readonly isOptional?: boolean;

  /**
   * Initialize the subsystem: create services, register in the service
   * container, wire routes to the ApiRouter, etc.
   */
  initialize(context: ISubsystemContext): Promise<void>;

  /**
   * Optional teardown hook. Called in reverse registration order during
   * App.stop(). Errors are logged but do not prevent other plugins from
   * stopping.
   */
  stop?(): Promise<void>;
}
