/**
 * Typed error classes – unit tests.
 */

import {
  BrightChainDbError,
  BulkWriteError,
  DocumentNotFoundError,
  IndexError,
  TransactionError,
  ValidationError,
  WriteConcernError,
} from '../lib/errors';

describe('BrightChainDbError (base)', () => {
  it('should store message and code', () => {
    const err = new BrightChainDbError('something broke', 42);
    expect(err.message).toBe('something broke');
    expect(err.code).toBe(42);
    expect(err.name).toBe('BrightChainDbError');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(BrightChainDbError);
  });
});

describe('DocumentNotFoundError', () => {
  it('should carry collection and documentId', () => {
    const err = new DocumentNotFoundError('users', 'abc-123');
    expect(err.collection).toBe('users');
    expect(err.documentId).toBe('abc-123');
    expect(err.code).toBe(404);
    expect(err.name).toBe('DocumentNotFoundError');
    expect(err).toBeInstanceOf(BrightChainDbError);
    expect(err.message).toContain('users');
    expect(err.message).toContain('abc-123');
  });
});

describe('ValidationError', () => {
  it('should carry validation field errors', () => {
    const errors = [
      { field: 'name', message: 'required' },
      { field: 'age', message: 'must be number', value: 'oops' },
    ];
    const err = new ValidationError('people', errors);
    expect(err.code).toBe(121);
    expect(err.name).toBe('ValidationError');
    expect(err.collection).toBe('people');
    expect(err.validationErrors).toHaveLength(2);
    expect(err.validationErrors[0].field).toBe('name');
    expect(err.validationErrors[1].value).toBe('oops');
    expect(err).toBeInstanceOf(BrightChainDbError);
  });
});

describe('TransactionError', () => {
  it('should carry optional sessionId', () => {
    const err = new TransactionError('txn failed', 'sess-1');
    expect(err.code).toBe(251);
    expect(err.name).toBe('TransactionError');
    expect(err.sessionId).toBe('sess-1');
    expect(err).toBeInstanceOf(BrightChainDbError);
  });

  it('should work without sessionId', () => {
    const err = new TransactionError('no session');
    expect(err.sessionId).toBeUndefined();
  });
});

describe('IndexError', () => {
  it('should carry optional indexName', () => {
    const err = new IndexError('bad index', 'idx_name');
    expect(err.code).toBe(86);
    expect(err.name).toBe('IndexError');
    expect(err.indexName).toBe('idx_name');
    expect(err).toBeInstanceOf(BrightChainDbError);
  });
});

describe('WriteConcernError', () => {
  it('should carry write concern spec', () => {
    const wc = { w: 3, journal: true };
    const err = new WriteConcernError('timeout', wc);
    expect(err.code).toBe(64);
    expect(err.name).toBe('WriteConcernError');
    expect(err.writeConcern).toEqual(wc);
    expect(err).toBeInstanceOf(BrightChainDbError);
  });
});

describe('BulkWriteError', () => {
  it('should carry write errors and success count', () => {
    const writeErrors = [
      { index: 2, code: 11000, message: 'dup key' },
      { index: 5, code: 121, message: 'validation' },
    ];
    const err = new BulkWriteError(writeErrors, 4);
    expect(err.code).toBe(65);
    expect(err.name).toBe('BulkWriteError');
    expect(err.writeErrors).toHaveLength(2);
    expect(err.successCount).toBe(4);
    expect(err.message).toContain('2 error(s)');
    expect(err.message).toContain('4 succeeded');
    expect(err).toBeInstanceOf(BrightChainDbError);
  });
});
