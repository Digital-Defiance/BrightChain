import { TupleSize } from '../constants';
import { ChecksumBuffer } from '../types';
import { BaseBlock } from './base';
import { EncryptedConstituentBlockListBlock } from './encryptedCbl';
import { InMemoryBlockTuple } from './memoryTuple';

export class EncryptedCblTuple extends InMemoryBlockTuple {
    constructor(blocks: BaseBlock[]) {
        if (blocks.length != TupleSize) {
            throw new Error(`Tuple must have ${TupleSize} blocks`);
        }
        super(blocks);
    }
    public static override fromIds(blockIDs: ChecksumBuffer[], fetchBlock: (blockId: ChecksumBuffer) => BaseBlock): InMemoryBlockTuple {
        if (blockIDs.length != TupleSize) {
            throw new Error(`Tuple must have ${TupleSize} blocks`);
        }
        return super.fromIds(blockIDs, fetchBlock);
    }
    public xorToEncryptedCBL(): EncryptedConstituentBlockListBlock {
        const resultBlock = this.xor<EncryptedConstituentBlockListBlock>();
        return resultBlock;
    }
}