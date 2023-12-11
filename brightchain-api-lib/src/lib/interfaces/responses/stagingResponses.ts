import type {
  ICommitResponse,
  ITempUploadResponse,
} from '@brightchain/brightchain-lib';
import { Response } from 'express';

/**
 * Express response wrapper for the staging upload endpoint.
 */
export interface ITempUploadApiResponse extends Response {
  body: ITempUploadResponse;
}

/**
 * Express response wrapper for the commit endpoint.
 */
export interface ICommitApiResponse extends Response {
  body: ICommitResponse<string>;
}
