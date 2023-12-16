import { BlockType } from "../enumerations/blockType";
import { EphemeralBlock } from "./ephemeral";

export class ConstituentBlockListBlock extends EphemeralBlock {
  public readonly blockType = BlockType.ConstituentBlockList;
}