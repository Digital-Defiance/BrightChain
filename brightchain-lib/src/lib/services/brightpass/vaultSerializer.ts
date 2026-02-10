import { AuditLogEntry, VaultEntry } from '../../interfaces/brightpass';

/**
 * VaultSerializer — serializes and deserializes VaultEntry and AuditLogEntry objects.
 *
 * Handles proper Date ↔ ISO string conversion during serialization/deserialization.
 * Pure JSON operations, fully browser-compatible.
 */
export class VaultSerializer {
  static serializeEntry(entry: VaultEntry): string {
    const serializable = {
      ...entry,
      createdAt:
        entry.createdAt instanceof Date && !isNaN(entry.createdAt.getTime())
          ? entry.createdAt.toISOString()
          : entry.createdAt,
      updatedAt:
        entry.updatedAt instanceof Date && !isNaN(entry.updatedAt.getTime())
          ? entry.updatedAt.toISOString()
          : entry.updatedAt,
    };
    return JSON.stringify(serializable);
  }

  static deserializeEntry(json: string): VaultEntry {
    try {
      const parsed = JSON.parse(json);

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Invalid JSON: expected object');
      }

      if (
        !parsed.type ||
        !['login', 'secure_note', 'credit_card', 'identity'].includes(
          parsed.type,
        )
      ) {
        throw new Error(`Invalid entry type: ${parsed.type}`);
      }

      if (!parsed.id || !parsed.title) {
        throw new Error('Missing required fields: id, title');
      }

      parsed.createdAt = new Date(parsed.createdAt);
      parsed.updatedAt = new Date(parsed.updatedAt);

      return parsed as VaultEntry;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`JSON parse error: ${error.message}`);
      }
      throw error;
    }
  }

  static serializeAuditLog(entry: AuditLogEntry): string {
    const serializable = {
      ...entry,
      timestamp:
        entry.timestamp instanceof Date
          ? entry.timestamp.toISOString()
          : entry.timestamp,
    };
    return JSON.stringify(serializable);
  }

  static deserializeAuditLog(json: string): AuditLogEntry {
    try {
      const parsed = JSON.parse(json);

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid JSON: expected object');
      }

      if (!parsed.id || !parsed.vaultId || !parsed.memberId || !parsed.action) {
        throw new Error('Missing required audit log fields');
      }

      parsed.timestamp = new Date(parsed.timestamp);

      return parsed as AuditLogEntry;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`JSON parse error: ${error.message}`);
      }
      throw error;
    }
  }
}
