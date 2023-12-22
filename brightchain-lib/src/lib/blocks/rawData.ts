import { BlockType } from "../enumerations/blockType";
import { BaseBlock } from "./base";

export class RawDataBlock extends BaseBlock {
  public override readonly blockType: BlockType = BlockType.RawData;
}