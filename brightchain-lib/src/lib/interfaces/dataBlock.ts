import { IBlock } from './blockBase';
export interface IDataBlock extends IBlock {
  /**
   * The date the block was created
   */
  get dateCreated(): Date;
  /**
   * The data length of the block before any encryption or padding overhead
   */
  get actualDataLength(): number;
  /**
   * Whether the block has been encrypted
   */
  get encrypted(): boolean;
  /**
   * Whether the block can be encrypted
   */
  get canEncrypt(): boolean;
  /**
   * Whether the block can be decrypted
   */
  get canDecrypt(): boolean;
  /**
   * Whether the checksum has been validated against the data
   */
  get validated(): boolean;
  /**
   * Trigger validation and return the result
   */
  validate(): boolean;
  /**
   * Whether the block can be signed
   */
  get canSign(): boolean;
}
