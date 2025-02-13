import { GuidV4 } from '../../../guid';
import { SignatureBuffer } from '../../../types';

export interface IConstituentBlockListBlockHeader {
  /**
   * Creator ID of the CBL
   */
  get creatorId(): GuidV4;
  /**
   * Date the CBL was created
   */
  get dateCreated(): Date;
  /**
   * Number of addresses in the CBL
   */
  get cblAddressCount(): number;
  /**
   * Size of the file represented by the CBL (spanning all blocks)
   */
  get originalDataLength(): number;
  /**
   * Tuple size for the CBL
   */
  get tupleSize(): number;
  /**
   * Signature of the creator
   */
  get creatorSignature(): SignatureBuffer;
}
