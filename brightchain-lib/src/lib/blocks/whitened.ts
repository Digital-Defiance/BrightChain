import { BlockType } from "../enumerations/blockType";
import { RawDataBlock } from "./rawData";

export class WhitenedBlock extends RawDataBlock {
    public override readonly blockType: BlockType = BlockType.OwnerFreeWhitenedBlock;
}