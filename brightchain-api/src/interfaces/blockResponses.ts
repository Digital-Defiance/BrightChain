/* eslint-disable @typescript-eslint/no-explicit-any */
export interface IGetBlockResponse {
  blockId: string;
  data: Buffer;
  canRead: boolean;
  canPersist: boolean;
  [key: string]: any; // Add index signature for ApiResponse compatibility
}

export interface IStoreBlockResponse {
  blockId: string;
  success: boolean;
  [key: string]: any; // Add index signature for ApiResponse compatibility
}
