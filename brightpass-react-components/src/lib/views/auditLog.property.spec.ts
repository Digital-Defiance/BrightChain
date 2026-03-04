/**
 * Property-based tests for AuditLogView — Properties 16, 17, 18
 *
 * Property 16: Audit log entry rendering completeness
 * Property 17: Audit log action type filtering
 * Property 18: Audit log chronological ordering
 *
 * **Validates: Requirements 12.2, 12.3, 12.4**
 */

import fc from 'fast-check';

// Mock brightchain-lib to avoid the heavy ECIES/GUID init chain
jest.mock('@brightchain/brightchain-lib', () => ({
  __esModule: true,
  AuditAction: {
    VAULT_CREATED: 'VAULT_CREATED',
    VAULT_OPENED: 'VAULT_OPENED',
    ENTRY_CREATED: 'ENTRY_CREATED',
    ENTRY_READ: 'ENTRY_READ',
    ENTRY_UPDATED: 'ENTRY_UPDATED',
    ENTRY_DELETED: 'ENTRY_DELETED',
    VAULT_SHARED: 'VAULT_SHARED',
    VAULT_SHARE_REVOKED: 'VAULT_SHARE_REVOKED',
    EMERGENCY_CONFIGURED: 'EMERGENCY_CONFIGURED',
    EMERGENCY_RECOVERED: 'EMERGENCY_RECOVERED',
  },
  BrightPassStrings: new Proxy({}, { get: (_target, prop) => String(prop) }),
}));

jest.mock('../hooks/useBrightPassTranslation', () => ({
  __esModule: true,
  useBrightPassTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('../hooks/useBrightPassApi', () => ({
  __esModule: true,
  useBrightPassApi: () => ({
    getAuditLog: jest.fn(),
  }),
}));

jest.mock('react-router-dom', () => ({
  __esModule: true,
  useParams: () => ({ vaultId: 'test-vault' }),
}));

jest.mock('../components/BreadcrumbNav', () => ({
  __esModule: true,
  default: () => null,
}));

// Import AFTER mocks
import type { AuditEntry } from './AuditLogView';
import {
  filterAuditEntries,
  formatAuditEntry,
  sortAuditEntries,
} from './AuditLogView';

const ACTION_TYPES = [
  'VAULT_CREATED',
  'VAULT_OPENED',
  'ENTRY_CREATED',
  'ENTRY_READ',
  'ENTRY_UPDATED',
  'ENTRY_DELETED',
  'VAULT_SHARED',
  'VAULT_SHARE_REVOKED',
  'EMERGENCY_CONFIGURED',
  'EMERGENCY_RECOVERED',
];

const auditEntryArb = fc.record<AuditEntry>({
  id: fc.uuid(),
  timestamp: fc
    .integer({ min: 1577836800000, max: 1893456000000 })
    .map((ms) => new Date(ms).toISOString()),
  actionType: fc.constantFrom(...ACTION_TYPES),
  memberId: fc.uuid(),
});

describe('Property 16: Audit log entry rendering completeness', () => {
  it('formatAuditEntry returns non-empty formattedTimestamp and actionLabel', () => {
    fc.assert(
      fc.property(auditEntryArb, (entry) => {
        const result = formatAuditEntry(entry);
        expect(result.formattedTimestamp.length).toBeGreaterThan(0);
        expect(result.actionLabel).toBe(entry.actionType);
      }),
      { numRuns: 100 },
    );
  });

  it('is deterministic', () => {
    fc.assert(
      fc.property(auditEntryArb, (entry) => {
        const a = formatAuditEntry(entry);
        const b = formatAuditEntry(entry);
        expect(a).toEqual(b);
      }),
      { numRuns: 100 },
    );
  });
});

describe('Property 17: Audit log action type filtering', () => {
  it('returns all entries when filter is null', () => {
    fc.assert(
      fc.property(fc.array(auditEntryArb, { maxLength: 50 }), (entries) => {
        const filtered = filterAuditEntries(entries, null);
        expect(filtered.length).toBe(entries.length);
      }),
      { numRuns: 100 },
    );
  });

  it('returns only entries matching the selected action type', () => {
    fc.assert(
      fc.property(
        fc.array(auditEntryArb, { maxLength: 50 }),
        fc.constantFrom(...ACTION_TYPES),
        (entries, actionType) => {
          const filtered = filterAuditEntries(entries, actionType);
          expect(filtered.every((e) => e.actionType === actionType)).toBe(true);
          const expected = entries.filter((e) => e.actionType === actionType);
          expect(filtered.length).toBe(expected.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Property 18: Audit log chronological ordering', () => {
  it('sorts entries in reverse chronological order (newest first)', () => {
    fc.assert(
      fc.property(fc.array(auditEntryArb, { maxLength: 50 }), (entries) => {
        const sorted = sortAuditEntries(entries);
        for (let i = 0; i < sorted.length - 1; i++) {
          const a = new Date(sorted[i].timestamp).getTime();
          const b = new Date(sorted[i + 1].timestamp).getTime();
          expect(a).toBeGreaterThanOrEqual(b);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('preserves all entries (no entries lost or duplicated)', () => {
    fc.assert(
      fc.property(fc.array(auditEntryArb, { maxLength: 50 }), (entries) => {
        const sorted = sortAuditEntries(entries);
        expect(sorted.length).toBe(entries.length);
        const sortedIds = sorted.map((e) => e.id).sort();
        const originalIds = [...entries].map((e) => e.id).sort();
        expect(sortedIds).toEqual(originalIds);
      }),
      { numRuns: 100 },
    );
  });
});
