/**
 * BrightTrustDatabaseAdapter — BrightDB-backed implementation of IBrightTrustDatabase.
 *
 * Uses a dedicated BrightDb instance with pool ID "brightTrust-system" for
 * isolated storage of all brightTrust-related data. Each data type is stored in
 * a separate collection.
 *
 * This is a Node.js-specific service that lives in brightchain-api-lib.
 *
 * @see Requirements 9, 10
 */

import {
  AliasRecord,
  BrightTrustAuditLogEntry,
  BrightTrustDataRecord,
  BrightTrustEpoch,
  ChainedAuditLogEntry,
  IBanRecord,
  IBrightTrustDatabase,
  IBrightTrustMember,
  IdentityRecoveryRecord,
  OperationalState,
  Proposal,
  RedistributionJournalEntry,
  StatuteOfLimitationsConfig,
  Vote,
} from '@brightchain/brightchain-lib';
import type { BrightDb, BsonDocument } from '@brightchain/db';
import {
  HexString,
  IIdProvider,
  PlatformID,
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
const COLLECTION_BAN_RECORDS = 'ban_records';

/** Dedicated pool ID for BrightTrust data isolation */
export const BRIGHT_TRUST_SYSTEM_POOL_ID = 'brightTrust-system';

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

interface BanRecordDoc extends BsonDocument {
  memberId: string;
  data: Record<string, unknown>;
}

// ─── Serialization Helpers ──────────────────────────────────────────────────

function serializeMap(map: Map<HexString, Uint8Array>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of map.entries()) {
    result[key] = Buffer.from(value).toString('base64');
  }
  return result;
}

