import {
  AccountStatus,
  CanaryStatus,
  IUserBase,
  StringLanguage,
} from '@brightchain/brightchain-lib';
import { DefaultBackendIdType } from '../shared-types';
import { IBaseDocument } from './base';

/**
 * Composite interface for user collection documents
 */
export type IUserDocument = IBaseDocument<
  IUserBase<
    DefaultBackendIdType,
    Date,
    StringLanguage,
    AccountStatus,
    CanaryStatus
  >
>;
