import {
  BlockSize,
  lengthToBlockSize,
  blockSizeToLength,
  validateBlockSize,
  blockSizeLengths,
  validBlockSizes,
  maxFileSizesWithCBL,
  cblBlockMaxIDCounts,
  maxFileSizesWithData,
  cblBlockDataLengths,
} from '../enumerations/blockSizes';
describe('blockSizes', () => {
  it('should have the expected members', () => {
    // BlockSize is an enum with assigned number values
    expect(BlockSize.Unknown).toBe(0);
    expect(BlockSize.Micro).toBe(256);
    expect(BlockSize.Message).toBe(512);
    expect(BlockSize.Tiny).toBe(1024);
    expect(BlockSize.Small).toBe(4096);
    expect(BlockSize.Medium).toBe(1048576);
    expect(BlockSize.Large).toBe(67108864);
  });
  it('should validate the blockSizes/blockSizeLengths const arrays', () => {
    expect(validBlockSizes).toEqual([
      BlockSize.Micro,
      BlockSize.Message,
      BlockSize.Tiny,
      BlockSize.Small,
      BlockSize.Medium,
      BlockSize.Large,
    ]);
    expect(blockSizeLengths).toEqual([
      256, 512, 1024, 4096, 1048576, 67108864,
    ]);
  });
  it('should test blockSizeToLength', () => {
    expect(blockSizeToLength(BlockSize.Micro)).toBe(256);
    expect(blockSizeToLength(BlockSize.Message)).toBe(512);
    expect(blockSizeToLength(BlockSize.Tiny)).toBe(1024);
    expect(blockSizeToLength(BlockSize.Small)).toBe(4096);
    expect(blockSizeToLength(BlockSize.Medium)).toBe(1048576);
    expect(blockSizeToLength(BlockSize.Large)).toBe(67108864);
  });
  it('should test lengthToBlockSize', () => {
    expect(lengthToBlockSize(0)).toBe(BlockSize.Unknown);
    expect(lengthToBlockSize(256)).toBe(BlockSize.Micro);
    expect(lengthToBlockSize(512)).toBe(BlockSize.Message);
    expect(lengthToBlockSize(1024)).toBe(BlockSize.Tiny);
    expect(lengthToBlockSize(4096)).toBe(BlockSize.Small);
    expect(lengthToBlockSize(1048576)).toBe(BlockSize.Medium);
    expect(lengthToBlockSize(67108864)).toBe(BlockSize.Large);
    //expect unexpected sizes to be unknown
    expect(lengthToBlockSize(1)).toBe(BlockSize.Unknown);
    expect(lengthToBlockSize(67108863)).toBe(BlockSize.Unknown);

  });
  it('should test validateBlockSize', () => {
    expect(validateBlockSize(BlockSize.Micro)).toBe(true);
    expect(validateBlockSize(BlockSize.Message)).toBe(true);
    expect(validateBlockSize(BlockSize.Tiny)).toBe(true);
    expect(validateBlockSize(BlockSize.Small)).toBe(true);
    expect(validateBlockSize(BlockSize.Medium)).toBe(true);
    expect(validateBlockSize(BlockSize.Large)).toBe(true);
    //expect unexpected sizes to be false
    expect(validateBlockSize(BlockSize.Unknown)).toBe(false);
    expect(validateBlockSize(1)).toBe(false);
    expect(validateBlockSize(123)).toBe(false);
  });
  it('should test maxFileSizesWithData', () => {
    expect(maxFileSizesWithData[0]).toBe(154);
    expect(maxFileSizesWithData[1]).toBe(410);
    expect(maxFileSizesWithData[2]).toBe(922);
    expect(maxFileSizesWithData[3]).toBe(3994);
    expect(maxFileSizesWithData[4]).toBe(1048474);
    expect(maxFileSizesWithData[5]).toBe(67108762);
  });
  it('should test cblBlockDataLengths', () => {
    expect(cblBlockDataLengths[0]).toBe(146);
    expect(cblBlockDataLengths[1]).toBe(402);
    expect(cblBlockDataLengths[2]).toBe(914);
    expect(cblBlockDataLengths[3]).toBe(3986);
    expect(cblBlockDataLengths[4]).toBe(1048466);
    expect(cblBlockDataLengths[5]).toBe(67108754);
  });
  it('should test cblBlockMaxIDCounts', () => {
    expect(cblBlockMaxIDCounts[0]).toBe(9);
    expect(cblBlockMaxIDCounts[1]).toBe(25);
    expect(cblBlockMaxIDCounts[2]).toBe(57);
    expect(cblBlockMaxIDCounts[3]).toBe(249);
    expect(cblBlockMaxIDCounts[4]).toBe(65529);
    expect(cblBlockMaxIDCounts[5]).toBe(4194297);
  });
  it('should test maxFileSizesWithCBL', () => {
    expect(maxFileSizesWithCBL[0]).toBe(2304n);
    expect(maxFileSizesWithCBL[1]).toBe(12800n);
    expect(maxFileSizesWithCBL[2]).toBe(58368n);
    expect(maxFileSizesWithCBL[3]).toBe(1019904n);
    expect(maxFileSizesWithCBL[4]).toBe(68712136704n);
    expect(maxFileSizesWithCBL[5]).toBe(281474506948608n);
  });
});
