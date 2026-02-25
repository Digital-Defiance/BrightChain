/**
 * QuorumDatabaseAdapter — BrightChainDb-backed implementation of IQuorumDatabase.
 *
 * Uses a dedicated BrightChainDb instance with pool ID "quorum-system" for
 * isolated storage of all quorum-related data. Each data type is stored in
 * a separate collection.
 *
 * This is a Node.js-specific service that lives in brightchain-api-lib.
 *
 * @see Requirements 9, 10
 */

import {
  AliasRecord,
  ChainedAuditLogEntry,
  IdentityRecoveryRecord,
  IQuorumDatabase,
  IQuorumMember,
  OperationalState,
  Proposal,
  QuorumAuditLogEntry,
  QuorumDataRecord,
  QuorumEpoch,
  RedistributionJournalEntry,
  StatuteOfLimitationsConfig,
  Vote,
} from '@brightchain/brightchain-lib';
import type { BrightChainDb, BsonDocument } from '@brightchain/db';
import {
  PlatformID,
  ShortHexGuid,
  SignatureUint8Array,
} from '@digitaldefiance/ecies-lib';

// ─── Collection Names ───────────────────────────────────────────────────────

const COLLECTION_EPOCHS = 'epochs';
const COLLECTION_MEMBERS = 'members';
const COLLECTION_DOCUMENTS = 'documents';
const COLLECTION_PROPOSALS = 'proposals';
const COLLECTION_VOTES = 'votes';
const COLLECTION_IDENTITY_RECORDS = 'identity_records';
const COLLECTION_ALIASES = 'aliases';
const COLLECTION_AUDIT_LOG = 'audit_log';
const COLLECTION_REDISTRIBUTION_JOURNAL = 'redistribution_journal';
const COLLECTION_STATUTE_CONFIG = 'statute_config';
const COLLECTION_OPERATIONAL_STATE = 'operational_state';

/** Dedicated pool ID for quorum data isolation */
export const QUORUM_SYSTEM_POOL_ID = 'quorum-system';

// ─── Document Wrappers ──────────────────────────────────────────────────────

interface EpochDoc extends BsonDocument {
  epochNumber: number;
  data: Record<string, unknown>;
}

interface MemberDoc extends BsonDocument {
  memberId: string;
  isActive: boolean;
  data: Record<string, unknown>;
}

interface DocumentDoc extends BsonDocument {
  docId: string;
  epochNumber: number;
  data: Record<string, unknown>;
}

interface ProposalDoc extends BsonDocument {
  proposalId: string;
  data: Record<string, unknown>;
}

interface VoteDoc extends BsonDocument {
  proposalId: string;
  voterMemberId: string;
  data: Record<string, unknown>;
}

interface IdentityRecordDoc extends BsonDocument {
  recordId: string;
  expiresAt: string;
  data: Record<string, unknown>;
}

interface AliasDoc extends BsonDocument {
  aliasName: string;
  isActive: boolean;
  data: Record<string, unknown>;
}

interface AuditLogDoc extends BsonDocument {
  entryId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

interface JournalDoc extends BsonDocument {
  documentId: string;
  oldEpoch: number;
  data: Record<string, unknown>;
}

interface StatuteConfigDoc extends BsonDocument {
  key: string;
  data: Record<string, unknown>;
}

interface OperationalStateDoc extends BsonDocument {
  key: string;
  data: Record<string, unknown>;
}

// ─── Serialization Helpers ──────────────────────────────────────────────────

function serializeMap(
  map: Map<ShortHexGuid, Uint8Array>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of map.entries()) {
    result[key] = Buffer.from(value).toString('base64');
  }
  return result;
}

function deserializeMap(
  obj: Record<string, string>,
): Map<ShortHexGuid, Uint8Array> {
  const map = new Map<ShortHexGuid, Uint8Array>();
  for (const [key, value] of Object.entries(obj)) {
    map.set(key as ShortHexGuid, Buffer.from(value, 'base64'));
  }
  return map;
}

function serializeDurationsMap(
  map: Map<string, number>,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of map.entries()) {
    result[key] = value;
  }
  return result;
}

function deserializeDurationsMap(
  obj: Record<string, number>,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const [key, value] of Object.entries(obj)) {
    map.set(key, value);
  }
  return map;
}

function serializeUint8Array(arr: Uint8Array): string {
  return Buffer.from(arr).toString('base64');
}

