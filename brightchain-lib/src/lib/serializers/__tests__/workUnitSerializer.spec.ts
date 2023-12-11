/**
 * Unit tests for WorkUnitSerializer edge cases.
 * Feature: proof-of-useful-work-ratelimit
 *
 * Tests specific malformed input scenarios, base64 round-trip for binary
 * fields, and valid JSON output from serializers.
 *
 * **Validates: Requirements 15.5, 15.6**
 */

import { BrightChainStrings } from '../../enumerations/brightChainStrings';
import { DifficultyTier } from '../../enumerations/difficultyTier';
import { TranslatableBrightChainError } from '../../errors/translatableBrightChainError';
import {
  IWorkResult,
  IWorkUnit,
  WorkUnitOperation,
} from '../../interfaces/pouw';
import {
  parseWorkResult,
  parseWorkUnit,
  serializeWorkResult,
  serializeWorkUnit,
} from '../workUnitSerializer';

// ── Test Fixtures ──────────────────────────────────────────────────────

/** A known-good IWorkUnit fixture with base64-encoded inputData */
const validWorkUnit: IWorkUnit = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  treeId: 'tree-abc-123',
  treeLevel: 2,
  treeIndex: 3,
  operation: WorkUnitOperation.LeafHash,
  inputData: 'SGVsbG8gQnJpZ2h0Q2hhaW4h', // "Hello BrightChain!" in base64
  childCount: 0,
  difficulty: DifficultyTier.Low,
  challengeToken: 'tok_challenge_abc123',
  createdAt: '2025-01-15T10:00:00.000Z',
  expiresAt: '2025-01-15T10:01:00.000Z',
};

/** A known-good IWorkResult fixture */
const validWorkResult: IWorkResult = {
  workUnitId: '550e8400-e29b-41d4-a716-446655440000',
  resultHash:
    'a69f73cca23a9ac5c8b567dc185a756e97c982164fe25859e0d1dcc1475c80a6' +
    '15b2123af1f5f94c11e3e9402c3ac558f500199d95b6d3e301758586281dcd26',
  challengeToken: 'tok_challenge_abc123',
  computeTimeMs: 1234,
  completedAt: '2025-01-15T10:00:05.000Z',
};

// ── serializeWorkUnit: valid JSON output ───────────────────────────────

