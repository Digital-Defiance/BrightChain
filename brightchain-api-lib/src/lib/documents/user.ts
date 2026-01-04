import {
  StringLanguage,
} from '@brightchain/brightchain-lib';
import { DefaultBackendIdType } from '../shared-types';
import { IBaseDocument } from './base';
import { AccountStatus, IUserBase } from '@digitaldefiance/suite-core-lib';

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
