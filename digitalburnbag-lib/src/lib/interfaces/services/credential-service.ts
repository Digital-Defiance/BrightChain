import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { IProviderCredentials } from '../canary-provider/canary-provider-adapter';

/**
 * Result of validating credential freshness.
 */
export interface ICredentialFreshnessResult {
  /** Whether the credentials are still valid (not expired) */
  valid: boolean;
  /** Milliseconds until expiry, if applicable */
  expiresInMs?: number;
}

/**
 * Service interface for encrypting, storing, retrieving, and deleting
 * provider credentials. Credentials are decrypted only in-memory for
 * the duration of an API call.
 */
export interface ICredentialService<TID extends PlatformID = string> {
  /** Encrypt and store credentials */
  storeCredentials(credentials: IProviderCredentials<TID>): Promise<void>;

  /** Retrieve and decrypt credentials for an API call (in-memory only) */
  getDecryptedCredentials(
    connectionId: TID,
  ): Promise<IProviderCredentials<TID>>;

  /** Permanently delete all credentials for a connection */
  deleteCredentials(connectionId: TID): Promise<void>;

  /** Validate that credentials are not expired */
  validateCredentialFreshness(
    connectionId: TID,
  ): Promise<ICredentialFreshnessResult>;
}