function deserializeUint8Array(str: string): Uint8Array {
  return new Uint8Array(Buffer.from(str, 'base64'));
}

// ─── Epoch Serialization ────────────────────────────────────────────────────

function serializeEpoch<TID extends PlatformID>(
  epoch: QuorumEpoch<TID>,
): Record<string, unknown> {
  return {
    epochNumber: epoch.epochNumber,
    memberIds: epoch.memberIds,
    threshold: epoch.threshold,
    mode: epoch.mode,
    createdAt: epoch.createdAt.toISOString(),
    previousEpochNumber: epoch.previousEpochNumber,
    innerQuorumMemberIds: epoch.innerQuorumMemberIds,
  };
}

function deserializeEpoch<TID extends PlatformID>(
  data: Record<string, unknown>,
): QuorumEpoch<TID> {
  return {
    epochNumber: data['epochNumber'] as number,
    memberIds: data['memberIds'] as ShortHexGuid[],
    threshold: data['threshold'] as number,
    mode: data['mode'] as QuorumEpoch<TID>['mode'],
    createdAt: new Date(data['createdAt'] as string),
    previousEpochNumber: data['previousEpochNumber'] as number | undefined,
    innerQuorumMemberIds: data['innerQuorumMemberIds'] as
      | ShortHexGuid[]
      | undefined,
  };
}

// ─── Member Serialization ───────────────────────────────────────────────────

function serializeMember<TID extends PlatformID>(
  member: IQuorumMember<TID>,
): Record<string, unknown> {
  return {
    id: member.id,
    publicKey: serializeUint8Array(member.publicKey),
    metadata: member.metadata,
    isActive: member.isActive,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
  };
}

function deserializeMember<TID extends PlatformID>(
  data: Record<string, unknown>,
): IQuorumMember<TID> {
  return {
    id: data['id'] as ShortHexGuid,
    publicKey: deserializeUint8Array(data['publicKey'] as string),
    metadata: data['metadata'] as IQuorumMember<TID>['metadata'],
    isActive: data['isActive'] as boolean,
    createdAt: new Date(data['createdAt'] as string),
    updatedAt: new Date(data['updatedAt'] as string),
  };
}

// ─── Proposal Serialization ─────────────────────────────────────────────────

function serializeProposal<TID extends PlatformID>(
  proposal: Proposal<TID>,
): Record<string, unknown> {
  return {
    id: proposal.id,
    description: proposal.description,
    actionType: proposal.actionType,
    actionPayload: proposal.actionPayload,
    proposerMemberId: proposal.proposerMemberId,
    status: proposal.status,
    requiredThreshold: proposal.requiredThreshold,
    expiresAt: proposal.expiresAt.toISOString(),
    createdAt: proposal.createdAt.toISOString(),
    attachmentCblId: proposal.attachmentCblId,
    epochNumber: proposal.epochNumber,
  };
}

function deserializeProposal<TID extends PlatformID>(
  data: Record<string, unknown>,
): Proposal<TID> {
  return {
    id: data['id'] as ShortHexGuid,
    description: data['description'] as string,
    actionType: data['actionType'] as Proposal<TID>['actionType'],
    actionPayload: data['actionPayload'] as Record<string, unknown>,
    proposerMemberId: data['proposerMemberId'] as ShortHexGuid,
    status: data['status'] as Proposal<TID>['status'],
    requiredThreshold: data['requiredThreshold'] as number,
    expiresAt: new Date(data['expiresAt'] as string),
    createdAt: new Date(data['createdAt'] as string),
    attachmentCblId: data['attachmentCblId'] as string | undefined,
    epochNumber: data['epochNumber'] as number,
  };
}

// ─── Vote Serialization ─────────────────────────────────────────────────────

function serializeVote<TID extends PlatformID>(
  vote: Vote<TID>,
): Record<string, unknown> {
  return {
    proposalId: vote.proposalId,
    voterMemberId: vote.voterMemberId,
    decision: vote.decision,
    comment: vote.comment,
    encryptedShare: vote.encryptedShare
      ? serializeUint8Array(vote.encryptedShare)
      : undefined,
    createdAt: vote.createdAt.toISOString(),
  };
}

