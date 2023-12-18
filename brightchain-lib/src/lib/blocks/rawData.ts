import { BlockType } from "../enumerations/blockType";
import { EphemeralBlock } from "./ephemeral";

export class RawDataBlock extends EphemeralBlock {
  public override readonly blockType: BlockType = BlockType.RawData;
}