import { EciesEncryptionTransform } from "./eciesEncryptTransform";
import { StaticHelpersECIES } from "../staticHelpers.ECIES";
import { BlockSize } from "../enumerations/blockSizes";

jest.mock('../staticHelpers.ECIES');

describe('EciesEncryptionTransform Unit Tests', () => {
    const blockSize = BlockSize.Small;
    const keypair = {
        publicKey: Buffer.alloc(0),
        privateKey: Buffer.alloc(0),
    };

    beforeEach(() => {
        StaticHelpersECIES.encrypt = jest.fn((publicKey, data) => {
            return Buffer.from(data.map(byte => (byte + 1) % 256));
        });
        StaticHelpersECIES.decrypt = jest.fn((publicKey, data) => {
            return Buffer.from(data.map(byte => (byte + 255) % 256));
        });
    });
    const testEncryption = (inputData: Buffer) => {
        const transform = new EciesEncryptionTransform(blockSize, keypair.publicKey);
        let encryptedData = Buffer.alloc(0);

        transform.on('data', (chunk) => {
            encryptedData = Buffer.concat([encryptedData, chunk]);
        });

        transform.write(inputData);
        transform.end();

        // Split the encrypted data into blocks and decrypt each one
        const decryptedData: Buffer[] = [];
        for (let i = 0; i < encryptedData.length; i += blockSize) {
            const block = encryptedData.subarray(i, i + blockSize);
            const decryptedBlock = StaticHelpersECIES.decrypt(keypair.privateKey, block);
            decryptedData.push(decryptedBlock);
        }

        // Concatenate decrypted data and remove padding from the last block
        const decryptedBuffer = Buffer.concat(decryptedData);
        const finalDecryptedData = decryptedBuffer.subarray(0, inputData.length);

        // Compare the final decrypted data with the original input data
        expect(finalDecryptedData).toEqual(inputData);
    };

    it('encrypts and decrypts data that is less than the chunk size', () => {
        const inputData = Buffer.from('short data');
        testEncryption(inputData);
    });

    it('encrypts and decrypts data that is exactly the chunk size', () => {
        const inputData = Buffer.alloc(blockSize - StaticHelpersECIES.ecieOverheadLength, 'a');
        testEncryption(inputData);
    });

    it('encrypts and decrypts data that spans multiple chunks', () => {
        const inputData = Buffer.alloc((blockSize - StaticHelpersECIES.ecieOverheadLength) * 2 + 10, 'a');
        testEncryption(inputData);
    });
});