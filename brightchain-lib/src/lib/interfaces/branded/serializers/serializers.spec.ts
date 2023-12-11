/**
 * @fileoverview Unit tests for serializer edge cases
 *
 * Tests that deserialize() returns the correct error codes for:
 * - Invalid JSON strings (Requirement 5.4)
 * - Valid JSON that doesn't match the schema (Requirement 5.5)
 *
 * Requirements: 5.4, 5.5
 */

import { describe, expect, it } from '@jest/globals';

// Primitives must be registered before definitions that ref them
import '../primitives/blockId';
import '../primitives/emailString';
import '../primitives/iso8601Timestamp';
import '../primitives/poolId';
import '../primitives/shortHexGuid';

import {
  blockStoreStatsSerializer,
  clientEventSerializer,
  energyAccountStatusSerializer,
  nodeStatusSerializer,
  peerInfoSerializer,
  poolInfoSerializer,
} from './clientProtocolSerializers';

import { ClientEventAccessTier } from '../../clientProtocol/clientEvent';

// ---------------------------------------------------------------------------
// Requirement 5.4: deserialize() with invalid JSON returns INVALID_JSON
// ---------------------------------------------------------------------------

describe('deserialize() with invalid JSON returns INVALID_JSON error code (Req 5.4)', () => {
  const invalidJsonCases = [
    '{not valid json',
    '{"unclosed": ',
    'undefined',
    '',
    '{key: "no quotes"}',
  ];

  it('nodeStatusSerializer: returns INVALID_JSON for malformed JSON strings', () => {
    for (const bad of invalidJsonCases) {
      const result = nodeStatusSerializer.deserialize(bad);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_JSON');
      }
    }
  });

  it('peerInfoSerializer: returns INVALID_JSON for malformed JSON strings', () => {
    for (const bad of invalidJsonCases) {
      const result = peerInfoSerializer.deserialize(bad);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_JSON');
      }
    }
  });

  it('poolInfoSerializer: returns INVALID_JSON for malformed JSON strings', () => {
    for (const bad of invalidJsonCases) {
      const result = poolInfoSerializer.deserialize(bad);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_JSON');
      }
    }
  });

  it('energyAccountStatusSerializer: returns INVALID_JSON for malformed JSON strings', () => {
    for (const bad of invalidJsonCases) {
      const result = energyAccountStatusSerializer.deserialize(bad);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_JSON');
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Requirement 5.5: deserialize() with valid JSON that doesn't match schema
//                  returns VALIDATION_FAILED
// ---------------------------------------------------------------------------

describe('deserialize() with schema-mismatched JSON returns VALIDATION_FAILED error code (Req 5.5)', () => {
  it('nodeStatusSerializer: returns VALIDATION_FAILED for empty object JSON', () => {
    const result = nodeStatusSerializer.deserialize('{}');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_FAILED');
    }
  });

  it('nodeStatusSerializer: returns VALIDATION_FAILED when required fields are missing', () => {
    const json = JSON.stringify({ nodeId: 'abc', healthy: true });
    const result = nodeStatusSerializer.deserialize(json);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_FAILED');
    }
  });

  it('nodeStatusSerializer: returns VALIDATION_FAILED when field has wrong type', () => {
    const json = JSON.stringify({
      nodeId: 123,
      healthy: true,
      uptime: 100,
      version: '1.0',
      capabilities: [],
      partitionMode: false,
    });
    const result = nodeStatusSerializer.deserialize(json);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_FAILED');
    }
  });

  it('peerInfoSerializer: returns VALIDATION_FAILED for empty object JSON', () => {
    const result = peerInfoSerializer.deserialize('{}');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_FAILED');
    }
  });

  it('peerInfoSerializer: returns VALIDATION_FAILED when connected is a string instead of boolean', () => {
    const json = JSON.stringify({
      nodeId: 'abc',
      connected: 'yes',
      lastSeen: '2024-01-01',
    });
    const result = peerInfoSerializer.deserialize(json);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_FAILED');
    }
  });

  it('poolInfoSerializer: returns VALIDATION_FAILED when poolId fails PoolId primitive validation', () => {
    const json = JSON.stringify({
      poolId: '!!!invalid!!!',
      blockCount: 10,
      totalSize: 1000,
      memberCount: 5,
      encrypted: false,
      publicRead: true,
      publicWrite: false,
      hostingNodes: [],
    });
    const result = poolInfoSerializer.deserialize(json);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_FAILED');
    }
  });

  it('energyAccountStatusSerializer: returns VALIDATION_FAILED for empty object JSON', () => {
    const result = energyAccountStatusSerializer.deserialize('{}');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_FAILED');
    }
  });

  it('blockStoreStatsSerializer: returns VALIDATION_FAILED when totalCapacity is a string', () => {
    const json = JSON.stringify({
      totalCapacity: 'big',
      currentUsage: 100,
      availableSpace: 900,
      blockCounts: { total: 5 },
      totalBlocks: 5,
    });
    const result = blockStoreStatsSerializer.deserialize(json);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_FAILED');
    }
  });

  it('clientEventSerializer: returns VALIDATION_FAILED when eventType is missing', () => {
    const json = JSON.stringify({
      accessTier: ClientEventAccessTier.Public,
      payload: null,
      timestamp: '2024-01-01T00:00:00Z',
      correlationId: 'abc-123',
    });
    const result = clientEventSerializer.deserialize(json);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_FAILED');
    }
  });

  it('nodeStatusSerializer: returns VALIDATION_FAILED for a JSON array', () => {
    const result = nodeStatusSerializer.deserialize('[1, 2, 3]');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_FAILED');
    }
  });

  it('nodeStatusSerializer: returns VALIDATION_FAILED for a JSON null', () => {
    const result = nodeStatusSerializer.deserialize('null');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_FAILED');
    }
  });
});
