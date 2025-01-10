import {
  KeyPair,
  PrivateKey,
  PublicKey,
  generateRandomKeysSync,
} from 'paillier-bigint';
import { StaticHelpersECIES } from './staticHelpers.ECIES';
export abstract class StaticHelpersVoting {
  public static votingKeyPairBitLength = 3072;
  public static generateVotingKeyPair(): KeyPair {
    return generateRandomKeysSync(StaticHelpersVoting.votingKeyPairBitLength);
  }
  public static keyPairToEncryptedPrivateKey(
    keyPair: KeyPair,
    walletPublicKey: Buffer,
  ): Buffer {
    // Convert lambda and mu to hex buffers
    const lambda = Buffer.from(keyPair.privateKey.lambda.toString(16), 'hex');
    const mu = Buffer.from(keyPair.privateKey.mu.toString(16), 'hex');

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

    // Concatenate all buffers with both lengths
    return StaticHelpersECIES.encrypt(
      Buffer.concat([Buffer.from([0x04]), publicKeyForEncryption]),
      Buffer.concat([lambdaLengthBuffer, lambda, muLengthBuffer, mu]),
    );
  }

  public static encryptedPrivateKeyToKeyPair(
    encryptedPrivateKey: Buffer,
    walletPrivateKey: Buffer,
    votingPublicKey: PublicKey,
  ): PrivateKey {
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

    // Convert buffers to BigInts
    const lambda = BigInt('0x' + lambdaBuffer.toString('hex'));
    const mu = BigInt('0x' + muBuffer.toString('hex'));

    return new PrivateKey(lambda, mu, votingPublicKey);
  }
  public static votingPublicKeyToBuffer(votingPublicKey: PublicKey): Buffer {
    const nBuffer = Buffer.from(votingPublicKey.n.toString(16), 'hex');
    const nBufferLength = Buffer.alloc(4);
    nBufferLength.writeUInt32BE(nBuffer.length);

    const gBuffer = Buffer.from(votingPublicKey.g.toString(16), 'hex');
    const gBufferLength = Buffer.alloc(4);
    gBufferLength.writeUInt32BE(gBuffer.length);

    return Buffer.concat([nBufferLength, nBuffer, gBufferLength, gBuffer]);
  }

  public static bufferToVotingPublicKey(buffer: Buffer): PublicKey {
    const nBufferLength = buffer.readUInt32BE(0);
    const nBuffer = buffer.subarray(4, 4 + nBufferLength);

    const gBufferLength = buffer.readUInt32BE(4 + nBufferLength);
    const gBuffer = buffer.subarray(
      8 + nBufferLength,
      8 + nBufferLength + gBufferLength,
    );

    const n = BigInt('0x' + nBuffer.toString('hex'));
    const g = BigInt('0x' + gBuffer.toString('hex'));
    return new PublicKey(n, g);
  }
}
