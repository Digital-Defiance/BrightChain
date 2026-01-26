import { AccountStatus, IUserBase } from '@digitaldefiance/suite-core-lib';
import { StringLanguage } from '../interfaces/request-user';
import type { DefaultBackendIdType } from '../types/backend-id';
import { IBaseDocument } from './base';

export interface IBrightChainUserBase extends IUserBase<
  DefaultBackendIdType,
  Date,
  StringLanguage,
  AccountStatus
> {
  expireMemoryMnemonicSeconds?: number;
  expireMemoryWalletSeconds?: number;
}

/**
 * Composite interface for user collection documents
 */
export type IUserDocument = IBaseDocument<IBrightChainUserBase>;
