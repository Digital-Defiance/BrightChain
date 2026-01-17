import { IApplication } from '../interfaces/application';
import { IBlockService } from '../interfaces/blockService';
import { BlocksService } from './blocks';

/**
 * Factory for creating and managing BlockService instances.
 * 
 * This factory ensures that:
 * - Only one BlockService instance exists per application
 * - Services are properly initialized with FEC support
 * - Services can be cleared for testing purposes
 */
export class BlockServiceFactory {
  private static instance: BlockServiceFactory;
  private services: Map<string, IBlockService>;

  private constructor() {
    this.services = new Map();
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
  public getService(application: IApplication): IBlockService {
    const key = application.id;
    if (!this.services.has(key)) {
      this.services.set(key, new BlocksService(application));
    }
    return this.services.get(key)!;
  }

  /**
   * Clear all service instances.
   * Useful for testing or when reconfiguring the application.
   */
  public clearServices(): void {
    this.services.clear();
  }
}
