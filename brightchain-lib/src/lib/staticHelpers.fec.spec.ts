import { randomBytes } from "crypto";
import { StaticHelpersFec } from "./staticHelpers.fec";
import { BlockSize } from "./enumerations/blockSizes";
import { BaseBlock } from "./blocks/base";

function buildAvailableBlocks(dataBlocks: number, parityBlocks: number): boolean[] {
    const availableBlocks = [];
    for (let i=0; i<dataBlocks; i++) {
        availableBlocks.push(false);
    }
    for (let i=0; i<parityBlocks; i++) {
        availableBlocks.push(true);
    }
    return availableBlocks;
}

describe('staticHelpers.fec', () => {
    it('should encode and decode with no errors present', async () => {
        // testing with Large or Huge blocks fails due to memory/algorithm constraints
        const blockSize = BlockSize.Medium as number;
        const input = randomBytes(blockSize);
        const fec = new StaticHelpersFec();
        const dataBlocks = 1;
        const parityBlocks = 2;
        const encoded = await fec.fecEncode(input, blockSize, dataBlocks, parityBlocks, false);
        expect(encoded.length).toBe(blockSize * (dataBlocks + parityBlocks));
        // introduce up to (parityBlocks * blockSize) - 1 / 2 errors within the original data portion of the encoded data
        for (let i = 0; i < ((parityBlocks * blockSize) - 1) / 2; i++) {
            const randomOffset = Math.floor(Math.random() * (dataBlocks * blockSize));
            encoded[randomOffset] = Math.floor(Math.random() * 255);
        }
        const decoded = await fec.fecDecode(encoded, blockSize, dataBlocks, parityBlocks, buildAvailableBlocks(dataBlocks, parityBlocks));
        expect(decoded.length).toBe(blockSize);
        expect(decoded).toStrictEqual(input);
    });
    // large and huge sizes fail due to memory constraints
    const testBlockSizes = [BlockSize.Message, BlockSize.Tiny, BlockSize.Small, BlockSize.Medium];
    const parityBlockCounts = [1, 2];
    testBlockSizes.forEach((blockSize: BlockSize) => {
        parityBlockCounts.forEach((parityBlockCount: number) => {
            it(`should produce parity blocks that can be used to recover from errors with size ${blockSize} and ${parityBlockCount} parity blocks`, async () => {
                const input = randomBytes(blockSize);
                const originalInput = Buffer.from(input);
                const inputBlock = new BaseBlock(blockSize, input, true, false, blockSize as number);
                const fec = new StaticHelpersFec();
                const parityBlocks = await fec.createParityBlocks(inputBlock, parityBlockCount);
                // damage the input block
                // we want to make sure to damage each 1 mb chunk of the input block by at least a few bytes,
                // though it should be able to tolerate just under half a megabyte of errors
                const chunksRequired = Math.ceil(blockSize as number / StaticHelpersFec.MaximumShardSize);
                const chunkSize = Math.floor(blockSize as number / chunksRequired);
                const damagePerChunk = (chunkSize - 1) / 2;
                for (let i=0; i<chunksRequired; i++) {
                    for (let j=0; j<damagePerChunk; j++) {
                        // pick a random offset within the chunk
                        const randomOffset = Math.floor(Math.random() * chunkSize) + (i * chunkSize);
                        inputBlock.data[randomOffset] = Math.floor(Math.random() * 255);
                    }
                }
                const damagedBlock = new BaseBlock(blockSize, inputBlock.data, true, false, blockSize as number);
                const recoveredBlock = await fec.recoverDataBlocks(damagedBlock, parityBlocks);
                expect(recoveredBlock.data).toStrictEqual(originalInput);
            });
        });
    });
});