import { generateRandomKeysSync } from 'paillier-bigint';
import { StaticHelpersVoting } from './staticHelpers.voting';
import { EthereumECIES } from './ethereumECIES';
import { randomBytes } from 'crypto';
describe('staticHelpers.voting', () => {
  const mnemonic = EthereumECIES.generateNewMnemonic();
  const { wallet } = EthereumECIES.walletAndSeedFromMnemonic(mnemonic);
  const keyPair = EthereumECIES.walletToSimpleKeyPairBuffer(wallet);
  const votingKeypair = generateRandomKeysSync(StaticHelpersVoting.votingKeyPairBitLength);
  describe('private key algorithms', () => {
    it('should encrypt and decrypt a private key', () => {
      const encryptedPrivateKey = StaticHelpersVoting.keyPairToEncryptedPrivateKey(votingKeypair, keyPair.publicKey);
      expect(encryptedPrivateKey).toBeDefined();
      expect(encryptedPrivateKey.length).toBeGreaterThan(0);
      const decryptedPrivateKey = StaticHelpersVoting.encryptedPrivateKeyToKeyPair(encryptedPrivateKey, keyPair.privateKey, votingKeypair.publicKey);
      expect(decryptedPrivateKey.lambda).toEqual(votingKeypair.privateKey.lambda);
      expect(decryptedPrivateKey.mu).toEqual(votingKeypair.privateKey.mu);
    });
  });
  describe('public key algorithms', () => {
    it('should encode and decode a public key', () => {
      const votingPublicKeyBuffer = StaticHelpersVoting.votingPublicKeyToBuffer(votingKeypair.publicKey);
      expect(votingPublicKeyBuffer).toBeDefined();
      expect(votingPublicKeyBuffer.length).toBeGreaterThan(0);
      const votingPublicKey = StaticHelpersVoting.bufferToVotingPublicKey(votingPublicKeyBuffer);
      expect(votingPublicKey.n).toEqual(votingKeypair.publicKey.n);
      expect(votingPublicKey.g).toEqual(votingKeypair.publicKey.g);
    });
  });
  describe('general functionality', () => {
    it('should be able to decrypt with a recovered keypair', () => {
      // ensure that a recovered keypair can be used to encrypt and decrypt data
      // pick a random bigint
      const data = randomBytes(32);
      const dataBigInt = BigInt('0x' + data.toString('hex'));
      const encrypted = votingKeypair.publicKey.encrypt(dataBigInt);
      const votingPublicKeyBuffer = StaticHelpersVoting.votingPublicKeyToBuffer(votingKeypair.publicKey);
      const encryptedPrivateKey = StaticHelpersVoting.keyPairToEncryptedPrivateKey(votingKeypair, keyPair.publicKey);
      const recoveredPublicKey = StaticHelpersVoting.bufferToVotingPublicKey(votingPublicKeyBuffer);
      const recoveredKeyPair = {
        publicKey: recoveredPublicKey,
        privateKey: StaticHelpersVoting.encryptedPrivateKeyToKeyPair(encryptedPrivateKey, keyPair.privateKey, recoveredPublicKey)
      };
      const decrypted = recoveredKeyPair.privateKey.decrypt(encrypted);
      expect(decrypted).toEqual(dataBigInt);
    });
  });
});