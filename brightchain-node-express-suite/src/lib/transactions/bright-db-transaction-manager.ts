/**
 * @fileoverview BrightDB transaction manager.
 * Manages transaction lifecycle with retry logic and timeout support.
 * Parallel to upstream's TransactionManager (which wraps Mongoose sessions).
 *
 * @module transactions/bright-db-transaction-manager
 */

import type { BrightDb } from '@brightchain/db';
import type { IClientSession } from '@digitaldefiance/suite-core-lib';

/**
 * Options for transaction execution.
 */
export interface BrightDbTransactionOptions {
  /** Transaction timeout in milliseconds */
  timeoutMs?: number;
  /** Maximum number of retry attempts (default: 0 = no retries) */
  maxRetries?: number;
}

/**
 * Manager for BrightDB transactions.
 * Wraps @brightchain/db's session-based transaction support.
 *
 * When `useTransactions` is false, the callback is executed directly
 * without a session (passthrough mode).
 */
export class BrightDbTransactionManager {
  constructor(
    private readonly db: BrightDb,
    private readonly useTransactions: boolean,
  ) {}

  /**
   * Executes a callback within a transaction.
   *
   * When transactions are enabled, creates a session, starts a transaction,
   * and commits on success or aborts on failure. Supports retry logic.
   *
   * When transactions are disabled, runs the callback directly with
   * `undefined` as the session parameter.
   *
   * @template T - Return type
   * @param callback - Function to execute, receives session or undefined
   * @param options - Transaction options (timeout, retries)
   * @returns Result of callback execution
   */
  async execute<T>(
    callback: (session: IClientSession | undefined) => Promise<T>,
    options?: BrightDbTransactionOptions,
  ): Promise<T> {
    if (!this.useTransactions) {
      return callback(undefined);
    }

    const maxRetries = options?.maxRetries ?? 0;
    const timeoutMs = options?.timeoutMs;

    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const session = this.db.startSession();
      session.startTransaction();

      try {
        const resultPromise = callback(session);

        let result: T;
        if (timeoutMs !== undefined) {
          result = await Promise.race([
            resultPromise,
            new Promise<never>((_, reject) =>
              setTimeout(
                () => reject(new Error(`Transaction timed out after ${timeoutMs}ms`)),
                timeoutMs,
              ),
            ),
          ]);
        } else {
          result = await resultPromise;
        }

        await session.commitTransaction();
        return result;
      } catch (err) {
        lastError = err;
        try {
          await session.abortTransaction();
        } catch {
          // Best-effort abort
        }
      } finally {
        session.endSession();
      }
    }

    throw lastError;
  }
}
