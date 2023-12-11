/**
 * Unit tests for KeyStoreController.
 *
 * Tests all REST endpoints with mocked KeyStoreService, GpgKeyManager,
 * and SmimeCertificateManager.
 *
 * @see Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 6.1, 6.2, 6.3, 10.3, 13.1, 13.2
 */
import 'reflect-metadata';

import {
  IGpgKeyMetadata,
  IKeyStoreEntry,
  ISmimeCertificateMetadata,
  MessageEncryptionScheme,
} from '@brightchain/brightchain-lib';
import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';
import { IBrightChainApplication } from '../../interfaces';
import { KeyStoreController } from './keyStore';

// ─── Types ───────────────────────────────────────────────────────────────────

interface KeyStoreControllerHandlers {
  handlers: {
    generateGpgKeyPair: (req: unknown) => Promise<{
      statusCode: number;
      response: IApiMessageResponse;
    }>;
    importGpgPublicKey: (req: unknown) => Promise<{
      statusCode: number;
      response: IApiMessageResponse;
    }>;
    publishGpgKey: (req: unknown) => Promise<{
      statusCode: number;
      response: IApiMessageResponse;
    }>;
    exportGpgPublicKey: (req: unknown) => Promise<{
      statusCode: number;
      response: IApiMessageResponse;
    }>;
    deleteGpgKeyPair: (req: unknown) => Promise<{
      statusCode: number;
      response: IApiMessageResponse;
    }>;
    importSmimeCertificate: (req: unknown) => Promise<{
      statusCode: number;
      response: IApiMessageResponse;
    }>;
    getSmimeCertificate: (req: unknown) => Promise<{
      statusCode: number;
      response: IApiMessageResponse;
    }>;
    deleteSmimeCertificate: (req: unknown) => Promise<{
      statusCode: number;
      response: IApiMessageResponse;
    }>;
    resolveKeys: (req: unknown) => Promise<{
      statusCode: number;
      response: IApiMessageResponse;
    }>;
    setPreference: (req: unknown) => Promise<{
      statusCode: number;
      response: IApiMessageResponse;
    }>;
    getPreference: (req: unknown) => Promise<{
      statusCode: number;
      response: IApiMessageResponse;
    }>;
  };
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const mockGpgMetadata: IGpgKeyMetadata = {
  keyId: 'ABCD1234EFGH5678',
  fingerprint: 'ABCD1234EFGH5678ABCD1234EFGH5678ABCD1234',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  expiresAt: null,
  userId: 'Test User <test@example.com>',
  algorithm: 'rsa4096',
};

const mockGpgEntry: IKeyStoreEntry<string> = {
  id: 'entry-gpg-1',
  userId: 'user-1',
  type: 'gpg_keypair',
  associatedEmail: 'test@example.com',
  publicMaterial:
    '-----BEGIN PGP PUBLIC KEY BLOCK-----\nmock\n-----END PGP PUBLIC KEY BLOCK-----',
  privateMaterial:
    '-----BEGIN PGP PRIVATE KEY BLOCK-----\nmock\n-----END PGP PRIVATE KEY BLOCK-----',
  metadata: mockGpgMetadata,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
};

const mockSmimeMetadata: ISmimeCertificateMetadata = {
  subject: 'CN=Test User, O=Example Corp',
  issuer: 'CN=Example CA',
  serialNumber: '01AB',
  validFrom: new Date('2025-01-01T00:00:00Z'),
  validTo: new Date('2026-01-01T00:00:00Z'),
  emailAddresses: ['test@example.com'],
  fingerprint: 'aabbccdd',
  isExpired: false,
};

const mockSmimeEntry: IKeyStoreEntry<string> = {
  id: 'entry-smime-1',
  userId: 'user-1',
  type: 'smime_bundle',
  associatedEmail: 'test@example.com',
  publicMaterial:
    '-----BEGIN CERTIFICATE-----\nmock\n-----END CERTIFICATE-----',
  metadata: mockSmimeMetadata,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
};

// ─── Mock Factories ──────────────────────────────────────────────────────────

function createMockKeyStore() {
  return {
    storeGpgKeyPair: jest.fn(async () => mockGpgEntry),
    storeGpgPublicKey: jest.fn(async () => ({
      ...mockGpgEntry,
      type: 'gpg_public' as const,
    })),
    getGpgKeyPair: jest.fn(async () => mockGpgEntry),
    getGpgPublicKey: jest.fn(async () => null),
    deleteGpgKeyPair: jest.fn(async () => undefined),
    storeSmimeCertificate: jest.fn(async () => mockSmimeEntry),
    storeSmimeContactCert: jest.fn(async () => mockSmimeEntry),
    getSmimeCertificate: jest.fn(async () => mockSmimeEntry),
    getSmimeContactCert: jest.fn(async () => null),
    deleteSmimeCertificate: jest.fn(async () => undefined),
    setEncryptionPreference: jest.fn(async () => undefined),
    getEncryptionPreference: jest.fn(async () => ({
      userId: 'user-1',
      scheme: MessageEncryptionScheme.GPG,
    })),
    getKeysForEmail: jest.fn(async () => [mockGpgEntry, mockSmimeEntry]),
  };
}

function createMockGpgKeyManager() {
  return {
    generateKeyPair: jest.fn(async () => ({
      publicKeyArmored: mockGpgEntry.publicMaterial,
      privateKeyArmored:
        '-----BEGIN PGP PRIVATE KEY BLOCK-----\nmock\n-----END PGP PRIVATE KEY BLOCK-----',
      metadata: mockGpgMetadata,
    })),
    importPublicKey: jest.fn(async () => mockGpgMetadata),
    exportPublicKey: jest.fn(async (key: string) => key),
    validatePublicKey: jest.fn(() => true),
    publishToKeyserver: jest.fn(async () => undefined),
    searchKeyserver: jest.fn(async () => []),
    encrypt: jest.fn(),
    decrypt: jest.fn(),
    sign: jest.fn(),
    verify: jest.fn(),
  };
}

function createMockSmimeCertManager() {
  return {
    importCertificate: jest.fn(async () => mockSmimeMetadata),
    importPkcs12: jest.fn(async () => ({
      certificatePem: mockSmimeEntry.publicMaterial,
      privateKeyPem:
        '-----BEGIN PRIVATE KEY-----\nmock\n-----END PRIVATE KEY-----',
      metadata: mockSmimeMetadata,
    })),
    exportCertificatePem: jest.fn(async (pem: string) => pem),
    validateCertificate: jest.fn(() => true),
    encrypt: jest.fn(),
    decrypt: jest.fn(),
    sign: jest.fn(),
    verify: jest.fn(),
  };
}

function createMockApplication(): IBrightChainApplication {
  return {
    db: { connection: { readyState: 1 } },
    environment: { mongo: { useTransactions: false }, debug: false },
    constants: {},
    ready: true,
    services: { get: () => undefined },
    plugins: {},
    getModel: () => {
      throw new Error('not implemented');
    },
    getController: () => {
      throw new Error('not implemented');
    },
    setController: () => {},
    start: async () => {},
  } as unknown as IBrightChainApplication;
}

function createController() {
  const keyStore = createMockKeyStore();
  const gpgKeyManager = createMockGpgKeyManager();
  const smimeCertManager = createMockSmimeCertManager();
  const app = createMockApplication();
  const controller = new KeyStoreController(app);

  controller.setKeyStore(keyStore as never);
  controller.setGpgKeyManager(gpgKeyManager as never);
  controller.setSmimeCertificateManager(smimeCertManager as never);

  return {
    controller,
    keyStore,
    gpgKeyManager,
    smimeCertManager,
    handlers: (controller as unknown as KeyStoreControllerHandlers).handlers,
  };
}

function authReq(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: 'user-1', email: 'test@example.com' },
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('KeyStoreController', () => {
  // ── GPG keypair generation ─────────────────────────────────────────

  describe('POST /gpg/generate', () => {
    it('generates a GPG keypair and returns 201', async () => {
      const { handlers, gpgKeyManager, keyStore } = createController();
      const result = await handlers.generateGpgKeyPair(
        authReq({ body: { passphrase: 'test-pass' } }),
      );

      expect(result.statusCode).toBe(201);
      expect(result.response.message).toBe(
        'GPG keypair generated successfully',
      );
      expect(gpgKeyManager.generateKeyPair).toHaveBeenCalledWith(
        'test',
        'test@example.com',
        'test-pass',
      );
      expect(keyStore.storeGpgKeyPair).toHaveBeenCalled();
    });

    it('returns validation error when passphrase is missing', async () => {
      const { handlers } = createController();
      const result = await handlers.generateGpgKeyPair(authReq({ body: {} }));

      expect(result.statusCode).toBe(400);
    });

    it('does not return private material in response', async () => {
      const { handlers } = createController();
      const result = await handlers.generateGpgKeyPair(
        authReq({ body: { passphrase: 'test-pass' } }),
      );

      expect(result.statusCode).toBe(201);
      const body = result.response as Record<string, unknown>;
      expect(body['privateMaterial']).toBeUndefined();
    });
  });

  // ── GPG public key import ──────────────────────────────────────────

  describe('POST /gpg/import', () => {
    it('imports a GPG public key and returns 201', async () => {
      const { handlers, gpgKeyManager, keyStore } = createController();
      const armoredKey =
        '-----BEGIN PGP PUBLIC KEY BLOCK-----\ntest\n-----END PGP PUBLIC KEY BLOCK-----';
      const result = await handlers.importGpgPublicKey(
        authReq({ body: { armoredKey } }),
      );

      expect(result.statusCode).toBe(201);
      expect(result.response.message).toBe(
        'GPG public key imported successfully',
      );
      expect(gpgKeyManager.importPublicKey).toHaveBeenCalledWith(armoredKey);
      expect(keyStore.storeGpgPublicKey).toHaveBeenCalled();
    });

    it('returns validation error when armoredKey is missing', async () => {
      const { handlers } = createController();
      const result = await handlers.importGpgPublicKey(authReq({ body: {} }));

      expect(result.statusCode).toBe(400);
    });
  });

  // ── GPG public key export ──────────────────────────────────────────

  describe('GET /gpg/export', () => {
    it('exports the GPG public key', async () => {
      const { handlers } = createController();
      const result = await handlers.exportGpgPublicKey(authReq());

      expect(result.statusCode).toBe(200);
      const body = result.response as Record<string, unknown>;
      expect(body['publicKeyArmored']).toBe(mockGpgEntry.publicMaterial);
    });

    it('returns 404 when no keypair exists', async () => {
      const { handlers, keyStore } = createController();
      keyStore.getGpgKeyPair.mockResolvedValueOnce(null);
      const result = await handlers.exportGpgPublicKey(authReq());

      expect(result.statusCode).toBe(404);
    });
  });

  // ── GPG keypair deletion ────────────────────────────────────────────

  describe('DELETE /gpg', () => {
    it('deletes the GPG keypair', async () => {
      const { handlers, keyStore } = createController();
      const result = await handlers.deleteGpgKeyPair(authReq());

      expect(result.statusCode).toBe(200);
      expect(result.response.message).toBe('GPG keypair deleted');
      expect(keyStore.deleteGpgKeyPair).toHaveBeenCalledWith('user-1');
    });
  });

  // ── GPG publish ────────────────────────────────────────────────────

  describe('POST /gpg/publish', () => {
    it('publishes the GPG public key to keyserver', async () => {
      const { handlers, gpgKeyManager } = createController();
      const result = await handlers.publishGpgKey(authReq());

      expect(result.statusCode).toBe(200);
      expect(result.response.message).toBe(
        'GPG public key published to keyserver',
      );
      expect(gpgKeyManager.publishToKeyserver).toHaveBeenCalledWith(
        mockGpgEntry.publicMaterial,
        'https://keys.openpgp.org',
      );
    });

    it('returns 404 when no keypair exists', async () => {
      const { handlers, keyStore } = createController();
      keyStore.getGpgKeyPair.mockResolvedValueOnce(null);
      const result = await handlers.publishGpgKey(authReq());

      expect(result.statusCode).toBe(404);
    });
  });

  // ── S/MIME certificate import (PEM) ────────────────────────────────

  describe('POST /smime/import', () => {
    it('imports an S/MIME certificate from PEM', async () => {
      const { handlers, smimeCertManager, keyStore } = createController();
      const result = await handlers.importSmimeCertificate(
        authReq({
          body: {
            certificatePem:
              '-----BEGIN CERTIFICATE-----\ntest\n-----END CERTIFICATE-----',
          },
        }),
      );

      expect(result.statusCode).toBe(201);
      expect(result.response.message).toBe('S/MIME certificate imported');
      expect(smimeCertManager.importCertificate).toHaveBeenCalled();
      expect(keyStore.storeSmimeCertificate).toHaveBeenCalled();
    });

    it('imports an S/MIME certificate from PKCS#12', async () => {
      const { handlers, smimeCertManager, keyStore } = createController();
      const result = await handlers.importSmimeCertificate(
        authReq({
          body: {
            pkcs12Base64: Buffer.from('mock-pkcs12').toString('base64'),
            password: 'test-password',
            format: 'pkcs12',
          },
        }),
      );

      expect(result.statusCode).toBe(201);
      expect(result.response.message).toBe(
        'S/MIME certificate imported from PKCS#12',
      );
      expect(smimeCertManager.importPkcs12).toHaveBeenCalled();
      expect(keyStore.storeSmimeCertificate).toHaveBeenCalled();
    });

    it('returns validation error when PKCS#12 password is missing', async () => {
      const { handlers } = createController();
      const result = await handlers.importSmimeCertificate(
        authReq({
          body: { pkcs12Base64: 'data', format: 'pkcs12' },
        }),
      );

      expect(result.statusCode).toBe(400);
    });

    it('returns validation error when no certificate data provided', async () => {
      const { handlers } = createController();
      const result = await handlers.importSmimeCertificate(
        authReq({ body: {} }),
      );

      expect(result.statusCode).toBe(400);
    });
  });

  // ── S/MIME certificate metadata retrieval ──────────────────────────

  describe('GET /smime', () => {
    it('returns S/MIME certificate metadata', async () => {
      const { handlers } = createController();
      const result = await handlers.getSmimeCertificate(authReq());

      expect(result.statusCode).toBe(200);
      const body = result.response as Record<string, unknown>;
      expect(body['type']).toBe('smime_bundle');
      expect(body['metadata']).toEqual(mockSmimeMetadata);
    });

    it('returns 404 when no certificate exists', async () => {
      const { handlers, keyStore } = createController();
      keyStore.getSmimeCertificate.mockResolvedValueOnce(null);
      const result = await handlers.getSmimeCertificate(authReq());

      expect(result.statusCode).toBe(404);
    });
  });

  // ── S/MIME certificate deletion ────────────────────────────────────

  describe('DELETE /smime', () => {
    it('deletes the S/MIME certificate', async () => {
      const { handlers, keyStore } = createController();
      const result = await handlers.deleteSmimeCertificate(authReq());

      expect(result.statusCode).toBe(200);
      expect(result.response.message).toBe('S/MIME certificate deleted');
      expect(keyStore.deleteSmimeCertificate).toHaveBeenCalledWith('user-1');
    });
  });

  // ── Key resolution ──────────────────────────────────────────────────

  describe('GET /resolve/:email', () => {
    it('resolves key availability for an email', async () => {
      const { handlers } = createController();
      const result = await handlers.resolveKeys(
        authReq({ params: { email: 'test@example.com' } }),
      );

      expect(result.statusCode).toBe(200);
      const body = result.response as Record<string, unknown>;
      expect(body['email']).toBe('test@example.com');
      expect(body['hasGpgKey']).toBe(true);
      expect(body['hasSmimeCert']).toBe(true);
      expect(body['isInternal']).toBe(true);
    });

    it('returns false availability when no keys found', async () => {
      const { handlers, keyStore } = createController();
      keyStore.getKeysForEmail.mockResolvedValueOnce([]);
      const result = await handlers.resolveKeys(
        authReq({ params: { email: 'unknown@example.com' } }),
      );

      expect(result.statusCode).toBe(200);
      const body = result.response as Record<string, unknown>;
      expect(body['hasGpgKey']).toBe(false);
      expect(body['hasSmimeCert']).toBe(false);
      expect(body['isInternal']).toBe(false);
    });

    it('returns validation error when email param is missing', async () => {
      const { handlers } = createController();
      const result = await handlers.resolveKeys(authReq({ params: {} }));

      expect(result.statusCode).toBe(400);
    });
  });

  // ── Encryption preferences ─────────────────────────────────────────

  describe('PUT /preferences', () => {
    it('sets encryption preference', async () => {
      const { handlers, keyStore } = createController();
      const result = await handlers.setPreference(
        authReq({ body: { scheme: 'gpg' } }),
      );

      expect(result.statusCode).toBe(200);
      expect(result.response.message).toBe('Encryption preference updated');
      expect(keyStore.setEncryptionPreference).toHaveBeenCalledWith({
        userId: 'user-1',
        contactEmail: undefined,
        scheme: 'gpg',
      });
    });

    it('sets per-contact encryption preference', async () => {
      const { handlers, keyStore } = createController();
      const result = await handlers.setPreference(
        authReq({ body: { scheme: 'gpg', contactEmail: 'bob@example.com' } }),
      );

      expect(result.statusCode).toBe(200);
      expect(keyStore.setEncryptionPreference).toHaveBeenCalledWith({
        userId: 'user-1',
        contactEmail: 'bob@example.com',
        scheme: 'gpg',
      });
    });

    it('rejects invalid encryption scheme values', async () => {
      const { handlers } = createController();
      const result = await handlers.setPreference(
        authReq({ body: { scheme: 'invalid_scheme' } }),
      );

      expect(result.statusCode).toBe(400);
      const body = result.response as Record<string, unknown>;
      expect(JSON.stringify(body)).toContain('Invalid encryption scheme');
    });

    it('returns validation error when scheme is missing', async () => {
      const { handlers } = createController();
      const result = await handlers.setPreference(authReq({ body: {} }));

      expect(result.statusCode).toBe(400);
    });
  });

  describe('GET /preferences', () => {
    it('returns encryption preference', async () => {
      const { handlers } = createController();
      const result = await handlers.getPreference(authReq());

      expect(result.statusCode).toBe(200);
      const body = result.response as Record<string, unknown>;
      expect(body['preference']).toEqual({
        userId: 'user-1',
        scheme: MessageEncryptionScheme.GPG,
      });
    });

    it('returns null preference when none set', async () => {
      const { handlers, keyStore } = createController();
      keyStore.getEncryptionPreference.mockResolvedValueOnce(null);
      const result = await handlers.getPreference(authReq());

      expect(result.statusCode).toBe(200);
      const body = result.response as Record<string, unknown>;
      expect(body['preference']).toBeNull();
    });

    it('passes contactEmail query param', async () => {
      const { handlers, keyStore } = createController();
      await handlers.getPreference(
        authReq({ query: { contactEmail: 'bob@example.com' } }),
      );

      expect(keyStore.getEncryptionPreference).toHaveBeenCalledWith(
        'user-1',
        'bob@example.com',
      );
    });
  });
});
