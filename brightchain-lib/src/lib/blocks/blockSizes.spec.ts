import {
  BlockSize,
  lengthToBlockSize,
  blockSizeToLength,
  validateBlockSize,
  blockSizes,
  blockSizeLengths,
} from '../enumerations/blockSizes';
describe('blockSizes', () => {
  it('should have the expected members', () => {
    // BlockSize is an enum with assigned number values
    expect(BlockSize.Unknown).toBe(0);
    expect(BlockSize.Nano).toBe(128);
    expect(BlockSize.Micro).toBe(256);
    expect(BlockSize.Message).toBe(512);
    expect(BlockSize.Tiny).toBe(1024);
    expect(BlockSize.Small).toBe(4096);
    expect(BlockSize.Medium).toBe(1048576);
    expect(BlockSize.Large).toBe(67108864);
  });
  it('should validate the blockSizes/blockSizeLengths const arrays', () => {
    expect(blockSizes).toEqual([
      BlockSize.Unknown,
      BlockSize.Nano,
      BlockSize.Micro,
      BlockSize.Message,
      BlockSize.Tiny,
      BlockSize.Small,
      BlockSize.Medium,
      BlockSize.Large,
    ]);
    expect(blockSizeLengths).toEqual([
      0, 128, 256, 512, 1024, 4096, 1048576, 67108864,
    ]);
  });
  it('should test blockSizeToLength', () => {
    expect(blockSizeToLength(BlockSize.Unknown)).toBe(0);
    expect(blockSizeToLength(BlockSize.Nano)).toBe(128);
    expect(blockSizeToLength(BlockSize.Micro)).toBe(256);
    expect(blockSizeToLength(BlockSize.Message)).toBe(512);
    expect(blockSizeToLength(BlockSize.Tiny)).toBe(1024);
    expect(blockSizeToLength(BlockSize.Small)).toBe(4096);
    expect(blockSizeToLength(BlockSize.Medium)).toBe(1048576);
    expect(blockSizeToLength(BlockSize.Large)).toBe(67108864);
  });
  it('should test lengthToBlockSize', () => {
    expect(lengthToBlockSize(0)).toBe(BlockSize.Unknown);
    expect(lengthToBlockSize(128)).toBe(BlockSize.Nano);
    expect(lengthToBlockSize(256)).toBe(BlockSize.Micro);
    expect(lengthToBlockSize(512)).toBe(BlockSize.Message);
    expect(lengthToBlockSize(1024)).toBe(BlockSize.Tiny);
    expect(lengthToBlockSize(4096)).toBe(BlockSize.Small);
    expect(lengthToBlockSize(1048576)).toBe(BlockSize.Medium);
    expect(lengthToBlockSize(67108864)).toBe(BlockSize.Large);
    //expect unexpected sizes to be unknown
    expect(lengthToBlockSize(1)).toBe(BlockSize.Unknown);
  });
  it('should test validateBlockSize', () => {
    expect(validateBlockSize(128)).toBe(true);
    expect(validateBlockSize(256)).toBe(true);
    expect(validateBlockSize(512)).toBe(true);
    expect(validateBlockSize(1024)).toBe(true);
    expect(validateBlockSize(4096)).toBe(true);
    expect(validateBlockSize(1048576)).toBe(true);
    expect(validateBlockSize(67108864)).toBe(true);
    //expect unexpected sizes to be false
    expect(validateBlockSize(0)).toBe(false);
    expect(validateBlockSize(1)).toBe(false);
  });
});
