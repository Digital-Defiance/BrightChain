/* eslint-disable @nx/enforce-module-boundaries */
import { BlockSize } from '@brightchain/brightchain-lib/lib/enumerations/blockSize';
import { DiskQuorumService } from '@brightchain/brightchain-api-lib/lib/services/diskQuorumService';
import { FecServiceFactory } from '@brightchain/brightchain-api-lib/lib/services/fecServiceFactory';
import { IFecService } from '@brightchain/brightchain-lib';
import { IApplication } from '../interfaces/application';
import { BaseService } from './base';

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
export class QuorumServiceWrapper extends BaseService {
  private readonly quorumService: DiskQuorumService;
  private fecServiceInitialized = false;
  private fecServicePromise: Promise<void> | null = null;

  constructor(application: IApplication) {
    super(application);

    // Initialize block store for document storage
    const storePath =
      process.env.BRIGHTCHAIN_BLOCKSTORE_PATH ?? 'tmp/blockstore';
    const blockSize = (
      process.env.BRIGHTCHAIN_BLOCKSIZE_BYTES
        ? Number.parseInt(process.env.BRIGHTCHAIN_BLOCKSIZE_BYTES, 10)
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
        console.log('[QuorumServiceWrapper] FEC service initialized successfully');
      } catch (error) {
        // FEC service is optional - log warning but don't fail
        console.warn('[QuorumServiceWrapper] FEC service not available:', error instanceof Error ? error.message : String(error));
        console.warn('[QuorumServiceWrapper] Quorum service will work without FEC parity protection');
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
