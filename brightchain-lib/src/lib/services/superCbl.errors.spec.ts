import { describe, expect, it } from '@jest/globals';
import { SuperCBLError, SuperCBLErrorType } from '../errors/superCbl';
import type { SubCBL, SuperCBL } from '../interfaces/storage/superCbl';
import { SuperCBLService, parseCBLData } from './superCbl.service';

describe('SuperCBLService - Error Handling', () => {
  const service = new SuperCBLService();

  describe('parseCBLData', () => {
    it('should throw INVALID_CBL_TYPE for unknown v2 type', () => {
      const invalidCbl = {
        version: 2,
        type: 'unknown-type',
        fileName: 'test.txt',
      };

      expect(() => parseCBLData(invalidCbl)).toThrow(SuperCBLError);

      try {
        parseCBLData(invalidCbl);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SuperCBLError);
        expect((error as SuperCBLError).type).toBe(
          SuperCBLErrorType.INVALID_CBL_TYPE,
        );
      }
    });

    it('should throw INVALID_CBL_FORMAT for unsupported version', () => {
      const invalidCbl = {
        version: 99,
        type: 'regular',
        fileName: 'test.txt',
      };

      expect(() => parseCBLData(invalidCbl)).toThrow(SuperCBLError);

      try {
        parseCBLData(invalidCbl);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SuperCBLError);
        expect((error as SuperCBLError).type).toBe(
          SuperCBLErrorType.INVALID_CBL_FORMAT,
        );
      }
    });
  });

  describe('createHierarchicalCBL', () => {
    it('should throw MAX_DEPTH_EXCEEDED when depth limit reached', async () => {
      const blocks = Array.from({ length: 100 }, (_, i) => `block-${i}`);
      const config = {
        fileName: 'test.txt',
        originalSize: 10000,
        blockSize: 1024,
        maxDepth: 1,
      };

      const storeSubCBL = async (
        _subCbl: SubCBL | SuperCBL,
      ): Promise<string> => {
        return `magnet:?xt=urn:brightchain:cbl&bs=1024&b1=abc&b2=def`;
      };

      await expect(
        service.createHierarchicalCBL(blocks, config, storeSubCBL, 2),
      ).rejects.toThrow(SuperCBLError);

      try {
        await service.createHierarchicalCBL(blocks, config, storeSubCBL, 2);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SuperCBLError);
        expect((error as SuperCBLError).type).toBe(
          SuperCBLErrorType.MAX_DEPTH_EXCEEDED,
        );
      }
    });
  });

  describe('reconstructBlockReferences', () => {
    it('should throw MISSING_SUB_CBL when retrieval fails', async () => {
      const superCbl: SuperCBL = {
        version: 2,
        type: 'super-cbl',
        fileName: 'test.txt',
        originalSize: 10000,
        blockSize: 1024,
        totalBlockCount: 100,
        depth: 2,
        subCblCount: 2,
        subCblMagnetUrls: [
          'magnet:?xt=urn:brightchain:cbl&bs=1024&b1=abc&b2=def',
          'magnet:?xt=urn:brightchain:cbl&bs=1024&b1=ghi&b2=jkl',
        ],
      };

      const retrieveSubCBL = async (_magnetUrl: string) => {
        throw new Error('Block not found');
      };

      await expect(
        service.reconstructBlockReferences(superCbl, retrieveSubCBL),
      ).rejects.toThrow(SuperCBLError);

      try {
        await service.reconstructBlockReferences(superCbl, retrieveSubCBL);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SuperCBLError);
        expect((error as SuperCBLError).type).toBe(
          SuperCBLErrorType.MISSING_SUB_CBL,
        );
      }
    });

    it('should throw BLOCK_COUNT_MISMATCH when counts do not match', async () => {
      const superCbl: SuperCBL = {
        version: 2,
        type: 'super-cbl',
        fileName: 'test.txt',
        originalSize: 10000,
        blockSize: 1024,
        totalBlockCount: 100,
        depth: 2,
        subCblCount: 1,
        subCblMagnetUrls: [
          'magnet:?xt=urn:brightchain:cbl&bs=1024&b1=abc&b2=def',
        ],
      };

      const retrieveSubCBL = async (_magnetUrl: string) => {
        const _subCbl: SubCBL = {
          version: 2,
          type: 'sub-cbl',
          fileName: 'test.txt',
          originalSize: 10000,
          blockSize: 1024,
          blockCount: 50,
          blocks: Array.from({ length: 50 }, (_, i) => `block-${i}`),
          subCblIndex: 0,
          totalSubCbls: 1,
        };
        return _subCbl;
      };

      await expect(
        service.reconstructBlockReferences(superCbl, retrieveSubCBL),
      ).rejects.toThrow(SuperCBLError);

      try {
        await service.reconstructBlockReferences(superCbl, retrieveSubCBL);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SuperCBLError);
        expect((error as SuperCBLError).type).toBe(
          SuperCBLErrorType.BLOCK_COUNT_MISMATCH,
        );
      }
    });

    it('should throw INVALID_CBL_TYPE for unknown CBL type', async () => {
      const invalidCbl = {
        version: 2,
        type: 'unknown',
        fileName: 'test.txt',
        originalSize: 1000,
        blockSize: 1024,
        blockCount: 1,
        blocks: [],
      };

      const retrieveSubCBL = async (_magnetUrl: string) => {
        return invalidCbl as never;
      };

      await expect(
        service.reconstructBlockReferences(invalidCbl as never, retrieveSubCBL),
      ).rejects.toThrow(SuperCBLError);

      try {
        await service.reconstructBlockReferences(
          invalidCbl as never,
          retrieveSubCBL,
        );
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SuperCBLError);
        expect((error as SuperCBLError).type).toBe(
          SuperCBLErrorType.INVALID_CBL_TYPE,
        );
      }
    });
  });
});
