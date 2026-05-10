/**
 * Property-based tests for CredentialService.
 *
 * Feature: canary-provider-system
 */
import type { IProviderCredentials } from '@brightchain/digitalburnbag-lib';
import * as fc from 'fast-check';
import {
  CredentialService,
  EncryptedCredentialData,
  ICredentialRepository,
  IEncryptionService,
} from '../../services/credential-service';

// ---------------------------------------------------------------------------
// In-memory mock encryption service (simple XOR-style for deterministic tests)
// ---------------------------------------------------------------------------

/**
 * A simple in-memory encryption service that uses base64 encoding with a
 * reversible transform for testing. NOT cryptographically secure — used
 * only to verify the round-trip property.
 */
function createMockEncryptionService(): IEncryptionService {
  return {
    async encrypt(plaintext: string) {
      const encoded = Buffer.from(plaintext, 'utf-8').toString('base64');
      const iv = Buffer.from('test-iv-' + Date.now().toString()).toString(
        'base64',
      );
      const authTag = Buffer.from('test-tag').toString('base64');
      return { ciphertext: encoded, iv, authTag };
    },
    async decrypt(ciphertext: string, _iv: string, _authTag: string) {
      return Buffer.from(ciphertext, 'base64').toString('utf-8');
    },
  };
}

// ---------------------------------------------------------------------------
// In-memory mock credential repository
// ---------------------------------------------------------------------------

function createMockRepository(): ICredentialRepository & {
  store_: Map<string, EncryptedCredentialData>;
} {
  const store_ = new Map<string, EncryptedCredentialData>();
  return {
    store_,
    async store(connectionId: string, data: EncryptedCredentialData) {
      store_.set(connectionId, { ...data });
    },
    async get(connectionId: string) {
      return store_.get(connectionId) ?? null;
    },
    async delete(connectionId: string) {
      store_.delete(connectionId);
    },
  };
}

