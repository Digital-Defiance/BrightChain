import { Member, PlatformID, ShortHexGuid, uint8ArrayToHex } from '@digitaldefiance/ecies-lib';
import { BaseBlock } from '../../blocks/base';
import { ConstituentBlockListBlock } from '../../blocks/cbl';
import { RawDataBlock } from '../../blocks/rawData';
import { BlockSize } from '../../enumerations/blockSize';
import { MemberErrorType } from '../../enumerations/memberErrorType';
import { FactoryPatternViolationError } from '../../errors/factoryPatternViolationError';
import { MemberError } from '../../errors/memberError';
import { BlockStoreFactory } from '../../factories/blockStoreFactory';
import { IMemberStorageData } from '../../interfaces/member/storage';
import { MemberCblService } from '../../services/member/memberCblService';
import { Checksum } from '../../types/checksum';
import { Document } from '../base';
import { BaseMemberDocument } from './baseMemberDocument';
import { memberHydrationSchema } from './memberHydration';
import { memberOperationalFactory } from './memberOperational';

/**
 * Type guard for ConstituentBlockListBlock
 * @internal - Currently unused but kept for future use
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function isConstituentBlockListBlock(
  block: BaseBlock | RawDataBlock | unknown,
): block is ConstituentBlockListBlock {
  return block instanceof ConstituentBlockListBlock;
}

/**
 * Private symbol used to verify factory method usage.
 * This ensures that MemberDocument can only be instantiated through the create() factory method.
 * @internal
 */
const FACTORY_TOKEN = Symbol('MemberDocument.factory-token');

/**
 * Concrete implementation of member document using CBLs.
 *
 * @remarks
 * This class uses the factory pattern to ensure proper initialization and validation.
 * Direct instantiation via `new MemberDocument()` is not allowed - use the static
 * `create()` method instead.
 *
 * @example
 * ```typescript
 * // Correct usage - use factory method
 * const doc = MemberDocument.create(publicMember, privateMember);
 *
 * // Incorrect usage - will throw FactoryPatternViolationError
 * // const doc = new MemberDocument(publicMember, privateMember);
 * ```
 *
 * @see Requirements 2.1, 2.2, 2.3, 2.4
 */
export class MemberDocument<
  TID extends PlatformID = Uint8Array,
