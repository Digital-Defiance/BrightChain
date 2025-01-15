import { DefaultIdType } from '../sharedTypes';

export interface IRole<I = DefaultIdType> {
  /**
   * The name of the role
   */
  name: string;
  /**
   * The IDs of the users associated with the role
   */
  users: I[];
  /**
   * Whether the role is a globalAdmin
   * Must not specify member and globalAdmin simultaneously
   */
  globalAdmin: boolean;
  /**
   * Whether the role is a site member
   * Must not specify globalAdmin and member simultaneously
   */
  member: boolean;
}
