import { LanguageCode } from '@digitaldefiance/i18n-lib';
import { IRole } from './role';

/**
 * User information from an authenticated request
 *
 * @remarks
 * This interface represents the user data extracted from an authenticated
 * request, typically from a JWT token or session. It includes user identity,
 * preferences, and authorization information.
 *
 * @example
 * ```typescript
 * const user: IRequestUser = {
 *   id: 'user-123',
 *   email: 'user@example.com',
 *   emailVerified: true,
 *   roles: [adminRole, memberRole],
 *   username: 'johndoe',
 *   siteLanguage: LanguageCode.EN_US,
 *   timezone: 'America/New_York',
 *   lastLogin: new Date()
 * };
 * ```
 */
export interface IRequestUser {
  /** Unique identifier for the user */
  id: string;

  /** User's email address */
  email: string;

  /** Whether the user's email has been verified */
  emailVerified: boolean;

  /** Array of roles assigned to the user */
  roles: Array<IRole>;

  /** User's chosen username */
  username: string;

  /** User's preferred language for the site */
  siteLanguage: LanguageCode;

  /** User's timezone (e.g., 'America/New_York') */
  timezone: string;

  /**
   * Timestamp of the user's last login (optional)
   * @remarks May be undefined for first-time logins
   */
  lastLogin?: Date;
}
