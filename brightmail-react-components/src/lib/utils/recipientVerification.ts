/**
 * Recipient verification utilities.
 *
 * Pure functions for partitioning local vs external recipients and
 * mapping verification results to chip statuses. Exported for
 * property testing (Properties 11, 12).
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

/**
 * Read the local email domain from window.APP_CONFIG.
 * Falls back to 'example.com' if unavailable.
 */
export function getEmailDomain(): string {
  if (typeof window !== 'undefined') {
    const appConfig = (window as { APP_CONFIG?: { emailDomain?: string } })
      .APP_CONFIG;
    if (appConfig?.emailDomain) {
      return appConfig.emailDomain;
    }
  }
  return 'example.com';
}

/**
 * Determines whether an email address belongs to the local domain.
 * Comparison is case-insensitive.
 *
 * @returns true if the domain part matches emailDomain
 */
export function isLocalDomain(email: string, emailDomain: string): boolean {
  const atIndex = email.lastIndexOf('@');
  if (atIndex <= 0) return false;
  const domain = email.slice(atIndex + 1);
  return domain.toLowerCase() === emailDomain.toLowerCase();
}

/**
 * Extracts the local part (username) from an email address.
 * Returns empty string if the email is malformed.
 */
export function extractLocalPart(email: string): string {
  const atIndex = email.lastIndexOf('@');
  if (atIndex <= 0) return '';
  return email.slice(0, atIndex);
}

/**
 * Maps a verification result to a chip status.
 *
 * - exists: true → 'valid'
 * - exists: false → 'warning'
 */
export function verificationResultToChipStatus(
  exists: boolean,
): 'valid' | 'warning' {
  return exists ? 'valid' : 'warning';
}

/**
 * Returns the subset of email addresses that are NOT on the local domain.
 * Useful for detecting recipients who cannot receive ECIES-encrypted messages.
 *
 * @param emails - Array of email address strings
 * @param emailDomain - The local email domain
 * @returns Array of email addresses whose domain does not match emailDomain
 */
export function getExternalRecipients(
  emails: string[],
  emailDomain: string,
): string[] {
  return emails.filter((email) => {
    const trimmed = email.trim();
    if (trimmed.length === 0) return false;
    return !isLocalDomain(trimmed, emailDomain);
  });
}
