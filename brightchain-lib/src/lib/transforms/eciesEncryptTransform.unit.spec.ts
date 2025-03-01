import { randomBytes } from 'crypto';
import { BlockSize } from '../enumerations/blockSizes';
import { EciesErrorType } from '../enumerations/eciesErrorType';
import { EciesError } from '../errors/eciesError';
import { SecureString } from '../secureString';
import { ECIESService } from '../services/ecies.service';
import { EciesEncryptTransform } from './eciesEncryptTransform';

describe('EciesEncryptTransform Unit Tests', () => {
  const mockLogger = {
    error: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  } as unknown as Console;

  const blockSize = BlockSize.Small;
  let eciesService: ECIESService;
  let mnemonic: SecureString;
  let keypair: {
    privateKey: Buffer;
    publicKey: Buffer;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    eciesService = new ECIESService();
    mnemonic = eciesService.generateNewMnemonic();
    keypair = eciesService.mnemonicToSimpleKeyPairBuffer(mnemonic);
  });

  it('should be instantiated with correct parameters', () => {
    const transform = new EciesEncryptTransform(
      blockSize,
      keypair.publicKey,
      mockLogger,
    );
    expect(transform).toBeDefined();
  });

  it('should handle empty input', (done) => {
    const transform = new EciesEncryptTransform(
      blockSize,
      keypair.publicKey,
      mockLogger,
    );
    const chunks: Buffer[] = [];

    transform.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    transform.on('end', () => {
      expect(chunks.length).toBe(0);
      done();
    });

    transform.end();
  });

  it('should encrypt input data', (done) => {
    const transform = new EciesEncryptTransform(
      blockSize,
      keypair.publicKey,
      mockLogger,
    );
    const inputData = randomBytes(100);
    const chunks: Buffer[] = [];

    transform.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    transform.on('end', () => {
      expect(chunks.length).toBe(1);
      const encryptedData = Buffer.concat(chunks);

      // Verify the encrypted data can be decrypted
      const decryptedData = eciesService.decryptWithHeader(
        keypair.privateKey,
        encryptedData,
      );
      expect(decryptedData).toEqual(inputData);
      done();
    });

    transform.write(inputData);
    transform.end();
  });

  it('should handle streaming input', (done) => {
    const transform = new EciesEncryptTransform(
      blockSize,
      keypair.publicKey,
      mockLogger,
    );
    const inputData = randomBytes(1000);
    const chunks: Buffer[] = [];

    // Split input into multiple chunks
    const inputChunks = [
      inputData.subarray(0, 300),
      inputData.subarray(300, 700),
      inputData.subarray(700),
    ];

    transform.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    transform.on('end', () => {
      const encryptedData = Buffer.concat(chunks);

      // Verify the encrypted data can be decrypted
      const decryptedData = eciesService.decryptWithHeader(
        keypair.privateKey,
        encryptedData,
      );
      expect(decryptedData).toEqual(inputData);
      done();
    });

    // Write chunks immediately without artificial delays
    inputChunks.forEach((chunk) => {
      transform.write(chunk);
    });
    transform.end();
  }, 30000);

  it('should throw error with invalid public key', (done) => {
    const invalidPublicKey = randomBytes(32); // Wrong size for public key
    const transform = new EciesEncryptTransform(
      blockSize,
      invalidPublicKey,
      mockLogger,
    );
    const inputData = randomBytes(100);

    transform.on('error', (error: EciesError) => {
      expect(error).toBeDefined();
      expect(error.type).toBe(EciesErrorType.InvalidEphemeralPublicKey);
      expect(error.message).toContain('Invalid ephemeral public key');
      expect(mockLogger.error).toHaveBeenCalled();
      done();
    });

    transform.write(inputData);
    transform.end();
  }, 10000);
});
