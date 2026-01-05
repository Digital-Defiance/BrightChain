import { GuidV4 } from '@digitaldefiance/ecies-lib';
import * as uuid from 'uuid';
import { BrightChainMember } from './brightChainMember';
import { QuorumErrorType } from './enumerations/quorumErrorType';
import { QuorumError } from './errors/quorumError';
import { QuorumDataRecord } from './quorumDataRecord';
import { SealingService } from './services/sealing.service';
import { BufferStore } from './stores/bufferStore';
import { SimpleStore } from './stores/simpleStore';
import { ShortHexGuid } from './types';

export class BrightChainQuorum {
  /**
   * Member ID, uuid
   */
  public readonly id: ShortHexGuid;

  /**
   * The node owner is the system key pair that is used to sign and verify with Quorum members
   */
  private readonly nodeAgent: BrightChainMember;

  /**
   * The name of the quorum
   */
  public readonly name: string;

  /**
   * Quorum members collection, keys may or may not be loaded for a given member
   */
  private readonly _members: SimpleStore<ShortHexGuid, BrightChainMember>;

  /**
   * Collection of public keys for each member of the quorum.
   * This may include members not on this node.
   * Never erase, only add/update.
   */
  private readonly _memberPublicKeysByMemberId: BufferStore<ShortHexGuid>;

  /**
   * Collection of encrypted documents that this quorum node has taken responsibility for
   */
  private readonly _documentsById: SimpleStore<ShortHexGuid, QuorumDataRecord>;

  constructor(nodeAgent: BrightChainMember, name: string, id?: string) {
    if (id !== undefined) {
      if (!uuid.validate(id)) {
        throw new QuorumError(QuorumErrorType.InvalidQuorumId);
      }
      this.id = new GuidV4(id).asShortHexGuid;
    } else {
      this.id = GuidV4.new().asShortHexGuid;
    }

    this._members = new SimpleStore<ShortHexGuid, BrightChainMember>();
    this._memberPublicKeysByMemberId = new BufferStore<ShortHexGuid>();
    this._documentsById = new SimpleStore<ShortHexGuid, QuorumDataRecord>();

    this.nodeAgent = nodeAgent;
    this.name = name;

    this.storeMember(nodeAgent);
    // TODO create and validate a signature based on the node ID and the agent's public key
  }

  /**
   * Physically add a member to the members collection and key stores
   * @param member
   */
  protected storeMember(member: BrightChainMember) {
    this._members.set(member.guidId.asShortHexGuid, member);
    this._memberPublicKeysByMemberId.set(
      member.guidId.asShortHexGuid,
      member.publicKey,
    );
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
  public addDocument<T>(
    agent: BrightChainMember,
    document: T,
    amongstMembers: BrightChainMember[],
    sharesRequired?: number,
  ): QuorumDataRecord {
    const newDoc = SealingService.quorumSeal<T>(
      agent,
      document,
      amongstMembers,
      sharesRequired,
    );
    this._documentsById.set(newDoc.id.asShortHexGuid, newDoc);
    return newDoc;
  }

  /**
   * Ratrieves a document from the quorum using decrypted shares
   * @param id The document ID
   * @param memberIds The member IDs that will be used to decrypt the document
   * @returns
   */
  public getDocument<T>(id: ShortHexGuid, memberIds: ShortHexGuid[]): T {
    const doc = this._documentsById.get(id);
    if (!doc) {
      throw new QuorumError(QuorumErrorType.DocumentNotFound);
    }
    const members: BrightChainMember[] = memberIds.map((id) =>
      this._members.get(id),
    );

    const restoredDoc = SealingService.quorumUnseal<T>(doc, members);
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
  public canUnlock(id: ShortHexGuid, members: BrightChainMember[]): boolean {
    const doc = this._documentsById.get(id);
    if (!doc) {
      throw new QuorumError(QuorumErrorType.DocumentNotFound);
    }
    // check whether the supplied list of members are included in the document share distributions
    // as well as whether the number of members is sufficient to unlock the document
    return (
      members.length >= doc.sharesRequired &&
      members.every((m) => {
        const memberGuidId = m.guidId.asShortHexGuid;
        return doc.memberIDs.includes(memberGuidId);
      })
    );
  }
}
