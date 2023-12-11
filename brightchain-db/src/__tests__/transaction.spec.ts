import { DbSession, JournalOp } from '../lib/transaction';

describe('DbSession', () => {
  it('should start with no active transaction', () => {
    const session = new DbSession(jest.fn(), jest.fn());
    expect(session.inTransaction).toBe(false);
  });

  it('should start a transaction', () => {
    const session = new DbSession(jest.fn(), jest.fn());
    session.startTransaction();
    expect(session.inTransaction).toBe(true);
  });

  it('should throw if already in a transaction', () => {
    const session = new DbSession(jest.fn(), jest.fn());
    session.startTransaction();
    expect(() => session.startTransaction()).toThrow();
  });

  it('should commit transaction and call apply callback', async () => {
    const apply = jest.fn().mockResolvedValue(undefined);
    const rollback = jest.fn();
    const session = new DbSession(apply, rollback);

    session.startTransaction();
    session.addOp({
      type: 'insert',
      collection: 'users',
      doc: { _id: '1', name: 'Alice' },
    });
    session.addOp({
      type: 'update',
      collection: 'users',
      docId: '1',
      before: { _id: '1', name: 'Alice' },
      after: { _id: '1', name: 'Bob' },
    });

    await session.commitTransaction();

    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith(expect.any(Array));
    const journal: JournalOp[] = apply.mock.calls[0][0];
    expect(journal).toHaveLength(2);
    expect(session.inTransaction).toBe(false);
  });

  it('should abort transaction and call rollback callback', async () => {
    const apply = jest.fn().mockResolvedValue(undefined);
    const rollback = jest.fn().mockResolvedValue(undefined);
    const session = new DbSession(apply, rollback);

    session.startTransaction();
    session.addOp({
      type: 'insert',
      collection: 'users',
      doc: { _id: '1', name: 'Alice' },
    });
    session.addOp({
      type: 'delete',
      collection: 'users',
      docId: '2',
      doc: { _id: '2', name: 'Bob' },
    });

    await session.abortTransaction();

    expect(rollback).toHaveBeenCalledTimes(1);
    expect(session.inTransaction).toBe(false);
  });

  it('should throw on commit/abort with no active transaction', async () => {
    const session = new DbSession(jest.fn(), jest.fn());
    await expect(session.commitTransaction()).rejects.toThrow();
    await expect(session.abortTransaction()).rejects.toThrow();
  });

  it('should generate a session id', () => {
    const s1 = new DbSession(jest.fn(), jest.fn());
    const s2 = new DbSession(jest.fn(), jest.fn());
    expect(s1.id).toBeTruthy();
    expect(s2.id).toBeTruthy();
    expect(s1.id).not.toBe(s2.id);
  });

  it('should end session and abort any active transaction', () => {
    const session = new DbSession(jest.fn(), jest.fn());
    session.startTransaction();
    session.endSession();
    expect(session.inTransaction).toBe(false);
  });

  it('should expose journal for inspection', () => {
    const session = new DbSession(jest.fn(), jest.fn());
    session.startTransaction();
    session.addOp({
      type: 'insert',
      collection: 'users',
      doc: { _id: '1', name: 'Alice' },
    });
    const journal = session.getJournal();
    expect(journal).toHaveLength(1);
    expect(journal[0].type).toBe('insert');
  });

  it('should throw addOp without transaction', () => {
    const session = new DbSession(jest.fn(), jest.fn());
    expect(() =>
      session.addOp({ type: 'insert', collection: 'users', doc: { _id: '1' } }),
    ).toThrow();
  });
});
