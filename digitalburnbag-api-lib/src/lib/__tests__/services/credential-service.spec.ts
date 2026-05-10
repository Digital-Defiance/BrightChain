/**
 * Unit tests for CredentialService.
 *
 * Feature: canary-provider-system
 * Requirements: 10.2, 10.4
 */
import type { IProviderCredentials } from '@brightchain/digitalburnbag-lib';
import {
  CredentialService,
  EncryptedCredentialData,
  ICredentialRepository,
  IEncryptionService,
} from '../../services/credential-service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockEncryptionService(): IEncryptionService {
  return {
    async encrypt(plaintext: string) {
      const encoded = Buffer.from(plaintext, 'utf-8').toString('base64');
      const iv = Buffer.from('mock-iv').toString('base64');
      const authTag = Buffer.from('mock-tag').toString('base64');
      return { ciphertext: encoded, iv, authTag };
    },
    async decrypt(ciphertext: string, _iv: string, _authTag: string) {
      return Buffer.from(ciphertext, 'base64').toString('utf-8');
    },
  };
}

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

function makeCredentials(
  overrides?: Partial<IProviderCredentials<string>>,
): IProviderCredentials<string> {
  return {
    userId: 'user-1',
    providerId: 'provider-1',
    accessToken: 'access-token-secret-123',
    refreshToken: 'refresh-token-secret-456',
    apiKey: 'api-key-secret-789',
    isValid: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CredentialService', () => {
  // Req 10.4: Credential deletion removes all data on disconnect
  describe('credential deletion on disconnect (Req 10.4)', () => {
    it('should permanently delete all credential data for a connection', async () => {
      const encryptionService = createMockEncryptionService();
      const repository = createMockRepository();
      const service = new CredentialService<string>(
        encryptionService,
        repository,
      );

      const credentials = makeCredentials();
      await service.storeCredentials(credentials);

      const connectionId = 'user-1:provider-1';
      // Verify credentials exist
      const stored = await repository.get(connectionId);
      expect(stored).not.toBeNull();

      // Delete credentials
      await service.deleteCredentials(connectionId);

      // Verify credentials are gone
      const deleted = await repository.get(connectionId);
      expect(deleted).toBeNull();
    });

    it('should not throw when deleting non-existent credentials', async () => {
      const encryptionService = createMockEncryptionService();
      const repository = createMockRepository();
      const service = new CredentialService<string>(
        encryptionService,
        repository,
      );

      await expect(
        service.deleteCredentials('non-existent-connection'),
      ).resolves.not.toThrow();
    });

    it('should make credentials unrecoverable after deletion', async () => {
      const encryptionService = createMockEncryptionService();
      const repository = createMockRepository();
      const service = new CredentialService<string>(
        encryptionService,
        repository,
      );

      await service.storeCredentials(makeCredentials());
      const connectionId = 'user-1:provider-1';

      await service.deleteCredentials(connectionId);

      await expect(
        service.getDecryptedCredentials(connectionId),
      ).rejects.toThrow();
    });
  });

  // Req 10.2: Decrypt-before-call, clear-after-call lifecycle
  describe('decrypt-before-call, clear-after-call lifecycle (Req 10.2)', () => {
    it('should decrypt credentials in-memory and return plaintext values', async () => {
      const encryptionService = createMockEncryptionService();
      const repository = createMockRepository();
      const service = new CredentialService<string>(
        encryptionService,
        repository,
      );

      const credentials = makeCredentials();
      await service.storeCredentials(credentials);

      const connectionId = 'user-1:provider-1';
      const decrypted = await service.getDecryptedCredentials(connectionId);

      expect(decrypted.accessToken).toBe('access-token-secret-123');
      expect(decrypted.refreshToken).toBe('refresh-token-secret-456');
      expect(decrypted.apiKey).toBe('api-key-secret-789');
    });

    it('should store credentials in encrypted form, not plaintext', async () => {
      const encryptionService = createMockEncryptionService();
      const repository = createMockRepository();
      const service = new CredentialService<string>(
        encryptionService,
        repository,
      );

      const credentials = makeCredentials();
      await service.storeCredentials(credentials);

      const connectionId = 'user-1:provider-1';
      const stored = await repository.get(connectionId);

      // The stored data should NOT contain plaintext tokens
      expect(stored).not.toBeNull();
      expect(stored!.encryptedAccessToken).toBeDefined();
      expect(stored!.encryptedAccessToken).not.toBe('access-token-secret-123');
      expect(stored!.encryptedRefreshToken).toBeDefined();
      expect(stored!.encryptedRefreshToken).not.toBe(
        'refresh-token-secret-456',
      );
      expect(stored!.encryptedApiKey).toBeDefined();
      expect(stored!.encryptedApiKey).not.toBe('api-key-secret-789');
    });

    it('should preserve non-sensitive metadata through store/retrieve cycle', async () => {
      const encryptionService = createMockEncryptionService();
      const repository = createMockRepository();
      const service = new CredentialService<string>(
        encryptionService,
        repository,
      );

      const credentials = makeCredentials({
        providerUserId: 'ext-user-42',
        providerUsername: 'johndoe',
        tokenExpiresAt: new Date('2025-06-01T00:00:00Z'),
      });
      await service.storeCredentials(credentials);

      const connectionId = 'user-1:provider-1';
      const decrypted = await service.getDecryptedCredentials(connectionId);

      expect(decrypted.providerUserId).toBe('ext-user-42');
      expect(decrypted.providerUsername).toBe('johndoe');
      expect(decrypted.tokenExpiresAt).toEqual(
        new Date('2025-06-01T00:00:00Z'),
      );
    });
  });

  // Credential freshness validation
  describe('validateCredentialFreshness', () => {
    it('should return valid=true when token has not expired', async () => {
      const encryptionService = createMockEncryptionService();
      const repository = createMockRepository();
      const service = new CredentialService<string>(
        encryptionService,
        repository,
      );

      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
      await service.storeCredentials(
        makeCredentials({ tokenExpiresAt: futureDate }),
      );

      const result =
        await service.validateCredentialFreshness('user-1:provider-1');
      expect(result.valid).toBe(true);
      expect(result.expiresInMs).toBeGreaterThan(0);
    });

    it('should return valid=false when token has expired', async () => {
      const encryptionService = createMockEncryptionService();
      const repository = createMockRepository();
      const service = new CredentialService<string>(
        encryptionService,
        repository,
      );

      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
      await service.storeCredentials(
        makeCredentials({ tokenExpiresAt: pastDate }),
      );

      const result =
        await service.validateCredentialFreshness('user-1:provider-1');
      expect(result.valid).toBe(false);
      expect(result.expiresInMs).toBe(0);
    });

    it('should return valid=true when no expiry is set (e.g. API key)', async () => {
      const encryptionService = createMockEncryptionService();
      const repository = createMockRepository();
      const service = new CredentialService<string>(
        encryptionService,
        repository,
      );

      await service.storeCredentials(
        makeCredentials({ tokenExpiresAt: undefined }),
      );

      const result =
        await service.validateCredentialFreshness('user-1:provider-1');
      expect(result.valid).toBe(true);
    });

    it('should return valid=false when credentials do not exist', async () => {
      const encryptionService = createMockEncryptionService();
      const repository = createMockRepository();
      const service = new CredentialService<string>(
        encryptionService,
        repository,
      );

      const result = await service.validateCredentialFreshness('non-existent');
      expect(result.valid).toBe(false);
    });
  });
});