function deserializeVote<TID extends PlatformID>(
  data: Record<string, unknown>,
): Vote<TID> {
  return {
    proposalId: data['proposalId'] as ShortHexGuid,
    voterMemberId: data['voterMemberId'] as ShortHexGuid,
    decision: data['decision'] as Vote<TID>['decision'],
    comment: data['comment'] as string | undefined,
    encryptedShare: data['encryptedShare']
      ? deserializeUint8Array(data['encryptedShare'] as string)
      : undefined,
    createdAt: new Date(data['createdAt'] as string),
  };
}

// ─── IdentityRecoveryRecord Serialization ───────────────────────────────────

function serializeIdentityRecord<TID extends PlatformID>(
  record: IdentityRecoveryRecord<TID>,
): Record<string, unknown> {
  return {
    id: record.id,
    contentId: record.contentId,
    contentType: record.contentType,
    encryptedShardsByMemberId: serializeMap(record.encryptedShardsByMemberId),
    memberIds: record.memberIds,
    threshold: record.threshold,
    epochNumber: record.epochNumber,
    expiresAt: record.expiresAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
    identityMode: record.identityMode,
    aliasName: record.aliasName,
  };
}

function deserializeIdentityRecord<TID extends PlatformID>(
  data: Record<string, unknown>,
): IdentityRecoveryRecord<TID> {
  return {
    id: data['id'] as ShortHexGuid,
    contentId: data['contentId'] as ShortHexGuid,
    contentType: data['contentType'] as string,
    encryptedShardsByMemberId: deserializeMap(
      data['encryptedShardsByMemberId'] as Record<string, string>,
    ),
    memberIds: data['memberIds'] as ShortHexGuid[],
    threshold: data['threshold'] as number,
    epochNumber: data['epochNumber'] as number,
    expiresAt: new Date(data['expiresAt'] as string),
    createdAt: new Date(data['createdAt'] as string),
    identityMode: data[
      'identityMode'
    ] as IdentityRecoveryRecord<TID>['identityMode'],
    aliasName: data['aliasName'] as string | undefined,
  };
}

// ─── AliasRecord Serialization ──────────────────────────────────────────────

function serializeAlias<TID extends PlatformID>(
  alias: AliasRecord<TID>,
): Record<string, unknown> {
  return {
    aliasName: alias.aliasName,
    ownerMemberId: alias.ownerMemberId,
    aliasPublicKey: serializeUint8Array(alias.aliasPublicKey),
    identityRecoveryRecordId: alias.identityRecoveryRecordId,
    isActive: alias.isActive,
    registeredAt: alias.registeredAt.toISOString(),
    deactivatedAt: alias.deactivatedAt?.toISOString(),
    epochNumber: alias.epochNumber,
  };
}

function deserializeAlias<TID extends PlatformID>(
  data: Record<string, unknown>,
): AliasRecord<TID> {
  return {
    aliasName: data['aliasName'] as string,
    ownerMemberId: data['ownerMemberId'] as ShortHexGuid,
    aliasPublicKey: deserializeUint8Array(data['aliasPublicKey'] as string),
    identityRecoveryRecordId: data['identityRecoveryRecordId'] as ShortHexGuid,
    isActive: data['isActive'] as boolean,
    registeredAt: new Date(data['registeredAt'] as string),
    deactivatedAt: data['deactivatedAt']
      ? new Date(data['deactivatedAt'] as string)
      : undefined,
    epochNumber: data['epochNumber'] as number,
  };
}

// ─── AuditLogEntry Serialization ────────────────────────────────────────────

function serializeAuditEntry(
  entry: QuorumAuditLogEntry,
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    id: entry.id,
    eventType: entry.eventType,
    proposalId: entry.proposalId,
    targetMemberId: entry.targetMemberId,
    proposerMemberId: entry.proposerMemberId,
    attachmentCblId: entry.attachmentCblId,
    details: entry.details,
    timestamp: entry.timestamp.toISOString(),
  };
  // If this is a ChainedAuditLogEntry, also serialize chain fields
  const chained = entry as Partial<ChainedAuditLogEntry>;
  if (chained.contentHash !== undefined) {
    base['previousEntryHash'] = chained.previousEntryHash;
    base['contentHash'] = chained.contentHash;
    base['signature'] = chained.signature
      ? serializeUint8Array(chained.signature)
      : undefined;
    base['blockId1'] = chained.blockId1;
    base['blockId2'] = chained.blockId2;
  }
  return base;
}

