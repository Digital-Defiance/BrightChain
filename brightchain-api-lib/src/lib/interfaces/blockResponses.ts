/* eslint-disable @typescript-eslint/no-explicit-any */
import { type BlockId, IBlockMetadata } from '@brightchain/brightchain-lib';

export interface IGetBlockResponse {
  blockId: BlockId;
  data: Buffer;
  canRead: boolean;
  canPersist: boolean;
  metadata?: IBlockMetadata;
  [key: string]: any; // Add index signature for ApiResponse compatibility
}

export interface IStoreBlockResponse {
  blockId: BlockId;
  success: boolean;
  metadata?: IBlockMetadata;
  [key: string]: any; // Add index signature for ApiResponse compatibility
}

export interface IGetBlockMetadataResponse {
  blockId: BlockId;
  metadata: IBlockMetadata;
  [key: string]: any; // Add index signature for ApiResponse compatibility
}

export interface IDeleteBlockResponse {
  blockId: BlockId;
  success: boolean;
  [key: string]: any; // Add index signature for ApiResponse compatibility
}

export interface IBrightenBlockResponse {
  brightenedBlockId: BlockId;
  randomBlockIds: BlockId[];
  originalBlockId: BlockId;
  [key: string]: any; // Add index signature for ApiResponse compatibility
}
