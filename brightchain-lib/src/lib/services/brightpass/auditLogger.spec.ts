import { AuditAction, AuditLogEntry } from '../../interfaces/brightpass';
import { AuditLogger, IAuditLogStorage } from './auditLogger';

/**
 * In-memory implementation of IAuditLogStorage for testing.
 */
class InMemoryAuditLogStorage implements IAuditLogStorage {
  private readonly entries: AuditLogEntry[] = [];

  async append(entry: AuditLogEntry): Promise<void> {
    this.entries.push(entry);
  }

  async getByVaultId(
    vaultId: string,
    limit?: number,
  ): Promise<AuditLogEntry[]> {
    const filtered = this.entries
      .filter((e) => e.vaultId === vaultId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return limit !== undefined ? filtered.slice(0, limit) : filtered;
  }

  /** Expose raw entries for assertions. */
  getAll(): AuditLogEntry[] {
    return [...this.entries];
  }
}

describe('AuditLogger', () => {
  let storage: InMemoryAuditLogStorage;
  let logger: AuditLogger;

  beforeEach(() => {
    storage = new InMemoryAuditLogStorage();
    logger = new AuditLogger(storage);
  });

  it('should create an entry with a generated id and timestamp', async () => {
    const before = new Date();
    const entry = await logger.log(
      'vault-1',
      'member-1',
      AuditAction.VAULT_CREATED,
    );
    const after = new Date();

    expect(entry.id).toBeDefined();
    expect(entry.id.length).toBeGreaterThan(0);
    expect(entry.vaultId).toBe('vault-1');
    expect(entry.memberId).toBe('member-1');
    expect(entry.action).toBe(AuditAction.VAULT_CREATED);
    expect(entry.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(entry.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should persist the entry to storage', async () => {
    await logger.log('vault-1', 'member-1', AuditAction.ENTRY_CREATED);

    const stored = storage.getAll();
    expect(stored).toHaveLength(1);
    expect(stored[0].action).toBe(AuditAction.ENTRY_CREATED);
  });

  it('should include metadata when provided', async () => {
    const meta = { entryId: 'e-1', entryType: 'login' };
    const entry = await logger.log(
      'vault-1',
      'member-1',
      AuditAction.ENTRY_CREATED,
      meta,
    );

    expect(entry.metadata).toEqual(meta);
  });

  it('should not include metadata key when not provided', async () => {
    const entry = await logger.log(
      'vault-1',
      'member-1',
      AuditAction.VAULT_OPENED,
    );

    expect(Object.prototype.hasOwnProperty.call(entry, 'metadata')).toBe(false);
  });

  it('should generate unique ids for each entry', async () => {
    const e1 = await logger.log(
      'vault-1',
      'member-1',
      AuditAction.VAULT_CREATED,
    );
    const e2 = await logger.log(
      'vault-1',
      'member-1',
      AuditAction.VAULT_OPENED,
    );

    expect(e1.id).not.toBe(e2.id);
  });

  it('should support all AuditAction types', async () => {
    const actions = Object.values(AuditAction);
    for (const action of actions) {
      const entry = await logger.log('vault-1', 'member-1', action);
      expect(entry.action).toBe(action);
    }
    expect(storage.getAll()).toHaveLength(actions.length);
  });

  describe('getHistory', () => {
    it('should return entries for the specified vault', async () => {
      await logger.log('vault-1', 'member-1', AuditAction.VAULT_CREATED);
      await logger.log('vault-2', 'member-2', AuditAction.VAULT_CREATED);
      await logger.log('vault-1', 'member-1', AuditAction.ENTRY_CREATED);

      const history = await logger.getHistory('vault-1');
      expect(history).toHaveLength(2);
      expect(history.every((e) => e.vaultId === 'vault-1')).toBe(true);
    });

    it('should respect the limit parameter', async () => {
      await logger.log('vault-1', 'member-1', AuditAction.VAULT_CREATED);
      await logger.log('vault-1', 'member-1', AuditAction.VAULT_OPENED);
      await logger.log('vault-1', 'member-1', AuditAction.ENTRY_CREATED);

      const history = await logger.getHistory('vault-1', 2);
      expect(history).toHaveLength(2);
    });

    it('should return empty array for unknown vault', async () => {
      const history = await logger.getHistory('nonexistent');
      expect(history).toEqual([]);
    });

    it('should delegate to storage.getByVaultId', async () => {
      await logger.log('vault-1', 'member-1', AuditAction.VAULT_CREATED);

      const history = await logger.getHistory('vault-1');
      expect(history).toHaveLength(1);
      expect(history[0].vaultId).toBe('vault-1');
    });
  });
});
