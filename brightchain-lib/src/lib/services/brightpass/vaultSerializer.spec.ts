/**
 * Unit tests for VaultSerializer
 * Feature: api-lib-to-lib-migration
 *
 * Tests serialization/deserialization of VaultEntry and AuditLogEntry objects
 * with proper Date handling and validation.
 *
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6**
 */

import {
  AuditAction,
  AuditLogEntry,
  VaultEntry,
} from '../../interfaces/brightpass';
import { VaultSerializer } from './vaultSerializer';

describe('VaultSerializer', () => {
  const now = new Date('2024-06-15T12:00:00.000Z');

  const loginEntry: VaultEntry = {
    id: 'entry-1',
    type: 'login',
    title: 'My Login',
    siteUrl: 'https://example.com',
    username: 'user@example.com',
    password: 'secret123',
    createdAt: now,
    updatedAt: now,
    favorite: false,
  };

  const secureNoteEntry: VaultEntry = {
    id: 'entry-2',
    type: 'secure_note',
    title: 'My Note',
    content: 'Some secret content',
    createdAt: now,
    updatedAt: now,
    favorite: true,
  };

  const creditCardEntry: VaultEntry = {
    id: 'entry-3',
    type: 'credit_card',
    title: 'My Card',
    cardholderName: 'John Doe',
    cardNumber: '4111111111111111',
    expirationDate: '12/25',
    cvv: '123',
    createdAt: now,
    updatedAt: now,
    favorite: false,
  };

  const identityEntry: VaultEntry = {
    id: 'entry-4',
    type: 'identity',
    title: 'My Identity',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    createdAt: now,
    updatedAt: now,
    favorite: false,
  };

  const auditLogEntry: AuditLogEntry = {
    id: 'audit-1',
    vaultId: 'vault-1',
    memberId: 'member-1',
    action: AuditAction.ENTRY_CREATED,
    timestamp: now,
    metadata: { entryId: 'entry-1' },
  };

  describe('serializeEntry / deserializeEntry', () => {
    it('should round-trip a login entry with Date reconstruction', () => {
      const json = VaultSerializer.serializeEntry(loginEntry);
      const result = VaultSerializer.deserializeEntry(json);

      expect(result.id).toBe(loginEntry.id);
      expect(result.type).toBe('login');
      expect(result.title).toBe(loginEntry.title);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.createdAt.toISOString()).toBe(now.toISOString());
    });

    it('should round-trip a secure_note entry', () => {
      const json = VaultSerializer.serializeEntry(secureNoteEntry);
      const result = VaultSerializer.deserializeEntry(json);

      expect(result.type).toBe('secure_note');
      expect(result.title).toBe('My Note');
    });

    it('should round-trip a credit_card entry', () => {
      const json = VaultSerializer.serializeEntry(creditCardEntry);
      const result = VaultSerializer.deserializeEntry(json);

      expect(result.type).toBe('credit_card');
      expect(result.title).toBe('My Card');
    });

    it('should round-trip an identity entry', () => {
      const json = VaultSerializer.serializeEntry(identityEntry);
      const result = VaultSerializer.deserializeEntry(json);

      expect(result.type).toBe('identity');
      expect(result.title).toBe('My Identity');
    });

    it('should serialize Dates as ISO strings in JSON output', () => {
      const json = VaultSerializer.serializeEntry(loginEntry);
      const raw = JSON.parse(json);

      expect(raw.createdAt).toBe('2024-06-15T12:00:00.000Z');
      expect(raw.updatedAt).toBe('2024-06-15T12:00:00.000Z');
    });
  });

  describe('deserializeEntry validation', () => {
    it('should throw on invalid entry type', () => {
      const json = JSON.stringify({
        id: '1',
        title: 'Test',
        type: 'invalid_type',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });

      expect(() => VaultSerializer.deserializeEntry(json)).toThrow(
        'Invalid entry type: invalid_type',
      );
    });

    it('should throw on missing type', () => {
      const json = JSON.stringify({
        id: '1',
        title: 'Test',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });

      expect(() => VaultSerializer.deserializeEntry(json)).toThrow(
        'Invalid entry type',
      );
    });

    it('should throw on missing id', () => {
      const json = JSON.stringify({
        type: 'login',
        title: 'Test',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });

      expect(() => VaultSerializer.deserializeEntry(json)).toThrow(
        'Missing required fields: id, title',
      );
    });

    it('should throw on missing title', () => {
      const json = JSON.stringify({
        id: '1',
        type: 'login',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });

      expect(() => VaultSerializer.deserializeEntry(json)).toThrow(
        'Missing required fields: id, title',
      );
    });

    it('should throw a descriptive error on invalid JSON', () => {
      expect(() => VaultSerializer.deserializeEntry('not-json{')).toThrow(
        /JSON parse error:/,
      );
    });

    it('should throw on JSON array input', () => {
      expect(() => VaultSerializer.deserializeEntry('[]')).toThrow(
        'Invalid JSON: expected object',
      );
    });

    it('should throw on JSON null input', () => {
      expect(() => VaultSerializer.deserializeEntry('null')).toThrow(
        'Invalid JSON: expected object',
      );
    });
  });

  describe('serializeAuditLog / deserializeAuditLog', () => {
    it('should round-trip an audit log entry with Date reconstruction', () => {
      const json = VaultSerializer.serializeAuditLog(auditLogEntry);
      const result = VaultSerializer.deserializeAuditLog(json);

      expect(result.id).toBe(auditLogEntry.id);
      expect(result.vaultId).toBe(auditLogEntry.vaultId);
      expect(result.memberId).toBe(auditLogEntry.memberId);
      expect(result.action).toBe(AuditAction.ENTRY_CREATED);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.timestamp.toISOString()).toBe(now.toISOString());
      expect(result.metadata).toEqual({ entryId: 'entry-1' });
    });

    it('should serialize audit log timestamp as ISO string', () => {
      const json = VaultSerializer.serializeAuditLog(auditLogEntry);
      const raw = JSON.parse(json);

      expect(raw.timestamp).toBe('2024-06-15T12:00:00.000Z');
    });
  });

  describe('deserializeAuditLog validation', () => {
    it('should throw on missing required audit log fields', () => {
      const json = JSON.stringify({ id: 'a' });

      expect(() => VaultSerializer.deserializeAuditLog(json)).toThrow(
        'Missing required audit log fields',
      );
    });

    it('should throw a descriptive error on invalid JSON', () => {
      expect(() => VaultSerializer.deserializeAuditLog('{bad')).toThrow(
        /JSON parse error:/,
      );
    });

    it('should throw on non-object JSON', () => {
      expect(() => VaultSerializer.deserializeAuditLog('"string"')).toThrow(
        'Invalid JSON: expected object',
      );
    });
  });
});
