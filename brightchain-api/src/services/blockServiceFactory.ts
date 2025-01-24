import { IApplication } from '../interfaces/application';
import { IBlockService } from '../interfaces/blocks';
import { BlocksService } from './blocks';

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
   * Get or create a block service instance for the given application
   */
  public getService(application: IApplication): IBlockService {
    const key = application.id;
    if (!this.services.has(key)) {
      this.services.set(key, new BlocksService(application));
    }
    return this.services.get(key)!;
  }

  /**
   * Clear all service instances
   */
  public clearServices(): void {
    this.services.clear();
  }
}
