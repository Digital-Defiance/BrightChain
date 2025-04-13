/**
 * Application constants for BrightChain API
 * Re-exports constants from @digitaldefiance/node-express-suite
 */
import { LocalhostConstants } from '@digitaldefiance/node-express-suite';

/**
 * Application constants combining all constants from the suite packages
 * Includes:
 * - User/Role names (AdministratorUser, MemberUser, SystemUser, etc.)
 * - Validation regexes (PasswordRegex, UsernameRegex, MnemonicRegex, etc.)
 * - Token lengths and expirations (EmailTokenLength, EmailTokenExpiration, etc.)
 * - Cryptographic constants (ECIES, PBKDF2, BACKUP_CODES, etc.)
 * - Site configuration (Site, SiteHostname, SiteEmailDomain, etc.)
 */
export const AppConstants = {
  ...LocalhostConstants,
  HmacRegex: /^[a-fA-F0-9]+$/,
};
export { LocalhostConstants };

// Re-export for convenience
export default AppConstants;