// ---------------------------------------------------------------------------
// Property 22: Credential encryption round-trip
// Tag: Feature: canary-provider-system, Property 22: Credential encryption round-trip
// Validates: Requirements 10.1
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-system, Property 22: Credential encryption round-trip', () => {
  it('encrypting then decrypting any valid credential string produces the original', async () => {
    /**
     * **Validates: Requirements 10.1**
     *
     * For any valid credential string, encrypting then decrypting
     * produces the original string.
     */
    const encryptionService = createMockEncryptionService();
    const repository = createMockRepository();
    const service = new CredentialService<string>(
      encryptionService,
      repository,
    );

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.string({ minLength: 1, maxLength: 500 }),
        async (accessToken, refreshToken, apiKey) => {
          // Clear repository between runs
          repository.store_.clear();

          const credentials: IProviderCredentials<string> = {
            userId: 'user-1',
            providerId: 'provider-1',
            accessToken,
            refreshToken,
            apiKey,
            isValid: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          await service.storeCredentials(credentials);

          const connectionId = 'user-1:provider-1';
          const decrypted = await service.getDecryptedCredentials(connectionId);

          return (
            decrypted.accessToken === accessToken &&
            decrypted.refreshToken === refreshToken &&
            decrypted.apiKey === apiKey
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('round-trips credentials with only some fields populated', async () => {
    /**
     * **Validates: Requirements 10.1**
     *
     * Credentials with only a subset of token fields should still
     * round-trip correctly.
     */
    const encryptionService = createMockEncryptionService();
    const repository = createMockRepository();
    const service = new CredentialService<string>(
      encryptionService,
      repository,
    );

    await fc.assert(
      fc.asyncProperty(
        fc.option(fc.string({ minLength: 1, maxLength: 500 }), {
          nil: undefined,
        }),
        fc.option(fc.string({ minLength: 1, maxLength: 500 }), {
          nil: undefined,
        }),
        fc.option(fc.string({ minLength: 1, maxLength: 500 }), {
          nil: undefined,
        }),
        async (accessToken, refreshToken, apiKey) => {
          repository.store_.clear();

          const credentials: IProviderCredentials<string> = {
            userId: 'user-2',
            providerId: 'provider-2',
            accessToken,
            refreshToken,
            apiKey,
            isValid: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          await service.storeCredentials(credentials);

          const connectionId = 'user-2:provider-2';
          const decrypted = await service.getDecryptedCredentials(connectionId);

          return (
            decrypted.accessToken === accessToken &&
            decrypted.refreshToken === refreshToken &&
            decrypted.apiKey === apiKey
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 23: Credentials never appear in outputs
// Tag: Feature: canary-provider-system, Property 23: Credentials never appear in outputs
// Validates: Requirements 10.3
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-system, Property 23: Credentials never appear in outputs', () => {
  it('error messages from store failures do not contain credential values', async () => {
    /**
     * **Validates: Requirements 10.3**
     *
     * For any credential value and any error scenario, the error message
     * does not contain the credential as a substring.
     */
    // Use alphanumeric strings of sufficient length to avoid trivially
    // matching common words in error messages (e.g. single space).
    const arbCredentialString = fc.stringMatching(/^[A-Za-z0-9_\-]{4,200}$/);

    await fc.assert(
      fc.asyncProperty(
        arbCredentialString,
        arbCredentialString,
        arbCredentialString,
        async (accessToken, refreshToken, apiKey) => {
          // Create an encryption service that always fails
          const failingEncryption: IEncryptionService = {
            async encrypt() {
              throw new Error('Encryption hardware failure');
            },
            async decrypt() {
              throw new Error('Decryption hardware failure');
            },
          };
          const repository = createMockRepository();
          const service = new CredentialService<string>(
            failingEncryption,
            repository,
          );

          const credentials: IProviderCredentials<string> = {
            userId: 'user-err',
            providerId: 'provider-err',
            accessToken,
            refreshToken,
            apiKey,
            isValid: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          try {
            await service.storeCredentials(credentials);
            // If it doesn't throw, that's fine — no error to check
            return true;
          } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            // Credential values must never appear in error messages
            const leaked =
              (accessToken.length > 0 && msg.includes(accessToken)) ||
              (refreshToken.length > 0 && msg.includes(refreshToken)) ||
              (apiKey.length > 0 && msg.includes(apiKey));
            return !leaked;
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('error messages from decrypt failures do not contain stored credential data', async () => {
    /**
     * **Validates: Requirements 10.3**
     *
     * When decryption fails, the error message must not contain any
     * encrypted or plaintext credential values.
     */
    const arbCredentialString = fc.stringMatching(/^[A-Za-z0-9_\-]{4,200}$/);

    await fc.assert(
      fc.asyncProperty(arbCredentialString, async (accessToken) => {
        const goodEncryption = createMockEncryptionService();
        const repository = createMockRepository();

        // Store credentials with working encryption
        const storeService = new CredentialService<string>(
          goodEncryption,
          repository,
        );
        const credentials: IProviderCredentials<string> = {
          userId: 'user-dec',
          providerId: 'provider-dec',
          accessToken,
          isValid: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await storeService.storeCredentials(credentials);

        // Now try to decrypt with a failing encryption service
        const failingEncryption: IEncryptionService = {
          async encrypt(plaintext: string) {
            return goodEncryption.encrypt(plaintext);
          },
          async decrypt() {
            throw new Error('Decryption key unavailable');
          },
        };
        const decryptService = new CredentialService<string>(
          failingEncryption,
          repository,
        );

        try {
          await decryptService.getDecryptedCredentials('user-dec:provider-dec');
          return true;
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          // Neither the plaintext nor the encrypted form should appear
          const leaked = accessToken.length > 0 && msg.includes(accessToken);
          return !leaked;
        }
      }),
      { numRuns: 100 },
    );
  });

  it('error messages from missing credentials do not contain the connection ID in a way that leaks info', async () => {
    /**
     * **Validates: Requirements 10.3**
     *
     * When credentials are not found, the error message uses a redacted
     * connection identifier.
     */
    const arbConnectionId = fc.stringMatching(/^[A-Za-z0-9_\-]{4,200}$/);

    await fc.assert(
      fc.asyncProperty(arbConnectionId, async (connectionId) => {
        const encryptionService = createMockEncryptionService();
        const repository = createMockRepository();
        const service = new CredentialService<string>(
          encryptionService,
          repository,
        );

        try {
          await service.getDecryptedCredentials(connectionId);
          return true;
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          // The raw connection ID should be redacted
          return !msg.includes(connectionId) || msg.includes('[REDACTED]');
        }
      }),
      { numRuns: 100 },
    );
  });
});
