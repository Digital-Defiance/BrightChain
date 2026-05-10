import { PlatformID } from '@digitaldefiance/ecies-lib';
import {
  AccountStatus,
  IUserBase as IUserBaseSource,
} from '@digitaldefiance/suite-core-lib';
import { CanaryStatus } from '../../enumerations/canary-status';

export interface IUserBase<
  I extends PlatformID,
  D extends Date,
  S extends string,
  A extends AccountStatus,
  C extends CanaryStatus,
> extends IUserBaseSource<I, D, S, A> {
  /**
   * Crypted mnemonics/passwords that trigger a duress protocol
   */
  duressPasswords: string[];
  /**
   * Overall status for the user
   */
  overallCanaryStatus: C;
}
