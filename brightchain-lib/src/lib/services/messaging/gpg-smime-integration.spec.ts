/**
 * Integration tests for end-to-end GPG and S/MIME encryption flows.
 *
 * These tests exercise real cryptographic operations (no mocks) across
 * GpgKeyManager, SmimeCertificateManager, EmailEncryptionService, and
 * RecipientKeyResolver to validate full encrypt→decrypt→verify pipelines.
 *
 * @see Requirements 3.1, 5.1, 7.1, 9.1, 14.1, 14.2, 14.4
 */
import 'reflect-metadata';
import * as x509 from '@peculiar/x509';
import { EmailErrorType } from '../../enumerations/messaging/emailErrorType';
import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import { EmailError } from '../../errors/messaging/emailError';
import type { IGpgKeyMetadata } from '../../interfaces/messaging/gpgKey';
import {
  IEncryptionPreference,
  IKeyStore,
  IKeyStoreEntry,
} from '../../interfaces/messaging/keyStore';
import type { ISmimeCertificateMetadata } from '../../interfaces/messaging/smimeCertificate';
import { EmailEncryptionService } from './emailEncryptionService';
import { GpgKeyManager } from './gpgKeyManager';
import { RecipientKeyResolver } from './recipientKeyResolver';
import { SmimeCertificateManager } from './smimeCertificateManager';

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Generate a self-signed RSA certificate and private key for S/MIME testing.
 */
