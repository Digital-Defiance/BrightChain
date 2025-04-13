/* eslint-disable @nx/enforce-module-boundaries */
import { StringLanguage } from '@brightchain/brightchain-lib';
import { AccountStatus, IUserBase } from '@digitaldefiance/suite-core-lib';
import { DefaultBackendIdType } from '../shared-types';
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
