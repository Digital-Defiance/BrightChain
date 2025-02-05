import {
  BlockSize,
  blockSizeExponents,
  blockSizeLengths,
  lengthToBlockSize,
  lengthToClosestBlockSize,
  validateBlockSize,
  validBlockSizes,
} from './blockSizes';
describe('blockSizes', () => {
  it('should have the expected members', () => {
    // BlockSize is an enum with assigned number values
    expect(BlockSize.Unknown).toBe(0);
    expect(BlockSize.Message).toBe(blockSizeLengths[0]);
    expect(BlockSize.Tiny).toBe(blockSizeLengths[1]);
    expect(BlockSize.Small).toBe(blockSizeLengths[2]);
    expect(BlockSize.Medium).toBe(blockSizeLengths[3]);
    expect(BlockSize.Large).toBe(blockSizeLengths[4]);
    expect(BlockSize.Huge).toBe(blockSizeLengths[5]);
  });
  it('should validate the blockSizes/blockSizeLengths const arrays', () => {
    expect(validBlockSizes).toEqual([
      BlockSize.Message,
      BlockSize.Tiny,
      BlockSize.Small,
      BlockSize.Medium,
      BlockSize.Large,
      BlockSize.Huge,
    ]);
    expect(blockSizeLengths).toEqual([
      512, 1024, 4096, 1048576, 67108864, 268435456,
    ]);
  });
  it('should test lengthToBlockSize', () => {
    expect(lengthToBlockSize(blockSizeLengths[0])).toBe(BlockSize.Message);
    expect(lengthToBlockSize(blockSizeLengths[1])).toBe(BlockSize.Tiny);
    expect(lengthToBlockSize(blockSizeLengths[2])).toBe(BlockSize.Small);
    expect(lengthToBlockSize(blockSizeLengths[3])).toBe(BlockSize.Medium);
    expect(lengthToBlockSize(blockSizeLengths[4])).toBe(BlockSize.Large);
    expect(lengthToBlockSize(blockSizeLengths[5])).toBe(BlockSize.Huge);
    //expect non-matching sizes to be unknown
    expect(() => lengthToBlockSize(0)).toThrow();
    expect(() => lengthToBlockSize(1)).toThrow();
    expect(() => lengthToBlockSize(blockSizeLengths[4] - 1)).toThrow();
    expect(() => lengthToBlockSize(blockSizeLengths[5] - 1)).toThrow();
  });
  it('should test validateBlockSize', () => {
    expect(validateBlockSize(BlockSize.Message)).toBe(true);
    expect(validateBlockSize(BlockSize.Tiny)).toBe(true);
    expect(validateBlockSize(BlockSize.Small)).toBe(true);
    expect(validateBlockSize(BlockSize.Medium)).toBe(true);
    expect(validateBlockSize(BlockSize.Large)).toBe(true);
    expect(validateBlockSize(BlockSize.Huge)).toBe(true);
    //expect unexpected sizes to be false
    expect(validateBlockSize(BlockSize.Unknown)).toBe(false);
    expect(validateBlockSize(1)).toBe(false);
    expect(validateBlockSize(123)).toBe(false);
  });

  describe('lengthToClosestBlockSize', () => {
    it('should match exact block sizes', () => {
      expect(lengthToClosestBlockSize(512)).toBe(BlockSize.Message);
      expect(lengthToClosestBlockSize(1024)).toBe(BlockSize.Tiny);
      expect(lengthToClosestBlockSize(4096)).toBe(BlockSize.Small);
      expect(lengthToClosestBlockSize(1048576)).toBe(BlockSize.Medium);
      expect(lengthToClosestBlockSize(67108864)).toBe(BlockSize.Large);
      expect(lengthToClosestBlockSize(268435456)).toBe(BlockSize.Huge);
    });

    it('should return closest block size for values between sizes', () => {
      expect(lengthToClosestBlockSize(511)).toBe(BlockSize.Message);
      expect(lengthToClosestBlockSize(1023)).toBe(BlockSize.Tiny);
      expect(lengthToClosestBlockSize(4095)).toBe(BlockSize.Small);
      expect(lengthToClosestBlockSize(1048575)).toBe(BlockSize.Medium);
      expect(lengthToClosestBlockSize(67108863)).toBe(BlockSize.Large);
      expect(lengthToClosestBlockSize(268435455)).toBe(BlockSize.Huge);
    });

    it('should handle edge cases', () => {
      expect(lengthToClosestBlockSize(0)).toBe(BlockSize.Message);
      expect(() => lengthToClosestBlockSize(-1)).toThrow(
        'Invalid block size: -1',
      );
      expect(lengthToClosestBlockSize(268435457)).toBe(BlockSize.Huge);
      expect(lengthToClosestBlockSize(536870912)).toBe(BlockSize.Huge);
    });
  });
});
describe('blockSizeExponents', () => {
  it('should match the blockSizeLengths when exponentiated', () => {
    expect(blockSizeExponents.map((exp) => 2 ** exp)).toEqual(blockSizeLengths);
  });
});
