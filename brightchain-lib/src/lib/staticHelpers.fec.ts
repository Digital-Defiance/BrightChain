import { ReedSolomonErasure } from "@subspace/reed-solomon-erasure.wasm";
import { BlockSize } from "./enumerations/blockSizes";
import { BaseBlock } from "./blocks/base";
import { ParityBlock } from "./blocks/parity";

export class StaticHelpersFec {
    public static MaximumShardSize = BlockSize.Medium as number;
    /**
     * Given a data buffer, encode it using Reed-Solomon erasure coding.
     * This will produce a buffer of size (shardSize * (dataShards + parityShards)) or (shardSize * parityShards) if fecOnly is true.
     * @param data The data to encode.
     * @param shardSize The size of each shard.
     * @param dataShards The number of data shards.
     * @param parityShards The number of parity shards.
     * @param fecOnly If true, only the parity shards will be returned.
     */
    public static async fecEncode(data: Buffer, shardSize: number, dataShards: number, parityShards: number, fecOnly: boolean): Promise<Buffer> {
        if (data.length !== shardSize * dataShards) {
            throw new Error("Invalid data length");
        }

        if (shardSize > StaticHelpersFec.MaximumShardSize) {
            throw new Error("Invalid shard size");
        }

        const shards = new Uint8Array(shardSize * (dataShards + parityShards));
        shards.set(data);

        // Encoding
        const reedSolomonErasure = await ReedSolomonErasure.fromCurrentDirectory();
        reedSolomonErasure.encode(shards, dataShards, parityShards);
        return fecOnly ? Buffer.from(shards.subarray(shardSize * dataShards)) : Buffer.from(shards);
    }

    /**
     * Given a data buffer, reconstruct/repair it using Reed-Solomon erasure coding.
     * This will produce a buffer of size (shardSize * dataShards).
     * @param data The data to decode.
     * @param shardSize The size of each shard.
     * @param dataShards The number of data shards.
     * @param parityShards The number of parity shards.
     * @param shardsAvailable An array of booleans indicating which shards are available.
     * @returns 
     */
    public static async fecDecode(data: Buffer, shardSize: number, dataShards: number, parityShards: number, shardsAvailable: boolean[]): Promise<Buffer> {
        if (data.length !== shardSize * (dataShards + parityShards)) {
            throw new Error("Invalid data length");
        }
        const reedSolomonErasure = await ReedSolomonErasure.fromCurrentDirectory();
        reedSolomonErasure.reconstruct(data, dataShards, parityShards, shardsAvailable);
        const result = Buffer.from(data).subarray(0, shardSize * dataShards);
        return result;
    }
    /**
     * Given an input block, produce a set of parity blocks, each of the same size as the input block.
     * @param input The input block.
     * @param parityBlocks The number of parity blocks to produce.
     * @returns The parity blocks.
     */
    public static async createParityBlocks(input: BaseBlock, parityBlocks: number): Promise<ParityBlock[]> {
        const shardSize = input.blockSize > StaticHelpersFec.MaximumShardSize ? StaticHelpersFec.MaximumShardSize : input.blockSize;
        const requiredShards = Math.ceil(input.blockSize / shardSize);
        // work on the input data in chunks of up to 1MB (the maximum size of a shard)
        // we will build each parity block independently from the parity results of each chunk
        // eg we will split the parity up from each resultant chunk and concatenate them together
        // to form the final parity block
        const resultParityBlocks: Buffer[] = [];
        for (let i =0; i<parityBlocks; i++) {
            resultParityBlocks.push(Buffer.alloc(0));
        }
        // for each of the required shards, produce N parity shards, aggregate them together by block
        for (let i = 0; i < requiredShards; i++) {
            const chunk = input.data.subarray(i * shardSize, (i + 1) * shardSize);
            const chunkParity = await StaticHelpersFec.fecEncode(chunk, shardSize, 1, parityBlocks, true);
            for (let j=0; j<parityBlocks; j++) {
                const parityChunk = chunkParity.subarray(j * shardSize, (j + 1) * shardSize);
                resultParityBlocks[j] = Buffer.concat([resultParityBlocks[j], parityChunk]);
            }
        }
        const result: ParityBlock[] = [];
        for (let i = 0; i < parityBlocks; i++) {
            if (resultParityBlocks[i].length !== input.blockSize) {
                throw new Error(`Invalid parity block size ${resultParityBlocks[i].length} for block size ${input.blockSize}`);
            }
            result.push(new ParityBlock(input.blockSize, resultParityBlocks[i]));
        }
        return result;
    }
    public static async recoverDataBlocks(damagedBlock: BaseBlock, parityBlocks: ParityBlock[]): Promise<BaseBlock> {
        const shardSize = damagedBlock.blockSize > StaticHelpersFec.MaximumShardSize ? StaticHelpersFec.MaximumShardSize : damagedBlock.blockSize;
        const requiredShards = Math.ceil(damagedBlock.blockSize / shardSize);
        // divide the damaged block into shards
        // then divide each parity block back into shards and reconstruct each original shard
        let recoveredBlock: Buffer = Buffer.alloc(0);
        const availableShards: boolean[] = [];
        availableShards.push(false); // data block is presumed bad
        for (let i=0; i<parityBlocks.length; i++) {
            availableShards.push(true); // parity blocks are presumed good
        }
        for (let i=0;i<requiredShards; i++) {
            let damagedShard = damagedBlock.data.subarray(i * shardSize, (i + 1) * shardSize);
            for (let j=0; j<parityBlocks.length; j++) {
                damagedShard = Buffer.concat([damagedShard, parityBlocks[j].data.subarray(i * shardSize, (i + 1) * shardSize)]);
            }
            const recoveredShard = await StaticHelpersFec.fecDecode(damagedShard, shardSize, 1, parityBlocks.length, availableShards);
            recoveredBlock = Buffer.concat([recoveredBlock, recoveredShard]);
        }
        if (recoveredBlock.length !== damagedBlock.blockSize) {
            throw new Error(`Invalid recovered block size ${recoveredBlock.length} for block size ${damagedBlock.blockSize}`);
        }
        return new BaseBlock(damagedBlock.blockSize, recoveredBlock, true, false, damagedBlock.blockSize);
    }
}   