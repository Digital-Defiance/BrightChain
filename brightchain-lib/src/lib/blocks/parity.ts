import { BlockType } from "../enumerations/blockType";
import { RawDataBlock } from "./rawData";

export class ParityBlock extends RawDataBlock {
  public override readonly blockType: BlockType = BlockType.FECData;
}