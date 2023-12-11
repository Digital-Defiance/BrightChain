/**
 * Database collection name enumeration
 */
export enum SchemaCollection {
  User = 'users',
  Role = 'roles',
  UserRole = 'user_roles',
  Mnemonic = 'mnemonics',
  EmailToken = 'email_tokens',
  UsedDirectLoginToken = 'used_direct_login_tokens',
  UserSettings = 'user_settings',
  Organization = 'organizations',
  HealthcareRole = 'healthcare_roles',
  Invitation = 'invitations',
}
