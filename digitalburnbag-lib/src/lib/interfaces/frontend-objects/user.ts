import { IUserFrontendObject as IBaseUserFontendObject } from '@digitaldefiance/suite-core-lib';
import { CanaryStatus } from '../../enumerations/canary-status';
export interface IUserFrontendObject<C extends CanaryStatus>
  extends IBaseUserFontendObject {
  /**
   * Crypted mnemonics/passwords that trigger a duress protocol
   */
  duressPasswords: string[];
  /**
   * Overall status for the user
   */
  overallCanaryStatus: C;
}
