/**
 * Property-Based Tests for AuditLogService
 *
 * P12: Audit Chain Integrity
 * For any sequence of N audit log entries, entry[i].previousEntryHash === entry[i-1].contentHash
 * for all i > 0, and entry[0].previousEntryHash === null. Recomputing contentHash from entry
 * fields matches the stored contentHash. Signatures verify against the signing node's public key.
 *
 * **Validates: Requirements 13.6, 13.7**
 */
import {
  EmailString,
  GuidV4Uint8Array,
  IMemberWithMnemonic,
  Member,
  MemberType,
  ShortHexGuid,
} from '@digitaldefiance/ecies-lib';
import * as fc from 'fast-check';
import { v4 as uuidv4 } from 'uuid';
import { initializeBrightChain } from '../init';
import {
  AuditEventType,
  QuorumAuditLogEntry,
} from '../interfaces/auditLogEntry';
import { ChainedAuditLogEntry } from '../interfaces/chainedAuditLogEntry';
import { IQuorumDatabase } from '../interfaces/services/quorumDatabase';
import {
  AuditLogService,
  computeContentHash,
  serializeEntryForHashing,
} from './auditLogService';
import { ServiceProvider } from './service.provider';

// Set a longer timeout for property-based tests
jest.setTimeout(120000);

/** All valid audit event types for generating random entries */
const AUDIT_EVENT_TYPES: AuditEventType[] = [
  'epoch_created',
  'member_added',
  'member_removed',
  'transition_ceremony_started',
  'transition_ceremony_completed',
  'transition_ceremony_failed',
  'proposal_created',
  'proposal_approved',
  'proposal_rejected',
  'proposal_expired',
  'vote_cast',
  'identity_disclosure_proposed',
  'identity_disclosure_approved',
  'identity_disclosure_rejected',
  'identity_disclosure_expired',
  'identity_shards_expired',
  'alias_registered',
  'alias_deregistered',
  'share_redistribution_started',
  'share_redistribution_completed',
  'share_redistribution_failed',
];

/** Arbitrary for generating random audit event types */
const arbEventType = fc.constantFrom(...AUDIT_EVENT_TYPES);

/** Arbitrary for generating random audit log entries */
const arbAuditEntry = fc
  .record({
    eventType: arbEventType,
    detailKey: fc.string({ minLength: 1, maxLength: 20 }),
    detailValue: fc.string({ minLength: 0, maxLength: 50 }),
  })
  .map(
    ({ eventType, detailKey, detailValue }): QuorumAuditLogEntry => ({
      id: uuidv4() as ShortHexGuid,
      eventType,
      details: { [detailKey]: detailValue },
      timestamp: new Date(),
    }),
  );

/**
 * Creates a mock IQuorumDatabase that tracks chained audit entries in memory.
 */
function createAuditMockDatabase(): IQuorumDatabase<GuidV4Uint8Array> & {
  chainedEntries: ChainedAuditLogEntry[];
} {
  const chainedEntries: ChainedAuditLogEntry[] = [];

  const noop = async () => {};
  const nullAsync = async () => null;

  return {
    chainedEntries,
    appendAuditEntry: jest.fn(async (entry: QuorumAuditLogEntry) => {
      // Store as ChainedAuditLogEntry if it has chain fields
      const chained = entry as ChainedAuditLogEntry;
      if (chained.contentHash !== undefined) {
        chainedEntries.push(chained);
      }
    }),
    getLatestAuditEntry: jest.fn(async () => {
      if (chainedEntries.length === 0) return null;
      return chainedEntries[chainedEntries.length - 1];
    }),
    // Stubs for the rest of IQuorumDatabase
    saveEpoch: jest.fn(noop),
    getEpoch: jest.fn(nullAsync),
    getCurrentEpoch: jest.fn(async () => {
      throw new Error('Not implemented');
    }),
    saveMember: jest.fn(noop),
    getMember: jest.fn(nullAsync),
    listActiveMembers: jest.fn(async () => []),
    saveDocument: jest.fn(noop),
    getDocument: jest.fn(nullAsync),
    listDocumentsByEpoch: jest.fn(async () => []),
    saveProposal: jest.fn(noop),
    getProposal: jest.fn(nullAsync),
    saveVote: jest.fn(noop),
    getVotesForProposal: jest.fn(async () => []),
    saveIdentityRecord: jest.fn(noop),
    getIdentityRecord: jest.fn(nullAsync),
    deleteIdentityRecord: jest.fn(noop),
    listExpiredIdentityRecords: jest.fn(async () => []),
    saveAlias: jest.fn(noop),
    getAlias: jest.fn(nullAsync),
    isAliasAvailable: jest.fn(async () => true),
    saveJournalEntry: jest.fn(noop),
    getJournalEntries: jest.fn(async () => []),
    deleteJournalEntries: jest.fn(noop),
    saveStatuteConfig: jest.fn(noop),
    getStatuteConfig: jest.fn(nullAsync),
    saveOperationalState: jest.fn(noop),
    getOperationalState: jest.fn(nullAsync),
    withTransaction: jest.fn(async <R>(fn: () => Promise<R>) => fn()),
    isAvailable: jest.fn(async () => true),
  };
}

