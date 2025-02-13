import { IConstituentBlockListBlock } from '../interfaces/cbl';
import { CBLCore } from './cblCore';

/**
 * Constituent Block List
 * Instance cannot be encrypted, see EncryptedConstituentBlockListBlock
 *
 * Header Structure:
 * [CreatorId][DateCreated][AddressCount][OriginalDataLength][TupleSize][CreatorSignature]
 * Followed by:
 * [Address Data][Padding]
 *
 * The signature is placed at the end of the header and signs both the header fields
 * and the address data that follows, ensuring integrity of the entire structure.
 */
export class ConstituentBlockListBlock
  extends CBLCore
  implements IConstituentBlockListBlock
{
  /**
   * Get the maximum number of addresses that can be stored in a CBL block.
   * Does not account for encryption overhead.
   * @returns The maximum number of addresses
   */
  public get addressCapacity(): number {
    return CBLCore.CblService.calculateCBLAddressCapacity(
      this.blockSize,
      false,
    );
  }

  /**
   * Get the maximum number of addresses that can be stored in an encrypted CBL block.
   * Accounts for encryption overhead.
   * @returns The maximum number of addresses
   */
  public get encryptedAddressCapacity(): number {
    return CBLCore.CblService.calculateCBLAddressCapacity(this.blockSize, true);
  }
}
