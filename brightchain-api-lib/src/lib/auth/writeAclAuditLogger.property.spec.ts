/**
 * Property-based tests for WriteAclAuditLogger (Property 15).
 *
 * Feature: brightdb-write-acls, Property 15: Audit Log Completeness
 *
 * For any write ACL event (authorized write, rejected write, ACL modification,
 * capability token issuance, capability token usage, security event), the audit
 * logger SHALL record an entry containing the actor's public key, the operation
 * type, the target scope, and a timestamp. The number of audit log entries SHALL
 * equal the number of write ACL events processed.
 *
 * **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5**
 */
import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';

import type { IAclScope } from '@brightchain/brightchain-lib';

import { AuditOperationType, WriteAclAuditLogger } from './writeAclAuditLogger';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Arbitrary safe string for names / keys (non-empty, no colons). */
const arbName: fc.Arbitrary<string> = fc
  .stringMatching(/^[a-zA-Z0-9_-]{1,32}$/)
  .filter((s) => s.length > 0);

/** Arbitrary hex-encoded public key (64 hex chars). */
const arbPublicKeyHex: fc.Arbitrary<string> = fc
  .uint8Array({ minLength: 32, maxLength: 32 })
  .map((bytes) => Buffer.from(bytes).toString('hex'));

/** Arbitrary ACL scope. */
const arbAclScope: fc.Arbitrary<IAclScope> = fc.record({
  dbName: arbName,
  collectionName: fc.option(arbName, { nil: undefined }),
});

/** Arbitrary block ID (hex string). */
const arbBlockId: fc.Arbitrary<string> = fc
  .uint8Array({ minLength: 16, maxLength: 16 })
  .map((bytes) => Buffer.from(bytes).toString('hex'));

/** Arbitrary reason string. */
const arbReason: fc.Arbitrary<string> = fc
  .stringMatching(/^[a-zA-Z0-9 _.-]{1,64}$/)
  .filter((s) => s.length > 0);

/** Arbitrary change type. */
const arbChangeType: fc.Arbitrary<string> = fc.constantFrom(
  'addWriter',
  'removeWriter',
  'addAdmin',
  'removeAdmin',
  'setWriteMode',
);

/** Arbitrary future date for token expiration. */
const arbFutureDate: fc.Arbitrary<Date> = fc
  .integer({ min: 1, max: 365 * 24 * 60 * 60 * 1000 })
  .map((offset) => new Date(Date.now() + offset));

/**
 * Discriminated union of all possible audit events for generation.
 */
type AuditEvent =
  | {
      type: 'authorizedWrite';
      writerPublicKey: string;
      dbName: string;
      collectionName: string;
      blockId: string;
    }
  | {
      type: 'rejectedWrite';
      requesterPublicKey: string;
      dbName: string;
      collectionName: string;
      reason: string;
    }
  | {
      type: 'aclModification';
      adminPublicKey: string;
      changeType: string;
      affectedMember: string;
      dbName: string;
      collectionName: string | undefined;
    }
  | {
      type: 'capabilityTokenIssued';
      granteePublicKey: string;
      scope: IAclScope;
      expiresAt: Date;
      grantorPublicKey: string;
    }
  | {
      type: 'capabilityTokenUsed';
      granteePublicKey: string;
      scope: IAclScope;
      dbName: string;
      collectionName: string;
      blockId: string;
    }
  | {
      type: 'securityEvent';
      event: string;
      details: Record<string, unknown>;
    };