describe('P12: Audit Chain Integrity', () => {
  let signingMember: IMemberWithMnemonic<GuidV4Uint8Array>;
  let eciesService: ReturnType<
    typeof ServiceProvider.getInstance<GuidV4Uint8Array>
  >['eciesService'];

  beforeAll(() => {
    initializeBrightChain();
    const sp = ServiceProvider.getInstance<GuidV4Uint8Array>();
    eciesService = sp.eciesService;
    signingMember = Member.newMember<GuidV4Uint8Array>(
      eciesService,
      MemberType.System,
      'AuditSigner',
      new EmailString('signer@example.com'),
    );
  });

  it('should form a valid hash chain for any sequence of entries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbAuditEntry, { minLength: 1, maxLength: 10 }),
        async (entries) => {
          const db = createAuditMockDatabase();
          const service = new AuditLogService<GuidV4Uint8Array>(
            db,
            signingMember.member,
            eciesService,
          );

          // Append all entries
          const chainedEntries: ChainedAuditLogEntry[] = [];
          for (const entry of entries) {
            const chained = await service.appendEntry(entry);
            chainedEntries.push(chained);
          }

          // Verify chain properties
          for (let i = 0; i < chainedEntries.length; i++) {
            const current = chainedEntries[i];

            // P12.1: Genesis entry has null previousEntryHash
            if (i === 0) {
              expect(current.previousEntryHash).toBeNull();
            } else {
              // P12.2: entry[i].previousEntryHash === entry[i-1].contentHash
              expect(current.previousEntryHash).toBe(
                chainedEntries[i - 1].contentHash,
              );
            }

            // P12.3: Recomputed contentHash matches stored contentHash
            const serialized = serializeEntryForHashing({
              id: current.id,
              eventType: current.eventType,
              timestamp: current.timestamp,
              details: current.details,
              proposalId: current.proposalId,
              targetMemberId: current.targetMemberId,
              proposerMemberId: current.proposerMemberId,
              attachmentCblId: current.attachmentCblId,
              previousEntryHash: current.previousEntryHash,
            });
            const recomputedHash = computeContentHash(serialized);
            expect(recomputedHash).toBe(current.contentHash);

            // P12.4: Signature verifies against signing node's public key
            const contentHashBytes = new TextEncoder().encode(
              current.contentHash,
            );
            const signatureValid = eciesService.verifyMessage(
              signingMember.member.publicKey,
              contentHashBytes,
              current.signature,
            );
            expect(signatureValid).toBe(true);
          }
        },
      ),
      { numRuns: 20 },
    );
  });

  it('should detect chain tampering via verifyChain', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbAuditEntry, { minLength: 2, maxLength: 8 }),
        fc.nat(),
        async (entries, tamperSeed) => {
          const db = createAuditMockDatabase();
          const service = new AuditLogService<GuidV4Uint8Array>(
            db,
            signingMember.member,
            eciesService,
          );

          // Build a valid chain
          const chainedEntries: ChainedAuditLogEntry[] = [];
          for (const entry of entries) {
            const chained = await service.appendEntry(entry);
            chainedEntries.push(chained);
          }

          // Valid chain should verify
          const isValid = await service.verifyChain(
            signingMember.member.publicKey,
            chainedEntries,
          );
          expect(isValid).toBe(true);

          // Tamper with one entry's contentHash
          const tamperIndex = tamperSeed % chainedEntries.length;
          const tamperedEntries = chainedEntries.map((e, idx) => {
            if (idx === tamperIndex) {
              return {
                ...e,
                contentHash: e.contentHash.replace(
                  e.contentHash[0],
                  e.contentHash[0] === 'a' ? 'b' : 'a',
                ),
              };
            }
            return e;
          });

          // Tampered chain should throw
          await expect(
            service.verifyChain(
              signingMember.member.publicKey,
              tamperedEntries,
            ),
          ).rejects.toThrow();
        },
      ),
      { numRuns: 15 },
    );
  });
});
