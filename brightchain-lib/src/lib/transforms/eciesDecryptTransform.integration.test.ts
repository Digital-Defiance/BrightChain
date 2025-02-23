import { randomBytes } from 'crypto';
import { Readable } from 'stream';
import { ECIES } from '../constants';
import { BlockSize } from '../enumerations/blockSizes';
import { SecureString } from '../secureString';
import { ECIESService } from '../services/ecies.service';
import { EciesDecryptionTransform } from './eciesDecryptTransform';

describe('EciesDecryptionTransform Integration Tests', () => {
  const blockSize = BlockSize.Small;
  let eciesService: ECIESService;
  let mnemonic: SecureString;
  let keypair: {
    privateKey: Buffer;
    publicKey: Buffer;
  };

  beforeEach(() => {
    eciesService = new ECIESService();
    mnemonic = eciesService.generateNewMnemonic();
    keypair = eciesService.mnemonicToSimpleKeyPairBuffer(mnemonic);
  });

  function encryptData(inputData: Buffer, publicKey: Buffer): Buffer {
    return eciesService.encrypt(publicKey, inputData);
  }

  const testEndToEndDecryption = async (inputData: Buffer): Promise<Buffer> => {
    // Encrypt the data
    const encryptedData = encryptData(inputData, keypair.publicKey);

    // Now decrypt the data
    const decryptionTransform = new EciesDecryptionTransform(
      keypair.privateKey,
      blockSize,
    );
    const decryptedChunks: Buffer[] = [];
    const readableForDecryption = new Readable({
      read() {
        this.push(encryptedData);
        this.push(null); // End the stream
      },
    });

    readableForDecryption.pipe(decryptionTransform);
    for await (const chunk of decryptionTransform) {
      decryptedChunks.push(chunk);
    }

    // Concatenate the decrypted chunks
    return Buffer.concat(decryptedChunks);
  };

  it('correctly decrypts data that was encrypted and spans multiple blocks', async () => {
    jest.setTimeout(10000); // Increase timeout to 10 seconds
    const testDataLength = 1000; // A reasonable size that would span multiple blocks
    const inputData = randomBytes(testDataLength);
    const decryptedData = await testEndToEndDecryption(inputData);
    expect(decryptedData).toEqual(inputData);
  });

  it('correctly decrypts data that was encrypted and is shorter than a block', async () => {
    jest.setTimeout(10000); // Increase timeout to 10 seconds
    const testDataLength = 100; // A small size that fits in one block
    const inputData = randomBytes(testDataLength);
    const decryptedData = await testEndToEndDecryption(inputData);
    expect(decryptedData).toEqual(inputData);
  });

  it('correctly decrypts data that was encrypted and is exactly one block', async () => {
    jest.setTimeout(10000); // Increase timeout to 10 seconds
    const testDataLength = blockSize - ECIES.OVERHEAD_SIZE;
    const inputData = randomBytes(testDataLength);
    const decryptedData = await testEndToEndDecryption(inputData);
    expect(decryptedData).toEqual(inputData);
  });
});