function deserializeChainedAuditEntry(
  data: Record<string, unknown>,
): ChainedAuditLogEntry {
  return {
    id: data['id'] as ShortHexGuid,
    eventType: data['eventType'] as ChainedAuditLogEntry['eventType'],
    proposalId: data['proposalId'] as ShortHexGuid | undefined,
    targetMemberId: data['targetMemberId'] as ShortHexGuid | undefined,
    proposerMemberId: data['proposerMemberId'] as ShortHexGuid | undefined,
    attachmentCblId: data['attachmentCblId'] as string | undefined,
    details: data['details'] as Record<string, unknown>,
    timestamp: new Date(data['timestamp'] as string),
    previousEntryHash: (data['previousEntryHash'] as string | null) ?? null,
    contentHash: (data['contentHash'] as string) ?? '',
    signature: (data['signature']
      ? deserializeUint8Array(data['signature'] as string)
      : new Uint8Array(0)) as SignatureUint8Array,
    blockId1: (data['blockId1'] as string) ?? '',
    blockId2: (data['blockId2'] as string) ?? '',
  };
}

// ─── RedistributionJournalEntry Serialization ───────────────────────────────

function serializeJournalEntry(
  entry: RedistributionJournalEntry,
): Record<string, unknown> {
  return {
    documentId: entry.documentId,
    oldShares: serializeMap(entry.oldShares),
    oldMemberIds: entry.oldMemberIds,
    oldThreshold: entry.oldThreshold,
    oldEpoch: entry.oldEpoch,
  };
}

function deserializeJournalEntry(
  data: Record<string, unknown>,
): RedistributionJournalEntry {
  return {
    documentId: data['documentId'] as ShortHexGuid,
    oldShares: deserializeMap(data['oldShares'] as Record<string, string>),
    oldMemberIds: data['oldMemberIds'] as ShortHexGuid[],
    oldThreshold: data['oldThreshold'] as number,
    oldEpoch: data['oldEpoch'] as number,
  };
}

// ─── StatuteOfLimitationsConfig Serialization ───────────────────────────────

function serializeStatuteConfig(
  config: StatuteOfLimitationsConfig,
): Record<string, unknown> {
  return {
    defaultDurations: serializeDurationsMap(config.defaultDurations),
    fallbackDurationMs: config.fallbackDurationMs,
  };
}

function deserializeStatuteConfig(
  data: Record<string, unknown>,
): StatuteOfLimitationsConfig {
  return {
    defaultDurations: deserializeDurationsMap(
      data['defaultDurations'] as Record<string, number>,
    ),
    fallbackDurationMs: data['fallbackDurationMs'] as number,
  };
}

// ─── OperationalState Serialization ─────────────────────────────────────────

function serializeOperationalState(
  state: OperationalState,
): Record<string, unknown> {
  return {
    mode: state.mode,
    currentEpochNumber: state.currentEpochNumber,
    lastUpdated: state.lastUpdated.toISOString(),
  };
}

function deserializeOperationalState(
  data: Record<string, unknown>,
): OperationalState {
  return {
    mode: data['mode'] as OperationalState['mode'],
    currentEpochNumber: data['currentEpochNumber'] as number,
    lastUpdated: new Date(data['lastUpdated'] as string),
  };
}

// ─── QuorumDatabaseAdapter ──────────────────────────────────────────────────