describe('serializeWorkUnit', () => {
  it('produces valid JSON (JSON.parse does not throw)', () => {
    const json = serializeWorkUnit(validWorkUnit);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('produces JSON containing all required fields', () => {
    const json = serializeWorkUnit(validWorkUnit);
    const parsed = JSON.parse(json);
    expect(parsed.id).toBe(validWorkUnit.id);
    expect(parsed.treeId).toBe(validWorkUnit.treeId);
    expect(parsed.treeLevel).toBe(validWorkUnit.treeLevel);
    expect(parsed.treeIndex).toBe(validWorkUnit.treeIndex);
    expect(parsed.operation).toBe(validWorkUnit.operation);
    expect(parsed.inputData).toBe(validWorkUnit.inputData);
    expect(parsed.childCount).toBe(validWorkUnit.childCount);
    expect(parsed.difficulty).toBe(validWorkUnit.difficulty);
    expect(parsed.challengeToken).toBe(validWorkUnit.challengeToken);
    expect(parsed.createdAt).toBe(validWorkUnit.createdAt);
    expect(parsed.expiresAt).toBe(validWorkUnit.expiresAt);
  });
});

// ── serializeWorkResult: valid JSON output ─────────────────────────────

describe('serializeWorkResult', () => {
  it('produces valid JSON (JSON.parse does not throw)', () => {
    const json = serializeWorkResult(validWorkResult);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('produces JSON containing all required fields', () => {
    const json = serializeWorkResult(validWorkResult);
    const parsed = JSON.parse(json);
    expect(parsed.workUnitId).toBe(validWorkResult.workUnitId);
    expect(parsed.resultHash).toBe(validWorkResult.resultHash);
    expect(parsed.challengeToken).toBe(validWorkResult.challengeToken);
    expect(parsed.computeTimeMs).toBe(validWorkResult.computeTimeMs);
    expect(parsed.completedAt).toBe(validWorkResult.completedAt);
  });
});

// ── Round-trip with known fixtures ─────────────────────────────────────

describe('round-trip with known fixtures', () => {
  it('round-trips a known IWorkUnit fixture', () => {
    const json = serializeWorkUnit(validWorkUnit);
    const parsed = parseWorkUnit(json);
    expect(parsed).toEqual(validWorkUnit);
  });

  it('round-trips a known IWorkResult fixture', () => {
    const json = serializeWorkResult(validWorkResult);
    const parsed = parseWorkResult(json);
    expect(parsed).toEqual(validWorkResult);
  });
});

// ── Base64 inputData field survives round-trip ─────────────────────────

describe('base64 inputData round-trip', () => {
  it('preserves base64-encoded inputData through serialize/parse', () => {
    // Encode some binary data as base64
    const binaryData = new Uint8Array([0x00, 0xff, 0x80, 0x7f, 0x01, 0xfe]);
    const base64Input = Buffer.from(binaryData).toString('base64');

    const workUnit: IWorkUnit = {
      ...validWorkUnit,
      inputData: base64Input,
    };

    const json = serializeWorkUnit(workUnit);
    const parsed = parseWorkUnit(json);

    expect(parsed.inputData).toBe(base64Input);

    // Verify the decoded bytes match the original
    const decoded = Buffer.from(parsed.inputData, 'base64');
    expect(new Uint8Array(decoded)).toEqual(binaryData);
  });

  it('preserves a large base64 payload through round-trip', () => {
    // Simulate a 512-byte block of data
    const largeData = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
      largeData[i] = i % 256;
    }
    const base64Input = Buffer.from(largeData).toString('base64');

    const workUnit: IWorkUnit = {
      ...validWorkUnit,
      inputData: base64Input,
    };

    const json = serializeWorkUnit(workUnit);
    const parsed = parseWorkUnit(json);

    expect(parsed.inputData).toBe(base64Input);
    const decoded = Buffer.from(parsed.inputData, 'base64');
    expect(new Uint8Array(decoded)).toEqual(largeData);
  });
});

// ── parseWorkUnit: malformed input scenarios ───────────────────────────

describe('parseWorkUnit malformed input', () => {
  it('throws on empty string', () => {
    expect(() => parseWorkUnit('')).toThrow(/parse error/i);
    try {
      parseWorkUnit('');
    } catch (error) {
      expect(error).toBeInstanceOf(TranslatableBrightChainError);
    }
  });

  it('throws on "null"', () => {
    expect(() => parseWorkUnit('null')).toThrow(/parse error/i);
    try {
      parseWorkUnit('null');
    } catch (error) {
      expect(error).toBeInstanceOf(TranslatableBrightChainError);
    }
  });

  it('throws on "[]" (array)', () => {
    expect(() => parseWorkUnit('[]')).toThrow(/parse error/i);
    try {
      parseWorkUnit('[]');
    } catch (error) {
      expect(error).toBeInstanceOf(TranslatableBrightChainError);
    }
  });

  // Each required field missing individually
  const requiredFields: Array<{ field: string; type: 'string' | 'number' }> = [
    { field: 'id', type: 'string' },
    { field: 'treeId', type: 'string' },
    { field: 'treeLevel', type: 'number' },
    { field: 'treeIndex', type: 'number' },
    { field: 'operation', type: 'string' },
    { field: 'inputData', type: 'string' },
    { field: 'childCount', type: 'number' },
    { field: 'difficulty', type: 'string' },
    { field: 'challengeToken', type: 'string' },
    { field: 'createdAt', type: 'string' },
    { field: 'expiresAt', type: 'string' },
  ];

  it.each(requiredFields)(
    'throws mentioning "$field" when $field is missing',
    ({ field }) => {
      const obj = { ...validWorkUnit } as Record<string, unknown>;
      delete obj[field];
      const json = JSON.stringify(obj);
      try {
        parseWorkUnit(json);
        fail('Expected parseWorkUnit to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(TranslatableBrightChainError);
        const translatable = error as TranslatableBrightChainError;
        expect(translatable.stringKey).toBe(
          BrightChainStrings.Error_PoUW_WorkUnit_MissingFieldTemplate,
        );
        expect(translatable.message).toMatch(new RegExp(field, 'i'));
      }
    },
  );

  it('throws on invalid operation enum value', () => {
    const obj = { ...validWorkUnit, operation: 'invalid_op' };
    const json = JSON.stringify(obj);
    try {
      parseWorkUnit(json);
      fail('Expected parseWorkUnit to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(TranslatableBrightChainError);
      const translatable = error as TranslatableBrightChainError;
      expect(translatable.stringKey).toBe(
        BrightChainStrings.Error_PoUW_WorkUnit_InvalidOperationTemplate,
      );
      expect(translatable.message).toMatch(/operation/i);
    }
  });

  it('throws on invalid difficulty enum value', () => {
    const obj = { ...validWorkUnit, difficulty: 'extreme' };
    const json = JSON.stringify(obj);
    try {
      parseWorkUnit(json);
      fail('Expected parseWorkUnit to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(TranslatableBrightChainError);
      const translatable = error as TranslatableBrightChainError;
      expect(translatable.stringKey).toBe(
        BrightChainStrings.Error_PoUW_WorkUnit_InvalidDifficultyTemplate,
      );
      expect(translatable.message).toMatch(/difficulty/i);
    }
  });
});

// ── parseWorkResult: malformed input scenarios ─────────────────────────

describe('parseWorkResult malformed input', () => {
  it('throws on empty string', () => {
    expect(() => parseWorkResult('')).toThrow(/parse error/i);
    try {
      parseWorkResult('');
    } catch (error) {
      expect(error).toBeInstanceOf(TranslatableBrightChainError);
    }
  });

  const requiredResultFields: Array<{ field: string }> = [
    { field: 'workUnitId' },
    { field: 'resultHash' },
    { field: 'challengeToken' },
    { field: 'computeTimeMs' },
    { field: 'completedAt' },
  ];

  it.each(requiredResultFields)(
    'throws mentioning "$field" when $field is missing',
    ({ field }) => {
      const obj = { ...validWorkResult } as Record<string, unknown>;
      delete obj[field];
      const json = JSON.stringify(obj);
      try {
        parseWorkResult(json);
        fail('Expected parseWorkResult to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(TranslatableBrightChainError);
        const translatable = error as TranslatableBrightChainError;
        expect(translatable.stringKey).toBe(
          BrightChainStrings.Error_PoUW_WorkResult_MissingFieldTemplate,
        );
        expect(translatable.message).toMatch(new RegExp(field, 'i'));
      }
    },
  );
});
