/**
 * Unit tests for the brandedField() helper.
 *
 * Validates: Requirements 4.3, 4.4
 */

import { BlockIdPrimitive } from './blockId';
import { brandedField } from './brandedField';
import { PoolIdPrimitive } from './poolId';
import { ShortHexGuidPrimitive } from './shortHexGuid';

describe('brandedField', () => {
  it('returns { type: "branded-primitive", ref: def.id } for BlockIdPrimitive', () => {
    const schema = brandedField(BlockIdPrimitive);
    expect(schema.type).toBe('branded-primitive');
    expect(schema.ref).toBe(BlockIdPrimitive.id);
    expect(schema.ref).toBe('BlockId');
  });

  it('returns { type: "branded-primitive", ref: def.id } for PoolIdPrimitive', () => {
    const schema = brandedField(PoolIdPrimitive);
    expect(schema.type).toBe('branded-primitive');
    expect(schema.ref).toBe(PoolIdPrimitive.id);
    expect(schema.ref).toBe('PoolId');
  });

  it('returns { type: "branded-primitive", ref: def.id } for ShortHexGuidPrimitive', () => {
    const schema = brandedField(ShortHexGuidPrimitive);
    expect(schema.type).toBe('branded-primitive');
    expect(schema.ref).toBe(ShortHexGuidPrimitive.id);
    expect(schema.ref).toBe('ShortHexGuid');
  });

  it('merges extra options into the returned schema', () => {
    const schema = brandedField(PoolIdPrimitive, { required: true });
    expect(schema.type).toBe('branded-primitive');
    expect(schema.ref).toBe('PoolId');
    expect(schema.required).toBe(true);
  });

  it('type and ref always override anything supplied in options', () => {
    const schema = brandedField(BlockIdPrimitive, {
      type: 'string' as never,
      ref: 'SomethingElse',
    });
    expect(schema.type).toBe('branded-primitive');
    expect(schema.ref).toBe('BlockId');
  });
});
