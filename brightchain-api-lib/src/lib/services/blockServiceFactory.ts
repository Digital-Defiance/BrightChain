import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { IApplication } from '@digitaldefiance/node-express-suite';
import { IBrightChainApplication } from '../interfaces';
import { IBlockService } from '../interfaces/blockService';
import { DefaultBackendIdType } from '../shared-types';
import { BlocksService } from './blocks';

/**
 * Factory for creating and managing BlockService instances.
 *
 * This factory ensures that:
 * - Only one BlockService instance exists per application
 * - Services are properly initialized with FEC support
 * - Services can be cleared for testing purposes
 */
export class BlockServiceFactory<
  TID extends PlatformID = DefaultBackendIdType,
> {
  private static instance: BlockServiceFactory;
  private services: WeakMap<IApplication<PlatformID>, IBlockService>;

  private constructor() {
    this.services = new WeakMap();
  }

  public static getInstance(): BlockServiceFactory {
    if (!BlockServiceFactory.instance) {
      BlockServiceFactory.instance = new BlockServiceFactory();
    }
    return BlockServiceFactory.instance;
  }

  /**
   * Get or create a block service instance for the given application.
   * The service is initialized with FEC support if available.
   */
  public getService(application: IBrightChainApplication<TID>): IBlockService {
    if (!this.services.has(application)) {
      this.services.set(application, new BlocksService(application));
    }
    return this.services.get(application)!;
  }

  /**
   * Clear all service instances.
   * Useful for testing or when reconfiguring the application.
   */
  public clearServices(): void {
    this.services = new WeakMap();
  }
}
