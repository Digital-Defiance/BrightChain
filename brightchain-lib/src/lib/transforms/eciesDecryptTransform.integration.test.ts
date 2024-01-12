import { EciesDecryptionTransform } from "./eciesDecryptTransform";
import { StaticHelpersECIES } from "../staticHelpers.ECIES";
import { BlockSize } from "../enumerations/blockSizes";
import { Readable } from "stream";
import { randomBytes } from "crypto";

function makeEncryptedBlocks(inputData: Buffer, blockSize: BlockSize, publicKey: Buffer): Buffer {
  const chunkSize = blockSize - StaticHelpersECIES.ecieOverheadLength;
  let encryptedBuffer = Buffer.alloc(0);
  for (let i = 0; i < inputData.length; i += chunkSize) {
    let block = inputData.subarray(i, i + chunkSize);
    if (block.length < chunkSize) {
      // Pad the last block with random data
      const padding = randomBytes(chunkSize - block.length);
      block = Buffer.concat([block, padding]);
    }
    const encryptedBlock = StaticHelpersECIES.encrypt(publicKey, block);
    encryptedBuffer = Buffer.concat([encryptedBuffer, encryptedBlock]);
  }
  return encryptedBuffer;
}

describe('EciesDecryptionTransform Integration Tests', () => {
  const blockSize = BlockSize.Small; // Numeric value representing the number of bytes
  const chunkSize = blockSize - StaticHelpersECIES.ecieOverheadLength;
  const mnemonic = StaticHelpersECIES.generateNewMnemonic();
  const keypair = StaticHelpersECIES.mnemonicToSimpleKeyPairBuffer(mnemonic);

  const testEndToEndDecryption = async (inputData: Buffer): Promise<Buffer> => {
    // Encrypt the data using makeEncryptedBlocks
    const encryptedData = makeEncryptedBlocks(inputData, blockSize, keypair.publicKey);

    // Now decrypt the data
    const decryptionTransform = new EciesDecryptionTransform(keypair.privateKey, blockSize);
    const decryptedChunks: Buffer[] = [];
    const readableForDecryption = new Readable({
      read() {
        this.push(encryptedData);
        this.push(null); // End the stream
      }
    });

    readableForDecryption.pipe(decryptionTransform);
    for await (const chunk of decryptionTransform) {
      decryptedChunks.push(chunk);
    }

    // Concatenate the decrypted chunks
    return Buffer.concat(decryptedChunks);
  };

  it('correctly decrypts data that was encrypted and spans multiple blocks', async () => {
    const testDataLength = chunkSize * 3; // Ensuring data spans multiple blocks
    const inputData = randomBytes(testDataLength); // Create test data
    const decryptedData = await testEndToEndDecryption(inputData);

    expect(decryptedData).toEqual(inputData);
  });

  it('correctly decrypts data that was encrypted and is shorter than a block', async () => {
    const testDataLength = chunkSize - 1; // Ensuring data is less than one block
    const inputData = randomBytes(testDataLength); // Create test data
    const decryptedData = await testEndToEndDecryption(inputData);
    // strip any padding from the decrypted data
    const truncatedDecryptedData = decryptedData.subarray(0, inputData.length);

    expect(truncatedDecryptedData).toEqual(inputData);
  });

  it('correctly decrypts data that was encrypted and spans multiple blocks with a final block that is less than a block', async () => {
    const testDataLength = chunkSize * 3 + 1; // Ensuring data spans multiple blocks
    const inputData = randomBytes(testDataLength); // Create test data
    const decryptedData = await testEndToEndDecryption(inputData);
    // strip any padding from the decrypted data
    const truncatedDecryptedData = decryptedData.subarray(0, inputData.length);

    expect(truncatedDecryptedData).toEqual(inputData);
  });
});