> extends BaseMemberDocument {
  private cblService: MemberCblService<TID>;
  private originalPublicMember: Member<TID>;
  private originalPrivateMember: Member<TID>;
  private readonly _blockSize: BlockSize;

  /**
   * Get the document ID as ShortHexGuid
   */
  public override get id(): ShortHexGuid {
    // Use uint8ArrayToHex for consistent ShortHexGuid format
    return uint8ArrayToHex(this.originalPublicMember.idBytes) as ShortHexGuid;
  }

  /**
   * Convert Member to storage data
   */
  private static toStorageData<TID extends PlatformID = Uint8Array>(
    member: Member<TID>,
  ): IMemberStorageData {
    if (!member?.id || !member.type || !member.name) {
      throw new MemberError(MemberErrorType.InvalidMemberData);
    }

    const hydrated = memberOperationalFactory<TID>().extract(member);
    const schema = memberHydrationSchema<TID>();
    return schema.dehydrate(hydrated);
  }

  /**
   * Private constructor - use the static create() factory method instead.
   *
   * @param factoryToken - Internal token to verify factory method usage
   * @param publicMember - The public member data
   * @param privateMember - The private member data
   * @param publicCBLId - Optional public CBL ID
   * @param privateCBLId - Optional private CBL ID
   * @param config - Optional configuration
   *
   * @throws {FactoryPatternViolationError} If called without the factory token
   *
   * @internal
   */
  constructor(
    factoryToken: symbol,
    publicMember: Member<TID>,
    privateMember: Member<TID>,
    publicCBLId?: Checksum,
    privateCBLId?: Checksum,
    config?: { blockSize?: BlockSize },
  ) {
    // Verify this was called from factory method
    if (factoryToken !== FACTORY_TOKEN) {
      throw new FactoryPatternViolationError('MemberDocument', {
        hint: 'Use MemberDocument.create() instead of new MemberDocument()',
      });
    }

    super(
      MemberDocument.toStorageData(publicMember),
      MemberDocument.toStorageData(privateMember),
      publicCBLId,
      privateCBLId,
    );
    this._blockSize = config?.blockSize ?? BlockSize.Small;
    // Create a unique block store for each document instance to avoid conflicts
    const blockStore = BlockStoreFactory.createMemoryStore({ blockSize: this._blockSize });
    this.cblService = new MemberCblService(blockStore);

    // Store original member instances
    this.originalPublicMember = publicMember;
    this.originalPrivateMember = privateMember;
  }

  /**
   * Factory method to create a new MemberDocument instance.
   *
   * This is the only supported way to create MemberDocument instances.
   * Direct instantiation via `new MemberDocument()` is not allowed and will
   * throw a FactoryPatternViolationError.
   *
   * @param publicMember - The public member data containing public key information
   * @param privateMember - The private member data containing private key information
   * @param publicCBLId - Optional existing public CBL ID to associate with this document
   * @param privateCBLId - Optional existing private CBL ID to associate with this document
   * @param config - Optional configuration object
   * @param config.blockSize - The block size to use for CBL operations (default: BlockSize.Small)
   *
   * @returns A new MemberDocument instance
   *
   * @throws {MemberError} If the member data is invalid (missing id, type, or name)
   *
   * @example
   * ```typescript
   * import { MemberDocument } from './memberDocument';
   * import { Member } from '@digitaldefiance/ecies-lib';
   *
   * // Create members
   * const publicMember = Member.create({ ... });
   * const privateMember = Member.create({ ... });
   *
   * // Create document using factory method
   * const doc = MemberDocument.create(publicMember, privateMember);
   *
   * // With optional configuration
   * const docWithConfig = MemberDocument.create(
   *   publicMember,
   *   privateMember,
   *   undefined,
   *   undefined,
   *   { blockSize: BlockSize.Medium }
   * );
   * ```
   *
   * @see Requirements 2.1, 2.2, 2.3, 2.4, 2.5
   */
  public static create<TID extends PlatformID = Uint8Array>(
    publicMember: Member<TID>,
    privateMember: Member<TID>,
    publicCBLId?: Checksum,
    privateCBLId?: Checksum,
    config?: { blockSize?: BlockSize },
  ): MemberDocument<TID> {
    return new MemberDocument<TID>(
      FACTORY_TOKEN,
      publicMember,
      privateMember,
      publicCBLId,
      privateCBLId,
      config,
    );
  }

  /**
   * Get public CBL ID
   */
  public override getPublicCBL(): Checksum {
    if (!this.publicCBLId) {
      throw new Error('Public CBL ID not set');
    }
    return this.publicCBLId;
  }

  /**
   * Get private CBL ID
   */
  public override getPrivateCBL(): Checksum {
    if (!this.privateCBLId) {
      throw new Error('Private CBL ID not set');
    }
    return this.privateCBLId;
  }

  /**
   * Convert public data to CBL
   */
  public override async toPublicCBL(): Promise<Uint8Array> {
    try {
      // Use the original member instance instead of recreating from storage
      const block = await this.cblService.createMemberCbl(
        this.originalPublicMember,
        this.originalPublicMember, // Use public data as creator
      );

      // Get the block's data
      const data = block.data;
      if (!(data instanceof Uint8Array)) {
        throw new MemberError(MemberErrorType.InvalidMemberBlocks);
      }

      // Store the block's checksum
      this.publicCBLId = (block as BaseBlock).idChecksum;

      return data;
    } catch (error) {
      if (error instanceof MemberError) {
        throw error;
      }
      throw new MemberError(MemberErrorType.FailedToCreateMemberBlocks);
    }
  }

  /**
   * Convert private data to CBL
   */
  public override async toPrivateCBL(): Promise<Uint8Array> {
    try {
      // Use the original member instances instead of recreating from storage
      const block = await this.cblService.createMemberCbl(
        this.originalPrivateMember,
        this.originalPublicMember, // Use public data as creator
      );

      // Get the block's data
      const data = block.data;
      if (!(data instanceof Uint8Array)) {
        throw new MemberError(MemberErrorType.InvalidMemberBlocks);
      }

      // Store the block's checksum
      this.privateCBLId = block.idChecksum;

      return data;
    } catch (error) {
      if (error instanceof MemberError) {
        throw error;
      }
      throw new MemberError(MemberErrorType.FailedToCreateMemberBlocks);
    }
  }

  /**
   * Create from CBLs
   */
  public async createFromCBLs(
    publicCBL: Uint8Array,
    privateCBL: Uint8Array,
  ): Promise<void> {
    try {
      // Create CBL blocks directly from the data, passing the block size for signature validation
      const publicBlock = new ConstituentBlockListBlock(
        publicCBL,
        this.originalPublicMember,
        this._blockSize,
      );
      const privateBlock = new ConstituentBlockListBlock(
        privateCBL,
        this.originalPublicMember,
        this._blockSize,
      );

      // The CBL blocks contain addresses to constituent blocks, but those blocks
      // need to be available in the block store. Since we're creating from existing CBLs,
      // we need to reconstruct the data without the constituent blocks.
      // For now, let's create new members from the original data and use those.

      // Update storage data using the original members
      this.publicDocument = new Document<IMemberStorageData>(
        MemberDocument.toStorageData(this.originalPublicMember),
      );
      this.privateDocument = new Document<IMemberStorageData>(
        MemberDocument.toStorageData(this.originalPrivateMember),
      );
      this.publicCBLId = publicBlock.idChecksum;
      this.privateCBLId = privateBlock.idChecksum;
    } catch (error) {
      if (error instanceof MemberError) {
        throw error;
      }
      throw new MemberError(MemberErrorType.FailedToHydrateMember);
    }
  }

  /**
   * Generate CBLs for this document
   */
  public async generateCBLs(): Promise<void> {
    try {
      // Generate CBLs - the checksums are already set in the toPublicCBL/toPrivateCBL methods
      await this.toPublicCBL();
      await this.toPrivateCBL();

      // The CBL IDs are already set by the toPublicCBL and toPrivateCBL methods
      // No need to retrieve from store since we already have the checksums
    } catch (error) {
      if (error instanceof MemberError) {
        throw error;
      }
      throw new MemberError(MemberErrorType.FailedToCreateMemberBlocks);
    }
  }

  /**
   * Convert back to Member object
   */
  public async toMember(usePrivate = false): Promise<Member<TID>> {
    // For now, return the original member since we're not doing full CBL round-trip
    // In a full implementation, this would reconstruct the member from CBL data
    return usePrivate ? this.originalPrivateMember : this.originalPublicMember;
  }
}
