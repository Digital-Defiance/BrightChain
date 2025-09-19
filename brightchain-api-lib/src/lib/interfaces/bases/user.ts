import {
  AccountStatus,
  CanaryStatus,
  IUserBase,
  StringLanguage,
} from '@brightchain/brightchain-lib';
import { DefaultBackendIdType } from '../../shared-types';

export type IUserBackend = IUserBase<
  DefaultBackendIdType,
  Date,
  StringLanguage,
  AccountStatus,
  CanaryStatus
>;
