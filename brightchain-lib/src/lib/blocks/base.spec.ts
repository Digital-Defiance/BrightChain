import { randomBytes } from 'crypto';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { ChecksumBuffer } from '../types';
import { BaseBlock } from './base';

// Mock classes for testing abstract methods
// Simulate a derived class with file I/O (Error Handling)
class FileBasedBlock extends BaseBlock {
  private filePath: string;
  private _data: Buffer | null = null; // Data loaded on demand
  private _validated = false; // Initially not validated

  constructor(
    type: BlockType,
    blockDataType: BlockDataType,
    blockSize: BlockSize,
    checksum: ChecksumBuffer,
    filePath: string,
    canRead = true,
    canPersist = true,
  ) {
    super(type, blockDataType, blockSize, checksum, canRead, canPersist);
    this.filePath = filePath;
  }

  public override get data(): Buffer {
    if (this._data === null) {
      // Simulate file loading – replace with actual file operations
      try {
        this._data = this.loadFromFile(this.filePath);
        this._validated = this.validate();
      } catch (error) {
        //Handle the error appropriately in a production setting
        throw new Error(`Failed to load data from file: ${error}`);
      }
    }
    return this._data;
  }

  public override get validated(): boolean {
    return this._validated;
  }

  private loadFromFile(path: string): Buffer {
    // Simulate file loading – replace with actual file system interaction
    if (path === 'error') {
      throw new Error('Simulated file load error');
    }
    return randomBytes(this.blockSize as number);
  }

  private validate(): boolean {
    //Simulate validation
    return true;
  }

  public override get overhead(): number {
    return 0;
  }
}

describe('FileBasedBlock', () => {
  it('should handle file loading errors in derived class', () => {
    const blockSize = BlockSize.Small;
    const checksum = randomBytes(
      StaticHelpersChecksum.Sha3ChecksumBufferLength,
    ) as ChecksumBuffer;
    const block = new FileBasedBlock(
      BlockType.Random,
      BlockDataType.RawData,
      blockSize,
      checksum,
      'error',
    );
    expect(() => block.data).toThrow(
      'Failed to load data from file: Error: Simulated file load error',
    );
  });
});

class MemoryBasedBlock extends BaseBlock {
  private _data: Buffer;
  private _validated: boolean;
  private _overhead: number;

  constructor(
    type: BlockType,
    blockDataType: BlockDataType,
    blockSize: BlockSize,
    data: Buffer,
    precalculatedChecksum?: ChecksumBuffer,
    canRead = true,
    canPersist = true,
    overhead = 0,
  ) {
    const calculatedChecksum = StaticHelpersChecksum.calculateChecksum(data);
    const checksum = precalculatedChecksum ?? calculatedChecksum;
    super(type, blockDataType, blockSize, checksum, canRead, canPersist);
    this._data = data;
    this._validated =
      (precalculatedChecksum !== undefined &&
        this.idChecksum.equals(calculatedChecksum)) ||
      precalculatedChecksum === undefined;
    this._overhead = overhead;
  }

  public override get data(): Buffer {
    return this._data;
  }

  public override get validated(): boolean {
    return this._validated;
  }

  public override get overhead(): number {
    return this._overhead;
  }
}

