import { faker } from '@faker-js/faker';
import { BrightChainMember } from './brightChainMember';
import { EmailString } from './emailString';
import { MemberType } from './enumerations/memberType';
import { StaticHelpersECIES } from './staticHelpers.ECIES';

describe('brightchain', () => {
  let alice: BrightChainMember,
    bob: BrightChainMember,
    noKeyCharlie: BrightChainMember;
  beforeEach(() => {
    alice = BrightChainMember.newMember(
      MemberType.User,
      'Alice Smith',
      new EmailString('alice@example.com'),
    );
    bob = BrightChainMember.newMember(
      MemberType.User,
      'Bob Smith',
      new EmailString('bob@example.com'),
    );
    noKeyCharlie = BrightChainMember.newMember(
      MemberType.User,
      'Charlie Smith',
      new EmailString('charlie@example.com'),
    );
    noKeyCharlie.unloadWalletAndPrivateKey();
  });

  describe('basic member operations', () => {
    it('should sign and verify a message for a member', () => {
      const message = Buffer.from('hello world');
      const signature = alice.sign(message);
      const verified = alice.verify(signature, message);
      expect(verified).toBeTruthy();
      expect(alice.verify(signature, Buffer.from('hello worldx'))).toBeFalsy();
    });

    it('should fail to sign when there is no signing key', () => {
      expect(() =>
        noKeyCharlie.sign(Buffer.from(faker.lorem.sentence())),
      ).toThrow('No private key');
    });

    it('should unload a private key when called', () => {
      const dwight = BrightChainMember.newMember(
        MemberType.User,
        'Dwight Smith',
        new EmailString('dwight@example.com'),
      );
      expect(dwight.hasPrivateKey).toBeTruthy();
      dwight.unloadWalletAndPrivateKey();
      expect(dwight.hasPrivateKey).toBeFalsy();
    });
  });

  describe('member creation validation', () => {
    it('should fail to create a user with no name', () => {
      expect(() =>
        BrightChainMember.newMember(
          MemberType.User,
          '',
          new EmailString('alice@example.com'),
        ),
      ).toThrow('Member name missing');
    });

    it('should fail to create a user with whitespace at the start or end of their name', () => {
      expect(() =>
        BrightChainMember.newMember(
          MemberType.User,
          'alice ',
          new EmailString('alice@example.com'),
        ),
      ).toThrow('Member name has leading or trailing spaces');
      expect(() =>
        BrightChainMember.newMember(
          MemberType.User,
          ' alice',
          new EmailString('alice@example.com'),
        ),
      ).toThrow('Member name has leading or trailing spaces');
    });

    it('should fail to create a user with no email', () => {
      expect(() =>
        BrightChainMember.newMember(
          MemberType.User,
          'alice',
          new EmailString(''),
        ),
      ).toThrow('Email missing');
    });

    it('should fail to create a user with an email that has whitespace at the start or end', () => {
      expect(() =>
        BrightChainMember.newMember(
          MemberType.User,
          'alice',
          new EmailString(' alice@example.com'),
        ),
      ).toThrow('Email has leading or trailing spaces');
      expect(() =>
        BrightChainMember.newMember(
          MemberType.User,
          'alice',
          new EmailString('alice@example.com '),
        ),
      ).toThrow('Email has leading or trailing spaces');
    });

    it('should fail to create a user with an invalid email', () => {
      expect(() => {
        BrightChainMember.newMember(
          MemberType.User,
          'Nope',
          new EmailString('x!foo'),
        );
      }).toThrow('Email is invalid');
    });

    it('should check whether a user has a private key', () => {
      expect(bob.hasPrivateKey).toEqual(true);
      expect(noKeyCharlie.hasPrivateKey).toEqual(false);
    });
  });

  describe('BIP39 mnemonic and wallet functionality', () => {
    it('should generate valid BIP39 mnemonic and derive wallet', () => {
      const mnemonic = StaticHelpersECIES.generateNewMnemonic();
      const { wallet } = StaticHelpersECIES.walletAndSeedFromMnemonic(mnemonic);
      expect(wallet).toBeDefined();
      expect(wallet.getPrivateKey()).toBeDefined();
      expect(wallet.getPublicKey()).toBeDefined();
    });

    it('should consistently derive keys from the same mnemonic', () => {
      const mnemonic = StaticHelpersECIES.generateNewMnemonic();
      const { wallet: wallet1 } =
        StaticHelpersECIES.walletAndSeedFromMnemonic(mnemonic);
      const { wallet: wallet2 } =
        StaticHelpersECIES.walletAndSeedFromMnemonic(mnemonic);

      expect(wallet1.getPrivateKey().toString('hex')).toEqual(
        wallet2.getPrivateKey().toString('hex'),
      );
      expect(wallet1.getPublicKey().toString('hex')).toEqual(
        wallet2.getPublicKey().toString('hex'),
      );
    });

    it('should maintain key consistency between wallet and ECDH', () => {
      // Create a new member
      const member = BrightChainMember.newMember(
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );

      // Get the public key from the member (which uses ECDH internally)
      const memberPublicKey = member.publicKey;

      // The public key should be in uncompressed format with 0x04 prefix
      expect(memberPublicKey[0]).toEqual(0x04);

      // Verify the key length is correct for the curve
      // For secp256k1, public key should be 65 bytes (1 byte prefix + 32 bytes x + 32 bytes y)
      expect(memberPublicKey.length).toEqual(65);
    });

    it('should handle wallet unload and reload with mnemonic', () => {
      // Generate a new member
      const member = BrightChainMember.newMember(
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );

      // Store the original keys
      const originalPublicKey = member.publicKey;
      const originalPrivateKey = member.privateKey;

      // Unload the wallet and private key
      member.unloadWalletAndPrivateKey();
      expect(member.hasPrivateKey).toBeFalsy();
      expect(() => member.wallet).toThrow('No wallet');

      // Generate a new mnemonic (this should fail to load)
      const wrongMnemonic = StaticHelpersECIES.generateNewMnemonic();
      expect(() => member.loadWallet(wrongMnemonic)).toThrow(
        'Incorrect or invalid mnemonic for public key',
      );

      // The member should still not have a private key
      expect(member.hasPrivateKey).toBeFalsy();
      expect(() => member.wallet).toThrow('No wallet');

      // Create a new member with same keys to simulate reloading from storage
      const reloadedMember = new BrightChainMember(
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
        originalPublicKey,
        member.votingPublicKey, // Include the voting public key
      );
      // Set the private key using the setter to ensure proper validation
      reloadedMember.privateKey = originalPrivateKey;

      // Verify ECDH keys match
      expect(reloadedMember.publicKey.toString('hex')).toEqual(
        originalPublicKey.toString('hex'),
      );
      expect(reloadedMember.privateKey.toString('hex')).toEqual(
        originalPrivateKey.toString('hex'),
      );

      // Verify voting public key matches
      expect(reloadedMember.votingPublicKey.toString('hex')).toEqual(
        member.votingPublicKey.toString('hex'),
      );
    });

    it('should create unique keys for different members', () => {
      const member1 = BrightChainMember.newMember(
        MemberType.User,
        'User 1',
        new EmailString('user1@example.com'),
      );

      const member2 = BrightChainMember.newMember(
        MemberType.User,
        'User 2',
        new EmailString('user2@example.com'),
      );

      // Public keys should be different
      expect(member1.publicKey.toString('hex')).not.toEqual(
        member2.publicKey.toString('hex'),
      );

      // Private keys should be different
      expect(member1.privateKey.toString('hex')).not.toEqual(
        member2.privateKey.toString('hex'),
      );

      // Voting keys should be different
      expect(member1.votingPublicKey.toString('hex')).not.toEqual(
        member2.votingPublicKey.toString('hex'),
      );
    });

    it('should handle anonymous member creation consistently', () => {
      const anonymous = BrightChainMember.anonymous();
      expect(anonymous.memberType).toEqual(MemberType.Anonymous);
      expect(anonymous.name).toEqual('Anonymous');
      expect(anonymous.contactEmail.toString()).toEqual(
        'anonymous@brightchain.org',
      );
      expect(anonymous.hasPrivateKey).toBeTruthy();

      // Should have proper key format
      expect(anonymous.publicKey[0]).toEqual(0x04); // Uncompressed format
      expect(anonymous.publicKey.length).toEqual(65); // Proper key length
    });
  });
});
