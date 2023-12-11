import { DefaultIdType } from '../sharedTypes';

/**
 * Role definition for authorization and access control
 *
 * @remarks
 * Roles define sets of permissions and can be assigned to users. A role
 * can be either a global admin role or a member role, but not both.
 *
 * @typeParam I - The type used for user IDs (defaults to DefaultIdType)
 *
 * @example
 * ```typescript
 * const adminRole: IRole = {
 *   name: 'Administrator',
 *   users: ['user-1', 'user-2'],
 *   globalAdmin: true,
 *   member: false
 * };
 *
 * const memberRole: IRole = {
 *   name: 'Member',
 *   users: ['user-3', 'user-4'],
 *   globalAdmin: false,
 *   member: true
 * };
 * ```
 */
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
