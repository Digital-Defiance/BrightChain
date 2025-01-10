import { createHash } from 'crypto';
import {
  KeyPair,
  PrivateKey,
  PublicKey,
  generateRandomKeysSync,
} from 'paillier-bigint';
import { IsolatedPrivateKey } from './isolatedPrivateKey';
import { IsolatedPublicKey } from './isolatedPublicKey';
import { StaticHelpersECIES } from './staticHelpers.ECIES';

export class StaticHelpersVoting {
  public static votingKeyPairBitLength = 3072;
  public static generateVotingKeyPair(): KeyPair {
    const keyPair = generateRandomKeysSync(
      StaticHelpersVoting.votingKeyPairBitLength,
    );

    // Create isolated public key with consistent padding
    const nHex = keyPair.publicKey.n.toString(16).padStart(768, '0');
    const nBuffer = Buffer.from(nHex, 'hex');
    const keyId = createHash('sha256').update(nBuffer).digest();
    const isolatedPublicKey = new IsolatedPublicKey(
      keyPair.publicKey.n,
      keyPair.publicKey.g,
      keyId,
    );

    // Create isolated private key
    const isolatedPrivateKey = new IsolatedPrivateKey(
      keyPair.privateKey.lambda,
      keyPair.privateKey.mu,
      isolatedPublicKey,
    );

    return { publicKey: isolatedPublicKey, privateKey: isolatedPrivateKey };
  }

  public static keyPairToEncryptedPrivateKey(
    keyPair: KeyPair,
    walletPublicKey: Buffer,
  ): Buffer {
    if (!(keyPair.publicKey instanceof IsolatedPublicKey)) {
      throw new Error('Invalid key pair: public key must be isolated');
    }
    if (!(keyPair.privateKey instanceof IsolatedPrivateKey)) {
      throw new Error('Invalid key pair: private key must be isolated');
    }

    // Convert lambda and mu to hex buffers, padding with zeros if needed
    const lambda = Buffer.from(
      keyPair.privateKey.lambda.toString(16).padStart(768, '0'),
      'hex',
    );
    const mu = Buffer.from(
      keyPair.privateKey.mu.toString(16).padStart(768, '0'),
      'hex',
    );

    // Create length buffers
    const lambdaLengthBuffer = Buffer.alloc(4);
    lambdaLengthBuffer.writeUInt32BE(lambda.length);
    const muLengthBuffer = Buffer.alloc(4);
    muLengthBuffer.writeUInt32BE(mu.length);

    // Always strip 0x04 prefix if present since we expect raw public key
    const publicKeyForEncryption =
      walletPublicKey[0] === 0x04
        ? walletPublicKey.subarray(1)
        : walletPublicKey;

    // Pass public key directly to encrypt which will handle prefix
    return StaticHelpersECIES.encrypt(
      publicKeyForEncryption,
      Buffer.concat([lambdaLengthBuffer, lambda, muLengthBuffer, mu]),
    );
  }

  public static encryptedPrivateKeyToKeyPair(
    encryptedPrivateKey: Buffer,
    walletPrivateKey: Buffer,
    votingPublicKey: PublicKey,
  ): PrivateKey {
    if (!(votingPublicKey instanceof IsolatedPublicKey)) {
      throw new Error('Invalid public key: must be an isolated key');
    }

    // If private key has 0x04 prefix, remove it since ECDH expects raw private key
    const privateKeyForDecryption =
      walletPrivateKey[0] === 0x04
        ? walletPrivateKey.subarray(1)
        : walletPrivateKey;

    const decryptedPrivateKeyBuffer = StaticHelpersECIES.decryptWithHeader(
      privateKeyForDecryption,
      encryptedPrivateKey,
    );

    // Read lambda length and extract lambda buffer
    const lambdaLength = decryptedPrivateKeyBuffer.readUInt32BE(0);
    const lambdaBuffer = decryptedPrivateKeyBuffer.subarray(
      4,
      4 + lambdaLength,
    );

    // Read mu length and extract mu buffer
    const muLength = decryptedPrivateKeyBuffer.readUInt32BE(4 + lambdaLength);
    const muBuffer = decryptedPrivateKeyBuffer.subarray(
      8 + lambdaLength,
      8 + lambdaLength + muLength,
    );

    // Convert buffers to BigInts, preserving leading zeros
    const lambda = BigInt(
      '0x' + lambdaBuffer.toString('hex').padStart(768, '0'),
    );
    const mu = BigInt('0x' + muBuffer.toString('hex').padStart(768, '0'));

    return new IsolatedPrivateKey(
      lambda,
      mu,
      votingPublicKey as IsolatedPublicKey,
    );
  }

  private static readonly KEY_VERSION = 1;
  private static readonly KEY_MAGIC = Buffer.from('BCVK'); // BrightChain Voting Key

  public static votingPublicKeyToBuffer(votingPublicKey: PublicKey): Buffer {
    if (!(votingPublicKey instanceof IsolatedPublicKey)) {
      throw new Error('Invalid public key: must be an isolated key');
    }

    const nHex = votingPublicKey.n.toString(16).padStart(768, '0');
    const nBuffer = Buffer.from(nHex, 'hex');
    const keyId = (votingPublicKey as IsolatedPublicKey).getKeyId();
    const instanceId = (votingPublicKey as IsolatedPublicKey).getInstanceId();

    const nLengthBuffer = Buffer.alloc(4);
    nLengthBuffer.writeUInt32BE(nBuffer.length);

    const header = Buffer.concat([
      this.KEY_MAGIC,
      Buffer.from([this.KEY_VERSION]),
    ]);

    return Buffer.concat([header, keyId, instanceId, nLengthBuffer, nBuffer]);
  }

  public static bufferToVotingPublicKey(buffer: Buffer): IsolatedPublicKey {
    // Minimum buffer length check (magic + version + keyId + instanceId + nLength = 73 bytes)
    if (buffer.length < 73) {
      throw new Error('Invalid public key buffer: too short');
    }

    // Verify magic
    const magic = buffer.subarray(0, 4);
    if (!magic.equals(this.KEY_MAGIC)) {
      throw new Error('Invalid public key buffer: wrong magic');
    }

    // Read version
    const version = buffer[4];
    if (version !== this.KEY_VERSION) {
      throw new Error('Unsupported public key version');
    }

    // Read key ID
    const storedKeyId = buffer.subarray(5, 37);

    // Read n length and value
    const nLength = buffer.readUInt32BE(69);
    if (buffer.length < 73 + nLength) {
      throw new Error('Invalid public key buffer: incomplete n value');
    }
    const nBuffer = buffer.subarray(73, 73 + nLength);

    // Convert to BigInt with consistent padding and error handling
    const nHex = nBuffer.toString('hex').padStart(768, '0');
    let n: bigint;
    try {
      n = BigInt('0x' + nHex);
    } catch (error) {
      throw new Error(`Invalid public key buffer: failed to parse n: ${error}`);
    }

    const g = n + 1n; // In Paillier, g is always n + 1

    // Verify key ID
    const computedKeyId = createHash('sha256').update(nBuffer).digest();
    if (!computedKeyId.equals(storedKeyId)) {
      throw new Error('Invalid public key: key ID mismatch');
    }

    // Create and validate the public key
    try {
      // Create a new public key and update its instance ID
      const publicKey = new IsolatedPublicKey(n, g, storedKeyId);
      publicKey.updateInstanceId(); // Generate a new instance ID for the recovered key
      return publicKey;
    } catch (error) {
      throw new Error(
        `Invalid public key parameters: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }
}
