import { PlatformID } from '@digitaldefiance/ecies-lib';
import { AccessBy } from '../../shared-types';

export interface IACLBase<I extends PlatformID | string> {
  /**
   * Who can access the file.
   * - 'public': Anyone can access the file.
   * - 'password': Anyone with the access password can access the file.
   * - 'restricted': Only users with specific user IDs or emails can access the file.
   * - 'self': Only the user who uploaded the file can access it.
   * - 'none': No one can access the file until it is released.
   */
  access: AccessBy;
  /**
   * user ids that can access the file/folder if access is 'restricted'
   */
  restrictedUserIds?: Array<I>;
  /**
   * emails that can access the file/folder if access is 'restricted'
   */
  restrictedEmails?: Array<string>;
  /**
   * Passwords that can access the file/folder (as long as access is not 'none'). This may be set by a canary protocol.
   */
  accessPasswordHashes?: Array<string>;
  /**
   * Duress passwords that will trigger a canary protocol if used to access the file/folder.
   */
  duressPasswordHashes?: Array<string>;
}