function deserializeMap(
  obj: Record<string, string>,
): Map<HexString, Uint8Array> {
  const map = new Map<HexString, Uint8Array>();
  for (const [key, value] of Object.entries(obj)) {
    map.set(key as HexString, Buffer.from(value, 'base64'));
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
  epoch: BrightTrustEpoch<TID>,
): Record<string, unknown> {
  return {
    epochNumber: epoch.epochNumber,
    memberIds: epoch.memberIds,
    threshold: epoch.threshold,
    mode: epoch.mode,
    createdAt: epoch.createdAt.toISOString(),
    previousEpochNumber: epoch.previousEpochNumber,
    innerBrightTrustMemberIds: epoch.innerBrightTrustMemberIds,
  };
}

function deserializeEpoch<TID extends PlatformID>(
  data: Record<string, unknown>,
): BrightTrustEpoch<TID> {
  return {
    epochNumber: data['epochNumber'] as number,
    memberIds: data['memberIds'] as TID[],
    threshold: data['threshold'] as number,
    mode: data['mode'] as BrightTrustEpoch<TID>['mode'],
    createdAt: new Date(data['createdAt'] as string),
    previousEpochNumber: data['previousEpochNumber'] as number | undefined,
    innerBrightTrustMemberIds: data['innerBrightTrustMemberIds'] as
      | TID[]
      | undefined,
  };
}

// ─── Member Serialization ───────────────────────────────────────────────────

function serializeMember<TID extends PlatformID>(
  member: IBrightTrustMember<TID>,
  idProvider: IIdProvider<TID>,
): Record<string, unknown> {
  return {
    id: idProvider.idToString(member.id),
    publicKey: serializeUint8Array(member.publicKey),
    metadata: member.metadata,
    isActive: member.isActive,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
  };
}

function deserializeMember<TID extends PlatformID>(
  data: Record<string, unknown>,
  idProvider: IIdProvider<TID>,
): IBrightTrustMember<TID> {
  const rawId = data['id'];
  const id = idProvider.parseSafe(String(rawId));
  if (id === undefined) {
    throw new Error(`Invalid member ID in stored document: ${rawId}`);
  }
  return {
    id,
    publicKey: deserializeUint8Array(data['publicKey'] as string),
    metadata: data['metadata'] as IBrightTrustMember<TID>['metadata'],
    isActive: data['isActive'] as boolean,
    createdAt: new Date(data['createdAt'] as string),
    updatedAt: new Date(data['updatedAt'] as string),
  };
}

// ─── Proposal Serialization ─────────────────────────────────────────────────

function serializeProposal<TID extends PlatformID>(
  proposal: Proposal<TID>,
  idProvider: IIdProvider<TID>,
): Record<string, unknown> {
  return {
    id: idProvider.idToString(proposal.id),
    description: proposal.description,
    actionType: proposal.actionType,
    actionPayload: proposal.actionPayload,
    proposerMemberId: idProvider.idToString(proposal.proposerMemberId),
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
  idProvider: IIdProvider<TID>,
): Proposal<TID> {
  const rawId = data['id'];
  const id = idProvider.parseSafe(String(rawId));
  if (id === undefined) {
    throw new Error(`Invalid proposal ID in stored document: ${rawId}`);
  }
  const rawProposerId = data['proposerMemberId'];
  const proposerMemberId = idProvider.parseSafe(String(rawProposerId));
  if (proposerMemberId === undefined) {
    throw new Error(
      `Invalid proposerMemberId in stored document: ${rawProposerId}`,
    );
  }
  return {
    id,
    description: data['description'] as string,
    actionType: data['actionType'] as Proposal<TID>['actionType'],
    actionPayload: data['actionPayload'] as Record<string, unknown>,
    proposerMemberId,
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
  idProvider: IIdProvider<TID>,
): Record<string, unknown> {
  return {
    proposalId: idProvider.idToString(vote.proposalId),
    voterMemberId: idProvider.idToString(vote.voterMemberId),
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
  idProvider: IIdProvider<TID>,
): Vote<TID> {
  const rawProposalId = data['proposalId'];
  const proposalId = idProvider.parseSafe(String(rawProposalId));
  if (proposalId === undefined) {
    throw new Error(`Invalid proposalId in stored vote: ${rawProposalId}`);
  }
  const rawVoterId = data['voterMemberId'];
  const voterMemberId = idProvider.parseSafe(String(rawVoterId));
  if (voterMemberId === undefined) {
    throw new Error(`Invalid voterMemberId in stored vote: ${rawVoterId}`);
  }
  return {
    proposalId,
    voterMemberId,
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
  idProvider: IIdProvider<TID>,
): Record<string, unknown> {
  return {
    id: idProvider.idToString(record.id),
    contentId: idProvider.idToString(record.contentId),
    contentType: record.contentType,
    encryptedShardsByMemberId: serializeMap(
      record.encryptedShardsByMemberId as unknown as Map<HexString, Uint8Array>,
    ),
    memberIds: record.memberIds.map((mid) => idProvider.idToString(mid)),
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
  idProvider: IIdProvider<TID>,
): IdentityRecoveryRecord<TID> {
  const rawId = data['id'];
  const id = idProvider.parseSafe(String(rawId));
  if (id === undefined) {
    throw new Error(`Invalid identity record ID in stored document: ${rawId}`);
  }
  const rawContentId = data['contentId'];
  const contentId = idProvider.parseSafe(String(rawContentId));
  if (contentId === undefined) {
    throw new Error(
      `Invalid contentId in stored identity record: ${rawContentId}`,
    );
  }
  const rawMemberIds = data['memberIds'] as string[];
  const memberIds: TID[] = rawMemberIds.map((rawMid, i) => {
    const mid = idProvider.parseSafe(String(rawMid));
    if (mid === undefined) {
      throw new Error(
        `Invalid memberIds[${i}] in stored identity record: ${rawMid}`,
      );
    }
    return mid;
  });
  return {
    id,
    contentId,
    contentType: data['contentType'] as string,
    encryptedShardsByMemberId: deserializeMap(
      data['encryptedShardsByMemberId'] as Record<string, string>,
    ) as unknown as Map<TID, Uint8Array>,
    memberIds,
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
  idProvider: IIdProvider<TID>,
): Record<string, unknown> {
  return {
    aliasName: alias.aliasName,
    ownerMemberId: idProvider.idToString(alias.ownerMemberId),
    aliasPublicKey: serializeUint8Array(alias.aliasPublicKey),
    identityRecoveryRecordId: idProvider.idToString(
      alias.identityRecoveryRecordId,
    ),
    isActive: alias.isActive,
    registeredAt: alias.registeredAt.toISOString(),
    deactivatedAt: alias.deactivatedAt?.toISOString(),
    epochNumber: alias.epochNumber,
  };
}

function deserializeAlias<TID extends PlatformID>(
  data: Record<string, unknown>,
  idProvider: IIdProvider<TID>,
): AliasRecord<TID> {
  const rawOwnerId = data['ownerMemberId'];
  const ownerMemberId = idProvider.parseSafe(String(rawOwnerId));
  if (ownerMemberId === undefined) {
    throw new Error(`Invalid ownerMemberId in stored alias: ${rawOwnerId}`);
  }
  const rawRecordId = data['identityRecoveryRecordId'];
  const identityRecoveryRecordId = idProvider.parseSafe(String(rawRecordId));
  if (identityRecoveryRecordId === undefined) {
    throw new Error(
      `Invalid identityRecoveryRecordId in stored alias: ${rawRecordId}`,
    );
  }
  return {
    aliasName: data['aliasName'] as string,
    ownerMemberId,
    aliasPublicKey: deserializeUint8Array(data['aliasPublicKey'] as string),
    identityRecoveryRecordId,
    isActive: data['isActive'] as boolean,
    registeredAt: new Date(data['registeredAt'] as string),
    deactivatedAt: data['deactivatedAt']
      ? new Date(data['deactivatedAt'] as string)
      : undefined,
    epochNumber: data['epochNumber'] as number,
  };
}

// ─── AuditLogEntry Serialization ────────────────────────────────────────────

function serializeAuditEntry<TID extends PlatformID>(
  entry: BrightTrustAuditLogEntry<TID>,
  idProvider: IIdProvider<TID>,
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    id: idProvider.idToString(entry.id),
    eventType: entry.eventType,
    proposalId:
      entry.proposalId !== undefined
        ? idProvider.idToString(entry.proposalId)
        : undefined,
    targetMemberId:
      entry.targetMemberId !== undefined
        ? idProvider.idToString(entry.targetMemberId)
        : undefined,
    proposerMemberId:
      entry.proposerMemberId !== undefined
        ? idProvider.idToString(entry.proposerMemberId)
        : undefined,
    attachmentCblId: entry.attachmentCblId,
    details: entry.details,
    timestamp: entry.timestamp.toISOString(),
  };
  // If this is a ChainedAuditLogEntry, also serialize chain fields
  const chained = entry as Partial<ChainedAuditLogEntry<TID>>;
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

function deserializeChainedAuditEntry<TID extends PlatformID>(
  data: Record<string, unknown>,
  idProvider: IIdProvider<TID>,
): ChainedAuditLogEntry<TID> {
  const rawId = data['id'];
  const id = idProvider.parseSafe(String(rawId));
  if (id === undefined) {
    throw new Error(`Invalid audit entry ID in stored document: ${rawId}`);
  }
  // Optional TID fields — validate if present
  const parseOptionalId = (raw: unknown): TID | undefined => {
    if (raw === undefined || raw === null) return undefined;
    const parsed = idProvider.parseSafe(String(raw));
    if (parsed === undefined) {
      throw new Error(`Invalid optional ID in stored audit entry: ${raw}`);
    }
    return parsed;
  };
  return {
    id,
    eventType: data['eventType'] as ChainedAuditLogEntry<TID>['eventType'],
    proposalId: parseOptionalId(data['proposalId']),
    targetMemberId: parseOptionalId(data['targetMemberId']),
    proposerMemberId: parseOptionalId(data['proposerMemberId']),
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
    documentId: data['documentId'] as HexString,
    oldShares: deserializeMap(data['oldShares'] as Record<string, string>),
    oldMemberIds: data['oldMemberIds'] as HexString[],
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

// ─── BrightTrustDatabaseAdapter ──────────────────────────────────────────────────

/**
 * BrightDB-backed implementation of IBrightTrustDatabase.
 *
 * Uses a dedicated pool ID ("brightTrust-system") for isolated storage.
 * Each data type is stored in a separate collection.
 *
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export class BrightTrustDatabaseAdapter<TID extends PlatformID = Uint8Array>
  implements IBrightTrustDatabase<TID>
{
  private readonly db: BrightDb;
  private readonly idProvider: IIdProvider<TID>;

  constructor(db: BrightDb, idProvider: IIdProvider<TID>) {
    this.db = db;
    this.idProvider = idProvider;
  }

  // === Epoch Management ===

  async saveEpoch(epoch: BrightTrustEpoch<TID>): Promise<void> {
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

  async getEpoch(epochNumber: number): Promise<BrightTrustEpoch<TID> | null> {
    const col = this.db.collection<EpochDoc>(COLLECTION_EPOCHS);
    const doc = await col.findOne({ epochNumber });
    if (!doc) return null;
    return deserializeEpoch<TID>(doc.data);
  }

  async getCurrentEpoch(): Promise<BrightTrustEpoch<TID>> {
    const col = this.db.collection<EpochDoc>(COLLECTION_EPOCHS);
    const docs = await col
      .find({})
      .sort({ epochNumber: -1 })
      .limit(1)
      .toArray();
    if (docs.length === 0) {
      throw new Error('No epochs found in BrightTrust database');
    }
    return deserializeEpoch<TID>(docs[0].data);
  }

  // === Member Management ===

  async saveMember(member: IBrightTrustMember<TID>): Promise<void> {
    const col = this.db.collection<MemberDoc>(COLLECTION_MEMBERS);
    const serializedId = this.idProvider.idToString(member.id);
    const existing = await col.findOne({ memberId: serializedId });
    if (existing) {
      await col.updateOne(
        { memberId: serializedId },
        {
          $set: {
            isActive: member.isActive,
            data: serializeMember(member, this.idProvider),
          },
        },
      );
    } else {
      await col.insertOne({
        memberId: serializedId,
        isActive: member.isActive,
        data: serializeMember(member, this.idProvider),
      });
    }
  }

  async getMember(memberId: TID): Promise<IBrightTrustMember<TID> | null> {
    const col = this.db.collection<MemberDoc>(COLLECTION_MEMBERS);
    const serializedId = this.idProvider.idToString(memberId);
    const doc = await col.findOne({ memberId: serializedId });
    if (!doc) return null;
    return deserializeMember<TID>(doc.data, this.idProvider);
  }

  async listActiveMembers(): Promise<IBrightTrustMember<TID>[]> {
    const col = this.db.collection<MemberDoc>(COLLECTION_MEMBERS);
    const docs = await col.find({ isActive: true }).toArray();
    return docs.map((doc: MemberDoc) =>
      deserializeMember<TID>(doc.data, this.idProvider),
    );
  }

  // === Sealed Documents ===

  async saveDocument(doc: BrightTrustDataRecord<TID>): Promise<void> {
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

  async getDocument(docId: TID): Promise<BrightTrustDataRecord<TID> | null> {
    const col = this.db.collection<DocumentDoc>(COLLECTION_DOCUMENTS);
    const serializedId = this.idProvider.idToString(docId);
    const doc = await col.findOne({ docId: serializedId });
    if (!doc) return null;
    // Return the stored DTO data — callers use BrightTrustDataRecord.fromDto
    // to reconstruct the full object with crypto services.
    return doc.data as unknown as BrightTrustDataRecord<TID>;
  }

  async listDocumentsByEpoch(
    epochNumber: number,
    page: number,
    pageSize: number,
  ): Promise<BrightTrustDataRecord<TID>[]> {
    const col = this.db.collection<DocumentDoc>(COLLECTION_DOCUMENTS);
    const docs = await col
      .find({ epochNumber })
      .skip(page * pageSize)
      .limit(pageSize)
      .toArray();
    return docs.map(
      (d: DocumentDoc) => d.data as unknown as BrightTrustDataRecord<TID>,
    );
  }

  // === Proposals and Votes ===

  async saveProposal(proposal: Proposal<TID>): Promise<void> {
    const col = this.db.collection<ProposalDoc>(COLLECTION_PROPOSALS);
    const serializedId = this.idProvider.idToString(proposal.id);
    const existing = await col.findOne({ proposalId: serializedId });
    if (existing) {
      await col.updateOne(
        { proposalId: serializedId },
        { $set: { data: serializeProposal(proposal, this.idProvider) } },
      );
    } else {
      await col.insertOne({
        proposalId: serializedId,
        data: serializeProposal(proposal, this.idProvider),
      });
    }
  }

  async getProposal(proposalId: TID): Promise<Proposal<TID> | null> {
    const col = this.db.collection<ProposalDoc>(COLLECTION_PROPOSALS);
    const serializedId = this.idProvider.idToString(proposalId);
    const doc = await col.findOne({ proposalId: serializedId });
    if (!doc) return null;
    return deserializeProposal<TID>(doc.data, this.idProvider);
  }

  async saveVote(vote: Vote<TID>): Promise<void> {
    const col = this.db.collection<VoteDoc>(COLLECTION_VOTES);
    const serializedProposalId = this.idProvider.idToString(vote.proposalId);
    const serializedVoterId = this.idProvider.idToString(vote.voterMemberId);
    const existing = await col.findOne({
      proposalId: serializedProposalId,
      voterMemberId: serializedVoterId,
    });
    if (existing) {
      await col.updateOne(
        {
          proposalId: serializedProposalId,
          voterMemberId: serializedVoterId,
        },
        { $set: { data: serializeVote(vote, this.idProvider) } },
      );
    } else {
      await col.insertOne({
        proposalId: serializedProposalId,
        voterMemberId: serializedVoterId,
        data: serializeVote(vote, this.idProvider),
      });
    }
  }

  async getVotesForProposal(proposalId: TID): Promise<Vote<TID>[]> {
    const col = this.db.collection<VoteDoc>(COLLECTION_VOTES);
    const serializedId = this.idProvider.idToString(proposalId);
    const docs = await col.find({ proposalId: serializedId }).toArray();
    return docs.map((d: VoteDoc) =>
      deserializeVote<TID>(d.data, this.idProvider),
    );
  }

  // === Identity Recovery Records ===

  async saveIdentityRecord(record: IdentityRecoveryRecord<TID>): Promise<void> {
    const col = this.db.collection<IdentityRecordDoc>(
      COLLECTION_IDENTITY_RECORDS,
    );
    const serializedId = this.idProvider.idToString(record.id);
    const existing = await col.findOne({ recordId: serializedId });
    if (existing) {
      await col.updateOne(
        { recordId: serializedId },
        {
          $set: {
            expiresAt: record.expiresAt.toISOString(),
            data: serializeIdentityRecord(record, this.idProvider),
          },
        },
      );
    } else {
      await col.insertOne({
        recordId: serializedId,
        expiresAt: record.expiresAt.toISOString(),
        data: serializeIdentityRecord(record, this.idProvider),
      });
    }
  }

  async getIdentityRecord(
    recordId: TID,
  ): Promise<IdentityRecoveryRecord<TID> | null> {
    const col = this.db.collection<IdentityRecordDoc>(
      COLLECTION_IDENTITY_RECORDS,
    );
    const serializedId = this.idProvider.idToString(recordId);
    const doc = await col.findOne({ recordId: serializedId });
    if (!doc) return null;
    return deserializeIdentityRecord<TID>(doc.data, this.idProvider);
  }

  async deleteIdentityRecord(recordId: TID): Promise<void> {
    const col = this.db.collection<IdentityRecordDoc>(
      COLLECTION_IDENTITY_RECORDS,
    );
    const serializedId = this.idProvider.idToString(recordId);
    await col.deleteOne({ recordId: serializedId });
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
      deserializeIdentityRecord<TID>(d.data, this.idProvider),
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
            data: serializeAlias(alias, this.idProvider),
          },
        },
      );
    } else {
      await col.insertOne({
        aliasName: alias.aliasName,
        isActive: alias.isActive,
        data: serializeAlias(alias, this.idProvider),
      });
    }
  }

  async getAlias(aliasName: string): Promise<AliasRecord<TID> | null> {
    const col = this.db.collection<AliasDoc>(COLLECTION_ALIASES);
    const doc = await col.findOne({ aliasName });
    if (!doc) return null;
    return deserializeAlias<TID>(doc.data, this.idProvider);
  }

  async isAliasAvailable(aliasName: string): Promise<boolean> {
    const col = this.db.collection<AliasDoc>(COLLECTION_ALIASES);
    const doc = await col.findOne({ aliasName });
    // Available if no record exists or the existing record is inactive
    return doc === null || !doc.isActive;
  }

  // === Audit Log ===

  async appendAuditEntry(entry: BrightTrustAuditLogEntry<TID>): Promise<void> {
    const col = this.db.collection<AuditLogDoc>(COLLECTION_AUDIT_LOG);
    await col.insertOne({
      entryId: this.idProvider.idToString(entry.id),
      timestamp: entry.timestamp.toISOString(),
      data: serializeAuditEntry(entry, this.idProvider),
    });
  }

  async getLatestAuditEntry(): Promise<ChainedAuditLogEntry<TID> | null> {
    const col = this.db.collection<AuditLogDoc>(COLLECTION_AUDIT_LOG);
    const docs = await col.find({}).sort({ timestamp: -1 }).limit(1).toArray();
    if (docs.length === 0) return null;
    return deserializeChainedAuditEntry<TID>(docs[0].data, this.idProvider);
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

  // === Ban Records ===

  async saveBanRecord(record: IBanRecord<TID>): Promise<void> {
    const col = this.db.collection<BanRecordDoc>(COLLECTION_BAN_RECORDS);
    const memberId = this.idProvider.idToString(record.memberId);
    const data: Record<string, unknown> = {
      memberId: memberId,
      reason: record.reason,
      proposalId: this.idProvider.idToString(record.proposalId),
      epoch: record.epoch,
      bannedAt: record.bannedAt.toISOString(),
      evidenceBlockIds: record.evidenceBlockIds,
      approvalSignatures: record.approvalSignatures.map((sig) => ({
        memberId: this.idProvider.idToString(sig.memberId),
        signature: serializeUint8Array(sig.signature),
      })),
      requiredSignatures: record.requiredSignatures,
    };
    const existing = await col.findOne({ memberId });
    if (existing) {
      await col.updateOne({ memberId }, { $set: { data } });
    } else {
      await col.insertOne({ memberId, data });
    }
  }

  async deleteBanRecord(memberId: TID): Promise<void> {
    const col = this.db.collection<BanRecordDoc>(COLLECTION_BAN_RECORDS);
    const id = this.idProvider.idToString(memberId);
    await col.deleteOne({ memberId: id });
  }

  async getBanRecord(memberId: TID): Promise<IBanRecord<TID> | null> {
    const col = this.db.collection<BanRecordDoc>(COLLECTION_BAN_RECORDS);
    const id = this.idProvider.idToString(memberId);
    const doc = await col.findOne({ memberId: id });
    if (!doc) return null;
    return this.deserializeBanRecord(doc.data);
  }

  async getAllBanRecords(): Promise<IBanRecord<TID>[]> {
    const col = this.db.collection<BanRecordDoc>(COLLECTION_BAN_RECORDS);
    const docs = await col.find({}).toArray();
    return docs.map((doc: BanRecordDoc) => this.deserializeBanRecord(doc.data));
  }

  async getMemberAdmissionProposerId(memberId: TID): Promise<TID | null> {
    // Look up the ADD_MEMBER proposal that admitted this member.
    // If no such proposal exists, the member is a founder.
    const col = this.db.collection<ProposalDoc>(COLLECTION_PROPOSALS);
    const memberIdStr = this.idProvider.idToString(memberId);
    const docs = await col.find({}).toArray();
    for (const doc of docs) {
      const data = doc.data;
      if (
        data['actionType'] === 'ADD_MEMBER' &&
        data['status'] === 'APPROVED'
      ) {
        const payload = data['actionPayload'] as
          | Record<string, unknown>
          | undefined;
        if (payload && payload['targetMemberId'] === memberIdStr) {
          const proposerId = data['proposerMemberId'] as string;
          if (proposerId) {
            return this.idProvider.idFromString(proposerId);
          }
        }
      }
    }
    return null;
  }

  private deserializeBanRecord(data: Record<string, unknown>): IBanRecord<TID> {
    const sigs =
      (data['approvalSignatures'] as Array<{
        memberId: string;
        signature: string;
      }>) ?? [];
    return {
      memberId: this.idProvider.idFromString(data['memberId'] as string),
      reason: data['reason'] as string,
      proposalId: this.idProvider.idFromString(data['proposalId'] as string),
      epoch: data['epoch'] as number,
      bannedAt: new Date(data['bannedAt'] as string),
      evidenceBlockIds: data['evidenceBlockIds'] as string[] | undefined,
      approvalSignatures: sigs.map((sig) => ({
        memberId: this.idProvider.idFromString(sig.memberId),
        signature: deserializeUint8Array(sig.signature),
      })),
      requiredSignatures: data['requiredSignatures'] as number,
    };
  }
}
