import {
  SignatureUint8Array,
  type PlatformID,
} from '@digitaldefiance/ecies-lib';

export interface IConstituentBlockListBlockHeader<
  TID extends PlatformID = Uint8Array,
> {
  /**
   * Creator ID of the CBL
   */
  readonly creatorId: TID;
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
