import { BrightDbTransactionManager } from '../lib/transactions/bright-db-transaction-manager';

function createMockDb(commitShouldFail = false) {
  const mockSession = {
    id: 'test-session',
    inTransaction: false,
    startTransaction: jest.fn(function (this: any) { this.inTransaction = true; }),
    commitTransaction: jest.fn(async function (this: any) {
      if (commitShouldFail) throw new Error('commit failed');
      this.inTransaction = false;
    }),
    abortTransaction: jest.fn(async function (this: any) { this.inTransaction = false; }),
    endSession: jest.fn(),
  };
  return {
    db: { startSession: jest.fn().mockReturnValue(mockSession) } as any,
    session: mockSession,
  };
}

describe('BrightDbTransactionManager', () => {
  it('runs callback without session when transactions disabled', async () => {
    const { db } = createMockDb();
    const mgr = new BrightDbTransactionManager(db, false);
    const result = await mgr.execute(async (session) => {
      expect(session).toBeUndefined();
      return 42;
    });
    expect(result).toBe(42);
    expect(db.startSession).not.toHaveBeenCalled();
  });

  it('runs callback with session when transactions enabled', async () => {
    const { db, session } = createMockDb();
    const mgr = new BrightDbTransactionManager(db, true);
    const result = await mgr.execute(async (s) => {
      expect(s).toBe(session);
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(session.startTransaction).toHaveBeenCalled();
    expect(session.commitTransaction).toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalled();
  });

  it('aborts transaction on callback error', async () => {
    const { db, session } = createMockDb();
    const mgr = new BrightDbTransactionManager(db, true);
    await expect(
      mgr.execute(async () => { throw new Error('boom'); }),
    ).rejects.toThrow('boom');
    expect(session.abortTransaction).toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalled();
  });

  it('retries on failure when maxRetries > 0', async () => {
    const { db } = createMockDb();
    let attempts = 0;
    const mgr = new BrightDbTransactionManager(db, true);
    const result = await mgr.execute(
      async () => {
        attempts++;
        if (attempts < 3) throw new Error('transient');
        return 'success';
      },
      { maxRetries: 2 },
    );
    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('throws after exhausting retries', async () => {
    const { db } = createMockDb();
    const mgr = new BrightDbTransactionManager(db, true);
    await expect(
      mgr.execute(
        async () => { throw new Error('persistent'); },
        { maxRetries: 1 },
      ),
    ).rejects.toThrow('persistent');
  });
});
