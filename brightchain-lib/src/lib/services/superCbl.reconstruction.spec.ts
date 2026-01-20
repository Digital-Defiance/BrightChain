/**
 * @fileoverview Tests for Super CBL reconstruction logic
 *
 * **Feature: super-cbl**
 *
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 6.5, 6.6**
 */

import { describe, expect, it } from '@jest/globals';
import type {
  CBLData,
  CBLv1,
  RegularCBLv2,
  SubCBL,
  SuperCBL,
} from '../interfaces/storage/superCbl';
import { parseCBLData, SuperCBLService } from './superCbl.service';

describe('Super CBL Reconstruction', () => {
  const service = new SuperCBLService();

  describe('parseCBLData', () => {
    it('should parse v1 CBL', () => {
      const v1: CBLv1 = {
        version: 1,
        fileName: 'test.txt',
        originalSize: 1000,
        blockSize: 4096,
        blockCount: 2,
        blocks: ['block1', 'block2'],
      };

      const parsed = parseCBLData(v1);
      expect(parsed.version).toBe(1);
      expect((parsed as CBLv1).blocks).toEqual(['block1', 'block2']);
    });

    it('should parse v2 regular CBL', () => {
      const v2: RegularCBLv2 = {
        version: 2,
        type: 'regular',
        fileName: 'test.txt',
        originalSize: 1000,
        blockSize: 4096,
        blockCount: 2,
        blocks: ['block1', 'block2'],
      };

      const parsed = parseCBLData(v2);
      expect(parsed.version).toBe(2);
      expect((parsed as RegularCBLv2).type).toBe('regular');
    });

    it('should parse sub-CBL', () => {
      const subCbl: SubCBL = {
        version: 2,
        type: 'sub-cbl',
        fileName: 'test.txt',
        originalSize: 1000,
        blockSize: 4096,
        blockCount: 2,
        blocks: ['block1', 'block2'],
        subCblIndex: 0,
        totalSubCbls: 2,
      };

      const parsed = parseCBLData(subCbl);
      expect((parsed as SubCBL).type).toBe('sub-cbl');
      expect((parsed as SubCBL).subCblIndex).toBe(0);
    });

    it('should parse Super CBL', () => {
      const superCbl: SuperCBL = {
        version: 2,
        type: 'super-cbl',
        fileName: 'test.txt',
        originalSize: 10000,
        blockSize: 4096,
        totalBlockCount: 100,
        depth: 2,
        subCblCount: 5,
        subCblMagnetUrls: ['url1', 'url2'],
      };

      const parsed = parseCBLData(superCbl);
      expect((parsed as SuperCBL).type).toBe('super-cbl');
      expect((parsed as SuperCBL).subCblCount).toBe(5);
    });

    it('should parse from JSON string', () => {
      const v1Json = JSON.stringify({
        version: 1,
        fileName: 'test.txt',
        originalSize: 1000,
        blockSize: 4096,
        blockCount: 1,
        blocks: ['block1'],
      });

      const parsed = parseCBLData(v1Json);
      expect(parsed.version).toBe(1);
    });

    it('should throw error for unsupported version', () => {
      const invalid = { version: 99, type: 'unknown' };
      expect(() => parseCBLData(invalid)).toThrow(/Unsupported CBL version/);
    });
  });

  describe('reconstructBlockReferences', () => {
    it('should reconstruct from v1 CBL', async () => {
      const v1: CBLv1 = {
        version: 1,
        fileName: 'test.txt',
        originalSize: 1000,
        blockSize: 4096,
        blockCount: 3,
        blocks: ['block1', 'block2', 'block3'],
      };

      const retrieveSubCBL = async (_url: string): Promise<CBLData> => {
        throw new Error('Should not be called for v1');
      };

      const blocks = await service.reconstructBlockReferences(
        v1,
        retrieveSubCBL,
      );
      expect(blocks).toEqual(['block1', 'block2', 'block3']);
    });

    it('should reconstruct from regular v2 CBL', async () => {
      const regular: RegularCBLv2 = {
        version: 2,
        type: 'regular',
        fileName: 'test.txt',
        originalSize: 1000,
        blockSize: 4096,
        blockCount: 2,
        blocks: ['blockA', 'blockB'],
      };

      const retrieveSubCBL = async (_url: string): Promise<CBLData> => {
        throw new Error('Should not be called for regular');
      };

      const blocks = await service.reconstructBlockReferences(
        regular,
        retrieveSubCBL,
      );
      expect(blocks).toEqual(['blockA', 'blockB']);
    });

    it('should reconstruct from Super CBL with sub-CBLs', async () => {
      const subCbl1: SubCBL = {
        version: 2,
        type: 'sub-cbl',
        fileName: 'test.txt',
        originalSize: 5000,
        blockSize: 4096,
        blockCount: 2,
        blocks: ['block1', 'block2'],
        subCblIndex: 0,
        totalSubCbls: 2,
      };

      const subCbl2: SubCBL = {
        version: 2,
        type: 'sub-cbl',
        fileName: 'test.txt',
        originalSize: 5000,
        blockSize: 4096,
        blockCount: 2,
        blocks: ['block3', 'block4'],
        subCblIndex: 1,
        totalSubCbls: 2,
      };

      const superCbl: SuperCBL = {
        version: 2,
        type: 'super-cbl',
        fileName: 'test.txt',
        originalSize: 5000,
        blockSize: 4096,
        totalBlockCount: 4,
        depth: 2,
        subCblCount: 2,
        subCblMagnetUrls: ['magnet:url1', 'magnet:url2'],
      };

      const retrieveSubCBL = async (url: string): Promise<CBLData> => {
        if (url === 'magnet:url1') return subCbl1;
        if (url === 'magnet:url2') return subCbl2;
        throw new Error(`Unknown URL: ${url}`);
      };

      const blocks = await service.reconstructBlockReferences(
        superCbl,
        retrieveSubCBL,
      );
      expect(blocks).toEqual(['block1', 'block2', 'block3', 'block4']);
    });

    it('should handle nested Super CBL hierarchy', async () => {
      const subCbl1: SubCBL = {
        version: 2,
        type: 'sub-cbl',
        fileName: 'test.txt',
        originalSize: 10000,
        blockSize: 4096,
        blockCount: 2,
        blocks: ['b1', 'b2'],
        subCblIndex: 0,
        totalSubCbls: 2,
      };

      const subCbl2: SubCBL = {
        version: 2,
        type: 'sub-cbl',
        fileName: 'test.txt',
        originalSize: 10000,
        blockSize: 4096,
        blockCount: 2,
        blocks: ['b3', 'b4'],
        subCblIndex: 1,
        totalSubCbls: 2,
      };

      const nestedSuperCbl: SuperCBL = {
        version: 2,
        type: 'super-cbl',
        fileName: 'test.txt',
        originalSize: 10000,
        blockSize: 4096,
        totalBlockCount: 4,
        depth: 2,
        subCblCount: 2,
        subCblMagnetUrls: ['magnet:sub1', 'magnet:sub2'],
      };

      const rootSuperCbl: SuperCBL = {
        version: 2,
        type: 'super-cbl',
        fileName: 'test.txt',
        originalSize: 10000,
        blockSize: 4096,
        totalBlockCount: 4,
        depth: 3,
        subCblCount: 1,
        subCblMagnetUrls: ['magnet:nested'],
      };

      const retrieveSubCBL = async (url: string): Promise<CBLData> => {
        if (url === 'magnet:nested') return nestedSuperCbl;
        if (url === 'magnet:sub1') return subCbl1;
        if (url === 'magnet:sub2') return subCbl2;
        throw new Error(`Unknown URL: ${url}`);
      };

      const blocks = await service.reconstructBlockReferences(
        rootSuperCbl,
        retrieveSubCBL,
      );
      expect(blocks).toEqual(['b1', 'b2', 'b3', 'b4']);
    });

    it('should throw error on block count mismatch', async () => {
      const subCbl: SubCBL = {
        version: 2,
        type: 'sub-cbl',
        fileName: 'test.txt',
        originalSize: 1000,
        blockSize: 4096,
        blockCount: 2,
        blocks: ['block1', 'block2'],
        subCblIndex: 0,
        totalSubCbls: 1,
      };

      const superCbl: SuperCBL = {
        version: 2,
        type: 'super-cbl',
        fileName: 'test.txt',
        originalSize: 1000,
        blockSize: 4096,
        totalBlockCount: 999, // Wrong count
        depth: 2,
        subCblCount: 1,
        subCblMagnetUrls: ['magnet:url1'],
      };

      const retrieveSubCBL = async (_url: string): Promise<CBLData> => subCbl;

      await expect(
        service.reconstructBlockReferences(superCbl, retrieveSubCBL),
      ).rejects.toThrow(/Block count mismatch/);
    });
  });
});
