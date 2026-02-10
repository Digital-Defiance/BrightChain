/**
 * Unit tests for GitSigningService.
 *
 * Tests Git commit/tag signing, verification, and public key export.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { GitSigningError, GitSigningService } from './gitSigningService';

// ─── Test fixtures ──────────────────────────────────────────────────────────

const TEST_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon ' +
  'abandon abandon abandon abandon abandon abandon abandon abandon ' +
  'abandon abandon abandon abandon abandon abandon abandon art';

const SAMPLE_COMMIT = `tree 4b825dc642cb6eb9a060e54bf899d69f82c3b3e8
author Alice <alice@example.com> 1700000000 +0000
committer Alice <alice@example.com> 1700000000 +0000

Initial commit`;

const SAMPLE_TAG = `object abc123def456
type commit
tag v1.0.0
tagger Alice <alice@example.com> 1700000000 +0000

Release v1.0.0`;

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('GitSigningService', () => {
  describe('signCommit', () => {
    it('should produce a PGP-armored signature', () => {
      const result = GitSigningService.signCommit(TEST_MNEMONIC, SAMPLE_COMMIT);

      expect(result.armoredSignature).toContain(
        '-----BEGIN PGP SIGNATURE-----',
      );
      expect(result.armoredSignature).toContain('-----END PGP SIGNATURE-----');
      expect(result.signatureHex).toBeTruthy();
      expect(result.contentHashHex).toBeTruthy();
      expect(result.derivationPath).toBe("m/44'/60'/0'/2/0");
    });

    it('should produce deterministic signatures', () => {
      const sig1 = GitSigningService.signCommit(TEST_MNEMONIC, SAMPLE_COMMIT);
      const sig2 = GitSigningService.signCommit(TEST_MNEMONIC, SAMPLE_COMMIT);

      expect(sig1.signatureHex).toBe(sig2.signatureHex);
      expect(sig1.contentHashHex).toBe(sig2.contentHashHex);
    });

    it('should produce different signatures for different content', () => {
      const sig1 = GitSigningService.signCommit(TEST_MNEMONIC, 'Commit A');
      const sig2 = GitSigningService.signCommit(TEST_MNEMONIC, 'Commit B');

      expect(sig1.signatureHex).not.toBe(sig2.signatureHex);
    });

    it('should throw GitSigningError for invalid mnemonic', () => {
      expect(() =>
        GitSigningService.signCommit('bad mnemonic', SAMPLE_COMMIT),
      ).toThrow(GitSigningError);
    });
  });

  describe('signTag', () => {
    it('should produce a PGP-armored signature for tags', () => {
      const result = GitSigningService.signTag(TEST_MNEMONIC, SAMPLE_TAG);

      expect(result.armoredSignature).toContain(
        '-----BEGIN PGP SIGNATURE-----',
      );
      expect(result.signatureHex).toBeTruthy();
    });

    it('should produce different signatures than commit signing', () => {
      const commitSig = GitSigningService.signCommit(
        TEST_MNEMONIC,
        SAMPLE_COMMIT,
      );
      const tagSig = GitSigningService.signTag(TEST_MNEMONIC, SAMPLE_TAG);

      expect(commitSig.signatureHex).not.toBe(tagSig.signatureHex);
    });
  });

  describe('verify', () => {
    it('should verify a valid commit signature', () => {
      const sig = GitSigningService.signCommit(TEST_MNEMONIC, SAMPLE_COMMIT);
      const valid = GitSigningService.verify(SAMPLE_COMMIT, sig, TEST_MNEMONIC);

      expect(valid).toBe(true);
    });

    it('should verify a valid tag signature', () => {
      const sig = GitSigningService.signTag(TEST_MNEMONIC, SAMPLE_TAG);
      const valid = GitSigningService.verify(SAMPLE_TAG, sig, TEST_MNEMONIC);

      expect(valid).toBe(true);
    });

    it('should reject a signature with tampered content', () => {
      const sig = GitSigningService.signCommit(TEST_MNEMONIC, SAMPLE_COMMIT);
      const valid = GitSigningService.verify(
        'tampered content',
        sig,
        TEST_MNEMONIC,
      );

      expect(valid).toBe(false);
    });

    it('should reject a signature with wrong key', () => {
      const otherMnemonic =
        'zoo zoo zoo zoo zoo zoo zoo zoo ' +
        'zoo zoo zoo zoo zoo zoo zoo zoo ' +
        'zoo zoo zoo zoo zoo zoo zoo vote';

      const sig = GitSigningService.signCommit(TEST_MNEMONIC, SAMPLE_COMMIT);
      const valid = GitSigningService.verify(SAMPLE_COMMIT, sig, otherMnemonic);

      expect(valid).toBe(false);
    });
  });

  describe('verifyWithPublicKey', () => {
    it('should verify using an exported public key', () => {
      const sig = GitSigningService.signCommit(TEST_MNEMONIC, SAMPLE_COMMIT);
      const pubKey = GitSigningService.exportPublicKey(TEST_MNEMONIC);

      const valid = GitSigningService.verifyWithPublicKey(
        SAMPLE_COMMIT,
        sig,
        pubKey.publicKeyHex,
      );

      expect(valid).toBe(true);
    });

    it('should reject with wrong public key', () => {
      const otherMnemonic =
        'zoo zoo zoo zoo zoo zoo zoo zoo ' +
        'zoo zoo zoo zoo zoo zoo zoo zoo ' +
        'zoo zoo zoo zoo zoo zoo zoo vote';

      const sig = GitSigningService.signCommit(TEST_MNEMONIC, SAMPLE_COMMIT);
      const wrongPubKey = GitSigningService.exportPublicKey(otherMnemonic);

      const valid = GitSigningService.verifyWithPublicKey(
        SAMPLE_COMMIT,
        sig,
        wrongPubKey.publicKeyHex,
      );

      expect(valid).toBe(false);
    });
  });

  describe('exportPublicKey', () => {
    it('should export a PGP-armored public key', () => {
      const result = GitSigningService.exportPublicKey(TEST_MNEMONIC);

      expect(result.armoredPublicKey).toContain(
        '-----BEGIN PGP PUBLIC KEY BLOCK-----',
      );
      expect(result.armoredPublicKey).toContain(
        '-----END PGP PUBLIC KEY BLOCK-----',
      );
      expect(result.publicKeyHex).toBeTruthy();
      expect(result.publicKeyHex.length).toBe(66); // 33 bytes compressed
      expect(result.fingerprint).toBeTruthy();
      expect(result.fingerprint.length).toBe(40); // 20 bytes
      expect(result.derivationPath).toBe("m/44'/60'/0'/2/0");
    });

    it('should produce deterministic exports', () => {
      const key1 = GitSigningService.exportPublicKey(TEST_MNEMONIC);
      const key2 = GitSigningService.exportPublicKey(TEST_MNEMONIC);

      expect(key1.publicKeyHex).toBe(key2.publicKeyHex);
      expect(key1.fingerprint).toBe(key2.fingerprint);
    });

    it('should produce different keys for different mnemonics', () => {
      const otherMnemonic =
        'zoo zoo zoo zoo zoo zoo zoo zoo ' +
        'zoo zoo zoo zoo zoo zoo zoo zoo ' +
        'zoo zoo zoo zoo zoo zoo zoo vote';

      const key1 = GitSigningService.exportPublicKey(TEST_MNEMONIC);
      const key2 = GitSigningService.exportPublicKey(otherMnemonic);

      expect(key1.publicKeyHex).not.toBe(key2.publicKeyHex);
      expect(key1.fingerprint).not.toBe(key2.fingerprint);
    });

    it('should throw GitSigningError for invalid mnemonic', () => {
      expect(() => GitSigningService.exportPublicKey('bad mnemonic')).toThrow(
        GitSigningError,
      );
    });
  });
});
