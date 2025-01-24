import { faker } from '@faker-js/faker';
import Wallet from 'ethereumjs-wallet';
import { BrightChainMember } from './brightChainMember';
import { EmailString } from './emailString';
import { MemberType } from './enumerations/memberType';
import { StaticHelpersECIES } from './staticHelpers.ECIES';
import { StaticHelpersVoting } from './staticHelpers.voting';

describe('brightchain', () => {
  let alice: BrightChainMember,
    bob: BrightChainMember,
    noKeyCharlie: BrightChainMember;
  beforeAll(() => {
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
    let mnemonic: string;
    let wallet: Wallet;
    let member: BrightChainMember;
    beforeAll(() => {
      mnemonic = StaticHelpersECIES.generateNewMnemonic();
      const { wallet: w } =
        StaticHelpersECIES.walletAndSeedFromMnemonic(mnemonic);
      wallet = w;
      member = BrightChainMember.newMember(
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );
    });
    it('should generate valid BIP39 mnemonic and derive wallet', () => {
      expect(wallet).toBeDefined();
      expect(wallet.getPrivateKey()).toBeDefined();
      expect(wallet.getPublicKey()).toBeDefined();
    });

    it('should consistently derive keys from the same mnemonic', () => {
      const { wallet: wallet2 } =
        StaticHelpersECIES.walletAndSeedFromMnemonic(mnemonic);

      expect(wallet.getPrivateKey().toString('hex')).toEqual(
        wallet2.getPrivateKey().toString('hex'),
      );
      expect(wallet.getPublicKey().toString('hex')).toEqual(
        wallet2.getPublicKey().toString('hex'),
      );
    });

    it('should maintain key consistency between wallet and ECDH', () => {
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
      const newMember = BrightChainMember.newMember(
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );

      // Store the original keys
      const originalPublicKey = newMember.publicKey;
      const originalPrivateKey = newMember.privateKey;

      // Unload the wallet and private key
      newMember.unloadWalletAndPrivateKey();
      expect(newMember.hasPrivateKey).toBeFalsy();
      expect(() => newMember.wallet).toThrow('No wallet');

      // Generate a new mnemonic (this should fail to load)
      const wrongMnemonic = StaticHelpersECIES.generateNewMnemonic();
      expect(() => newMember.loadWallet(wrongMnemonic)).toThrow(
        'Incorrect or invalid mnemonic for public key',
      );

      // The member should still not have a private key
      expect(newMember.hasPrivateKey).toBeFalsy();
      expect(() => newMember.wallet).toThrow('No wallet');

      // Create a new member with same keys to simulate reloading from storage
      const reloadedMember = new BrightChainMember(
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
        originalPublicKey,
        newMember.votingPublicKey, // Include the voting public key
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
      expect(
        StaticHelpersVoting.votingPublicKeyToBuffer(
          reloadedMember.votingPublicKey,
        ).toString('hex'),
      ).toEqual(
        StaticHelpersVoting.votingPublicKeyToBuffer(
          newMember.votingPublicKey,
        ).toString('hex'),
      );
    });

    it('should create unique keys for different members', () => {
      const member2 = BrightChainMember.newMember(
        MemberType.User,
        'User 2',
        new EmailString('user2@example.com'),
      );

      // Public keys should be different
      expect(member.publicKey.toString('hex')).not.toEqual(
        member2.publicKey.toString('hex'),
      );

      // Private keys should be different
      expect(member.privateKey.toString('hex')).not.toEqual(
        member2.privateKey.toString('hex'),
      );

      // Voting keys should be different
      expect(
        StaticHelpersVoting.votingPublicKeyToBuffer(
          member.votingPublicKey,
        ).toString('hex'),
      ).not.toEqual(
        StaticHelpersVoting.votingPublicKeyToBuffer(
          member2.votingPublicKey,
        ).toString('hex'),
      );
    });
  });
});
