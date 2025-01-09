import {
  KeyPair,
  PublicKey,
  PrivateKey,
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
    walletPublicKey: Buffer
  ): Buffer {
    const lambda = Buffer.from(keyPair.privateKey.lambda.toString(16), 'hex');
    const lambdaLengthBuffer = Buffer.alloc(4);
    lambdaLengthBuffer.writeUInt32BE(lambda.length);
    const mu = Buffer.from(keyPair.privateKey.mu.toString(16), 'hex');
    return StaticHelpersECIES.encrypt(
      walletPublicKey,
      Buffer.concat([lambdaLengthBuffer, lambda, mu])
    );
  }
  public static encryptedPrivateKeyToKeyPair(
    encryptedPrivateKey: Buffer,
    walletPrivateKey: Buffer,
    votingPublicKey: PublicKey
  ): PrivateKey {
    const decryptedPrivateKeyBuffer = StaticHelpersECIES.decrypt(
      walletPrivateKey,
      encryptedPrivateKey
    );
    const lambdaLength = decryptedPrivateKeyBuffer.readUInt32BE(0);
    const lambdaBuffer = decryptedPrivateKeyBuffer.subarray(
      4,
      4 + lambdaLength
    );
    const muBuffer = decryptedPrivateKeyBuffer.subarray(4 + lambdaLength);
    const lambda = BigInt('0x' + lambdaBuffer.toString('hex'));
    const mu = BigInt('0x' + muBuffer.toString('hex'));
    return new PrivateKey(lambda, mu, votingPublicKey);
  }
  public static votingPublicKeyToBuffer(votingPublicKey: PublicKey): Buffer {
    const nBuffer = Buffer.from(votingPublicKey.n.toString(16), 'hex');
    const nBufferLength = Buffer.alloc(4);
    nBufferLength.writeUInt32BE(nBuffer.length);
    const gBuffer = Buffer.from(votingPublicKey.g.toString(16), 'hex');
    return Buffer.concat([nBufferLength, nBuffer, gBuffer]);
  }
  public static bufferToVotingPublicKey(buffer: Buffer): PublicKey {
    const nBufferLength = buffer.readUInt32BE(0);
    const nBuffer = buffer.subarray(4, 4 + nBufferLength);
    const gBuffer = buffer.subarray(4 + nBufferLength);
    const n = BigInt('0x' + nBuffer.toString('hex'));
    const g = BigInt('0x' + gBuffer.toString('hex'));
    return new PublicKey(n, g);
  }
}
