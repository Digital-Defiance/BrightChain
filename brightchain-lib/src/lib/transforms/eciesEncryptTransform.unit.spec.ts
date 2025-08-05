import { randomBytes } from 'crypto';
import { BlockSize } from '../enumerations/blockSize';
import { EciesErrorType } from '../enumerations/eciesErrorType';
import { EciesError } from '../errors/eciesError';
import { SecureString } from '../secureString';
import { ECIESService } from '../services/ecies.service';
import { EciesEncryptTransform } from './eciesEncryptTransform';

describe('EciesEncryptTransform Unit Tests', () => {
  let consoleError: typeof console.error;

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

  beforeAll(() => {
    // Mock console.error to prevent actual logging during tests
    consoleError = console.error;
    console.error = jest.fn();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    eciesService = new ECIESService();
    mnemonic = eciesService.generateNewMnemonic();
    keypair = eciesService.mnemonicToSimpleKeyPairBuffer(mnemonic);
  });

  afterAll(() => {
    // Restore console.error after all tests
    console.error = consoleError;
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
      const combinedData = Buffer.concat(chunks);

      try {
        // Extract the actual encrypted data from the combined chunk
        // First 4 bytes are the length prefix
        const encryptedLength = combinedData.readUInt32BE(0);

        if (encryptedLength <= 0 || encryptedLength > combinedData.length - 4) {
          throw new Error(
            `Invalid encrypted length: ${encryptedLength}, combined data length: ${combinedData.length}`,
          );
        }

        const encryptedData = combinedData.subarray(4, 4 + encryptedLength);

        // Verify the encrypted data can be decrypted
        const decryptedData = eciesService.decryptSimpleOrSingleWithHeader(
          keypair.privateKey,
          encryptedData,
        );

        expect(decryptedData).toEqual(inputData);
        done();
      } catch (error) {
        console.error('Error in encryption test:', error);
        done(error);
      }
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
      try {
        const combinedChunks = Buffer.concat(chunks);

        // Extract all the encrypted blocks
        let position = 0;
        const extractedChunks: Buffer[] = [];

        while (position < combinedChunks.length) {
          // Read length prefix
          const blockLength = combinedChunks.readUInt32BE(position);

          if (
            blockLength <= 0 ||
            blockLength > combinedChunks.length - position - 4
          ) {
            throw new Error(
              `Invalid block length: ${blockLength}, remaining bytes: ${combinedChunks.length - position - 4}`,
            );
          }

          position += 4; // Move past length prefix

          // Extract the encrypted data
          const encryptedBlock = combinedChunks.subarray(
            position,
            position + blockLength,
          );

          extractedChunks.push(encryptedBlock);
          position += blockLength; // Move to the next block
        }

        // We should have encrypted chunks in this test
        expect(extractedChunks.length).toBeGreaterThan(0);

        // Combine all extracted encrypted chunks
        const encryptedData = Buffer.concat(extractedChunks);

        // Verify the encrypted data can be decrypted
        const decryptedData = eciesService.decryptSimpleOrSingleWithHeader(
          keypair.privateKey,
          encryptedData,
        );

        expect(decryptedData).toEqual(inputData);
        done();
      } catch (error) {
        console.error('Error in streaming test:', error);
        done(error);
      }
    });

    // Write chunks immediately without artificial delays
    inputChunks.forEach((chunk) => {
      transform.write(chunk);
    });
    transform.end();
  }, 30000);

  it('should throw error with invalid public key', (done) => {
    // Create a flag to ensure we only call done() once
    let isDone = false;
    const safeDone = (error?: Error | unknown) => {
      if (!isDone) {
        isDone = true;
        done(error);
      }
    };

    const invalidPublicKey = randomBytes(32); // Wrong size for public key
    const transform = new EciesEncryptTransform(
      blockSize,
      invalidPublicKey,
      mockLogger,
    );
    const inputData = randomBytes(100);

    // Prevent other events from triggering done
    transform.on('end', () => {
      // Do nothing - we only care about the error event
    });

    transform.on('error', (error: EciesError) => {
      try {
        expect(error).toBeDefined();
        expect(error.type).toBe(EciesErrorType.InvalidEphemeralPublicKey);
        expect(error.message).toContain('Invalid ephemeral public key');
        expect(mockLogger.error).toHaveBeenCalled();
        expect(console.error).toHaveBeenCalledTimes(1);
        safeDone();
      } catch (testError) {
        safeDone(testError);
      }
    });

    try {
      transform.write(inputData);
      transform.end();
    } catch (e) {
      // If write/end throws synchronously, we need to catch it
      safeDone(e);
    }
  }, 10000);
});
