import { BrightChainMember } from '../brightChainMember'; // Import BrightChainMember
import { BlockEncryptionType } from '../enumerations/blockEncryptionType'; // Import BlockEncryptionType
import { IConstituentBlockListBlock } from '../interfaces/blocks/cbl';
import { CBLService } from '../services/cblService'; // Import CBLService
import { ChecksumService } from '../services/checksum.service'; // Import ChecksumService
// Removed: import { ServiceLocator } from '../services/serviceLocator';
import { CBLBase } from './cblBase';

/**
 * Constituent Block List
 *
 * Header Structure:
 * [CreatorId][DateCreated][AddressCount][TupleSize][OriginalDataLength][OriginalDataChecksum][CreatorSignature]
 * Followed by:
 * [Address Data][Padding]
 *
 * The signature is placed at the end of the header and signs both the header fields
 * and the address data that follows, ensuring integrity of the entire structure.
 */
export class ConstituentBlockListBlock
  extends CBLBase
  implements IConstituentBlockListBlock
{
  constructor(
    data: Buffer,
    creator: BrightChainMember,
    cblService: CBLService,
    checksumService: ChecksumService,
  ) {
    super(data, creator, cblService, checksumService);
  }
  /**
   * Get the maximum number of addresses that can be stored in a CBL block.
   * Does not account for encryption overhead.
   * @returns The maximum number of addresses
   */
  public get addressCapacity(): number {
    // Use injected cblService
    return this.cblService.calculateCBLAddressCapacity(
      this.blockSize,
      BlockEncryptionType.None, // Assuming false means None
    );
  }

  /**
   * Get the maximum number of addresses that can be stored in an encrypted CBL block.
   * Accounts for encryption overhead.
   * @returns The maximum number of addresses
   */
  public get encryptedAddressCapacity(): number {
    // Use injected cblService
    return this.cblService.calculateCBLAddressCapacity(
      this.blockSize,
      BlockEncryptionType.SingleRecipient, // Assuming true means SingleRecipient (or MultiRecipient)
    );
  }
}
