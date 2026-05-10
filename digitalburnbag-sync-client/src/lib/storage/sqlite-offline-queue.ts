import type {
  IOfflineOperation,
  IOfflineQueue,
  ISyncApiClient,
} from '@brightchain/digitalburnbag-lib';
import { OfflineOperationType } from '@brightchain/digitalburnbag-lib';

/**
 * SQLite-backed offline operation queue.
 * Persists queued operations to disk so they survive app restarts.
 *
 * Uses better-sqlite3 for synchronous, fast SQLite access.
 */
export class SqliteOfflineQueue implements IOfflineQueue<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private db: any = null;
  private apiClient: ISyncApiClient<string> | null = null;

  constructor(
    private readonly dbPath: string,
    apiClient?: ISyncApiClient<string>,
  ) {
    this.apiClient = apiClient ?? null;
  }

  async initialize(): Promise<void> {
    const Database = (await import('better-sqlite3')).default;
    this.db = new Database(this.dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS offline_operations (
        operationId TEXT PRIMARY KEY,
        operationType TEXT NOT NULL,
        targetId TEXT NOT NULL,
        localPath TEXT NOT NULL,
        payload TEXT NOT NULL,
        queuedAt TEXT NOT NULL,
        retryCount INTEGER DEFAULT 0,
        lastError TEXT
      )
    `);
  }

  async enqueue(operation: IOfflineOperation<string>): Promise<void> {
    this.ensureInitialized();
    this.db
      .prepare(
        `
      INSERT OR REPLACE INTO offline_operations
        (operationId, operationType, targetId, localPath, payload, queuedAt, retryCount, lastError)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        operation.operationId,
        operation.operationType,
        operation.targetId,
        operation.localPath,
        operation.payload,
        typeof operation.queuedAt === 'string'
          ? operation.queuedAt
          : operation.queuedAt.toISOString(),
        operation.retryCount,
        operation.lastError ?? null,
      );
  }

  async dequeue(): Promise<IOfflineOperation<string> | undefined> {
    this.ensureInitialized();
    const row = this.db
      .prepare('SELECT * FROM offline_operations ORDER BY queuedAt ASC LIMIT 1')
      .get();
    if (!row) return undefined;
    this.db
      .prepare('DELETE FROM offline_operations WHERE operationId = ?')
      .run(row.operationId);
    return this.rowToOperation(row);
  }

  async peek(): Promise<IOfflineOperation<string> | undefined> {
    this.ensureInitialized();
    const row = this.db
      .prepare('SELECT * FROM offline_operations ORDER BY queuedAt ASC LIMIT 1')
      .get();
    return row ? this.rowToOperation(row) : undefined;
  }

  async getAll(): Promise<IOfflineOperation<string>[]> {
    this.ensureInitialized();
    const rows = this.db
      .prepare('SELECT * FROM offline_operations ORDER BY queuedAt ASC')
      .all();
    return rows.map(this.rowToOperation);
  }

  async remove(operationId: string): Promise<void> {
    this.ensureInitialized();
    this.db
      .prepare('DELETE FROM offline_operations WHERE operationId = ?')
      .run(operationId);
  }

  async clear(): Promise<void> {
    this.ensureInitialized();
    this.db.exec('DELETE FROM offline_operations');
  }

  async size(): Promise<number> {
    this.ensureInitialized();
    const row = this.db
      .prepare('SELECT COUNT(*) as count FROM offline_operations')
      .get();
    return row.count;
  }

  async replayAll(): Promise<{ succeeded: number; failed: number }> {
    if (!this.apiClient) {
      return { succeeded: 0, failed: 0 };
    }

    let succeeded = 0;
    let failed = 0;

    while (true) {
      const op = await this.peek();
      if (!op) break;

      try {
        const event = JSON.parse(op.payload);
        await this.apiClient.propagateLocalChange(event);
        await this.remove(op.operationId);
        succeeded++;
      } catch (err) {
        // Update retry count and last error
        op.retryCount++;
        op.lastError = (err as Error).message;

        if (op.retryCount >= 5) {
          // Give up after 5 retries
          await this.remove(op.operationId);
          failed++;
        } else {
          this.db
            .prepare(
              `
            UPDATE offline_operations
            SET retryCount = ?, lastError = ?
            WHERE operationId = ?
          `,
            )
            .run(op.retryCount, op.lastError, op.operationId);
          failed++;
          break; // Stop replaying on first failure (preserve order)
        }
      }
    }

    return { succeeded, failed };
  }

  /** Close the database connection */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  private ensureInitialized(): void {
    if (!this.db) {
      throw new Error(
        'SqliteOfflineQueue not initialized — call initialize() first',
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private rowToOperation(row: any): IOfflineOperation<string> {
    return {
      operationId: row.operationId,
      operationType: row.operationType as OfflineOperationType,
      targetId: row.targetId,
      localPath: row.localPath,
      payload: row.payload,
      queuedAt: row.queuedAt,
      retryCount: row.retryCount,
      lastError: row.lastError ?? undefined,
    };
  }
}
