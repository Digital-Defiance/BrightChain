/**
 * Database model name enumeration
 */
export enum ModelName {
  /**
   * User model
   */
  User = 'User',
  
  /**
   * Role model
   */
  Role = 'Role',
  
  /**
   * UserRole model (junction table)
   */
  UserRole = 'UserRole',
  
  /**
   * EmailToken model
   */
  EmailToken = 'EmailToken',
  
  /**
   * Mnemonic model
   */
  Mnemonic = 'Mnemonic',
  
  /**
   * UsedDirectLoginToken model
   */
  UsedDirectLoginToken = 'UsedDirectLoginToken',
}
