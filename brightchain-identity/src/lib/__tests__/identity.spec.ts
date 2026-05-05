import { ECIESService, Member } from '@digitaldefiance/node-ecies-lib';
import { MemberType, SecureString } from '@digitaldefiance/ecies-lib';

import { BrightChainIdentityError } from '../errors';
import { BrightChainIdentity } from '../identity';

const NAME = 'Ada Lovelace';
const EMAIL = 'ada@example.com';

describe('BrightChainIdentity', () => {
  describe('create', () => {
    it('returns member, mnemonic, and a JSON-safe descriptor', () => {
      const bundle = BrightChainIdentity.create(NAME, EMAIL);
      try {
        expect(bundle.member).toBeInstanceOf(Member);
        expect(bundle.mnemonic).toBeInstanceOf(SecureString);
        expect(bundle.identity.displayName).toBe(NAME);
        expect(bundle.identity.email).toBe(EMAIL);
        // compressed secp256k1 public key: 02/03 prefix + 32 bytes = 33 bytes => 66 hex chars
        expect(bundle.identity.publicKeyHex).toMatch(/^0[23][0-9a-f]{64}$/);
        expect(bundle.identity.id).toBeDefined();
      } finally {
        bundle.member.dispose();
      }
    });

    it('throws BrightChainIdentityError for empty name', () => {
      expect(() => BrightChainIdentity.create('', EMAIL)).toThrow(
        BrightChainIdentityError,
      );
    });

    it('throws BrightChainIdentityError for empty email', () => {
      expect(() => BrightChainIdentity.create(NAME, '')).toThrow(
        BrightChainIdentityError,
      );
    });

    it('honors a caller-supplied ECIESService', () => {
      const ecies = new ECIESService();
      const bundle = BrightChainIdentity.create(NAME, EMAIL, {
        eciesService: ecies,
      });
      try {
        expect(bundle.identity.publicKeyHex).toMatch(/^0[23][0-9a-f]{64}$/);
      } finally {
        bundle.member.dispose();
      }
    });

    it('honors a caller-supplied memberType', () => {
      const bundle = BrightChainIdentity.create(NAME, EMAIL, {
        memberType: MemberType.System,
      });
      try {
        expect(bundle.member.type).toBe(MemberType.System);
      } finally {
        bundle.member.dispose();
      }
    });
  });

  describe('fromMnemonic', () => {
    it('round-trips: create -> fromMnemonic yields identical public key', () => {
      // NOTE: member.id is freshly minted on each construction (not derived
      // from the mnemonic), so we only assert the deterministic public key.
      const created = BrightChainIdentity.create(NAME, EMAIL);
      const mnemonic = created.mnemonic;
      const originalPubKey = created.identity.publicKeyHex;
      created.member.dispose();

      const restored = BrightChainIdentity.fromMnemonic(mnemonic, NAME, EMAIL);
      try {
        expect(restored.identity.publicKeyHex).toBe(originalPubKey);
        expect(restored.identity.displayName).toBe(NAME);
        expect(restored.identity.email).toBe(EMAIL);
      } finally {
        restored.member.dispose();
      }
    });

    it('wraps invalid-mnemonic failures in BrightChainIdentityError', () => {
      const bogus = new SecureString('not actually a valid bip39 mnemonic');
      expect(() =>
        BrightChainIdentity.fromMnemonic(bogus, NAME, EMAIL),
      ).toThrow(BrightChainIdentityError);
    });

    it('throws BrightChainIdentityError for empty name', () => {
      const created = BrightChainIdentity.create(NAME, EMAIL);
      const mnemonic = created.mnemonic;
      created.member.dispose();
      expect(() =>
        BrightChainIdentity.fromMnemonic(mnemonic, '', EMAIL),
      ).toThrow(BrightChainIdentityError);
    });

    it('throws BrightChainIdentityError for empty email', () => {
      const created = BrightChainIdentity.create(NAME, EMAIL);
      const mnemonic = created.mnemonic;
      created.member.dispose();
      expect(() =>
        BrightChainIdentity.fromMnemonic(mnemonic, NAME, ''),
      ).toThrow(BrightChainIdentityError);
    });
  });

  describe('describe', () => {
    it('produces a JSON-safe descriptor with no private-key fields', () => {
      const bundle = BrightChainIdentity.create(NAME, EMAIL);
      try {
        const descriptor = BrightChainIdentity.describe(bundle.member);
        const json = JSON.parse(JSON.stringify(descriptor));
        expect(typeof json.publicKeyHex).toBe('string');
        expect(typeof json.displayName).toBe('string');
        expect(typeof json.email).toBe('string');
        expect(json.id).toBeDefined();
        // No private-key, mnemonic, wallet, or privateKey fields.
        expect(Object.keys(descriptor).sort()).toEqual(
          ['displayName', 'email', 'id', 'publicKeyHex'].sort(),
        );
      } finally {
        bundle.member.dispose();
      }
    });

    it('is pure - does not mutate the member', () => {
      const bundle = BrightChainIdentity.create(NAME, EMAIL);
      try {
        const before = bundle.member.publicKey.toString('hex');
        BrightChainIdentity.describe(bundle.member);
        const after = bundle.member.publicKey.toString('hex');
        expect(after).toBe(before);
      } finally {
        bundle.member.dispose();
      }
    });
  });
});
