import { TupleSize } from "../constants";
import { ChecksumBuffer } from "../types";
import { BaseBlock } from "./base";
import { EncryptedOwnedDataBlock } from "./encryptedOwnedData";
import { OwnedDataBlock } from "./ownedData";
import { RandomBlock } from "./random";
import { WhitenedBlock } from "./whitened";

export class InMemoryBlockTuple {
    public static readonly TupleSize = TupleSize;
    public readonly blocks: BaseBlock[];
    public get blockIds(): ChecksumBuffer[] {
        return this.blocks.map((block) => block.id);
    }
    public get blockIdsBuffer(): Buffer {
        return Buffer.concat(this.blockIds);
    }
    /**
     * XOR all blocks together
     */
    public xor<T extends BaseBlock>(): T {
        let block: BaseBlock = this.blocks[0];
        for (let i = 1; i < this.blocks.length; i++) {
            block = block.xor<T>(this.blocks[i]);
        }
        return block as T;
    }
    constructor(blocks: BaseBlock[]) {
        this.blocks = blocks;
        if (blocks.length !== TupleSize) {
            throw new Error(`Tuple must have ${TupleSize} blocks`);
        }
    }
    public static fromIds(blockIDs: ChecksumBuffer[], fetchBlock: (blockId: ChecksumBuffer) => BaseBlock): InMemoryBlockTuple {
        const blocks = blockIDs.map((blockId) => fetchBlock(blockId));
        return new InMemoryBlockTuple(blocks);
    }
    public static xorSourceToPrimeWhitened(sourceBlock: BaseBlock | EncryptedOwnedDataBlock, whiteners: WhitenedBlock[], randomBlocks: RandomBlock[]): WhitenedBlock {
        let block: BaseBlock = sourceBlock;
        for(let i=0;i<whiteners.length;i++) {
            block = block.xor<WhitenedBlock>(whiteners[i]);
        }
        for(let i=0;i<randomBlocks.length;i++) {
            block = block.xor<WhitenedBlock>(randomBlocks[i]);
        }
        return block as WhitenedBlock;
    }
    public static makeTupleFromSourceXor(sourceBlock: BaseBlock | EncryptedOwnedDataBlock, whiteners: WhitenedBlock[], randomBlocks: RandomBlock[]): InMemoryBlockTuple {
        const primeWhitenedBlock = this.xorSourceToPrimeWhitened(sourceBlock, whiteners, randomBlocks);
        const tuple = new InMemoryBlockTuple([primeWhitenedBlock, ...whiteners, ...randomBlocks]);
        return tuple;
    }
    public static xorDestPrimeWhitenedToOwned(primeWhitenedBlock: WhitenedBlock, whiteners: WhitenedBlock[]): OwnedDataBlock {
        let block: BaseBlock = primeWhitenedBlock;
        for(let i=0;i<whiteners.length;i++) {
            block = block.xor<BaseBlock>(whiteners[i]);
        }
        return block as OwnedDataBlock;
    }
    public static makeTupleFromDestXor(primeWhitenedBlock: WhitenedBlock, whiteners: WhitenedBlock[]): InMemoryBlockTuple {
        const ownedDataBlock = this.xorDestPrimeWhitenedToOwned(primeWhitenedBlock, whiteners);
        const tuple = new InMemoryBlockTuple([ownedDataBlock, ...whiteners]);
        return tuple;
    }
}