/** Arbitrary that produces any one of the six audit event types. */
const arbAuditEvent: fc.Arbitrary<AuditEvent> = fc.oneof(
  fc.record({
    type: fc.constant('authorizedWrite' as const),
    writerPublicKey: arbPublicKeyHex,
    dbName: arbName,
    collectionName: arbName,
    blockId: arbBlockId,
  }),
  fc.record({
    type: fc.constant('rejectedWrite' as const),
    requesterPublicKey: arbPublicKeyHex,
    dbName: arbName,
    collectionName: arbName,
    reason: arbReason,
  }),
  fc.record({
    type: fc.constant('aclModification' as const),
    adminPublicKey: arbPublicKeyHex,
    changeType: arbChangeType,
    affectedMember: arbPublicKeyHex,
    dbName: arbName,
    collectionName: fc.option(arbName, { nil: undefined }),
  }),
  fc.record({
    type: fc.constant('capabilityTokenIssued' as const),
    granteePublicKey: arbPublicKeyHex,
    scope: arbAclScope,
    expiresAt: arbFutureDate,
    grantorPublicKey: arbPublicKeyHex,
  }),
  fc.record({
    type: fc.constant('capabilityTokenUsed' as const),
    granteePublicKey: arbPublicKeyHex,
    scope: arbAclScope,
    dbName: arbName,
    collectionName: arbName,
    blockId: arbBlockId,
  }),
  fc.record({
    type: fc.constant('securityEvent' as const),
    event: arbReason,
    details: fc.record({
      actorPublicKey: arbPublicKeyHex,
      dbName: arbName,
    }) as fc.Arbitrary<Record<string, unknown>>,
  }),
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Dispatch an audit event to the logger.
 */
function dispatchEvent(logger: WriteAclAuditLogger, event: AuditEvent): void {
  switch (event.type) {
    case 'authorizedWrite':
      logger.logAuthorizedWrite(
        event.writerPublicKey,
        event.dbName,
        event.collectionName,
        event.blockId,
      );
      break;
    case 'rejectedWrite':
      logger.logRejectedWrite(
        event.requesterPublicKey,
        event.dbName,
        event.collectionName,
        event.reason,
      );
      break;
    case 'aclModification':
      logger.logAclModification(
        event.adminPublicKey,
        event.changeType,
        event.affectedMember,
        event.dbName,
        event.collectionName,
      );
      break;
    case 'capabilityTokenIssued':
      logger.logCapabilityTokenIssued(
        event.granteePublicKey,
        event.scope,
        event.expiresAt,
        event.grantorPublicKey,
      );
      break;
    case 'capabilityTokenUsed':
      logger.logCapabilityTokenUsed(
        event.granteePublicKey,
        event.scope,
        event.dbName,
        event.collectionName,
        event.blockId,
      );
      break;
    case 'securityEvent':
      logger.logSecurityEvent(event.event, event.details);
      break;
  }
}

/**
 * Map event type string to expected AuditOperationType.
 */
function expectedOperationType(
  eventType: AuditEvent['type'],
): AuditOperationType {
  switch (eventType) {
    case 'authorizedWrite':
      return AuditOperationType.AuthorizedWrite;
    case 'rejectedWrite':
      return AuditOperationType.RejectedWrite;
    case 'aclModification':
      return AuditOperationType.AclModification;
    case 'capabilityTokenIssued':
      return AuditOperationType.CapabilityTokenIssued;
    case 'capabilityTokenUsed':
      return AuditOperationType.CapabilityTokenUsed;
    case 'securityEvent':
      return AuditOperationType.SecurityEvent;
  }
}

// ---------------------------------------------------------------------------
// Property 15: Audit Log Completeness
// ---------------------------------------------------------------------------

describe('Feature: brightdb-write-acls, Property 15: Audit Log Completeness', () => {
  it('Property 15a: number of audit log entries equals number of events processed — **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5**', () => {
    fc.assert(
      fc.property(
        fc.array(arbAuditEvent, { minLength: 0, maxLength: 50 }),
        (events) => {
          const logger = new WriteAclAuditLogger();

          for (const event of events) {
            dispatchEvent(logger, event);
          }

          expect(logger.getEntryCount()).toBe(events.length);
          expect(logger.getEntries()).toHaveLength(events.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 15b: each entry contains required fields (actor public key, operation type, target scope, timestamp) — **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5**', () => {
    fc.assert(
      fc.property(
        fc.array(arbAuditEvent, { minLength: 1, maxLength: 30 }),
        (events) => {
          const logger = new WriteAclAuditLogger();
          const beforeTime = new Date();

          for (const event of events) {
            dispatchEvent(logger, event);
          }

          const afterTime = new Date();
          const entries = logger.getEntries();

          for (let i = 0; i < events.length; i++) {
            const entry = entries[i];
            const event = events[i];

            // Required field: timestamp is a Date within the test window
            expect(entry.timestamp).toBeInstanceOf(Date);
            expect(entry.timestamp.getTime()).toBeGreaterThanOrEqual(
              beforeTime.getTime(),
            );
            expect(entry.timestamp.getTime()).toBeLessThanOrEqual(
              afterTime.getTime(),
            );

            // Required field: operationType matches the event type
            expect(entry.operationType).toBe(expectedOperationType(event.type));

            // Required field: actorPublicKey is a string
            expect(typeof entry.actorPublicKey).toBe('string');

            // Required field: targetScope has dbName
            expect(entry.targetScope).toBeDefined();
            expect(typeof entry.targetScope.dbName).toBe('string');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 15c: entries preserve correct operation type ordering — **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5**', () => {
    fc.assert(
      fc.property(
        fc.array(arbAuditEvent, { minLength: 1, maxLength: 30 }),
        (events) => {
          const logger = new WriteAclAuditLogger();

          for (const event of events) {
            dispatchEvent(logger, event);
          }

          const entries = logger.getEntries();

          // Each entry's operation type matches the dispatched event in order
          for (let i = 0; i < events.length; i++) {
            expect(entries[i].operationType).toBe(
              expectedOperationType(events[i].type),
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 15d: each event type individually produces exactly one entry with correct fields — **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5**', () => {
    fc.assert(
      fc.property(arbAuditEvent, (event) => {
        const logger = new WriteAclAuditLogger();

        dispatchEvent(logger, event);

        // Exactly one entry
        expect(logger.getEntryCount()).toBe(1);

        const entry = logger.getEntries()[0];

        // Correct operation type
        expect(entry.operationType).toBe(expectedOperationType(event.type));

        // Timestamp is present
        expect(entry.timestamp).toBeInstanceOf(Date);

        // Actor public key is present
        expect(typeof entry.actorPublicKey).toBe('string');

        // Target scope is present with dbName
        expect(entry.targetScope).toBeDefined();
        expect(typeof entry.targetScope.dbName).toBe('string');
      }),
      { numRuns: 100 },
    );
  });
});
