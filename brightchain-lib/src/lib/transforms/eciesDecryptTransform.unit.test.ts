import { EciesDecryptionTransform } from "./eciesDecryptTransform";
import { StaticHelpersECIES } from "../staticHelpers.ECIES";
import { BlockSize } from "../enumerations/blockSizes";

jest.mock('../staticHelpers.ECIES');

describe('EciesDecryptionTransform Unit Tests', () => {
  const blockSize = BlockSize.Small;
  const keypair = {
    publicKey: Buffer.alloc(0),
    privateKey: Buffer.alloc(0),
  };

  beforeEach(() => {
    StaticHelpersECIES.encrypt = jest.fn((publicKey, data) => {
      return Buffer.from(data.map(byte => (byte + 1) % 256));
    });
    StaticHelpersECIES.decrypt = jest.fn((privateKey, data) => {
      return Buffer.from(data.map(byte => (byte + 255) % 256));
    });
  });

  const testDecryption = (inputData: Buffer) => {
    const transform = new EciesDecryptionTransform(keypair.privateKey, blockSize);
    let decryptedData = Buffer.alloc(0);

    transform.on('data', (chunk) => {
      decryptedData = Buffer.concat([decryptedData, chunk]);
    });

    // First, encrypt the data
    const encryptedData = StaticHelpersECIES.encrypt(keypair.publicKey, inputData);
    // Write encrypted data to the transform
    transform.write(encryptedData);
    transform.end();

    // Compare the decrypted data with the original input data
    expect(decryptedData).toEqual(inputData);
  };

  it('decrypts data that is less than the chunk size', () => {
    const inputData = Buffer.from('short data');
    testDecryption(inputData);
  });

  it('decrypts data that is exactly the chunk size', () => {
    const inputData = Buffer.alloc(blockSize - StaticHelpersECIES.ecieOverheadLength, 'a');
    testDecryption(inputData);
  });

  it('decrypts data that spans multiple chunks', () => {
    const inputData = Buffer.alloc((blockSize - StaticHelpersECIES.ecieOverheadLength) * 2 + 10, 'a');
    testDecryption(inputData);
  });
});
