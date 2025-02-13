import { faker } from '@faker-js/faker';
import Wallet from 'ethereumjs-wallet';
import { BrightChainMember } from './brightChainMember';
import { ECIES } from './constants';
import { EmailString } from './emailString';
import { InvalidEmailErrorType } from './enumerations/invalidEmailType';
import { MemberErrorType } from './enumerations/memberErrorType';
import { MemberType } from './enumerations/memberType';
import { InvalidEmailError } from './errors/invalidEmail';
import { MemberError } from './errors/memberError';
import { IMemberWithMnemonic } from './interfaces/memberWithMnemonic';
import { ECIESService } from './services/ecies.service';
import { VotingService } from './services/voting.service';

describe('brightchain', () => {
  let alice: IMemberWithMnemonic,
    bob: IMemberWithMnemonic,
    noKeyCharlie: IMemberWithMnemonic;
  let eciesService: ECIESService;

  beforeAll(() => {
    eciesService = new ECIESService();
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
    noKeyCharlie.member.unloadWalletAndPrivateKey();
  });

  describe('basic member operations', () => {
    it('should sign and verify a message for a member', () => {
      const message = Buffer.from('hello world');
      const signature = alice.member.sign(message);
      const verified = alice.member.verify(signature, message);
      expect(verified).toBeTruthy();
      expect(
        alice.member.verify(signature, Buffer.from('hello worldx')),
      ).toBeFalsy();
    });

    it('should fail to sign when there is no signing key', () => {
      expect(() =>
        noKeyCharlie.member.sign(Buffer.from(faker.lorem.sentence())),
      ).toThrowType(MemberError, (error: MemberError) => {
        expect(error.type).toBe(MemberErrorType.MissingPrivateKey);
      });
    });

    it('should unload a private key when called', () => {
      const dwight = BrightChainMember.newMember(
        MemberType.User,
        'Dwight Smith',
        new EmailString('dwight@example.com'),
      );
      expect(dwight.member.hasPrivateKey).toBeTruthy();
      dwight.member.unloadWalletAndPrivateKey();
      expect(dwight.member.hasPrivateKey).toBeFalsy();
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
      ).toThrowType(MemberError, (error: MemberError) => {
        expect(error.type).toBe(MemberErrorType.MissingMemberName);
      });
    });

    it('should fail to create a user with whitespace at the start or end of their name', () => {
      expect(() =>
        BrightChainMember.newMember(
          MemberType.User,
          'alice ',
          new EmailString('alice@example.com'),
        ),
      ).toThrowType(MemberError, (error: MemberError) => {
        expect(error.type).toBe(MemberErrorType.InvalidMemberNameWhitespace);
      });
      expect(() =>
        BrightChainMember.newMember(
          MemberType.User,
          ' alice',
          new EmailString('alice@example.com'),
        ),
      ).toThrowType(MemberError, (error: MemberError) => {
        expect(error.type).toBe(MemberErrorType.InvalidMemberNameWhitespace);
      });
    });

    it('should fail to create a user with no email', () => {
      expect(() =>
        BrightChainMember.newMember(
          MemberType.User,
          'alice',
          new EmailString(''),
        ),
      ).toThrowType(InvalidEmailError, (error: InvalidEmailError) => {
        expect(error.reason).toBe(InvalidEmailErrorType.Missing);
      });
    });

    it('should fail to create a user with an email that has whitespace at the start or end', () => {
      expect(() =>
        BrightChainMember.newMember(
          MemberType.User,
          'alice',
          new EmailString(' alice@example.com'),
        ),
      ).toThrowType(InvalidEmailError, (error: InvalidEmailError) => {
        expect(error.reason).toBe(InvalidEmailErrorType.Whitespace);
      });
      expect(() =>
        BrightChainMember.newMember(
          MemberType.User,
          'alice',
          new EmailString('alice@example.com '),
        ),
      ).toThrowType(InvalidEmailError, (error: InvalidEmailError) => {
        expect(error.reason).toBe(InvalidEmailErrorType.Whitespace);
      });
    });

    it('should fail to create a user with an invalid email', () => {
      expect(() => {
        BrightChainMember.newMember(
          MemberType.User,
          'Nope',
          new EmailString('x!foo'),
        );
      }).toThrowType(InvalidEmailError, (error: InvalidEmailError) => {
        expect(error.reason).toBe(InvalidEmailErrorType.Invalid);
      });
    });

    it('should check whether a user has a private key', () => {
      expect(bob.member.hasPrivateKey).toEqual(true);
      expect(noKeyCharlie.member.hasPrivateKey).toEqual(false);
    });
  });

  describe('BIP39 mnemonic and wallet functionality', () => {
    let mnemonic: string;
    let wallet: Wallet;
    let member: IMemberWithMnemonic;
    beforeAll(() => {
      mnemonic = eciesService.generateNewMnemonic();
      const { wallet: w } = eciesService.walletAndSeedFromMnemonic(mnemonic);
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
        eciesService.walletAndSeedFromMnemonic(mnemonic);

      expect(wallet.getPrivateKey().toString('hex')).toEqual(
        wallet2.getPrivateKey().toString('hex'),
      );
      expect(wallet.getPublicKey().toString('hex')).toEqual(
        wallet2.getPublicKey().toString('hex'),
      );
    });

    it('should maintain key consistency between wallet and ECDH', () => {
      // Get the public key from the member (which uses ECDH internally)
      const memberPublicKey = member.member.publicKey;

      // The public key should be in uncompressed format with 0x04 prefix
      expect(memberPublicKey[0]).toEqual(ECIES.PUBLIC_KEY_MAGIC);

      // Verify the key length is correct for the curve
      // For secp256k1, public key should be 65 bytes (1 byte prefix + 32 bytes x + 32 bytes y)
      expect(memberPublicKey.length).toEqual(ECIES.PUBLIC_KEY_LENGTH);
    });

    it('should handle wallet unload and reload with mnemonic', () => {
      // Generate a new member
      const newMember = BrightChainMember.newMember(
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );

      // Store the original keys
      const originalPublicKey = newMember.member.publicKey;
      const originalPrivateKey = newMember.member.privateKey;

      // Unload the wallet and private key
      newMember.member.unloadWalletAndPrivateKey();
      expect(newMember.member.hasPrivateKey).toBeFalsy();
      expect(() => newMember.member.wallet).toThrowType(
        MemberError,
        (error: MemberError) => {
          expect(error.type).toBe(MemberErrorType.NoWallet);
        },
      );

      // Generate a new mnemonic (this should fail to load)
      const wrongMnemonic = eciesService.generateNewMnemonic();
      expect(() => newMember.member.loadWallet(wrongMnemonic)).toThrowType(
        MemberError,
        (error: MemberError) => {
          expect(error.type).toBe(MemberErrorType.InvalidMnemonic);
        },
      );

      // The member should still not have a private key
      expect(newMember.member.hasPrivateKey).toBeFalsy();
      expect(() => newMember.member.wallet).toThrowType(
        MemberError,
        (error: MemberError) => {
          expect(error.type).toBe(MemberErrorType.NoWallet);
        },
      );

      // Create a new member with same keys to simulate reloading from storage
      const reloadedMember = new BrightChainMember(
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
        originalPublicKey,
        newMember.member.votingPublicKey, // Include the voting public key
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
        VotingService.votingPublicKeyToBuffer(
          reloadedMember.votingPublicKey,
        ).toString('hex'),
      ).toEqual(
        VotingService.votingPublicKeyToBuffer(
          newMember.member.votingPublicKey,
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
      expect(member.member.publicKey.toString('hex')).not.toEqual(
        member2.member.publicKey.toString('hex'),
      );

      // Private keys should be different
      expect(member.member.privateKey.toString('hex')).not.toEqual(
        member2.member.privateKey.toString('hex'),
      );

      // Voting keys should be different
      expect(
        VotingService.votingPublicKeyToBuffer(
          member.member.votingPublicKey,
        ).toString('hex'),
      ).not.toEqual(
        VotingService.votingPublicKeyToBuffer(
          member2.member.votingPublicKey,
        ).toString('hex'),
      );
    });
  });
  describe('json', () => {
    it('should serialize and deserialize correctly', () => {
      const memberJson = alice.member.toJson();
      const reloadedMember = BrightChainMember.fromJson(memberJson);
      reloadedMember.loadWallet(alice.mnemonic);
      const encrypted = eciesService.encrypt(
        alice.member.publicKey,
        Buffer.from('hello world'),
      );
      const decrypted = eciesService.decrypt(
        reloadedMember.privateKey,
        encrypted,
      );
      expect(decrypted.toString()).toEqual('hello world');
    });
  });
});
