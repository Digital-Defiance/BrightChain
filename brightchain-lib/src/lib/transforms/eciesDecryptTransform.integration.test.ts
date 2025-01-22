import { randomBytes } from 'crypto';
import { Readable } from 'stream';
import { BlockSize } from '../enumerations/blockSizes';
import { StaticHelpersECIES } from '../staticHelpers.ECIES';
import { EciesDecryptionTransform } from './eciesDecryptTransform';

function encryptData(inputData: Buffer, publicKey: Buffer): Buffer {
  return StaticHelpersECIES.encrypt(publicKey, inputData);
}

describe('EciesDecryptionTransform Integration Tests', () => {
  const blockSize = BlockSize.Small;
  const mnemonic = StaticHelpersECIES.generateNewMnemonic();
  const keypair = StaticHelpersECIES.mnemonicToSimpleKeyPairBuffer(mnemonic);

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
    const testDataLength = 1000; // A reasonable size that would span multiple blocks
    const inputData = randomBytes(testDataLength);
    const decryptedData = await testEndToEndDecryption(inputData);
    expect(decryptedData).toEqual(inputData);
  });

  it('correctly decrypts data that was encrypted and is shorter than a block', async () => {
    const testDataLength = 100; // A small size that fits in one block
    const inputData = randomBytes(testDataLength);
    const decryptedData = await testEndToEndDecryption(inputData);
    expect(decryptedData).toEqual(inputData);
  });

  it('correctly decrypts data that was encrypted and is exactly one block', async () => {
    const testDataLength = blockSize - StaticHelpersECIES.eciesOverheadLength;
    const inputData = randomBytes(testDataLength);
    const decryptedData = await testEndToEndDecryption(inputData);
    expect(decryptedData).toEqual(inputData);
  });
});
