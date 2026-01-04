import { GuidV4 } from '@digitaldefiance/ecies-lib';
import { SignatureUint8Array } from '../../../types';

export interface IConstituentBlockListBlockHeader {
  /**
   * Creator ID of the CBL
   */
  readonly creatorId: GuidV4;
  /**
   * Date the CBL was created
   */
  readonly dateCreated: Date;
  /**
   * Number of addresses in the CBL
   */
  readonly cblAddressCount: number;
  /**
   * Size of the file represented by the CBL (spanning all blocks)
   */
  readonly originalDataLength: number;
  /**
   * Tuple size for the CBL
   */
  readonly tupleSize: number;
  /**
   * Signature of the creator
   */
  readonly creatorSignature: SignatureUint8Array;
}
