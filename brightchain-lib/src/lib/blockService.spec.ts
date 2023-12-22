import { BlockService } from './blockService';
import { BlockSize } from './enumerations/blockSizes';

describe('BlockService', () => {
  describe('BlockService - getBlockSizeForData', () => {
    it('should return the correct block size for micro data lengths', () => {
      expect(BlockService.getBlockSizeForData(100)).toBe(BlockSize.Micro);
    });

    it('should return the correct block size for message data lengths', () => {
      expect(BlockService.getBlockSizeForData(400)).toBe(BlockSize.Message);
    });

    it('should return the correct block size for tiny data lengths', () => {
      expect(BlockService.getBlockSizeForData(900)).toBe(BlockSize.Tiny);
    });

    it('should return the correct block size for small data lengths', () => {
      expect(BlockService.getBlockSizeForData(3900)).toBe(BlockSize.Small);
    });

    it('should return the correct block size for medium data lengths', () => {
      expect(BlockService.getBlockSizeForData(1048400)).toBe(BlockSize.Medium);
    });

    it('should return the correct block size for large data lengths', () => {
      expect(BlockService.getBlockSizeForData(67108700)).toBe(BlockSize.Large);
    });

    it('should return the correct block size for huge data lengths', () => {
      expect(BlockService.getBlockSizeForData(268435400)).toBe(BlockSize.Huge);
    });
    it('should return Unknown for data length exceeding maximum limits', () => {
      expect(BlockService.getBlockSizeForData(268435500)).toBe(BlockSize.Unknown);
    });

    it('should return Unknown for negative data length', () => {
      expect(BlockService.getBlockSizeForData(-50)).toBe(BlockSize.Unknown);
    });
  });
});