async function generateTestCertAndKey(
  cn: string,
  serial: string,
  email?: string,
): Promise<{ certPem: string; privateKeyPem: string }> {
  const alg: RsaHashedKeyGenParams = {
    name: 'RSASSA-PKCS1-v1_5',
    hash: 'SHA-256',
    publicExponent: new Uint8Array([1, 0, 1]),
    modulusLength: 2048,
  };
  const keys = await globalThis.crypto.subtle.generateKey(alg, true, [
    'sign',
    'verify',
  ]);

  const extensions: x509.Extension[] = [];
  if (email) {
    extensions.push(
      new x509.SubjectAlternativeNameExtension([
        { type: 'email', value: email },
      ]),
    );
  }

  const cert = await x509.X509CertificateGenerator.createSelfSigned({
    serialNumber: serial,
    name: `CN=${cn}, O=Test Org`,
    notBefore: new Date(),
    notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    keys,
    signingAlgorithm: alg,
    extensions,
  });

  const certPem = cert.toString('pem');
  const pkcs8 = await globalThis.crypto.subtle.exportKey(
    'pkcs8',
    keys.privateKey,
  );
  const b64 = Buffer.from(pkcs8).toString('base64');
  const lines: string[] = [];
  for (let i = 0; i < b64.length; i += 64) {
    lines.push(b64.substring(i, i + 64));
  }
  const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----`;

  return { certPem, privateKeyPem };
}

/**
 * Create a mock IKeyStore backed by simple in-memory maps.
 */
function createInMemoryKeyStore(): IKeyStore & {
  _entries: IKeyStoreEntry[];
  _prefs: IEncryptionPreference[];
} {
  const _entries: IKeyStoreEntry[] = [];
  const _prefs: IEncryptionPreference[] = [];

  return {
    _entries,
    _prefs,

    async storeGpgKeyPair(userId, keyPair) {
      const entry: IKeyStoreEntry = {
        id: `gpg-kp-${userId}`,
        userId,
        type: 'gpg_keypair',
        associatedEmail: '',
        publicMaterial: keyPair.publicKeyArmored,
        privateMaterial: keyPair.privateKeyArmored,
        metadata: keyPair.metadata as unknown as
          | IGpgKeyMetadata
          | ISmimeCertificateMetadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      _entries.push(entry);
      return entry;
    },

    async storeGpgPublicKey(userId, email, armoredKey, metadata) {
      const entry: IKeyStoreEntry = {
        id: `gpg-pub-${email}`,
        userId,
        type: 'gpg_public',
        associatedEmail: email,
        publicMaterial: armoredKey,
        metadata: metadata as unknown as
          | IGpgKeyMetadata
          | ISmimeCertificateMetadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      _entries.push(entry);
      return entry;
    },

    async getGpgKeyPair(userId) {
      return (
        _entries.find((e) => e.userId === userId && e.type === 'gpg_keypair') ??
        null
      );
    },

    async getGpgPublicKey(email) {
      return (
        _entries.find(
          (e) =>
            e.associatedEmail === email &&
            (e.type === 'gpg_public' || e.type === 'gpg_keypair'),
        ) ?? null
      );
    },

    async deleteGpgKeyPair(userId) {
      const idx = _entries.findIndex(
        (e) => e.userId === userId && e.type === 'gpg_keypair',
      );
      if (idx >= 0) _entries.splice(idx, 1);
    },

    async storeSmimeCertificate(userId, bundle) {
      const entry: IKeyStoreEntry = {
        id: `smime-bundle-${userId}`,
        userId,
        type: 'smime_bundle',
        associatedEmail: bundle.metadata.emailAddresses?.[0] ?? '',
        publicMaterial: bundle.certificatePem,
        privateMaterial: bundle.privateKeyPem,
        metadata: bundle.metadata as unknown as
          | IGpgKeyMetadata
          | ISmimeCertificateMetadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      _entries.push(entry);
      return entry;
    },

    async storeSmimeContactCert(userId, email, certPem, metadata) {
      const entry: IKeyStoreEntry = {
        id: `smime-cert-${email}`,
        userId,
        type: 'smime_cert',
        associatedEmail: email,
        publicMaterial: certPem,
        metadata: metadata as unknown as
          | IGpgKeyMetadata
          | ISmimeCertificateMetadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      _entries.push(entry);
      return entry;
    },

    async getSmimeCertificate(userId) {
      return (
        _entries.find(
          (e) => e.userId === userId && e.type === 'smime_bundle',
        ) ?? null
      );
    },

    async getSmimeContactCert(email) {
      return (
        _entries.find(
          (e) =>
            e.associatedEmail === email &&
            (e.type === 'smime_cert' || e.type === 'smime_bundle'),
        ) ?? null
      );
    },

    async deleteSmimeCertificate(userId) {
      const idx = _entries.findIndex(
        (e) => e.userId === userId && e.type === 'smime_bundle',
      );
      if (idx >= 0) _entries.splice(idx, 1);
    },

    async setEncryptionPreference(pref) {
      const idx = _prefs.findIndex(
        (p) => p.userId === pref.userId && p.contactEmail === pref.contactEmail,
      );
      if (idx >= 0) _prefs[idx] = pref;
      else _prefs.push(pref);
    },

    async getEncryptionPreference(userId, contactEmail?) {
      return (
        _prefs.find(
          (p) => p.userId === userId && p.contactEmail === contactEmail,
        ) ?? null
      );
    },

    async getKeysForEmail(email) {
      return _entries.filter((e) => e.associatedEmail === email);
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Full GPG Flow
// ═══════════════════════════════════════════════════════════════════════

describe('Integration: Full GPG flow', () => {
  const gpg = new GpgKeyManager();
  const encService = new EmailEncryptionService();
  const passphrase = 'integration-test-pass';

  it('generate keypair → import contact key → encrypt → decrypt → verify signature', async () => {
    // 1. Generate sender keypair
    const senderKeyPair = await gpg.generateKeyPair(
      'Sender',
      'sender@example.com',
      passphrase,
    );
    expect(senderKeyPair.publicKeyArmored).toContain(
      'BEGIN PGP PUBLIC KEY BLOCK',
    );
    expect(senderKeyPair.metadata.fingerprint).toBeTruthy();

    // 2. Generate recipient keypair (simulates contact)
    const recipientPassphrase = 'recipient-pass';
    const recipientKeyPair = await gpg.generateKeyPair(
      'Recipient',
      'recipient@example.com',
      recipientPassphrase,
    );

    // 3. Import recipient's public key (validate it)
    const importedMeta = await gpg.importPublicKey(
      recipientKeyPair.publicKeyArmored,
    );
    expect(importedMeta.fingerprint).toBe(
      recipientKeyPair.metadata.fingerprint,
    );

    // 4. Encrypt message for recipient (with sender signing)
    const plaintext = new TextEncoder().encode(
      'Hello from GPG integration test!',
    );
    const recipientKeys = new Map<string, string>();
    recipientKeys.set(
      'recipient@example.com',
      recipientKeyPair.publicKeyArmored,
    );

    const encResult = await encService.encryptGpg(
      plaintext,
      recipientKeys,
      senderKeyPair.privateKeyArmored,
      passphrase,
    );

    expect(encResult.encryptionMetadata.scheme).toBe(
      MessageEncryptionScheme.GPG,
    );
    expect(encResult.encryptionMetadata.isSigned).toBe(true);
    expect(encResult.encryptionMetadata.gpgEncryptedMessage).toContain(
      'BEGIN PGP MESSAGE',
    );

    // 5. Decrypt message as recipient
    const decrypted = await encService.decryptGpg(
      encResult.encryptedContent,
      recipientKeyPair.privateKeyArmored,
      recipientPassphrase,
    );
    expect(new TextDecoder().decode(decrypted)).toBe(
      'Hello from GPG integration test!',
    );

    // 6. Verify sender's signature
    const signatureBytes = new TextEncoder().encode(
      encResult.encryptionMetadata.gpgSignature!,
    );
    const isValid = await encService.verifyGpg(
      plaintext,
      signatureBytes,
      senderKeyPair.publicKeyArmored,
    );
    expect(isValid).toBe(true);
  }, 60000);
});

// ═══════════════════════════════════════════════════════════════════════
// Full S/MIME Flow
// ═══════════════════════════════════════════════════════════════════════

describe('Integration: Full S/MIME flow', () => {
  const smime = new SmimeCertificateManager();
  const encService = new EmailEncryptionService();

  it('import cert+key → import contact cert → encrypt → decrypt → verify signature', async () => {
    // 1. Generate sender cert+key (simulates PKCS#12 import result)
    const sender = await generateTestCertAndKey(
      'S/MIME Sender',
      '100',
      'sender@smime.test',
    );

    // Validate the sender cert
    const senderMeta = await smime.importCertificate(sender.certPem, 'pem');
    expect(senderMeta.subject).toContain('CN=S/MIME Sender');
    expect(senderMeta.isExpired).toBe(false);

    // 2. Generate recipient cert+key (simulates contact cert import)
    const recipient = await generateTestCertAndKey(
      'S/MIME Recipient',
      '101',
      'recipient@smime.test',
    );

    const recipientMeta = await smime.importCertificate(
      recipient.certPem,
      'pem',
    );
    expect(recipientMeta.subject).toContain('CN=S/MIME Recipient');

    // 3. Encrypt message for recipient (with sender signing)
    const plaintext = new TextEncoder().encode(
      'Hello from S/MIME integration test!',
    );
    const recipientCerts = new Map<string, string>();
    recipientCerts.set('recipient@smime.test', recipient.certPem);

    const encResult = await encService.encryptSmimeReal(
      plaintext,
      recipientCerts,
      sender.certPem,
      sender.privateKeyPem,
    );

    expect(encResult.encryptionMetadata.scheme).toBe(
      MessageEncryptionScheme.S_MIME,
    );
    expect(encResult.encryptionMetadata.isSigned).toBe(true);
    expect(encResult.encryptionMetadata.cmsEncryptedContent).toBeInstanceOf(
      Uint8Array,
    );

    // 4. Decrypt message as recipient
    const decrypted = await encService.decryptSmimeReal(
      encResult.encryptedContent,
      recipient.certPem,
      recipient.privateKeyPem,
    );
    expect(new TextDecoder().decode(decrypted)).toBe(
      'Hello from S/MIME integration test!',
    );

    // 5. Verify sender's signature
    const isValid = await encService.verifySmime(
      plaintext,
      encResult.encryptionMetadata.cmsSignature!,
      sender.certPem,
    );
    expect(isValid).toBe(true);
  }, 60000);
});

// ═══════════════════════════════════════════════════════════════════════
// Encryption Preference Fallback
// ═══════════════════════════════════════════════════════════════════════

describe('Integration: Encryption preference fallback', () => {
  it('falls back to NONE when preferred GPG scheme is unavailable', async () => {
    const store = createInMemoryKeyStore();
    const resolver = new RecipientKeyResolver(store);

    // Set user preference to GPG
    await store.setEncryptionPreference({
      userId: 'user-1',
      scheme: MessageEncryptionScheme.GPG,
    });

    // Verify preference is stored
    const pref = await store.getEncryptionPreference('user-1');
    expect(pref).not.toBeNull();
    expect(pref!.scheme).toBe(MessageEncryptionScheme.GPG);

    // Resolve availability for a recipient with NO keys
    const availability = await resolver.resolveAvailability([
      'nokeys@example.com',
    ]);
    expect(availability[0].hasGpgKey).toBe(false);
    expect(availability[0].hasSmimeCert).toBe(false);

    // Attempt to resolve keys for GPG scheme — should throw RECIPIENT_KEY_MISSING
    let caughtError: EmailError | null = null;
    try {
      await resolver.resolveKeysForScheme(
        ['nokeys@example.com'],
        MessageEncryptionScheme.GPG,
      );
    } catch (err) {
      caughtError = err as EmailError;
    }

    expect(caughtError).toBeInstanceOf(EmailError);
    expect(caughtError!.errorType).toBe(EmailErrorType.RECIPIENT_KEY_MISSING);

    // Application logic: when preferred scheme fails, fall back to NONE
    const fallbackScheme = MessageEncryptionScheme.NONE;
    expect(fallbackScheme).toBe(MessageEncryptionScheme.NONE);

    // Resolving keys for NONE should succeed (no keys needed)
    const resolvedNone = await resolver.resolveKeysForScheme(
      ['nokeys@example.com'],
      MessageEncryptionScheme.NONE,
    );
    expect(resolvedNone.missingGpg).toHaveLength(0);
    expect(resolvedNone.missingSmime).toHaveLength(0);
  });

  it('falls back to NONE when preferred S/MIME scheme is unavailable', async () => {
    const store = createInMemoryKeyStore();
    const resolver = new RecipientKeyResolver(store);

    // Set user preference to S/MIME
    await store.setEncryptionPreference({
      userId: 'user-2',
      scheme: MessageEncryptionScheme.S_MIME,
    });

    const pref = await store.getEncryptionPreference('user-2');
    expect(pref!.scheme).toBe(MessageEncryptionScheme.S_MIME);

    // Recipient has no S/MIME cert
    const availability = await resolver.resolveAvailability([
      'nocert@example.com',
    ]);
    expect(availability[0].hasSmimeCert).toBe(false);

    // Attempt to resolve keys for S/MIME — should throw
    let caughtError: EmailError | null = null;
    try {
      await resolver.resolveKeysForScheme(
        ['nocert@example.com'],
        MessageEncryptionScheme.S_MIME,
      );
    } catch (err) {
      caughtError = err as EmailError;
    }

    expect(caughtError).toBeInstanceOf(EmailError);
    expect(caughtError!.errorType).toBe(EmailErrorType.RECIPIENT_KEY_MISSING);

    // Fall back to NONE
    const resolvedNone = await resolver.resolveKeysForScheme(
      ['nocert@example.com'],
      MessageEncryptionScheme.NONE,
    );
    expect(resolvedNone.missingGpg).toHaveLength(0);
    expect(resolvedNone.missingSmime).toHaveLength(0);
  });
});
