import { randomBytes } from 'crypto';
import { BlockSize } from '../enumerations/blockSize';
import { EciesErrorType } from '../enumerations/eciesErrorType';
import { EciesError } from '../errors/eciesError';
import { SecureString } from '../secureString';
import { ECIESService } from '../services/ecies.service';
import { EciesDecryptionTransform } from './eciesDecryptTransform';

describe('EciesDecryptionTransform Unit Tests', () => {
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
    const transform = new EciesDecryptionTransform(
      keypair.privateKey,
      blockSize,
      undefined,
      mockLogger,
    );
    expect(transform).toBeDefined();
  });

  it('should handle empty input', (done) => {
    const transform = new EciesDecryptionTransform(
      keypair.privateKey,
      blockSize,
      undefined,
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

  it('should decrypt input data', (done) => {
    const transform = new EciesDecryptionTransform(
      keypair.privateKey,
      blockSize,
      undefined,
      mockLogger,
    );
    const inputData = randomBytes(100);
    const encryptedData = eciesService.encrypt(keypair.publicKey, inputData);
    const chunks: Buffer[] = [];

    transform.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    transform.on('end', () => {
      expect(chunks.length).toBe(1);
      const decryptedData = Buffer.concat(chunks);
      expect(decryptedData).toEqual(inputData);
      done();
    });

    transform.write(encryptedData);
    transform.end();
  });

  it('should handle streaming input', (done) => {
    const transform = new EciesDecryptionTransform(
      keypair.privateKey,
      blockSize,
      undefined,
      mockLogger,
    );
    const inputData = randomBytes(1000);
    const encryptedData = eciesService.encrypt(keypair.publicKey, inputData);
    const chunks: Buffer[] = [];

    // Split encrypted data into multiple chunks
    const inputChunks = [
      encryptedData.subarray(0, 300),
      encryptedData.subarray(300, 700),
      encryptedData.subarray(700),
    ];

    transform.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    transform.on('end', () => {
      const decryptedData = Buffer.concat(chunks);
      expect(decryptedData).toEqual(inputData);
      done();
    });

    // Write chunks immediately without artificial delays
    inputChunks.forEach((chunk) => {
      transform.write(chunk);
    });
    transform.end();
  }, 30000);

  it('should throw error with invalid private key', (done) => {
    const invalidPrivateKey = randomBytes(32); // Wrong format for private key
    const transform = new EciesDecryptionTransform(
      invalidPrivateKey,
      blockSize,
      undefined,
      mockLogger,
    );
    const inputData = randomBytes(100);
    const encryptedData = eciesService.encrypt(keypair.publicKey, inputData);

    transform.on('error', (error: EciesError) => {
      expect(error).toBeDefined();
      expect(error.type).toBe(EciesErrorType.InvalidEphemeralPublicKey);
      expect(error.message).toContain('Invalid ephemeral public key');
      expect(mockLogger.error).toHaveBeenCalled();
      done();
    });

    transform.write(encryptedData);
    transform.end();
  }, 10000);

  it('should throw error with corrupted encrypted data', (done) => {
    const transform = new EciesDecryptionTransform(
      keypair.privateKey,
      blockSize,
      undefined,
      mockLogger,
    );
    const corruptedData = randomBytes(200); // Random data that's not properly encrypted

    transform.on('error', (error) => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Invalid ephemeral public key');
      expect(mockLogger.error).toHaveBeenCalled();
      done();
    });

    transform.write(corruptedData);
    transform.end();
  });
});
