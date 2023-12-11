import { IBlockStore } from '@brightchain/brightchain-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { IBrightChainApplication } from '../interfaces';
import { DefaultBackendIdType } from '../shared-types';
import { BaseService } from './base';
import { PersistentBrightTrustService } from './persistentBrightTrustService';

/**
 * Thin wrapper service that instantiates PersistentBrightTrustService with the
 * application's configured block store (disk, Azure Blob, S3, or memory).
 *
 * No business logic — only dependency injection.
 *
 * This service provides brightTrust-based document sealing/unsealing functionality
 * using Shamir's Secret Sharing for secure multi-party access control.
 */
export class BrightTrustServiceWrapper<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseService<TID> {
  private readonly brightTrustService: PersistentBrightTrustService;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);

    const registeredStore = this.application.services.get('blockStore') as
      | IBlockStore
      | undefined;
    if (!registeredStore) {
      throw new Error(
        '[BrightTrustServiceWrapper] No block store registered in the service container.',
      );
    }

    this.brightTrustService = new PersistentBrightTrustService(registeredStore);
  }

  /**
   * Get the underlying PersistentBrightTrustService instance.
   * Use this to access BrightTrust operations like addMember, sealDocument, etc.
   */
  getService(): PersistentBrightTrustService {
    return this.brightTrustService;
  }
}
