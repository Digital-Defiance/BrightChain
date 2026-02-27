/**
 * @fileoverview ContentAwareBlocksService — wraps BlocksService with identity
 * validation and sealing via ContentIngestionService.
 *
 * Content is only accepted into the block store after:
 * 1. Identity validation passes (signature, alias, membership proof, ban check)
 * 2. Identity sealing completes (shard generation, distribution, identity replacement)
 *
 * @see Requirements 16
 * @see Design: Content Ingestion Pipeline Integration (Task 19.2)
 */

import {
  BlockStoreOptions,
  BrightenResult,
  ContentIngestionResult,
  ContentWithIdentity,
  IBlockMetadata,
  IContentIngestionService,
  IdentityValidationError,
  QuorumError,
  type BlockId,
} from '@brightchain/brightchain-lib';
import { Member, PlatformID } from '@digitaldefiance/ecies-lib';
import { DefaultBackendIdType } from '../shared-types';
import { BlocksService } from './blocks';
import { ContentIngestionService } from './contentIngestionService';

/**
 * Result of storing a block with identity validation and sealing.
 */
export interface ContentAwareStoreResult<TID extends PlatformID = Uint8Array> {
  /** Block store result */
  blockId: string;
  metadata?: IBlockMetadata;
  /** Identity ingestion result */
  ingestion: ContentIngestionResult<TID>;
}

/**
 * ContentAwareBlocksService wraps BlocksService with identity validation
 * and sealing. Content is only stored after successful validation and
 * shard distribution.
 *
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export class ContentAwareBlocksService<
  TID extends PlatformID = DefaultBackendIdType,
> {
  constructor(
    private readonly blocksService: BlocksService<TID>,
    private readonly contentIngestionService: IContentIngestionService<TID>,
  ) {}

  /**
   * Store a block with identity validation and sealing.
   *
   * Flow:
   * 1. Validate and seal identity via ContentIngestionService
   * 2. Store the block via BlocksService (only if step 1 succeeds)
   * 3. Return combined result
   *
   * @param dataBuffer - The raw block data
   * @param member - The authenticated member
   * @param content - The content identity metadata for validation/sealing
   * @param canRead - Whether the block can be read
   * @param canPersist - Whether the block can be persisted
   * @param options - Block store options
   * @returns Combined block store and ingestion result
   * @throws IdentityValidationError if identity validation fails
   * @throws QuorumError if identity sealing fails
   */
  async storeBlockWithIdentity(
    dataBuffer: Buffer,
    member: Member,
    content: ContentWithIdentity<TID>,
    canRead = true,
    canPersist = true,
    options?: BlockStoreOptions,
  ): Promise<ContentAwareStoreResult<TID>> {
    // Step 1: Validate and seal identity — block store write is gated on this
    const ingestionResult =
      await this.contentIngestionService.processContent(content);

    // Step 2: Store the block only after successful validation and sealing
    const storeResult = await this.blocksService.storeBlock(
      dataBuffer,
      member,
      canRead,
      canPersist,
      options,
    );

    return {
      blockId: storeResult.blockId,
      metadata: storeResult.metadata,
      ingestion: ingestionResult,
    };
  }

  /**
   * Store a block without identity validation (passthrough to BlocksService).
   * Use this for system-internal blocks that don't carry user identity.
   */
  async storeBlock(
    dataBuffer: Buffer,
    member: Member,
    canRead = true,
    canPersist = true,
    options?: BlockStoreOptions,
  ): Promise<{ blockId: string; metadata?: IBlockMetadata }> {
    return this.blocksService.storeBlock(
      dataBuffer,
      member,
      canRead,
      canPersist,
      options,
    );
  }

  /**
   * Get a block by ID (passthrough to BlocksService).
   */
  async getBlock(
    blockId: string,
  ): Promise<{ data: Buffer; metadata?: IBlockMetadata }> {
    return this.blocksService.getBlock(blockId as unknown as BlockId);
  }

  async getBlockMetadata(blockId: string): Promise<IBlockMetadata | null> {
    return this.blocksService.getBlockMetadata(blockId as unknown as BlockId);
  }

  async deleteBlock(blockId: string): Promise<void> {
    return this.blocksService.deleteBlock(blockId as unknown as BlockId);
  }

  async brightenBlock(
    blockId: string,
    randomBlockCount: number,
  ): Promise<BrightenResult> {
    return this.blocksService.brightenBlock(
      blockId as unknown as BlockId,
      randomBlockCount,
    );
  }

  /**
   * Create a rejection from an IdentityValidationError.
   */
  static createRejection(error: IdentityValidationError) {
    return ContentIngestionService.createRejection(error);
  }

  /**
   * Create a rejection from a QuorumError.
   */
  static createSealingRejection(error: QuorumError) {
    return ContentIngestionService.createSealingRejection(error);
  }
}
