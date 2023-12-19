import { BlockService } from './blockService';
import { BlockSize } from './enumerations/blockSizes';

describe('BlockService', () => {
  describe('BlockService - getDataWithHeaderBlockSize', () => {
    it('should return Micro for data just fitting into Micro size', () => {
      expect(BlockService.getDataWithHeaderBlockSize(BigInt(100))).toBe(BlockSize.Micro);
    });

    it('should return Message for data just fitting into Message size', () => {
      expect(BlockService.getDataWithHeaderBlockSize(BigInt(400))).toBe(BlockSize.Message);
    });

    it('should return Tiny for data just fitting into Tiny size', () => {
      expect(BlockService.getDataWithHeaderBlockSize(BigInt(900))).toBe(BlockSize.Tiny);
    });
    it('should return Small for data just fitting into Small size', () => {
      expect(BlockService.getDataWithHeaderBlockSize(BigInt(3900))).toBe(BlockSize.Small);
    });

    it('should return Medium for data just fitting into Medium size', () => {
      expect(BlockService.getDataWithHeaderBlockSize(BigInt(1048400))).toBe(BlockSize.Medium);
    });

    it('should return Large for data just fitting into Large size', () => {
      expect(BlockService.getDataWithHeaderBlockSize(BigInt(67108700))).toBe(BlockSize.Large);
    });

    it('should return Unknown for data exceeding the largest size', () => {
      expect(BlockService.getDataWithHeaderBlockSize(BigInt(67219999))).toBe(BlockSize.Unknown);
    });

    it('should return Unknown for negative data length', () => {
      expect(BlockService.getDataWithHeaderBlockSize(BigInt(-1))).toBe(BlockSize.Unknown);
    });
  });
  describe('BlockService - getCBLBlockSize', () => {
    it('should return Micro for small data lengths', () => {
      expect(BlockService.getCBLBlockSize(2300n)).toBe(BlockSize.Micro);
    });

    it('should return Message for slightly larger data lengths', () => {
      expect(BlockService.getCBLBlockSize(12700n)).toBe(BlockSize.Message);
    });

    it('should return Tiny for slightly larger data lengths', () => {
      expect(BlockService.getCBLBlockSize(58300n)).toBe(BlockSize.Tiny);
    });

    it('should return Small for slightly larger data lengths', () => {
      expect(BlockService.getCBLBlockSize(1019800n)).toBe(BlockSize.Small);
    });

    it('should return Medium for slightly larger data lengths', () => {
      expect(BlockService.getCBLBlockSize(68712136600n)).toBe(BlockSize.Medium);
    });

    it('should return Large for slightly larger data lengths', () => {
      expect(BlockService.getCBLBlockSize(281474506948500n)).toBe(BlockSize.Large);
    });

    it('should return Unknown for extremely large data lengths', () => {
      expect(BlockService.getCBLBlockSize(BigInt("281474506948609"))).toBe(BlockSize.Unknown);
    });

    it('should return Unknown for negative data length', () => {
      expect(BlockService.getCBLBlockSize(BigInt(-100))).toBe(BlockSize.Unknown);
    });
  });
  describe('BlockService - getBlockSizeForDataLength', () => {
    it('should return the correct block size for micro data lengths', () => {
      expect(BlockService.getBlockSizeForDataLength(100n)).toBe(BlockSize.Micro);
    });

    it('should return the correct block size for message data lengths', () => {
      expect(BlockService.getBlockSizeForDataLength(400n)).toBe(BlockSize.Message);
    });

    it('should return the correct block size for tiny data lengths', () => {
      expect(BlockService.getBlockSizeForDataLength(900n)).toBe(BlockSize.Tiny);
    });

    it('should return the correct block size for small data lengths', () => {
      expect(BlockService.getBlockSizeForDataLength(3900n)).toBe(BlockSize.Small);
    });

    it('should return the correct block size for medium data lengths', () => {
      expect(BlockService.getBlockSizeForDataLength(1048400n)).toBe(BlockSize.Medium);
    });

    it('should return the correct block size for large data lengths', () => {
      expect(BlockService.getBlockSizeForDataLength(67108700n)).toBe(BlockSize.Large);
    });

    it('should return Unknown for data length exceeding maximum limits', () => {
      expect(BlockService.getBlockSizeForDataLength(BigInt("281474506948609"))).toBe(BlockSize.Unknown);
    });

    it('should return Unknown for negative data length', () => {
      expect(BlockService.getBlockSizeForDataLength(BigInt(-50))).toBe(BlockSize.Unknown);
    });
  });

});