describe('MemoryBaseBlock', () => {
  it('should construct correctly', () => {
    const blockSize = BlockSize.Small;
    const blockType = BlockType.Random;
    const blockDataType = BlockDataType.RawData;
    const data = randomBytes(blockSize as number);
    const precalculatedChecksum = StaticHelpersChecksum.calculateChecksum(data);

    const block = new MemoryBasedBlock(
      blockType,
      blockDataType,
      blockSize,
      data,
      precalculatedChecksum,
    );

    expect(block.blockSize).toBe(blockSize);
    expect(block.blockType).toBe(blockType);
    expect(block.blockDataType).toBe(blockDataType);
    expect(block.data).toBe(data);
    expect(block.idChecksum).toBe(precalculatedChecksum);
    expect(block.checksumString).toBe(
      StaticHelpersChecksum.checksumBufferToChecksumString(
        precalculatedChecksum,
      ),
    );
    expect(block.payload).toEqual(data);
    expect(block.validated).toBe(true);
    expect(block.canRead).toBe(true);
    expect(block.canPersist).toBe(true);
    expect(block.overhead).toBe(0);
    expect(block.capacity).toBe(blockSize as number);
    expect(block.layerOverheadData.length).toBe(0);
  });

  it('should set validated to false if checksum does not match', () => {
    const blockSize = BlockSize.Small;
    const blockType = BlockType.Random;
    const blockDataType = BlockDataType.RawData;
    const data = randomBytes(blockSize as number);
    const wrongChecksum = randomBytes(
      StaticHelpersChecksum.Sha3ChecksumBufferLength,
    ) as ChecksumBuffer;

    const block = new MemoryBasedBlock(
      blockType,
      blockDataType,
      blockSize,
      data,
      wrongChecksum,
    );

    expect(block.validated).toBe(false);
  });

  it('checksumString should return the correct checksum string', () => {
    const blockSize = BlockSize.Small;
    const blockType = BlockType.Random;
    const blockDataType = BlockDataType.RawData;
    const data = randomBytes(blockSize as number);
    const checksum = StaticHelpersChecksum.calculateChecksum(data);
    const expectedChecksumString =
      StaticHelpersChecksum.checksumBufferToChecksumString(checksum);

    const block = new MemoryBasedBlock(
      blockType,
      blockDataType,
      blockSize,
      data,
      checksum,
    );
    expect(block.checksumString).toBe(expectedChecksumString);
  });

  it('payload should return the correct payload', () => {
    const blockSize = BlockSize.Small;
    const blockType = BlockType.Random;
    const blockDataType = BlockDataType.RawData;
    const data = randomBytes(blockSize as number);
    const checksum = StaticHelpersChecksum.calculateChecksum(data);

    const block = new MemoryBasedBlock(
      blockType,
      blockDataType,
      blockSize,
      data,
      checksum,
    );

    expect(block.payload).toEqual(data); // BaseBlock payload is the same as data
  });

  it('layerOverheadData should be an empty buffer', () => {
    const blockSize = BlockSize.Small;
    const blockType = BlockType.Random;
    const blockDataType = BlockDataType.RawData;
    const data = randomBytes(blockSize as number);

    const block = new MemoryBasedBlock(
      blockType,
      blockDataType,
      blockSize,
      data,
    );
    expect(block.layerOverheadData).toEqual(Buffer.alloc(0));
  });

  // Add tests for canRead and canPersist - these are simple getters in BaseBlock
  // but might have more complex logic in derived classes.

  it('should have canRead as specified in constructor', () => {
    const block1 = new MemoryBasedBlock(
      BlockType.Random,
      BlockDataType.RawData,
      BlockSize.Small,
      randomBytes(BlockSize.Small as number),
      undefined,
      true,
    );
    expect(block1.canRead).toBe(true);

    const block2 = new MemoryBasedBlock(
      BlockType.Random,
      BlockDataType.RawData,
      BlockSize.Small,
      randomBytes(BlockSize.Small as number),
      undefined,
      false,
    );
    expect(block2.canRead).toBe(false);
  });

  it('should have canPersist as specified in constructor', () => {
    const block1 = new MemoryBasedBlock(
      BlockType.Random,
      BlockDataType.RawData,
      BlockSize.Small,
      randomBytes(BlockSize.Small as number),
      undefined,
      true,
      true,
    );
    expect(block1.canPersist).toBe(true);

    const block2 = new MemoryBasedBlock(
      BlockType.Random,
      BlockDataType.RawData,
      BlockSize.Small,
      randomBytes(BlockSize.Small as number),
      undefined,
      true,
      false,
    );
    expect(block2.canPersist).toBe(false);
  });

  it('layerOverheadData should return the correct overhead data', () => {
    const blockSize = BlockSize.Small;
    const blockType = BlockType.Random;
    const blockDataType = BlockDataType.RawData;
    const data = Buffer.alloc(blockSize as number, 0); // Filled with zeros for easier comparison
    const overheadSize = 10;
    const overheadData = Buffer.alloc(overheadSize, 1); // Filled with ones
    const fullData = Buffer.concat([overheadData, data]);

    const block = new MemoryBasedBlock(
      blockType,
      blockDataType,
      blockSize,
      fullData,
      undefined,
      true,
      true,
      overheadSize,
    );
    expect(block.layerOverheadData).toEqual(overheadData);
    expect(block.payload).toEqual(data);
    expect(block.capacity).toBe((blockSize as number) - overheadSize);
  });

  it('should handle zero overhead correctly', () => {
    const blockSize = BlockSize.Small;
    const blockType = BlockType.Random;
    const blockDataType = BlockDataType.RawData;
    const data = randomBytes(blockSize as number);

    const block = new MemoryBasedBlock(
      blockType,
      blockDataType,
      blockSize,
      data,
    );
    expect(block.layerOverheadData).toEqual(Buffer.alloc(0));
    expect(block.capacity).toBe(blockSize as number);
  });

  it('should handle non-zero overhead correctly', () => {
    const blockSize = BlockSize.Small;
    const blockType = BlockType.Random;
    const blockDataType = BlockDataType.RawData;
    const data = Buffer.alloc((blockSize as number) - 10, 0);
    const overhead = 10;

    const block = new MemoryBasedBlock(
      blockType,
      blockDataType,
      blockSize,
      Buffer.concat([Buffer.alloc(overhead, 1), data]),
      undefined,
      true,
      true,
      overhead,
    );
    expect(block.layerOverheadData.length).toBe(overhead);
    expect(block.capacity).toBe((blockSize as number) - overhead);
  });

  it('should have canRead and canPersist as specified in constructor', () => {
    //This test now covers all four combinations of canRead and canPersist
    const combinations = [
      [true, true],
      [true, false],
      [false, true],
      [false, false],
    ];

    combinations.forEach(([canRead, canPersist]) => {
      const block = new MemoryBasedBlock(
        BlockType.Random,
        BlockDataType.RawData,
        BlockSize.Small,
        randomBytes(BlockSize.Small as number),
        undefined,
        canRead,
        canPersist,
      );
      expect(block.canRead).toBe(canRead);
      expect(block.canPersist).toBe(canPersist);
    });
  });

  it('should handle different data sources correctly in derived classes', () => {
    const data = randomBytes(BlockSize.Small as number);
    const checksum = StaticHelpersChecksum.calculateChecksum(data);
    const block = new MemoryBasedBlock(
      BlockType.Random,
      BlockDataType.RawData,
      BlockSize.Small,
      data,
      checksum,
    );
    expect(block.data).toEqual(data);
  });

  it('should handle different validation logic in derived classes', () => {
    const data = randomBytes(BlockSize.Small as number);
    const checksum = randomBytes(
      StaticHelpersChecksum.Sha3ChecksumBufferLength,
    ) as ChecksumBuffer;
    const block = new MemoryBasedBlock(
      BlockType.Random,
      BlockDataType.RawData,
      BlockSize.Small,
      data,
      checksum,
      false,
    );
    expect(block.validated).toBe(false);
  });

  it('should handle various block sizes in derived classes - DEBUGGING', () => {
    const sizes = [BlockSize.Small, BlockSize.Medium, BlockSize.Large];
    sizes.forEach((size) => {
      const data = randomBytes(size as number);
      const checksum = StaticHelpersChecksum.calculateChecksum(data);
      const block = new MemoryBasedBlock(
        BlockType.Random,
        BlockDataType.RawData,
        size,
        data,
        checksum,
      );
      expect(block.data.length).toBe(size as number);
    });
  });
});
