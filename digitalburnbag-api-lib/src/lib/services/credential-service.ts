import type {
  ICredentialFreshnessResult,
  ICredentialService,
  IProviderCredentials,
} from '@brightchain/digitalburnbag-lib';
import type { PlatformID } from '@digitaldefiance/ecies-lib';

// ---------------------------------------------------------------------------
// Encryption Service Interface
// ---------------------------------------------------------------------------

/**
 * Result of an AES-256-GCM encryption operation.
 * All fields are base64-encoded strings for JSON-safe storage.
 */
export interface IEncryptionResult {
  /** Base64-encoded ciphertext */
  ciphertext: string;
  /** Base64-encoded initialization vector */
  iv: string;
  /** Base64-encoded authentication tag */
  authTag: string;
}

/**
 * Injected encryption service interface.
 * Decouples the credential service from specific crypto implementations.
 */
export interface IEncryptionService {
  /** Encrypt a plaintext string using AES-256-GCM */
  encrypt(plaintext: string): Promise<IEncryptionResult>;
  /** Decrypt a ciphertext using AES-256-GCM */
  decrypt(ciphertext: string, iv: string, authTag: string): Promise<string>;
}

// ---------------------------------------------------------------------------
// Credential Repository Interface
// ---------------------------------------------------------------------------

/**
 * Encrypted credential data stored in the repository.
 * All sensitive fields are base64-encoded AES-256-GCM ciphertext.
 */
