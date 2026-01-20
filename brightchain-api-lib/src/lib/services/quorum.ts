import { IFecService } from '@brightchain/brightchain-lib';
import { BlockSize } from '@brightchain/brightchain-lib/lib/enumerations/blockSize';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { IBrightChainApplication } from '../interfaces';
import { DefaultBackendIdType } from '../shared-types';
import { BaseService } from './base';
import { DiskQuorumService } from './diskQuorumService';
import { FecServiceFactory } from './fecServiceFactory';

/**
 * Thin wrapper service that instantiates DiskQuorumService with application dependencies.
 * No business logic - only dependency injection and initialization.
 *
 * This service provides quorum-based document sealing/unsealing functionality
 * using Shamir's Secret Sharing for secure multi-party access control.
 *
 * The service initializes the FEC service asynchronously for parity generation
 * and recovery on the underlying block store.
 */
export class QuorumServiceWrapper<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseService<TID> {
  private readonly quorumService: DiskQuorumService;
  private fecServiceInitialized = false;
  private fecServicePromise: Promise<void> | null = null;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);

    // Initialize block store for document storage
    const storePath =
      this.application.environment.blockStorePath ?? 'tmp/blockstore';
    const blockSize = (
      this.application.environment.blockStoreBlockSize
        ? this.application.environment.blockStoreBlockSize
        : BlockSize.Medium
    ) as BlockSize;

    // Initialize the DiskQuorumService with storage path and block size
    this.quorumService = new DiskQuorumService(storePath, blockSize);

    // Start FEC service initialization in the background
    this.initializeFecService();
  }

  /**
   * Initialize the FEC service asynchronously.
   * This is called automatically in the constructor but can be awaited
   * to ensure the FEC service is ready before use.
   */
  private async initializeFecService(): Promise<void> {
    if (this.fecServiceInitialized) {
      return;
    }

    if (this.fecServicePromise) {
      return this.fecServicePromise;
    }

    this.fecServicePromise = (async () => {
      try {
        const fecService = await FecServiceFactory.getBestAvailable();
        this.quorumService.setFecService(fecService);
        this.fecServiceInitialized = true;
        console.log(
          '[QuorumServiceWrapper] FEC service initialized successfully',
        );
      } catch (error) {
        // FEC service is optional - log warning but don't fail
        console.warn(
          '[QuorumServiceWrapper] FEC service not available:',
          error instanceof Error ? error.message : String(error),
        );
        console.warn(
          '[QuorumServiceWrapper] Quorum service will work without FEC parity protection',
        );
      }
    })();

    return this.fecServicePromise;
  }

  /**
   * Ensure the FEC service is initialized before performing operations
   * that require it. This is optional - operations will work without FEC
   * but won't have parity protection.
   */
  async ensureInitialized(): Promise<void> {
    await this.initializeFecService();
  }

  /**
   * Get the underlying DiskQuorumService instance.
   * Use this to access quorum operations like addMember, sealDocument, etc.
   */
  getService(): DiskQuorumService {
    return this.quorumService;
  }

  /**
   * Get the FEC service if available.
   */
  getFecService(): IFecService | null {
    return this.quorumService.getBlockStore().getFecService();
  }
}
