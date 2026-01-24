import {
  ECIESService,
  hexToUint8Array,
  Member,
  PlatformID,
  ShortHexGuid,
  TypedIdProviderWrapper,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import { QuorumErrorType } from './enumerations/quorumErrorType';
import { QuorumError } from './errors/quorumError';
import { getBrightChainIdProvider } from './init';
import { QuorumDataRecord } from './quorumDataRecord';
import { SealingService } from './services/sealing.service';
import { ArrayStore } from './stores/arrayStore';
import { SimpleStore } from './stores/simpleStore';

export class BrightChainQuorum<TID extends PlatformID = Uint8Array> {
  /**
   * Member ID, uuid
   */
  public readonly id: TID;

  /**
   * The node owner is the system key pair that is used to sign and verify with Quorum members
   */
  private readonly nodeAgent: Member<TID>;

  /**
   * The name of the quorum
   */
  public readonly name: string;

  /**
   * Quorum members collection, keys may or may not be loaded for a given member
   */
  private readonly _members: SimpleStore<ShortHexGuid, Member<TID>>;

  /**
   * Collection of public keys for each member of the quorum.
   * This may include members not on this node.
   * Never erase, only add/update.
   */
  private readonly _memberPublicKeysByMemberId: ArrayStore<ShortHexGuid>;

  /**
   * Collection of encrypted documents that this quorum node has taken responsibility for
   */
  private readonly _documentsById: SimpleStore<
    ShortHexGuid,
    QuorumDataRecord<TID>
  >;

  private readonly _sealingService: SealingService<TID>;
  private readonly _enhancedProvider: TypedIdProviderWrapper<TID>;

  constructor(
    nodeAgent: Member<TID>,
    name: string,
    id?: string,
    idProvider: TypedIdProviderWrapper<TID> = getBrightChainIdProvider<TID>(),
    eciesService?: ECIESService<TID>,
  ) {
    if (id !== undefined) {
      this.id = idProvider.fromBytes(hexToUint8Array(id));
    } else {
      this.id = idProvider.fromBytes(idProvider.generate());
    }
    this._enhancedProvider = idProvider;
    this._sealingService = new SealingService<TID>(eciesService, idProvider);
    this._members = new SimpleStore<ShortHexGuid, Member<TID>>();
    this._memberPublicKeysByMemberId = new ArrayStore<ShortHexGuid>();
    this._documentsById = new SimpleStore<
      ShortHexGuid,
      QuorumDataRecord<TID>
    >();

    this.nodeAgent = nodeAgent;
    this.name = name;

    this.storeMember(nodeAgent);
    // TODO create and validate a signature based on the node ID and the agent's public key
  }

  /**
   * Physically add a member to the members collection and key stores
   * @param member
   */
  protected storeMember(member: Member<TID>) {
    const provider = getBrightChainIdProvider<TID>();
    const hexMemberId = uint8ArrayToHex(
      provider.toBytes(member.id),
    ) as ShortHexGuid;
    this._members.set(hexMemberId, member);
    this._memberPublicKeysByMemberId.set(hexMemberId, member.publicKey);
  }

  /**
   * Returns whether this node has taken responsibility for a given document.
   * Some nodes may have different responsibilities for different documents, depending on the members using the node.
   * @param id
   * @returns
   */
  public hasDocument(id: ShortHexGuid): boolean {
    return this._documentsById.has(id);
  }

  /**
   * Encrypts and adds a document to the quorum.
   * @param agent The agent whose credentials are used to encrypt the document
   * @param document The document to be encrypted
   * @param amongstMembers The members who will be able to decrypt the document
   * @param sharesRequired The number of members required to decrypt the document
   * @returns The document record
   */
  public async addDocument<T>(
    agent: Member<TID>,
    document: T,
    amongstMembers: Member<TID>[],
    sharesRequired?: number,
  ): Promise<QuorumDataRecord<TID>> {
    const newDoc = await this._sealingService.quorumSeal<T>(
      agent,
      document,
      amongstMembers,
      sharesRequired,
    );
    this._documentsById.set(
      uint8ArrayToHex(
        this._enhancedProvider.toBytes(newDoc.id),
      ) as ShortHexGuid,
      newDoc,
    );
    return newDoc;
  }

  /**
   * Ratrieves a document from the quorum using decrypted shares
   * @param id The document ID
   * @param memberIds The member IDs that will be used to decrypt the document
   * @returns
   */
  public async getDocument<T>(
    id: ShortHexGuid,
    memberIds: ShortHexGuid[],
  ): Promise<T> {
    const doc = this._documentsById.get(id);
    if (!doc) {
      throw new QuorumError(QuorumErrorType.DocumentNotFound);
    }
    const members: Member<TID>[] = memberIds.map((id) => this._members.get(id));

    const restoredDoc = await this._sealingService.quorumUnseal<T>(
      doc,
      members,
    );
    if (!restoredDoc) {
      throw new QuorumError(QuorumErrorType.UnableToRestoreDocument);
    }
    return restoredDoc;
  }

  /**
   * Returns whether the given set of members is sufficient to decrypt the document
   * @param id
   * @param members
   */
  public canUnlock(id: ShortHexGuid, members: Member<TID>[]): boolean {
    const doc = this._documentsById.get(id);
    if (!doc) {
      throw new QuorumError(QuorumErrorType.DocumentNotFound);
    }
    // check whether the supplied list of members are included in the document share distributions
    // as well as whether the number of members is sufficient to unlock the document
    return (
      members.length >= doc.sharesRequired &&
      members.every((m) => {
        const provider = getBrightChainIdProvider<TID>();
        const memberGuidId = uint8ArrayToHex(
          provider.toBytes(m.id),
        ) as ShortHexGuid;
        return doc.memberIDs.includes(memberGuidId as unknown as TID);
      })
    );
  }
}
