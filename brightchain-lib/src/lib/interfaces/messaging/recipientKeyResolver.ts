/**
 * Recipient key resolver interfaces for BrightMail encryption.
 *
 * Defines the contract for resolving which encryption schemes are available
 * for a set of recipients, and for retrieving the actual cryptographic
 * material (GPG public keys, S/MIME certificates, ECIES public keys)
 * needed to encrypt a message under a given scheme.
 *
 * @see Requirements 2.3, 11.1, 11.2, 11.7
 */

import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';

/**
 * Key availability information for a single recipient.
 *
 * Indicates which types of cryptographic material are available for
 * a given email address, enabling the UI to show/hide encryption options.
 *
 * @see Requirement 11.1 — GPG option shown when recipient has GPG key
 * @see Requirement 11.2 — GPG option hidden when recipient lacks GPG key
 * @see Requirement 11.7 — Resolve recipient keys and display warnings
 */
export interface IRecipientKeyAvailability {
  /** The recipient's email address */
  email: string;

  /** Whether a GPG public key is available for this recipient */
  hasGpgKey: boolean;

  /** Whether an S/MIME certificate is available for this recipient */
  hasSmimeCert: boolean;

  /** Whether an ECIES public key is available for this recipient */
  hasEciesKey: boolean;

  /** Whether this recipient is an internal BrightChain member */
  isInternal: boolean;
}

/**
 * Resolved cryptographic material for a set of recipients under a given scheme.
 *
 * Contains maps of email → key material for recipients that have keys,
 * and arrays of emails for recipients that are missing the required material.
 *
 * @see Requirement 2.3 — Query keyserver for public keys by email
 * @see Requirement 11.7 — Display warnings for recipients lacking keys
 */
export interface IResolvedRecipientKeys {
  /** GPG public keys by recipient email (email → ASCII-armored public key) */
  gpgKeys: Map<string, string>;

  /** S/MIME certificates by recipient email (email → PEM certificate) */
  smimeCerts: Map<string, string>;

  /** ECIES public keys by recipient email (email → raw public key bytes) */
  eciesKeys: Map<string, Uint8Array>;

  /** Emails of recipients missing a GPG public key */
  missingGpg: string[];

  /** Emails of recipients missing an S/MIME certificate */
  missingSmime: string[];

  /** Emails of recipients missing an ECIES public key */
  missingEcies: string[];
}

/**
 * Service interface for resolving recipient encryption key availability.
 *
 * Used by the compose flow to determine which encryption schemes can be
 * offered and to retrieve the actual keys/certificates needed for encryption.
 *
 * @see Requirement 2.3 — Import GPG public key by email via keyserver
 * @see Requirement 11.1 — Show GPG option when user has GPG keypair
 * @see Requirement 11.2 — Hide GPG option when user lacks GPG keypair
 * @see Requirement 11.7 — Resolve recipient keys and display warnings
 */
export interface IRecipientKeyResolver {
  /**
   * Check key availability for all recipients.
   *
   * Queries the key store for each email to determine which types of
   * cryptographic material are available.
   *
   * @param emails - Array of recipient email addresses to check
   * @returns Availability information for each recipient
   */
  resolveAvailability(emails: string[]): Promise<IRecipientKeyAvailability[]>;

  /**
   * Resolve actual keys/certificates for a given encryption scheme.
   *
   * Retrieves the cryptographic material needed to encrypt a message
   * under the specified scheme. Populates the appropriate key map and
   * identifies recipients missing the required material.
   *
   * @param emails - Array of recipient email addresses
   * @param scheme - The encryption scheme to resolve keys for
   * @returns Resolved keys and lists of recipients with missing material
   */
  resolveKeysForScheme(
    emails: string[],
    scheme: MessageEncryptionScheme,
  ): Promise<IResolvedRecipientKeys>;
}
