import { ConstituentBlockListBlock } from '../blocks/cbl';
import { BrightChainMember } from '../brightChainMember';
import { QuorumErrorType } from '../enumerations/quorumErrorType';
import { QuorumError } from '../errors/quorumError';
import { GuidV4 } from '@digitaldefiance/ecies-lib';
import { QuorumDataRecord } from '../quorumDataRecord';
import { QuorumDocumentSchema } from '../schemas/quorumDocument';
import { BlockService } from '../services/blockService';
import { MemberCblService } from '../services/member/memberCblService';
import { SealingService } from '../services/sealing.service';
import { SchemaDefinition } from '../sharedTypes';
import { ChecksumUint8Array, SignatureUint8Array } from '../types';
import { Document } from './document';

export interface IQuorumDocument {
  checksum: ChecksumUint8Array;
  creatorId: ChecksumUint8Array;
  creator: BrightChainMember;
  signature: SignatureUint8Array;
  memberIDs: GuidV4[];
  sharesRequired: number;
  dateCreated: Date;
  dateUpdated: Date;
  encryptedData?: QuorumDataRecord;
}

/**
 * A QuorumDocument has its data stored in the blockchain and is encrypted with a key that is shared among a trusted quorum
 * of members using Shamir's Secret Sharing and the keys are kept within the Quorum.
 */
export class QuorumDocument<
  T extends IQuorumDocument = IQuorumDocument,
> extends Document<T> {
  constructor(data: Partial<T>) {
    super(data, QuorumDocumentSchema as SchemaDefinition<T>);
  }

  protected static memberService: MemberCblService | undefined = undefined;
  public static override initialize(
    blockService: BlockService,
    memberService: MemberCblService,
  ): void {
    super.initialize(blockService);
    QuorumDocument.memberService = memberService;
  }

  static createFromJson<T extends IQuorumDocument>(
    json: string,
  ): QuorumDocument<T> {
    const doc = Document.fromJson<T>(
      json,
      QuorumDocumentSchema as SchemaDefinition<T>,
    );
    return new QuorumDocument(JSON.parse(doc.toJson()));
  }

  /**
   * Save the document, creating CBLs for members as needed
   */
  public override async save(): Promise<void> {
    if (!QuorumDocument.memberService) {
      throw new QuorumError(QuorumErrorType.Uninitialized);
    }
    await super.save();
    const creator = this.get('creator');
    if (!creator) {
      throw new Error('Creator must be set before saving');
    }

    // Create CBL for creator
    const cbl = await QuorumDocument.memberService.createMemberCbl(
      creator,
      creator,
    );
    const checksum = Buffer.from(cbl.idChecksum) as unknown as ChecksumUint8Array;

    // Store creator's CBL ID
    this.set('creatorId', checksum);

    // Clear creator reference since we'll store just the ID
    this.set('creator', undefined);
  }

  /**
   * Load the document, hydrating members from CBLs
   */
  public override async load(): Promise<void> {
    if (!QuorumDocument.memberService) {
      throw new QuorumError(QuorumErrorType.Uninitialized);
    }
    await super.load();
    const creatorId = this.get('creatorId');
    if (creatorId) {
      const store = QuorumDocument.memberService.getBlockStore();
      const block = await store.getData(creatorId);
      if (block instanceof ConstituentBlockListBlock) {
        const hydratedCreator =
          await QuorumDocument.memberService.hydrateMember(block);
        this.set('creator', hydratedCreator);
      }
    }
  }

  /**
   * Delete the document
   */
  public override async delete(): Promise<void> {
    if (!QuorumDocument.memberService) {
      throw new QuorumError(QuorumErrorType.Uninitialized);
    }
    await super.delete();
  }

  /**
   * Encrypt document data using Shamir's Secret Sharing
   * @param data The data to encrypt
   * @param members The members to distribute shares to
   * @param sharesRequired Optional number of shares required to decrypt (defaults to all members)
   */
  async encrypt<T>(
    data: T,
    members: BrightChainMember[],
    sharesRequired?: number,
  ): Promise<void> {
    const creator = this.get('creator');
    if (!creator) {
      throw new Error('Creator must be set before encrypting');
    }

    const encryptedData = SealingService.quorumSeal(
      creator,
      data,
      members,
      sharesRequired,
    );
    this.set('encryptedData', encryptedData);
    this.set(
      'memberIDs',
      members.map((m) => m.guidId),
    );
    this.set('sharesRequired', sharesRequired ?? members.length);
  }

  /**
   * Decrypt document data using the provided member keys
   * @param membersWithKeys Members with loaded private keys
   * @returns The decrypted data
   */
  async decrypt<T>(membersWithKeys: BrightChainMember[]): Promise<T> {
    const encryptedData = this.get('encryptedData');
    if (!encryptedData) {
      throw new Error('Document has no encrypted data');
    }
    return SealingService.quorumUnseal<T>(encryptedData, membersWithKeys);
  }
}
