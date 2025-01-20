import { createECDH, randomBytes } from 'crypto';
import { generateRandomKeysSync } from 'paillier-bigint';
import { StaticHelpersECIES } from './staticHelpers.ECIES';
import { StaticHelpersVoting } from './staticHelpers.voting';

describe('staticHelpers.voting', () => {
  // Create ECDH key pair for tests
  const ecdh = createECDH(StaticHelpersECIES.curveName);
  ecdh.generateKeys();
  // Get raw private key without 0x04 prefix
  const privateKey = ecdh.getPrivateKey();
  // Get public key in uncompressed format (with 0x04 prefix)
  const publicKey = ecdh.getPublicKey();
  const keyPair = { privateKey, publicKey };
  const votingKeypair = generateRandomKeysSync(
    StaticHelpersVoting.votingKeyPairBitLength,
  );

  describe('private key algorithms', () => {
    it('should encrypt and decrypt a private key', () => {
      const encryptedPrivateKey =
        StaticHelpersVoting.keyPairToEncryptedPrivateKey(
          votingKeypair,
          keyPair.publicKey,
        );
      expect(encryptedPrivateKey).toBeDefined();
      expect(encryptedPrivateKey.length).toBeGreaterThan(0);
      const decryptedPrivateKey =
        StaticHelpersVoting.encryptedPrivateKeyToKeyPair(
          encryptedPrivateKey,
          keyPair.privateKey,
          votingKeypair.publicKey,
        );
      expect(decryptedPrivateKey.lambda.toString()).toEqual(
        votingKeypair.privateKey.lambda.toString(),
      );
      expect(decryptedPrivateKey.mu.toString()).toEqual(
        votingKeypair.privateKey.mu.toString(),
      );
    });

    it('should handle invalid private key encryption', () => {
      const invalidPublicKey = Buffer.from('invalid');
      expect(() => {
        StaticHelpersVoting.keyPairToEncryptedPrivateKey(
          votingKeypair,
          invalidPublicKey,
        );
      }).toThrow();
    });
  });

  describe('public key algorithms', () => {
    it('should encode and decode a public key', () => {
      const votingPublicKeyBuffer = StaticHelpersVoting.votingPublicKeyToBuffer(
        votingKeypair.publicKey,
      );
      expect(votingPublicKeyBuffer).toBeDefined();
      expect(votingPublicKeyBuffer.length).toBeGreaterThan(0);
      const votingPublicKey = StaticHelpersVoting.bufferToVotingPublicKey(
        votingPublicKeyBuffer,
      );
      expect(votingPublicKey.n.toString()).toEqual(
        votingKeypair.publicKey.n.toString(),
      );
      expect(votingPublicKey.g.toString()).toEqual(
        votingKeypair.publicKey.g.toString(),
      );
    });

    it('should handle invalid public key buffer', () => {
      const invalidBuffer = Buffer.from('invalid');
      expect(() => {
        StaticHelpersVoting.bufferToVotingPublicKey(invalidBuffer);
      }).toThrow();
    });
  });

  describe('general functionality', () => {
    it('should be able to decrypt with a recovered keypair', () => {
      // ensure that a recovered keypair can be used to encrypt and decrypt data
      // pick a random bigint
      const data = randomBytes(32);
      const dataBigInt = BigInt('0x' + data.toString('hex'));
      const encrypted = votingKeypair.publicKey.encrypt(dataBigInt);
      const votingPublicKeyBuffer = StaticHelpersVoting.votingPublicKeyToBuffer(
        votingKeypair.publicKey,
      );
      const encryptedPrivateKey =
        StaticHelpersVoting.keyPairToEncryptedPrivateKey(
          votingKeypair,
          keyPair.publicKey,
        );
      const recoveredPublicKey = StaticHelpersVoting.bufferToVotingPublicKey(
        votingPublicKeyBuffer,
      );
      const recoveredKeyPair = {
        publicKey: recoveredPublicKey,
        privateKey: StaticHelpersVoting.encryptedPrivateKeyToKeyPair(
          encryptedPrivateKey,
          keyPair.privateKey,
          recoveredPublicKey,
        ),
      };
      const decrypted = recoveredKeyPair.privateKey.decrypt(encrypted);
      expect(decrypted.toString()).toEqual(dataBigInt.toString());
    });

    it('should handle large numbers', () => {
      const largeNumber = BigInt(Number.MAX_SAFE_INTEGER) * BigInt(2);
      const encrypted = votingKeypair.publicKey.encrypt(largeNumber);
      const decrypted = votingKeypair.privateKey.decrypt(encrypted);
      expect(decrypted.toString()).toEqual(largeNumber.toString());
    });
  });

  describe('homomorphic operations', () => {
    it('should handle homomorphic addition of encrypted values', () => {
      const value1 = BigInt(5);
      const value2 = BigInt(3);

      // Encrypt individual values
      const encrypted1 = votingKeypair.publicKey.encrypt(value1);
      const encrypted2 = votingKeypair.publicKey.encrypt(value2);

      // Perform homomorphic addition
      const encryptedSum = votingKeypair.publicKey.addition(
        encrypted1,
        encrypted2,
      );

      // Decrypt result
      const decryptedSum = votingKeypair.privateKey.decrypt(encryptedSum);

      // 5 + 3 = 8
      expect(decryptedSum.toString()).toEqual('8');
    });

    it('should handle homomorphic multiplication with constant', () => {
      const value = BigInt(5);
      const multiplier = BigInt(3);

      // Encrypt value
      const encrypted = votingKeypair.publicKey.encrypt(value);

      // Perform homomorphic multiplication
      const encryptedProduct = votingKeypair.publicKey.multiply(
        encrypted,
        multiplier,
      );

      // Decrypt result
      const decryptedProduct =
        votingKeypair.privateKey.decrypt(encryptedProduct);

      // 5 * 3 = 15
      expect(decryptedProduct.toString()).toEqual('15');
    });

    it('should handle multiple homomorphic operations in sequence', () => {
      const value1 = BigInt(2);
      const value2 = BigInt(3);
      const value3 = BigInt(4);
      const multiplier = BigInt(2);

      const encrypted1 = votingKeypair.publicKey.encrypt(value1);
      const encrypted2 = votingKeypair.publicKey.encrypt(value2);
      const encrypted3 = votingKeypair.publicKey.encrypt(value3);

      // (2 + 3 + 4) * 2 = 18
      const sum = votingKeypair.publicKey.addition(
        votingKeypair.publicKey.addition(encrypted1, encrypted2),
        encrypted3,
      );
      const result = votingKeypair.publicKey.multiply(sum, multiplier);

      const decrypted = votingKeypair.privateKey.decrypt(result);
      expect(decrypted.toString()).toEqual('18');
    });
  });

  describe('voting scenarios', () => {
    it('should simulate a basic voting scenario', () => {
      // Simulate 3 votes: yes(1), no(0), yes(1)
      const votes = [BigInt(1), BigInt(0), BigInt(1)];

      // Encrypt all votes
      const encryptedVotes = votes.map((v) =>
        votingKeypair.publicKey.encrypt(v),
      );

      // Tally votes using homomorphic addition
      const encryptedSum = encryptedVotes.reduce(
        (sum, vote) => votingKeypair.publicKey.addition(sum, vote),
        votingKeypair.publicKey.encrypt(BigInt(0)), // Start with encrypted 0
      );

      // Decrypt final tally
      const tally = votingKeypair.privateKey.decrypt(encryptedSum);

      // Should have 2 yes votes
      expect(tally.toString()).toEqual('2');
    });

    it('should handle weighted voting', () => {
      // Simulate weighted votes: weight 2 yes(1), weight 3 no(0), weight 1 yes(1)
      const votes = [
        { vote: BigInt(1), weight: BigInt(2) },
        { vote: BigInt(0), weight: BigInt(3) },
        { vote: BigInt(1), weight: BigInt(1) },
      ];

      // Encrypt and weight votes
      const encryptedWeightedVotes = votes.map(({ vote, weight }) => {
        const encrypted = votingKeypair.publicKey.encrypt(vote);
        return votingKeypair.publicKey.multiply(encrypted, weight);
      });

      // Tally weighted votes
      const encryptedSum = encryptedWeightedVotes.reduce(
        (sum, vote) => votingKeypair.publicKey.addition(sum, vote),
        votingKeypair.publicKey.encrypt(BigInt(0)),
      );

      const tally = votingKeypair.privateKey.decrypt(encryptedSum);
      // Should have (2*1 + 3*0 + 1*1) = 3 weighted yes votes
      expect(tally.toString()).toEqual('3');
    });

    it('should simulate multiple voting rounds', () => {
      // Simulate 2 rounds of voting
      const round1Votes = [BigInt(1), BigInt(0), BigInt(1)]; // 2 yes
      const round2Votes = [BigInt(1), BigInt(1), BigInt(0)]; // 2 yes

      // Function to tally a round
      const tallyRound = (votes: bigint[]) => {
        const encryptedVotes = votes.map((v) =>
          votingKeypair.publicKey.encrypt(v),
        );
        return encryptedVotes.reduce(
          (sum, vote) => votingKeypair.publicKey.addition(sum, vote),
          votingKeypair.publicKey.encrypt(BigInt(0)),
        );
      };

      const round1Tally = votingKeypair.privateKey.decrypt(
        tallyRound(round1Votes),
      );
      const round2Tally = votingKeypair.privateKey.decrypt(
        tallyRound(round2Votes),
      );

      expect(round1Tally.toString()).toEqual('2');
      expect(round2Tally.toString()).toEqual('2');
    });

    it('should handle zero value encryption and decryption', () => {
      const zero = BigInt(0);
      const encrypted = votingKeypair.publicKey.encrypt(zero);
      const decrypted = votingKeypair.privateKey.decrypt(encrypted);
      expect(decrypted.toString()).toEqual('0');
    });

    it('should handle vote verification', () => {
      // Simulate a vote that must be 0 or 1
      const validVote = BigInt(1);
      const invalidVote = BigInt(2);

      const encryptedValid = votingKeypair.publicKey.encrypt(validVote);
      const decryptedValid = votingKeypair.privateKey.decrypt(encryptedValid);

      // Verify valid vote is 0 or 1
      expect(['0', '1']).toContain(decryptedValid.toString());

      const encryptedInvalid = votingKeypair.publicKey.encrypt(invalidVote);
      const decryptedInvalid =
        votingKeypair.privateKey.decrypt(encryptedInvalid);

      // Verify invalid vote is caught
      expect(['0', '1']).not.toContain(decryptedInvalid.toString());
    });
  });

  describe('key generation', () => {
    it('should handle edge cases in key generation', () => {
      // Test with minimum safe bit length
      const minBitLength = 2048;
      const minKeypair = generateRandomKeysSync(minBitLength);
      expect(minKeypair.publicKey.bitLength).toBeGreaterThanOrEqual(
        minBitLength,
      );

      // Verify key properties
      expect(minKeypair.publicKey.n).toBeDefined();
      expect(minKeypair.publicKey.g).toBeDefined();
      expect(minKeypair.privateKey.lambda).toBeDefined();
      expect(minKeypair.privateKey.mu).toBeDefined();
    });

    it('should generate different keys for different instances', () => {
      const keypair1 = generateRandomKeysSync(
        StaticHelpersVoting.votingKeyPairBitLength,
      );
      const keypair2 = generateRandomKeysSync(
        StaticHelpersVoting.votingKeyPairBitLength,
      );

      expect(keypair1.publicKey.n.toString()).not.toEqual(
        keypair2.publicKey.n.toString(),
      );
      expect(keypair1.publicKey.g.toString()).not.toEqual(
        keypair2.publicKey.g.toString(),
      );
    });
  });
});
