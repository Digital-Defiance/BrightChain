import { createECDH, randomBytes } from 'crypto';
import { BlockSize } from '../enumerations/blockSizes';
import { StaticHelpersECIES } from '../staticHelpers.ECIES';
import { EciesDecryptionTransform } from './eciesDecryptTransform';
import { EciesEncryptTransform } from './eciesEncryptTransform';

describe('EciesEncryptTransform Integration Tests', () => {
  const blockSize = BlockSize.Small;
  // Create real ECDH keys for actual encryption/decryption
  const ecdh = createECDH(StaticHelpersECIES.curveName);
  ecdh.generateKeys();
  // Get raw keys
  const keypair = {
    privateKey: ecdh.getPrivateKey(),
    publicKey: ecdh.getPublicKey(), // Use raw public key directly
  };

  const testEncryptionDecryption = (
    inputData: Buffer,
    done: jest.DoneCallback,
  ) => {
    const encryptTransform = new EciesEncryptTransform(
      blockSize,
      keypair.publicKey,
    );
    let encryptedData = Buffer.alloc(0);
    const decryptTransform = new EciesDecryptionTransform(
      keypair.privateKey,
      blockSize,
    );
    let decryptedData = Buffer.alloc(0);

    encryptTransform.on('data', (chunk: Buffer) => {
      encryptedData = Buffer.concat([encryptedData, chunk]);
    });

    encryptTransform.on('error', (error: Error) => {
      done(error);
    });

    decryptTransform.on('data', (chunk: Buffer) => {
      decryptedData = Buffer.concat([decryptedData, chunk]);
    });

    decryptTransform.on('error', (error) => {
      done(error);
    });

    decryptTransform.on('end', () => {
      try {
        expect(decryptedData).toEqual(inputData);
        done();
      } catch (error) {
        done(error);
      }
    });

    encryptTransform.pipe(decryptTransform);
    encryptTransform.write(inputData);
    encryptTransform.end();
  };

  it('encrypts and decrypts data that is less than the chunk size', (done) => {
    const inputData = Buffer.from('short data');
    testEncryptionDecryption(inputData, done);
  });

  it('encrypts and decrypts data that is exactly the chunk size', (done) => {
    const inputData = Buffer.alloc(
      (blockSize as number) - StaticHelpersECIES.eciesOverheadLength,
      'a',
    );
    testEncryptionDecryption(inputData, done);
  });

  it('encrypts and decrypts data that spans multiple chunks', (done) => {
    const inputData = Buffer.alloc(
      ((blockSize as number) - StaticHelpersECIES.eciesOverheadLength) * 2 + 10,
      'a',
    );
    testEncryptionDecryption(inputData, done);
  });

  it('handles empty input correctly', (done) => {
    const encryptTransform = new EciesEncryptTransform(
      blockSize,
      keypair.publicKey,
    );
    let encryptedData = Buffer.alloc(0);

    encryptTransform.on('data', (chunk: Buffer) => {
      encryptedData = Buffer.concat([encryptedData, chunk]);
    });

    // Handle encryption completion
    encryptTransform.on('end', () => {
      expect(encryptedData.length).toBe(0);

      const decryptTransform = new EciesDecryptionTransform(
        keypair.privateKey,
        blockSize,
      );
      let decryptedData = Buffer.alloc(0);

      decryptTransform.on('data', (chunk: Buffer) => {
        decryptedData = Buffer.concat([decryptedData, chunk]);
      });

      // Handle decryption completion
      decryptTransform.on('end', () => {
        try {
          expect(decryptedData.length).toBe(0);
          done();
        } catch (error) {
          done(error);
        }
      });

      decryptTransform.write(encryptedData);
      decryptTransform.end();
    });

    encryptTransform.end();
  });

  it('handles large data correctly', (done) => {
    const inputData = randomBytes(1024 * 1024); // 1MB
    testEncryptionDecryption(inputData, done);
  });

  describe('random data tests', () => {
    const sizes = [100, 500, 1000, 5000, 10000];

    sizes.forEach((size) => {
      it(`handles data of size ${size} correctly`, (done) => {
        const inputData = randomBytes(size);
        testEncryptionDecryption(inputData, done);
      });
    });
  });
});
