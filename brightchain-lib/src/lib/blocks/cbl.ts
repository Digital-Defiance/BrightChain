import { Member, type PlatformID } from '@digitaldefiance/ecies-lib';
import { BlockEncryptionType } from '../enumerations/blockEncryptionType';
import { BlockSize } from '../enumerations/blockSize';
import { IConstituentBlockListBlock } from '../interfaces/blocks/cbl';
import { ICBLServices } from '../interfaces/services/cblServices';
import { ServiceLocator } from '../services/serviceLocator';
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
 *
 * This class supports dependency injection for services to break circular
 * dependencies. When services are not provided, it falls back to using
 * ServiceLocator for backward compatibility.
 *
 * @typeParam TID - The platform ID type (defaults to Uint8Array)
 *
 * @example
 * ```typescript
 * // Using dependency injection (recommended)
 * const services: ICBLServices<Uint8Array> = {
 *   checksumService: checksumService,
 *   cblService: cblService,
 * };
 * const cbl = new ConstituentBlockListBlock(data, creator, blockSize, services);
 *
 * // Using ServiceLocator (backward compatible)
 * const cbl = new ConstituentBlockListBlock(data, creator, blockSize);
 * ```
 *
 * @requirements 2.1, 2.2, 2.4
 */
export class ConstituentBlockListBlock<TID extends PlatformID = Uint8Array>
  extends CBLBase<TID>
  implements IConstituentBlockListBlock<TID>
{
  /**
   * Create a new CBL block
   * @param data The CBL data (header + addresses, optionally padded)
   * @param creator The creator of the CBL
   * @param blockSize Optional block size for signature validation (required if data is unpadded)
   * @param services Optional injected services for dependency injection (breaks circular dependencies)
   *
   * @requirements 2.1, 2.2, 2.4
   */
  constructor(
    data: Uint8Array,
    creator: Member<TID>,
    blockSize?: BlockSize,
    services?: ICBLServices<TID>,
  ) {
    super(data, creator, blockSize, services);
  }

  /**
   * Get the maximum number of addresses that can be stored in a CBL block.
   * Does not account for encryption overhead.
   * @returns The maximum number of addresses
   */
  public get addressCapacity(): number {
    return ServiceLocator.getServiceProvider().cblService.calculateCBLAddressCapacity(
      this.blockSize,
      BlockEncryptionType.None,
    );
  }

  /**
   * Get the maximum number of addresses that can be stored in an encrypted CBL block.
   * Accounts for encryption overhead.
   * @returns The maximum number of addresses
   */
  public get encryptedAddressCapacity(): number {
    return ServiceLocator.getServiceProvider().cblService.calculateCBLAddressCapacity(
      this.blockSize,
      BlockEncryptionType.SingleRecipient,
    );
  }
}
