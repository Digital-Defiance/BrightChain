/* eslint-disable @nx/enforce-module-boundaries */
import { DurabilityLevel } from '@brightchain/brightchain-lib';
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
    options?: {
      expiresAt?: string; // ISO date string
      durabilityLevel?: DurabilityLevel;
    };
  };
}

export interface GetBlockRequest extends BlockRequest {
  params: {
    blockId: string;
  };
}

export interface GetBlockMetadataRequest extends BlockRequest {
  params: {
    blockId: string;
  };
}

export interface DeleteBlockRequest extends BlockRequest {
  params: {
    blockId: string;
  };
}

export interface BrightenBlockRequest extends BlockRequest {
  body: {
    blockId: string;
    randomBlockCount: number;
  };
}
