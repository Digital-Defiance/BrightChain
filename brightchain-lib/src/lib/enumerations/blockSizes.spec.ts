import { BlockSize, lengthToBlockSize, validateBlockSize } from './blockSizes';

describe('BlockSizes', () => {
  describe('validateBlockSize', () => {
    it('should validate standard block sizes', () => {
      expect(validateBlockSize(BlockSize.Message)).toBe(true);
      expect(validateBlockSize(BlockSize.Tiny)).toBe(true);
      expect(validateBlockSize(BlockSize.Small)).toBe(true);
      expect(validateBlockSize(BlockSize.Medium)).toBe(true);
      expect(validateBlockSize(BlockSize.Large)).toBe(true);
      expect(validateBlockSize(BlockSize.Huge)).toBe(true);
    });

    it('should reject invalid block sizes by default', () => {
      expect(validateBlockSize(123)).toBe(false);
      expect(validateBlockSize(295)).toBe(false);
      expect(validateBlockSize(359)).toBe(false);
    });

    it('should accept non-standard block sizes when allowNonStandard is true', () => {
      expect(validateBlockSize(123, true)).toBe(true);
      expect(validateBlockSize(295, true)).toBe(true);
      expect(validateBlockSize(359, true)).toBe(true);
    });
  });

  describe('lengthToBlockSize', () => {
    it('should convert standard block sizes', () => {
      expect(lengthToBlockSize(BlockSize.Message)).toBe(BlockSize.Message);
      expect(lengthToBlockSize(BlockSize.Tiny)).toBe(BlockSize.Tiny);
      expect(lengthToBlockSize(BlockSize.Small)).toBe(BlockSize.Small);
      expect(lengthToBlockSize(BlockSize.Medium)).toBe(BlockSize.Medium);
      expect(lengthToBlockSize(BlockSize.Large)).toBe(BlockSize.Large);
      expect(lengthToBlockSize(BlockSize.Huge)).toBe(BlockSize.Huge);
    });

    it('should convert non-standard block sizes to closest standard size', () => {
      expect(lengthToBlockSize(123)).toBe(BlockSize.Message);
      expect(lengthToBlockSize(295)).toBe(BlockSize.Message);
      expect(lengthToBlockSize(359)).toBe(BlockSize.Message);
      expect(lengthToBlockSize(600)).toBe(BlockSize.Tiny);
      expect(lengthToBlockSize(2000)).toBe(BlockSize.Small);
    });
  });
});
