/**
 * RecipientKeyResolver — resolves encryption key availability and retrieves
 * cryptographic material for a set of recipients under a given scheme.
 *
 * Implements the IRecipientKeyResolver interface, delegating key lookups
 * to an injected IKeyStore dependency.
 *
 * @see Requirements 2.3, 3.2, 7.2, 11.7, 14.1, 14.2, 14.4
 */

import { EmailErrorType } from '../../enumerations/messaging/emailErrorType';
import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import { EmailError } from '../../errors/messaging/emailError';
import { IKeyStore, IKeyStoreEntry } from '../../interfaces/messaging/keyStore';
import {
  IRecipientKeyAvailability,
  IRecipientKeyResolver,
  IResolvedRecipientKeys,
} from '../../interfaces/messaging/recipientKeyResolver';

/**
 * Resolves which encryption schemes are available for a set of recipients
 * and retrieves the actual cryptographic material needed for encryption.
 *
 * @see Requirement 2.3 — Query keyserver for public keys by email
 * @see Requirement 11.7 — Resolve recipient keys and display warnings
 */
export class RecipientKeyResolver implements IRecipientKeyResolver {
  constructor(private readonly keyStore: IKeyStore) {}

  /**
   * Check key availability for all recipients.
   *
   * Queries the key store for each email to determine which types of
   * cryptographic material are available.
   *
   * @param emails - Array of recipient email addresses to check
   * @returns Availability information for each recipient
   */
  async resolveAvailability(
    emails: string[],
  ): Promise<IRecipientKeyAvailability[]> {
    const results: IRecipientKeyAvailability[] = [];

    for (const email of emails) {
      const entries: IKeyStoreEntry[] =
        await this.keyStore.getKeysForEmail(email);

      let hasGpgKey = false;
      let hasSmimeCert = false;

      for (const entry of entries) {
        if (entry.type.startsWith('gpg_')) {
          hasGpgKey = true;
        }
        if (entry.type.startsWith('smime_')) {
          hasSmimeCert = true;
        }
      }

      results.push({
        email,
        hasGpgKey,
        hasSmimeCert,
        // ECIES keys are managed differently (via member lookup); default false for now
        hasEciesKey: false,
        // Internal member lookup not yet implemented; default false for now
        isInternal: false,
      });
    }

    return results;
  }

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
   * @throws EmailError with RECIPIENT_KEY_MISSING when required keys are missing
   */
  async resolveKeysForScheme(
    emails: string[],
    scheme: MessageEncryptionScheme,
  ): Promise<IResolvedRecipientKeys> {
    const resolved: IResolvedRecipientKeys = {
      gpgKeys: new Map<string, string>(),
      smimeCerts: new Map<string, string>(),
      eciesKeys: new Map<string, Uint8Array>(),
      missingGpg: [],
      missingSmime: [],
      missingEcies: [],
    };

    for (const email of emails) {
      const entries: IKeyStoreEntry[] =
        await this.keyStore.getKeysForEmail(email);

      switch (scheme) {
        case MessageEncryptionScheme.GPG: {
          const gpgEntry = entries.find(
            (e) => e.type === 'gpg_public' || e.type === 'gpg_keypair',
          );
          if (gpgEntry) {
            resolved.gpgKeys.set(email, gpgEntry.publicMaterial);
          } else {
            resolved.missingGpg.push(email);
          }
          break;
        }

        case MessageEncryptionScheme.S_MIME: {
          const smimeEntry = entries.find(
            (e) => e.type === 'smime_cert' || e.type === 'smime_bundle',
          );
          if (smimeEntry) {
            resolved.smimeCerts.set(email, smimeEntry.publicMaterial);
          } else {
            resolved.missingSmime.push(email);
          }
          break;
        }

        case MessageEncryptionScheme.RECIPIENT_KEYS: {
          // ECIES keys are managed separately; mark all as missing for now
          resolved.missingEcies.push(email);
          break;
        }

        default:
          // NONE and SHARED_KEY don't require per-recipient keys
          break;
      }
    }

    // Throw if any recipients are missing required keys for the selected scheme
    const hasMissing =
      (scheme === MessageEncryptionScheme.GPG &&
        resolved.missingGpg.length > 0) ||
      (scheme === MessageEncryptionScheme.S_MIME &&
        resolved.missingSmime.length > 0);

    if (hasMissing) {
      const missingEmails =
        scheme === MessageEncryptionScheme.GPG
          ? resolved.missingGpg
          : resolved.missingSmime;

      throw new EmailError(
        EmailErrorType.RECIPIENT_KEY_MISSING,
        `Recipients missing required ${scheme} keys: ${missingEmails.join(', ')}`,
        { scheme, missingEmails },
      );
    }

    return resolved;
  }
}
