/* eslint-disable @nx/enforce-module-boundaries, @typescript-eslint/no-explicit-any */
import { IBlockMetadata } from '@brightchain/brightchain-lib';

export interface IGetBlockResponse {
  blockId: string;
  data: Buffer;
  canRead: boolean;
  canPersist: boolean;
  metadata?: IBlockMetadata;
  [key: string]: any; // Add index signature for ApiResponse compatibility
}

export interface IStoreBlockResponse {
  blockId: string;
  success: boolean;
  metadata?: IBlockMetadata;
  [key: string]: any; // Add index signature for ApiResponse compatibility
}

export interface IGetBlockMetadataResponse {
  blockId: string;
  metadata: IBlockMetadata;
  [key: string]: any; // Add index signature for ApiResponse compatibility
}

export interface IDeleteBlockResponse {
  blockId: string;
  success: boolean;
  [key: string]: any; // Add index signature for ApiResponse compatibility
}

export interface IBrightenBlockResponse {
  brightenedBlockId: string;
  randomBlockIds: string[];
  originalBlockId: string;
  [key: string]: any; // Add index signature for ApiResponse compatibility
}
