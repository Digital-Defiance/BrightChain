import {
  BlockSize,
  lengthToBlockSize,
  validateBlockSize,
  blockSizeLengths,
  validBlockSizes,
} from './blockSizes';
describe('blockSizes', () => {
  it('should have the expected members', () => {
    // BlockSize is an enum with assigned number values
    expect(BlockSize.Unknown).toBe(0);
    expect(BlockSize.Message).toBe(512);
    expect(BlockSize.Tiny).toBe(1024);
    expect(BlockSize.Small).toBe(4096);
    expect(BlockSize.Medium).toBe(1048576);
    expect(BlockSize.Large).toBe(67108864);
    expect(BlockSize.Huge).toBe(268435456);
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
    expect(lengthToBlockSize(512)).toBe(BlockSize.Message);
    expect(lengthToBlockSize(1024)).toBe(BlockSize.Tiny);
    expect(lengthToBlockSize(4096)).toBe(BlockSize.Small);
    expect(lengthToBlockSize(1048576)).toBe(BlockSize.Medium);
    expect(lengthToBlockSize(67108864)).toBe(BlockSize.Large);
    expect(lengthToBlockSize(268435456)).toBe(BlockSize.Huge);
    //expect non-matching sizes to be unknown
    expect(() => lengthToBlockSize(0)).toThrow();
    expect(() => lengthToBlockSize(1)).toThrow();;
    expect(() => lengthToBlockSize(67108863)).toThrow();
    expect(() => lengthToBlockSize(268435455)).toThrow();
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
});
