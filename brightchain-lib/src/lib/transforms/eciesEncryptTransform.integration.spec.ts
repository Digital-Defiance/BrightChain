import { EciesEncryptionTransform } from "./eciesEncryptTransform";
import { EthereumECIES } from "../ethereumECIES";
import { BlockSize } from "../enumerations/blockSizes";
import { Readable } from "stream";
import { randomBytes } from "crypto";


describe('EciesEncryptionTransform Integration Tests', () => {
    const blockSize = BlockSize.Small; // Numeric value representing the number of bytes
    const chunkSize = blockSize - EthereumECIES.ecieOverheadLength;
    const mnemonic = EthereumECIES.generateNewMnemonic();
    const keypair = EthereumECIES.mnemonicToSimpleKeyPairBuffer(mnemonic);

    const testEndToEndEncryption = async (inputData: Buffer): Promise<Buffer> => {
        const transform = new EciesEncryptionTransform(blockSize, keypair.publicKey);
        const encryptedChunks: Buffer[] = [];
        const readable = new Readable({
            read() {
                this.push(inputData);
                this.push(null); // End the stream
            }
        });

        readable.pipe(transform);

        for await (const chunk of transform) {
            encryptedChunks.push(chunk);
        }

        // Concatenate the encrypted chunks and then decrypt in blocksize chunks
        const encryptedData = Buffer.concat(encryptedChunks);
        const decryptedChunks: Buffer[] = [];
        for (let i = 0; i < encryptedData.length; i += blockSize) {
            const block = encryptedData.subarray(i, i + blockSize);
            const decryptedBlock = EthereumECIES.decrypt(keypair.privateKey, block);
            decryptedChunks.push(decryptedBlock);
        }

        // Concatenate the decrypted chunks
        const decryptedData = Buffer.concat(decryptedChunks);
        // Slice to match the original inputData length
        return decryptedData.subarray(0, inputData.length);
    };

    it('correctly encrypts and decrypts data spanning multiple blocks', async () => {
        const testDataLength = chunkSize * 3; // Ensuring data spans multiple blocks
        const inputData = randomBytes(testDataLength); // Create test data
        const decryptedData = await testEndToEndEncryption(inputData);

        expect(decryptedData).toEqual(inputData);
    });

    it('correctly encrypts and decrypts data shorter than a block', async () => {
        const testDataLength = chunkSize - 1; // Ensuring data is less than one block
        const inputData = randomBytes(testDataLength); // Create test data
        const decryptedData = await testEndToEndEncryption(inputData);

        // Truncate the decrypted data to the length of the original input data
        const truncatedDecryptedData = decryptedData.subarray(0, inputData.length);
        expect(truncatedDecryptedData).toEqual(inputData);
    });

    it('correctly encrypts and decrypts data spanning multiple blocks with a final block that is less than a block', async () => {
        const testDataLength = chunkSize * 3 + 1; // Ensuring data spans multiple blocks
        const inputData = randomBytes(testDataLength); // Create test data
        const decryptedData = await testEndToEndEncryption(inputData);

        // Truncate the decrypted data to the length of the original input data
        const truncatedDecryptedData = decryptedData.subarray(0, inputData.length);
        expect(truncatedDecryptedData).toEqual(inputData);
    });
});
