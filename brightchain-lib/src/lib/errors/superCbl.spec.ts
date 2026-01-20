import { describe, expect, it } from '@jest/globals';
import { SuperCBLError, SuperCBLErrorType } from './superCbl';

describe('SuperCBLError', () => {
  describe('maxDepthExceeded', () => {
    it('should create error with correct type and message', () => {
      const error = SuperCBLError.maxDepthExceeded(11, 10);

      expect(error).toBeInstanceOf(SuperCBLError);
      expect(error.type).toBe(SuperCBLErrorType.MAX_DEPTH_EXCEEDED);
      expect(error.message).toContain(
        'Maximum hierarchy depth (10) exceeded at depth 11',
      );
      expect(error.context).toEqual({ currentDepth: 11, maxDepth: 10 });
    });
  });

  describe('missingSubCBL', () => {
    it('should create error with magnet URL', () => {
      const magnetUrl = 'magnet:?xt=urn:brightchain:cbl&bs=1024&b1=abc&b2=def';
      const error = SuperCBLError.missingSubCBL(magnetUrl);

      expect(error).toBeInstanceOf(SuperCBLError);
      expect(error.type).toBe(SuperCBLErrorType.MISSING_SUB_CBL);
      expect(error.message).toContain('Failed to retrieve sub-CBL');
      expect(error.context?.['magnetUrl']).toBe(magnetUrl);
    });

    it('should include cause message when provided', () => {
      const magnetUrl = 'magnet:?xt=urn:brightchain:cbl&bs=1024&b1=abc&b2=def';
      const cause = new Error('Network timeout');
      const error = SuperCBLError.missingSubCBL(magnetUrl, cause);

      expect(error.message).toContain('Network timeout');
      expect(error.context?.['cause']).toBe('Network timeout');
    });
  });

  describe('invalidCBLType', () => {
    it('should create error with type information', () => {
      const error = SuperCBLError.invalidCBLType('invalid-type');

      expect(error).toBeInstanceOf(SuperCBLError);
      expect(error.type).toBe(SuperCBLErrorType.INVALID_CBL_TYPE);
      expect(error.message).toContain(
        'Unknown or invalid CBL type: invalid-type',
      );
      expect(error.context).toEqual({ type: 'invalid-type' });
    });
  });

  describe('blockCountMismatch', () => {
    it('should create error with expected and actual counts', () => {
      const error = SuperCBLError.blockCountMismatch(100, 95);

      expect(error).toBeInstanceOf(SuperCBLError);
      expect(error.type).toBe(SuperCBLErrorType.BLOCK_COUNT_MISMATCH);
      expect(error.message).toContain(
        'Block count mismatch: expected 100, got 95',
      );
      expect(error.context).toEqual({ expected: 100, actual: 95 });
    });
  });

  describe('invalidFormat', () => {
    it('should create error with reason', () => {
      const error = SuperCBLError.invalidFormat('Missing version field');

      expect(error).toBeInstanceOf(SuperCBLError);
      expect(error.type).toBe(SuperCBLErrorType.INVALID_CBL_FORMAT);
      expect(error.message).toContain(
        'Invalid CBL format: Missing version field',
      );
    });

    it('should include context when provided', () => {
      const context = { version: undefined, type: 'regular' };
      const error = SuperCBLError.invalidFormat(
        'Missing version field',
        context,
      );

      expect(error.context).toEqual(context);
    });
  });

  describe('error properties', () => {
    it('should have correct name', () => {
      const error = SuperCBLError.invalidCBLType('test');
      expect(error.name).toBe('SuperCBLError');
    });

    it('should be instanceof Error', () => {
      const error = SuperCBLError.invalidCBLType('test');
      expect(error).toBeInstanceOf(Error);
    });

    it('should maintain prototype chain', () => {
      const error = SuperCBLError.invalidCBLType('test');
      expect(Object.getPrototypeOf(error)).toBe(SuperCBLError.prototype);
    });
  });
});
