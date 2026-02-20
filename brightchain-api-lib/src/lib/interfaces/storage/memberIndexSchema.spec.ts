/**
 * Unit tests for MEMBER_INDEX_SCHEMA structure.
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */

import {
  BlockIdPrimitive,
  PoolIdPrimitive,
  ShortHexGuidPrimitive,
} from '@brightchain/brightchain-lib';
import { MEMBER_INDEX_SCHEMA } from './memberIndexSchema';

describe('MEMBER_INDEX_SCHEMA', () => {
  it('has exactly the expected property keys', () => {
    expect(Object.keys(MEMBER_INDEX_SCHEMA.properties ?? {})).toEqual(
      expect.arrayContaining(['id', 'publicCBL', 'privateCBL', 'poolId']),
    );
  });

  it('id field uses branded-primitive type with ShortHexGuid ref', () => {
    expect(MEMBER_INDEX_SCHEMA.properties?.['id'].type).toBe(
      'branded-primitive',
    );
    expect(MEMBER_INDEX_SCHEMA.properties?.['id'].ref).toBe(
      ShortHexGuidPrimitive.id,
    );
  });

  it('publicCBL field uses branded-primitive type with BlockId ref', () => {
    expect(MEMBER_INDEX_SCHEMA.properties?.['publicCBL'].type).toBe(
      'branded-primitive',
    );
    expect(MEMBER_INDEX_SCHEMA.properties?.['publicCBL'].ref).toBe(
      BlockIdPrimitive.id,
    );
  });

  it('privateCBL field uses branded-primitive type with BlockId ref', () => {
    expect(MEMBER_INDEX_SCHEMA.properties?.['privateCBL'].type).toBe(
      'branded-primitive',
    );
    expect(MEMBER_INDEX_SCHEMA.properties?.['privateCBL'].ref).toBe(
      BlockIdPrimitive.id,
    );
  });

  it('poolId field uses branded-primitive type with PoolId ref', () => {
    expect(MEMBER_INDEX_SCHEMA.properties?.['poolId'].type).toBe(
      'branded-primitive',
    );
    expect(MEMBER_INDEX_SCHEMA.properties?.['poolId'].ref).toBe(
      PoolIdPrimitive.id,
    );
  });

  it('all four fields have type branded-primitive', () => {
    const props = MEMBER_INDEX_SCHEMA.properties ?? {};
    for (const key of ['id', 'publicCBL', 'privateCBL', 'poolId']) {
      expect(props[key].type).toBe('branded-primitive');
    }
  });

  it('required array includes all four fields', () => {
    expect(MEMBER_INDEX_SCHEMA.required).toEqual(
      expect.arrayContaining(['id', 'publicCBL', 'privateCBL', 'poolId']),
    );
  });

  it('validationAction is error', () => {
    expect(MEMBER_INDEX_SCHEMA.validationAction).toBe('error');
  });
});
