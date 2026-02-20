import {
  BlockIdPrimitive,
  brandedField,
  PoolIdPrimitive,
  ShortHexGuidPrimitive,
} from '@brightchain/brightchain-lib';
import type { CollectionSchema } from './document-types';

/**
 * Schema for the member index collection.
 *
 * Uses brandedField() so each field is validated against the registered
 * BrandedPrimitiveDefinition rather than a duplicated regex.
 *
 * _Requirements: 5.1–5.6_
 */
export const MEMBER_INDEX_SCHEMA: CollectionSchema = {
  name: 'memberIndex',
  properties: {
    id: brandedField(ShortHexGuidPrimitive, { required: true }),
    publicCBL: brandedField(BlockIdPrimitive, { required: true }),
    privateCBL: brandedField(BlockIdPrimitive, { required: true }),
    poolId: brandedField(PoolIdPrimitive, { required: true }),
  },
  required: ['id', 'publicCBL', 'privateCBL', 'poolId'],
  additionalProperties: true,
  validationLevel: 'strict',
  validationAction: 'error',
};
