import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { IApplication } from '@digitaldefiance/node-express-suite';
import { Environment } from '../environment';

/**
 * Extended application interface with BrightChain-specific methods
 */
export interface IBrightChainApplication<
  TID extends PlatformID = Buffer,
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
}
