import { v4 as uuidv4 } from 'uuid';
import { AuditAction, AuditLogEntry } from '../../interfaces/brightpass';

/**
 * Abstract storage interface for audit log persistence.
 *
 * Implementations can use any storage backend (IndexedDB, localStorage,
 * in-memory, block store, etc.) without coupling the logger to a specific one.
 *
 * Requirements: 14.3, 14.4
 */
export interface IAuditLogStorage {
  append(entry: AuditLogEntry): Promise<void>;
  getByVaultId(vaultId: string, limit?: number): Promise<AuditLogEntry[]>;
}

/**
 * AuditLogger — logs vault and entry operations with timestamps and metadata.
 *
 * Uses dependency injection via IAuditLogStorage to remain browser-compatible
 * and free of file system or database-specific dependencies.
 *
 * Requirements: 14.1, 14.2, 14.3, 14.4
 */
export class AuditLogger {
  constructor(private readonly storage: IAuditLogStorage) {}

  /**
   * Log an audit event for a vault operation.
   *
   * Creates an AuditLogEntry with a generated UUID, the current timestamp,
   * and the provided action/metadata, then persists it via the storage backend.
   *
   * Requirements: 14.1, 14.2
   */
  async log(
    vaultId: string,
    memberId: string,
    action: AuditAction,
    metadata?: Record<string, string>,
  ): Promise<AuditLogEntry> {
    const entry: AuditLogEntry = {
      id: uuidv4(),
      vaultId,
      memberId,
      action,
      timestamp: new Date(),
      ...(metadata !== undefined ? { metadata } : {}),
    };

    await this.storage.append(entry);
    return entry;
  }

  /**
   * Retrieve audit history for a vault, optionally limited.
   *
   * Requirements: 14.1
   */
  async getHistory(vaultId: string, limit?: number): Promise<AuditLogEntry[]> {
    return this.storage.getByVaultId(vaultId, limit);
  }
}
