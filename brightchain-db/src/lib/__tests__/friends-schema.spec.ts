/**
 * @fileoverview Unit tests for BrightChain Friends System database schemas.
 *
 * Verifies collection names, required fields, index configurations,
 * and status enum values for the friendships and friend requests schemas.
 *
 * _Requirements: 12.1, 12.2, 12.3, 12.4_
 */

import {
  FRIENDSHIPS_COLLECTION,
  FRIENDSHIPS_SCHEMA,
  FRIEND_REQUESTS_COLLECTION,
  FRIEND_REQUESTS_SCHEMA,
  FRIEND_REQUEST_STATUS_VALUES,
} from '../schemas/brightchain/friends.schema';

// ─────────────────────────────────────────────────────
// Collection naming
// ─────────────────────────────────────────────────────

describe('Friends schema collection names', () => {
  it('friendships collection uses brightchain_ prefix', () => {
    expect(FRIENDSHIPS_COLLECTION).toBe('brightchain_friendships');
    expect(FRIENDSHIPS_COLLECTION.startsWith('brightchain_')).toBe(true);
  });

  it('friend requests collection uses brightchain_ prefix', () => {
    expect(FRIEND_REQUESTS_COLLECTION).toBe('brightchain_friend_requests');
    expect(FRIEND_REQUESTS_COLLECTION.startsWith('brightchain_')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────
// Friendships schema
// ─────────────────────────────────────────────────────

describe('FRIENDSHIPS_SCHEMA', () => {
  it('has the expected required fields', () => {
    expect(FRIENDSHIPS_SCHEMA.required).toEqual(
      expect.arrayContaining(['memberIdA', 'memberIdB', 'createdAt']),
    );
    expect(FRIENDSHIPS_SCHEMA.required).toHaveLength(3);
  });

  it('defines all expected properties', () => {
    const propKeys = Object.keys(FRIENDSHIPS_SCHEMA.properties);
    expect(propKeys).toEqual(
      expect.arrayContaining(['_id', 'memberIdA', 'memberIdB', 'createdAt']),
    );
  });

  it('disallows additional properties', () => {
    expect(FRIENDSHIPS_SCHEMA.additionalProperties).toBe(false);
  });

  it('uses strict validation', () => {
    expect(FRIENDSHIPS_SCHEMA.validationLevel).toBe('strict');
    expect(FRIENDSHIPS_SCHEMA.validationAction).toBe('error');
  });

  it('has a unique compound index on (memberIdA, memberIdB)', () => {
    const uniqueIndex = FRIENDSHIPS_SCHEMA.indexes?.find(
      (idx) =>
        idx.fields &&
        'memberIdA' in idx.fields &&
        'memberIdB' in idx.fields &&
        idx.options?.unique === true,
    );
    expect(uniqueIndex).toBeDefined();
    expect(uniqueIndex!.fields).toEqual({ memberIdA: 1, memberIdB: 1 });
  });

  it('has a query index on memberIdA with createdAt descending', () => {
    const idx = FRIENDSHIPS_SCHEMA.indexes?.find(
      (i) =>
        i.fields &&
        'memberIdA' in i.fields &&
        'createdAt' in i.fields &&
        !i.options?.unique,
    );
    expect(idx).toBeDefined();
    expect(idx!.fields).toEqual({ memberIdA: 1, createdAt: -1 });
  });

  it('has a query index on memberIdB with createdAt descending', () => {
    const idx = FRIENDSHIPS_SCHEMA.indexes?.find(
      (i) =>
        i.fields &&
        'memberIdB' in i.fields &&
        'createdAt' in i.fields &&
        !i.options?.unique,
    );
    expect(idx).toBeDefined();
    expect(idx!.fields).toEqual({ memberIdB: 1, createdAt: -1 });
  });
});

// ─────────────────────────────────────────────────────
// Friend Requests schema
// ─────────────────────────────────────────────────────

describe('FRIEND_REQUESTS_SCHEMA', () => {
  it('has the expected required fields', () => {
    expect(FRIEND_REQUESTS_SCHEMA.required).toEqual(
      expect.arrayContaining([
        'requesterId',
        'recipientId',
        'status',
        'createdAt',
      ]),
    );
    expect(FRIEND_REQUESTS_SCHEMA.required).toHaveLength(4);
  });

  it('defines all expected properties', () => {
    const propKeys = Object.keys(FRIEND_REQUESTS_SCHEMA.properties);
    expect(propKeys).toEqual(
      expect.arrayContaining([
        '_id',
        'requesterId',
        'recipientId',
        'message',
        'status',
        'createdAt',
      ]),
    );
  });

  it('limits message to 280 characters', () => {
    expect(FRIEND_REQUESTS_SCHEMA.properties['message'].maxLength).toBe(280);
  });

  it('disallows additional properties', () => {
    expect(FRIEND_REQUESTS_SCHEMA.additionalProperties).toBe(false);
  });

  it('uses strict validation', () => {
    expect(FRIEND_REQUESTS_SCHEMA.validationLevel).toBe('strict');
    expect(FRIEND_REQUESTS_SCHEMA.validationAction).toBe('error');
  });

  it('has an index on (recipientId, status, createdAt)', () => {
    const idx = FRIEND_REQUESTS_SCHEMA.indexes?.find(
      (i) =>
        i.fields &&
        'recipientId' in i.fields &&
        'status' in i.fields &&
        'createdAt' in i.fields,
    );
    expect(idx).toBeDefined();
    expect(idx!.fields).toEqual({
      recipientId: 1,
      status: 1,
      createdAt: -1,
    });
  });

  it('has an index on (requesterId, status, createdAt)', () => {
    const idx = FRIEND_REQUESTS_SCHEMA.indexes?.find(
      (i) =>
        i.fields &&
        'requesterId' in i.fields &&
        'status' in i.fields &&
        'createdAt' in i.fields,
    );
    expect(idx).toBeDefined();
    expect(idx!.fields).toEqual({
      requesterId: 1,
      status: 1,
      createdAt: -1,
    });
  });

  it('has a unique index on (requesterId, recipientId)', () => {
    const uniqueIdx = FRIEND_REQUESTS_SCHEMA.indexes?.find(
      (i) =>
        i.fields &&
        'requesterId' in i.fields &&
        'recipientId' in i.fields &&
        i.options?.unique === true,
    );
    expect(uniqueIdx).toBeDefined();
    expect(uniqueIdx!.fields).toEqual({ requesterId: 1, recipientId: 1 });
  });
});

// ─────────────────────────────────────────────────────
// Friend Request Status Values
// ─────────────────────────────────────────────────────

describe('FRIEND_REQUEST_STATUS_VALUES', () => {
  it('contains all four expected status values', () => {
    expect(FRIEND_REQUEST_STATUS_VALUES).toEqual([
      'pending',
      'accepted',
      'rejected',
      'cancelled',
    ]);
  });

  it('has exactly 4 values', () => {
    expect(FRIEND_REQUEST_STATUS_VALUES).toHaveLength(4);
  });
});
