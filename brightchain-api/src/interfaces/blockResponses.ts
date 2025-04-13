import { JsonResponse } from '@digitaldefiance/node-express-suite';

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