/**
 * BrightChainDb-backed implementation of IQuorumDatabase.
 *
 * Uses a dedicated pool ID ("quorum-system") for isolated storage.
 * Each data type is stored in a separate collection.
 *
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export class QuorumDatabaseAdapter<
  TID extends PlatformID = Uint8Array,
> implements IQuorumDatabase<TID> {
  private readonly db: BrightChainDb;

  constructor(db: BrightChainDb) {
    this.db = db;
  }

  // === Epoch Management ===

  async saveEpoch(epoch: QuorumEpoch<TID>): Promise<void> {
    const col = this.db.collection<EpochDoc>(COLLECTION_EPOCHS);
    const existing = await col.findOne({
      epochNumber: epoch.epochNumber,
    });
    if (existing) {
      await col.updateOne(
        { epochNumber: epoch.epochNumber },
        { $set: { data: serializeEpoch(epoch) } },
      );
    } else {
      await col.insertOne({
        epochNumber: epoch.epochNumber,
        data: serializeEpoch(epoch),
      });
    }
  }

  async getEpoch(epochNumber: number): Promise<QuorumEpoch<TID> | null> {
    const col = this.db.collection<EpochDoc>(COLLECTION_EPOCHS);
    const doc = await col.findOne({ epochNumber });
    if (!doc) return null;
    return deserializeEpoch<TID>(doc.data);
  }

  async getCurrentEpoch(): Promise<QuorumEpoch<TID>> {
    const col = this.db.collection<EpochDoc>(COLLECTION_EPOCHS);
    const docs = await col
      .find({})
      .sort({ epochNumber: -1 })
      .limit(1)
      .toArray();
    if (docs.length === 0) {
      throw new Error('No epochs found in quorum database');
    }
    return deserializeEpoch<TID>(docs[0].data);
  }

  // === Member Management ===

  async saveMember(member: IQuorumMember<TID>): Promise<void> {
    const col = this.db.collection<MemberDoc>(COLLECTION_MEMBERS);
    const existing = await col.findOne({ memberId: member.id });
    if (existing) {
      await col.updateOne(
        { memberId: member.id },
        {
          $set: {
            isActive: member.isActive,
            data: serializeMember(member),
          },
        },
      );
    } else {
      await col.insertOne({
        memberId: member.id,
        isActive: member.isActive,
        data: serializeMember(member),
      });
    }
  }

  async getMember(memberId: ShortHexGuid): Promise<IQuorumMember<TID> | null> {
    const col = this.db.collection<MemberDoc>(COLLECTION_MEMBERS);
    const doc = await col.findOne({ memberId });
    if (!doc) return null;
    return deserializeMember<TID>(doc.data);
  }

  async listActiveMembers(): Promise<IQuorumMember<TID>[]> {
    const col = this.db.collection<MemberDoc>(COLLECTION_MEMBERS);
    const docs = await col.find({ isActive: true }).toArray();
    return docs.map((doc: MemberDoc) => deserializeMember<TID>(doc.data));
  }

  // === Sealed Documents ===

  async saveDocument(doc: QuorumDataRecord<TID>): Promise<void> {
    const col = this.db.collection<DocumentDoc>(COLLECTION_DOCUMENTS);
    const dto = doc.toDto();
    const docId = dto.id;
    const existing = await col.findOne({ docId });
    if (existing) {
      await col.updateOne(
        { docId },
        {
          $set: {
            epochNumber: dto.epochNumber,
            data: dto as unknown as Record<string, unknown>,
          },
        },
      );
    } else {
      await col.insertOne({
        docId,
        epochNumber: dto.epochNumber,
        data: dto as unknown as Record<string, unknown>,
      });
    }
  }

  async getDocument(
    docId: ShortHexGuid,
  ): Promise<QuorumDataRecord<TID> | null> {
    const col = this.db.collection<DocumentDoc>(COLLECTION_DOCUMENTS);
    const doc = await col.findOne({ docId });
    if (!doc) return null;
    // Return the stored DTO data — callers use QuorumDataRecord.fromDto
    // to reconstruct the full object with crypto services.
    return doc.data as unknown as QuorumDataRecord<TID>;
  }

  async listDocumentsByEpoch(
    epochNumber: number,
    page: number,
    pageSize: number,
  ): Promise<QuorumDataRecord<TID>[]> {
    const col = this.db.collection<DocumentDoc>(COLLECTION_DOCUMENTS);
    const docs = await col
      .find({ epochNumber })
      .skip(page * pageSize)
      .limit(pageSize)
      .toArray();
    return docs.map(
      (d: DocumentDoc) => d.data as unknown as QuorumDataRecord<TID>,
    );
  }

  // === Proposals and Votes ===

  async saveProposal(proposal: Proposal<TID>): Promise<void> {
    const col = this.db.collection<ProposalDoc>(COLLECTION_PROPOSALS);
    const existing = await col.findOne({ proposalId: proposal.id });
    if (existing) {
      await col.updateOne(
        { proposalId: proposal.id },
        { $set: { data: serializeProposal(proposal) } },
      );
    } else {
      await col.insertOne({
        proposalId: proposal.id,
        data: serializeProposal(proposal),
      });
    }
  }

  async getProposal(proposalId: ShortHexGuid): Promise<Proposal<TID> | null> {
    const col = this.db.collection<ProposalDoc>(COLLECTION_PROPOSALS);
    const doc = await col.findOne({ proposalId });
    if (!doc) return null;
    return deserializeProposal<TID>(doc.data);
  }

  async saveVote(vote: Vote<TID>): Promise<void> {
    const col = this.db.collection<VoteDoc>(COLLECTION_VOTES);
    const existing = await col.findOne({
      proposalId: vote.proposalId,
      voterMemberId: vote.voterMemberId,
    });
    if (existing) {
      await col.updateOne(
        {
          proposalId: vote.proposalId,
          voterMemberId: vote.voterMemberId,
        },
        { $set: { data: serializeVote(vote) } },
      );
    } else {
      await col.insertOne({
        proposalId: vote.proposalId,
        voterMemberId: vote.voterMemberId,
        data: serializeVote(vote),
      });
    }
  }

  async getVotesForProposal(proposalId: ShortHexGuid): Promise<Vote<TID>[]> {
    const col = this.db.collection<VoteDoc>(COLLECTION_VOTES);
    const docs = await col.find({ proposalId }).toArray();
    return docs.map((d: VoteDoc) => deserializeVote<TID>(d.data));
  }

  // === Identity Recovery Records ===

  async saveIdentityRecord(record: IdentityRecoveryRecord<TID>): Promise<void> {
    const col = this.db.collection<IdentityRecordDoc>(
      COLLECTION_IDENTITY_RECORDS,
    );
    const existing = await col.findOne({ recordId: record.id });
    if (existing) {
      await col.updateOne(
        { recordId: record.id },
        {
          $set: {
            expiresAt: record.expiresAt.toISOString(),
            data: serializeIdentityRecord(record),
          },
        },
      );
    } else {
      await col.insertOne({
        recordId: record.id,
        expiresAt: record.expiresAt.toISOString(),
        data: serializeIdentityRecord(record),
      });
    }
  }

  async getIdentityRecord(
    recordId: ShortHexGuid,
  ): Promise<IdentityRecoveryRecord<TID> | null> {
    const col = this.db.collection<IdentityRecordDoc>(
      COLLECTION_IDENTITY_RECORDS,
    );
    const doc = await col.findOne({ recordId });
    if (!doc) return null;
    return deserializeIdentityRecord<TID>(doc.data);
  }

  async deleteIdentityRecord(recordId: ShortHexGuid): Promise<void> {
    const col = this.db.collection<IdentityRecordDoc>(
      COLLECTION_IDENTITY_RECORDS,
    );
    await col.deleteOne({ recordId });
  }

  async listExpiredIdentityRecords(
    before: Date,
    page: number,
    pageSize: number,
  ): Promise<IdentityRecoveryRecord<TID>[]> {
    const col = this.db.collection<IdentityRecordDoc>(
      COLLECTION_IDENTITY_RECORDS,
    );
    // Fetch all records and filter in-memory since the collection
    // doesn't support $lt on ISO string fields natively.
    const allDocs = await col.find({}).toArray();
    const beforeIso = before.toISOString();
    const expired = allDocs
      .filter((d: IdentityRecordDoc) => d.expiresAt < beforeIso)
      .sort((a: IdentityRecordDoc, b: IdentityRecordDoc) =>
        a.expiresAt.localeCompare(b.expiresAt),
      );
    const start = page * pageSize;
    const paged = expired.slice(start, start + pageSize);
    return paged.map((d: IdentityRecordDoc) =>
      deserializeIdentityRecord<TID>(d.data),
    );
  }

  // === Alias Registry ===

  async saveAlias(alias: AliasRecord<TID>): Promise<void> {
    const col = this.db.collection<AliasDoc>(COLLECTION_ALIASES);
    const existing = await col.findOne({ aliasName: alias.aliasName });
    if (existing) {
      await col.updateOne(
        { aliasName: alias.aliasName },
        {
          $set: {
            isActive: alias.isActive,
            data: serializeAlias(alias),
          },
        },
      );
    } else {
      await col.insertOne({
        aliasName: alias.aliasName,
        isActive: alias.isActive,
        data: serializeAlias(alias),
      });
    }
  }

  async getAlias(aliasName: string): Promise<AliasRecord<TID> | null> {
    const col = this.db.collection<AliasDoc>(COLLECTION_ALIASES);
    const doc = await col.findOne({ aliasName });
    if (!doc) return null;
    return deserializeAlias<TID>(doc.data);
  }

  async isAliasAvailable(aliasName: string): Promise<boolean> {
    const col = this.db.collection<AliasDoc>(COLLECTION_ALIASES);
    const doc = await col.findOne({ aliasName });
    // Available if no record exists or the existing record is inactive
    return doc === null || !doc.isActive;
  }

  // === Audit Log ===

  async appendAuditEntry(entry: QuorumAuditLogEntry): Promise<void> {
    const col = this.db.collection<AuditLogDoc>(COLLECTION_AUDIT_LOG);
    await col.insertOne({
      entryId: entry.id,
      timestamp: entry.timestamp.toISOString(),
      data: serializeAuditEntry(entry),
    });
  }

  async getLatestAuditEntry(): Promise<ChainedAuditLogEntry | null> {
    const col = this.db.collection<AuditLogDoc>(COLLECTION_AUDIT_LOG);
    const docs = await col.find({}).sort({ timestamp: -1 }).limit(1).toArray();
    if (docs.length === 0) return null;
    return deserializeChainedAuditEntry(docs[0].data);
  }

  // === Redistribution Journal ===

  async saveJournalEntry(entry: RedistributionJournalEntry): Promise<void> {
    const col = this.db.collection<JournalDoc>(
      COLLECTION_REDISTRIBUTION_JOURNAL,
    );
    await col.insertOne({
      documentId: entry.documentId,
      oldEpoch: entry.oldEpoch,
      data: serializeJournalEntry(entry),
    });
  }

  async getJournalEntries(
    epochNumber: number,
  ): Promise<RedistributionJournalEntry[]> {
    const col = this.db.collection<JournalDoc>(
      COLLECTION_REDISTRIBUTION_JOURNAL,
    );
    const docs = await col.find({ oldEpoch: epochNumber }).toArray();
    return docs.map((d: JournalDoc) => deserializeJournalEntry(d.data));
  }

  async deleteJournalEntries(epochNumber: number): Promise<void> {
    const col = this.db.collection<JournalDoc>(
      COLLECTION_REDISTRIBUTION_JOURNAL,
    );
    await col.deleteMany({ oldEpoch: epochNumber });
  }

  // === Statute of Limitations Configuration ===

  async saveStatuteConfig(config: StatuteOfLimitationsConfig): Promise<void> {
    const col = this.db.collection<StatuteConfigDoc>(COLLECTION_STATUTE_CONFIG);
    const existing = await col.findOne({ key: 'statute_config' });
    if (existing) {
      await col.updateOne(
        { key: 'statute_config' },
        { $set: { data: serializeStatuteConfig(config) } },
      );
    } else {
      await col.insertOne({
        key: 'statute_config',
        data: serializeStatuteConfig(config),
      });
    }
  }

  async getStatuteConfig(): Promise<StatuteOfLimitationsConfig | null> {
    const col = this.db.collection<StatuteConfigDoc>(COLLECTION_STATUTE_CONFIG);
    const doc = await col.findOne({ key: 'statute_config' });
    if (!doc) return null;
    return deserializeStatuteConfig(doc.data);
  }

  // === Operational State ===

  async saveOperationalState(state: OperationalState): Promise<void> {
    const col = this.db.collection<OperationalStateDoc>(
      COLLECTION_OPERATIONAL_STATE,
    );
    const existing = await col.findOne({ key: 'operational_state' });
    if (existing) {
      await col.updateOne(
        { key: 'operational_state' },
        { $set: { data: serializeOperationalState(state) } },
      );
    } else {
      await col.insertOne({
        key: 'operational_state',
        data: serializeOperationalState(state),
      });
    }
  }

  async getOperationalState(): Promise<OperationalState | null> {
    const col = this.db.collection<OperationalStateDoc>(
      COLLECTION_OPERATIONAL_STATE,
    );
    const doc = await col.findOne({ key: 'operational_state' });
    if (!doc) return null;
    return deserializeOperationalState(doc.data);
  }

  // === Transactions ===

  async withTransaction<R>(fn: () => Promise<R>): Promise<R> {
    return this.db.withTransaction(async () => {
      return fn();
    });
  }

  // === Health Check ===

  async isAvailable(): Promise<boolean> {
    try {
      // Try a simple operation to verify the database is accessible
      const col = this.db.collection<OperationalStateDoc>(
        COLLECTION_OPERATIONAL_STATE,
      );
      await col.estimatedDocumentCount();
      return true;
    } catch {
      return false;
    }
  }
}
