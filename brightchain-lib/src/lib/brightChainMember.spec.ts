import { faker } from '@faker-js/faker';
import Wallet from 'ethereumjs-wallet';
import { BrightChainMember } from './brightChainMember';
import { ECIES } from './constants';
import { MemberErrorType } from './enumerations/memberErrorType';
import { MemberType } from './enumerations/memberType';
import { InvalidEmailError } from './errors/invalidEmail';
import { MemberError } from './errors/memberError';
import { IMemberWithMnemonic } from './interfaces/member/memberWithMnemonic';
import { ECIESService } from '@digitaldefiance/node-ecies-lib';
import { ServiceProvider } from './services/service.provider';
import { EmailString, InvalidEmailErrorType, SecureString, VotingService } from '@digitaldefiance/ecies-lib';

describe('brightchain', () => {
  let alice: IMemberWithMnemonic,
    bob: IMemberWithMnemonic,
    noKeyCharlie: IMemberWithMnemonic;
  let eciesService: ECIESService;
  let votingService: VotingService;

  beforeAll(async () => {
    eciesService = ServiceProvider.getInstance().eciesService;
    votingService = ServiceProvider.getInstance().votingService;
    alice = await BrightChainMember.newMember(
      eciesService,
      MemberType.User,
      'Alice Smith',
      new EmailString('alice@example.com'),
    );
    bob = await BrightChainMember.newMember(
      eciesService,
      MemberType.User,
      'Bob Smith',
      new EmailString('bob@example.com'),
    );
    noKeyCharlie = await BrightChainMember.newMember(
      eciesService,
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

    it('should unload a private key when called', async () => {
      const dwight = await BrightChainMember.newMember(
        eciesService,
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
    it('should fail to create a user with no name', async () => {
      await expect(
        BrightChainMember.newMember(
          eciesService,
          MemberType.User,
          '',
          new EmailString('alice@example.com'),
        ),
      ).toThrowType(MemberError, (error: MemberError) => {
        expect(error.type).toBe(MemberErrorType.MissingMemberName);
      });
    });

    it('should fail to create a user with whitespace at the start or end of their name', async () => {
      await expect(
        BrightChainMember.newMember(
          eciesService,
          MemberType.User,
          'alice ',
          new EmailString('alice@example.com'),
        ),
      ).toThrowType(MemberError, (error: MemberError) => {
        expect(error.type).toBe(MemberErrorType.InvalidMemberNameWhitespace);
      });
      await expect(
        BrightChainMember.newMember(
          eciesService,
          MemberType.User,
          ' alice',
          new EmailString('alice@example.com'),
        ),
      ).toThrowType(MemberError, (error: MemberError) => {
        expect(error.type).toBe(MemberErrorType.InvalidMemberNameWhitespace);
      });
    });

    it('should fail to create a user with no email', async () => {
      await expect(
        BrightChainMember.newMember(
          eciesService,
          MemberType.User,
          'alice',
          new EmailString(''),
        ),
      ).toThrowType(InvalidEmailError, (error: InvalidEmailError) => {
        expect(error.type).toBe(InvalidEmailErrorType.Missing);
      });
    });

    it('should fail to create a user with an email that has whitespace at the start or end', async () => {
      await expect(
        BrightChainMember.newMember(
          eciesService,
          MemberType.User,
          'alice',
          new EmailString(' alice@example.com'),
        ),
      ).toThrowType(InvalidEmailError, (error: InvalidEmailError) => {
        expect(error.type).toBe(InvalidEmailErrorType.Whitespace);
      });
      await expect(
        BrightChainMember.newMember(
          eciesService,
          MemberType.User,
          'alice',
          new EmailString('alice@example.com '),
        ),
      ).toThrowType(InvalidEmailError, (error: InvalidEmailError) => {
        expect(error.type).toBe(InvalidEmailErrorType.Whitespace);
      });
    });

    it('should fail to create a user with an invalid email', async () => {
      await expect(async () => {
        await BrightChainMember.newMember(
          eciesService,
          MemberType.User,
          'Nope',
          new EmailString('x!foo'),
        );
      }).toThrowType(InvalidEmailError, (error: InvalidEmailError) => {
        expect(error.type).toBe(InvalidEmailErrorType.Invalid);
      });
    });

    it('should check whether a user has a private key', () => {
      expect(bob.member.hasPrivateKey).toEqual(true);
      expect(noKeyCharlie.member.hasPrivateKey).toEqual(false);
    });
  });

  describe('BIP39 mnemonic and wallet functionality', () => {
    let mnemonic: SecureString;
    let wallet: Wallet;
    let member: IMemberWithMnemonic;
    beforeAll(async () => {
      mnemonic = eciesService.generateNewMnemonic();
      const { wallet: w } = eciesService.walletAndSeedFromMnemonic(mnemonic);
      wallet = w;
      member = await BrightChainMember.newMember(
        eciesService,
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

    it('should handle wallet unload and reload with mnemonic', async () => {
      // Generate a new member
      const newMember = await BrightChainMember.newMember(
        eciesService,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );

      // Store the original keys
      const originalPublicKey = Buffer.from(newMember.member.publicKey);
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
      await expect(newMember.member.loadWallet(wrongMnemonic)).rejects.toThrowType(
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
      const reloadedMember = await BrightChainMember.create(
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
        originalPublicKey,
        newMember.member.votingPublicKey, // Include the voting public key
      );
      // Set the private key using the setter to ensure proper validation
      if (originalPrivateKey) {
        await reloadedMember.loadPrivateKey(Buffer.from(originalPrivateKey.value));
      }

      // Verify ECDH keys match
      expect(Buffer.from(reloadedMember.publicKey).toString('hex')).toEqual(
        originalPublicKey.toString('hex'),
      );
      expect(reloadedMember.privateKey?.toString('hex')).toEqual(
        originalPrivateKey?.toString('hex'),
      );

      // Verify voting public key matches
      expect(
        votingService
          .votingPublicKeyToBuffer(reloadedMember.votingPublicKey)
          .toString('hex'),
      ).toEqual(
        votingService
          .votingPublicKeyToBuffer(newMember.member.votingPublicKey)
          .toString('hex'),
      );
    });

    it('should create unique keys for different members', async () => {
      const member2 = await BrightChainMember.newMember(
        eciesService,
        MemberType.User,
        'User 2',
        new EmailString('user2@example.com'),
      );

      // Public keys should be different
      expect(Buffer.from(member.member.publicKey).toString('hex')).not.toEqual(
        Buffer.from(member2.member.publicKey).toString('hex'),
      );

      // Private keys should be different
      expect(member.member.privateKey?.valueAsHexString).not.toEqual(
        member2.member.privateKey?.valueAsHexString,
      );

      // Voting keys should be different
      expect(
        votingService
          .votingPublicKeyToBuffer(member.member.votingPublicKey)
          .toString('hex'),
      ).not.toEqual(
        votingService
          .votingPublicKeyToBuffer(member2.member.votingPublicKey)
          .toString('hex'),
      );
    });
  });
  describe('json', () => {
    it('should serialize and deserialize correctly', async () => {
      const memberJson = alice.member.toJson();
      const reloadedMember = await BrightChainMember.fromJson(memberJson);
      await reloadedMember.loadWallet(alice.mnemonic);
      const publicKey = Buffer.from(alice.member.publicKey);
      const encrypted = await eciesService.encryptSimpleOrSingle(
        true,
        publicKey,
        Buffer.from('hello world'),
      );
      if (!reloadedMember.privateKey) {
        throw new Error('Private key not loaded');
      }
      const decrypted = eciesService.decryptSimpleOrSingleWithHeader(
        true,
        Buffer.from(reloadedMember.privateKey.value),
        encrypted,
      );
      expect(decrypted.toString()).toEqual('hello world');
    });
  });
});
