import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  IApplication,
  IControllerApplication,
  IServicesPort,
} from '@digitaldefiance/node-express-suite';
import { Environment } from '../environment';
import { DefaultBackendIdType } from '../types/backend-id';

/**
 * Extended application interface with BrightChain-specific methods.
 *
 * Note: BrightChain uses BlockDocumentStore instead of mongoose.
 * The `db` and `getModel` properties inherited from IApplication are
 * overridden at runtime by the App class to return DocumentStore /
 * DocumentCollection types. Consumers that need the BrightChain-specific
 * types should access them via the App class directly.
 */
export interface IBrightChainApplication<
  TID extends PlatformID = DefaultBackendIdType,
> extends IApplication<TID> {
  get environment(): Environment<TID>;

  /**
   * Get a controller by name
   * @param name - Controller name
   * @returns Controller instance
   */
  getController<T = unknown>(name: string): T;

  /**
   * Set a controller
   * @param name - Controller name
   * @param controller - Controller instance
   */
  setController(name: string, controller: unknown): void;

  /**
   * Get the node ID
   * @returns The node ID
   */
  getNodeId(): TID;

  /**
   * Drop and re-seed the in-memory dev block store.
   * Only available when running in DEV_DATABASE (in-memory) mode.
   * @returns The new seed credentials, or throws if not in dev mode.
   */
  reseedDevStore(): Promise<unknown>;
}

/**
 * The application members BrightChain controllers need when they only read
 * the service container: `constants`, `database`, `authProvider` and
 * `services`. A plain object literal can satisfy this type, so plugins and
 * tests can build one without a cast.
 */
export type IBrightChainControllerApplication<
  TID extends PlatformID = DefaultBackendIdType,
> = IControllerApplication<TID> & IServicesPort;