export interface EncryptedCredentialData {
  connectionId: string;
  userId: string;
  providerId: string;
  /** Encrypted access token (base64) */
  encryptedAccessToken?: string;
  accessTokenIv?: string;
  accessTokenAuthTag?: string;
  /** Encrypted refresh token (base64) */
  encryptedRefreshToken?: string;
  refreshTokenIv?: string;
  refreshTokenAuthTag?: string;
  /** Encrypted API key (base64) */
  encryptedApiKey?: string;
  apiKeyIv?: string;
  apiKeyAuthTag?: string;
  /** Non-sensitive metadata */
  providerUserId?: string;
  providerUsername?: string;
  tokenExpiresAt?: string;
  lastValidatedAt?: string;
  isValid: boolean;
  validationError?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Repository interface for credential persistence.
 * Will be implemented by BrightDB in Task 11.2.
 */
export interface ICredentialRepository {
  store(connectionId: string, data: EncryptedCredentialData): Promise<void>;
  get(connectionId: string): Promise<EncryptedCredentialData | null>;
  delete(connectionId: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// CredentialService Implementation
// ---------------------------------------------------------------------------

/**
 * Sanitises a value so it never appears in logs or error messages.
 * Returns a fixed placeholder regardless of input.
 */
function redact(_value: unknown): string {
  return '[REDACTED]';
}

/**
 * Concrete implementation of ICredentialService.
 *
 * Encrypts OAuth tokens and API keys with AES-256-GCM before persisting,
 * decrypts only in-memory for the duration of an API call, and permanently
 * deletes all credential data on disconnect.
 *
 * Requirements: 10.1, 10.2, 10.4
 */
export class CredentialService<TID extends PlatformID = string>
  implements ICredentialService<TID>
{
  constructor(
    private readonly encryptionService: IEncryptionService,
    private readonly repository: ICredentialRepository,
  ) {}

  async storeCredentials(
    credentials: IProviderCredentials<TID>,
  ): Promise<void> {
    const connectionId =
      String(credentials.userId) + ':' + String(credentials.providerId);
    const now = new Date().toISOString();

    const data: EncryptedCredentialData = {
      connectionId,
      userId: String(credentials.userId),
      providerId: String(credentials.providerId),
      providerUserId: credentials.providerUserId,
      providerUsername: credentials.providerUsername,
      tokenExpiresAt: credentials.tokenExpiresAt?.toISOString(),
      lastValidatedAt: credentials.lastValidatedAt?.toISOString(),
      isValid: credentials.isValid,
      validationError: credentials.validationError,
      createdAt: now,
      updatedAt: now,
    };

    try {
      // Encrypt access token
      if (credentials.accessToken) {
        const result = await this.encryptionService.encrypt(
          credentials.accessToken,
        );
        data.encryptedAccessToken = result.ciphertext;
        data.accessTokenIv = result.iv;
        data.accessTokenAuthTag = result.authTag;
      }

      // Encrypt refresh token
      if (credentials.refreshToken) {
        const result = await this.encryptionService.encrypt(
          credentials.refreshToken,
        );
        data.encryptedRefreshToken = result.ciphertext;
        data.refreshTokenIv = result.iv;
        data.refreshTokenAuthTag = result.authTag;
      }

      // Encrypt API key
      if (credentials.apiKey) {
        const result = await this.encryptionService.encrypt(credentials.apiKey);
        data.encryptedApiKey = result.ciphertext;
        data.apiKeyIv = result.iv;
        data.apiKeyAuthTag = result.authTag;
      }

      await this.repository.store(connectionId, data);
    } catch (error: unknown) {
      // Never leak credential values in error messages (Req 10.3)
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `Failed to store credentials for connection ${redact(connectionId)}: ${message}`,
      );
    }
  }

  async getDecryptedCredentials(
    connectionId: TID,
  ): Promise<IProviderCredentials<TID>> {
    const connId = String(connectionId);
    const data = await this.repository.get(connId);

    if (!data) {
      throw new Error(`No credentials found for connection ${redact(connId)}`);
    }

    try {
      let accessToken: string | undefined;
      if (
        data.encryptedAccessToken &&
        data.accessTokenIv &&
        data.accessTokenAuthTag
      ) {
        accessToken = await this.encryptionService.decrypt(
          data.encryptedAccessToken,
          data.accessTokenIv,
          data.accessTokenAuthTag,
        );
      }

      let refreshToken: string | undefined;
      if (
        data.encryptedRefreshToken &&
        data.refreshTokenIv &&
        data.refreshTokenAuthTag
      ) {
        refreshToken = await this.encryptionService.decrypt(
          data.encryptedRefreshToken,
          data.refreshTokenIv,
          data.refreshTokenAuthTag,
        );
      }

      let apiKey: string | undefined;
      if (data.encryptedApiKey && data.apiKeyIv && data.apiKeyAuthTag) {
        apiKey = await this.encryptionService.decrypt(
          data.encryptedApiKey,
          data.apiKeyIv,
          data.apiKeyAuthTag,
        );
      }

      return {
        userId: data.userId as unknown as TID,
        providerId: data.providerId as unknown as TID,
        accessToken,
        refreshToken,
        apiKey,
        tokenExpiresAt: data.tokenExpiresAt
          ? new Date(data.tokenExpiresAt)
          : undefined,
        providerUserId: data.providerUserId,
        providerUsername: data.providerUsername,
        lastValidatedAt: data.lastValidatedAt
          ? new Date(data.lastValidatedAt)
          : undefined,
        isValid: data.isValid,
        validationError: data.validationError,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      } as IProviderCredentials<TID>;
    } catch (error: unknown) {
      // Never leak credential values in error messages (Req 10.3)
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `Failed to decrypt credentials for connection ${redact(connId)}: ${message}`,
      );
    }
  }

  async deleteCredentials(connectionId: TID): Promise<void> {
    const connId = String(connectionId);
    await this.repository.delete(connId);
  }

  async validateCredentialFreshness(
    connectionId: TID,
  ): Promise<ICredentialFreshnessResult> {
    const connId = String(connectionId);
    const data = await this.repository.get(connId);

    if (!data) {
      return { valid: false };
    }

    if (!data.tokenExpiresAt) {
      // No expiry set — credentials are considered valid (e.g. API key)
      return { valid: true };
    }

    const expiresAt = new Date(data.tokenExpiresAt).getTime();
    const now = Date.now();
    const expiresInMs = expiresAt - now;

    return {
      valid: expiresInMs > 0,
      expiresInMs: expiresInMs > 0 ? expiresInMs : 0,
    };
  }
}
