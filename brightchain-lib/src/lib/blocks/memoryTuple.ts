import { TupleSize } from "../constants";
import { ChecksumBuffer } from "../types";
import { BaseBlock } from "./base";

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
    public get xor(): BaseBlock {
        let block: BaseBlock = this.blocks[0];
        for (let i = 1; i < this.blocks.length; i++) {
            block = block.xor(this.blocks[i]);
        }
        return block;
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
}