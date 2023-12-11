import type { ValidationFieldError } from '@brightchain/brightchain-lib';
import { MemberIndexSchemaValidationError } from './memberIndexSchemaValidationError';

describe('MemberIndexSchemaValidationError', () => {
  const sampleErrors: ValidationFieldError[] = [
    { field: 'field1', message: 'msg1' },
    { field: 'field2', message: 'msg2' },
  ];

  it('has name "MemberIndexSchemaValidationError"', () => {
    const err = new MemberIndexSchemaValidationError(sampleErrors);
    expect(err.name).toBe('MemberIndexSchemaValidationError');
  });

  it('formats message correctly from field errors', () => {
    const err = new MemberIndexSchemaValidationError(sampleErrors);
    expect(err.message).toBe(
      'Member index document failed schema validation: field1: msg1; field2: msg2',
    );
  });

  it('stores fieldErrors array correctly', () => {
    const err = new MemberIndexSchemaValidationError(sampleErrors);
    expect(err.fieldErrors).toEqual(sampleErrors);
    expect(err.fieldErrors).toHaveLength(2);
    expect(err.fieldErrors[0]).toEqual({ field: 'field1', message: 'msg1' });
    expect(err.fieldErrors[1]).toEqual({ field: 'field2', message: 'msg2' });
  });

  it('handles empty fieldErrors array', () => {
    const err = new MemberIndexSchemaValidationError([]);
    expect(err.name).toBe('MemberIndexSchemaValidationError');
    expect(err.message).toBe(
      'Member index document failed schema validation: ',
    );
    expect(err.fieldErrors).toEqual([]);
    expect(err.fieldErrors).toHaveLength(0);
  });

  it('is an instance of Error', () => {
    const err = new MemberIndexSchemaValidationError(sampleErrors);
    expect(err).toBeInstanceOf(Error);
  });
});
