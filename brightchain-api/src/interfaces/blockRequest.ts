import { Request } from 'express';

export interface BlockRequest extends Request {
  headers: {
    authorization?: string;
  };
}

export interface StoreBlockRequest extends BlockRequest {
  body: {
    data: string;
    canRead?: boolean;
    canPersist?: boolean;
  };
}

export interface GetBlockRequest extends BlockRequest {
  params: {
    blockId: string;
  };
}
