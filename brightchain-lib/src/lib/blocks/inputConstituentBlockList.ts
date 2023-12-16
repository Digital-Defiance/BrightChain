import { BlockType } from "../enumerations/blockType";
import { EphemeralBlock } from "./ephemeral";

export class InputConstituentBlockListBlock extends EphemeralBlock {
  public readonly blockType = BlockType.InputConstituentBlockList;
}