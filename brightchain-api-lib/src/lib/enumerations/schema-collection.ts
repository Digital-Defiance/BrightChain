/**
 * Database collection name enumeration
 */
export enum SchemaCollection {
  /**
   * User collection
   */
  User = 'users',

  /**
   * Role collection
   */
  Role = 'roles',

  /**
   * UserRole collection (junction table)
   */
  UserRole = 'user_roles',

  /**
   * Mnemonic collection
   */
  Mnemonic = 'mnemonics',

  /**
   * EmailToken collection
   */
  EmailToken = 'email_tokens',

  /**
   * UsedDirectLoginToken collection
   */
  UsedDirectLoginToken = 'used_direct_login_tokens',
}
