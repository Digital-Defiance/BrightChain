import { BlockService } from './blockService';
import { BlockSize } from './enumerations/blockSizes';

describe('BlockService', () => {
  describe('getBlockSizeForData', () => {
    it('should return Message size for small data', () => {
      expect(BlockService.getBlockSizeForData(400)).toBe(BlockSize.Message);
    });

    it('should return Tiny size for slightly larger data', () => {
      expect(BlockService.getBlockSizeForData(900)).toBe(BlockSize.Tiny);
    });

    it('should return Small size for medium data', () => {
      expect(BlockService.getBlockSizeForData(3900)).toBe(BlockSize.Small);
    });

    it('should return Medium size for larger data', () => {
      expect(BlockService.getBlockSizeForData(1048400)).toBe(BlockSize.Medium);
    });

    it('should return Large size for very large data', () => {
      expect(BlockService.getBlockSizeForData(67108700)).toBe(BlockSize.Large);
    });

    it('should return Huge size for extremely large data', () => {
      expect(BlockService.getBlockSizeForData(268435400)).toBe(BlockSize.Huge);
    });

    it('should return Unknown for data exceeding maximum size', () => {
      expect(BlockService.getBlockSizeForData(268435500)).toBe(
        BlockSize.Unknown,
      );
    });

    it('should return Unknown for negative sizes', () => {
      expect(BlockService.getBlockSizeForData(-50)).toBe(BlockSize.Unknown);
    });
  });
});
