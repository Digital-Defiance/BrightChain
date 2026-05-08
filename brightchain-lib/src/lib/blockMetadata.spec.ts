import { BlockMetadata } from './blockMetadata';
import { BlockDataType } from './enumerations/blockDataType';
import { BlockSize } from './enumerations/blockSize';
import { BlockType } from './enumerations/blockType';
import { BlockValidationErrorType } from './enumerations/blockValidationErrorType';
import { BlockValidationError } from './errors/block';
import { ServiceProvider } from './services/service.provider';
import type { BrightDateTimestamp } from './types/brightDateTimestamp';
import {
  brightDateNow,
  normalizeToBrightDate,
} from './utils/brightDateConversions';
import { RawDataBlock } from './blocks/rawData';

describe('BlockMetadata', () => {
  afterEach(() => {
    ServiceProvider.resetInstance();
  });

  describe('JSON serialization round-trip with numeric dateCreated', () => {
    it('should serialize dateCreated as a number in JSON', () => {
      const knownDate: BrightDateTimestamp = 9296.9375; // a known BrightDateValue
      const metadata = new BlockMetadata(
        BlockSize.Small,
        BlockType.RawData,
        BlockDataType.RawData,
        100,
        knownDate,
      );

      const json = metadata.toJson();
      const parsed = JSON.parse(json);

      expect(typeof parsed.dateCreated).toBe('number');
      expect(parsed.dateCreated).toBe(knownDate);
    });

    it('should round-trip dateCreated exactly via toJson/fromJson', () => {
      const knownDate: BrightDateTimestamp = 9296.9375;
      const metadata = new BlockMetadata(
        BlockSize.Small,
        BlockType.RawData,
        BlockDataType.RawData,
        100,
        knownDate,
      );

      const json = metadata.toJson();
      const restored = BlockMetadata.fromJson(json);

      expect(restored.dateCreated).toBe(knownDate);
      expect(restored.size).toBe(BlockSize.Small);
      expect(restored.type).toBe(BlockType.RawData);
      expect(restored.dataType).toBe(BlockDataType.RawData);
      expect(restored.lengthWithoutPadding).toBe(100);
    });

    it('should handle legacy ISO string dateCreated via normalizeToBrightDate fallback', () => {
      // Simulate a legacy JSON payload where dateCreated is an ISO string
      const isoString = '2025-06-15T12:00:00.000Z';
      const expectedBrightDate = normalizeToBrightDate(isoString);

      const legacyJson = JSON.stringify({
        size: BlockSize.Small,
        type: BlockType.RawData,
        dataType: BlockDataType.RawData,
        lengthWithoutPadding: 100,
        dateCreated: isoString,
      });

      const restored = BlockMetadata.fromJson(legacyJson);

      expect(typeof restored.dateCreated).toBe('number');
      // Should be within 1 microday of the expected value
      expect(Math.abs(restored.dateCreated - expectedBrightDate)).toBeLessThan(
        0.000001,
      );
    });

    it('should not serialize dateCreated as a Date object or string', () => {
      const knownDate: BrightDateTimestamp = 9300.5;
      const metadata = new BlockMetadata(
        BlockSize.Small,
        BlockType.RawData,
        BlockDataType.RawData,
        50,
        knownDate,
      );

      const json = metadata.toJson();
      const parsed = JSON.parse(json);

      // Must not be a string representation
      expect(typeof parsed.dateCreated).not.toBe('string');
      // Must not be an object (Date serializes as string, but guard against object wrappers)
      expect(typeof parsed.dateCreated).not.toBe('object');
      // Must be the exact numeric value
      expect(parsed.dateCreated).toStrictEqual(knownDate);
    });
  });
});

describe('BaseBlock (via RawDataBlock) future-date validation using BrightDate numeric comparison', () => {
  beforeEach(() => {
    ServiceProvider.getInstance();
  });

  afterEach(() => {
    ServiceProvider.resetInstance();
  });

  it('should throw BlockValidationError with FutureCreationDate when dateCreated is in the future', () => {
    const futureDate: BrightDateTimestamp = brightDateNow() + 1; // 1 day in the future
    const data = new Uint8Array(16);
    crypto.getRandomValues(data);

    expect(() => {
      new RawDataBlock(BlockSize.Small, data, futureDate);
    }).toThrowType(
      BlockValidationError,
      (error: BlockValidationError) => {
        expect(error.type).toBe(BlockValidationErrorType.FutureCreationDate);
      },
    );
  });

  it('should succeed when dateCreated is in the past', () => {
    const pastDate: BrightDateTimestamp = brightDateNow() - 1; // 1 day in the past
    const data = new Uint8Array(16);
    crypto.getRandomValues(data);

    expect(() => {
      new RawDataBlock(BlockSize.Small, data, pastDate);
    }).not.toThrow();
  });

  it('should store the past dateCreated value correctly on the block', () => {
    const pastDate: BrightDateTimestamp = brightDateNow() - 1;
    const data = new Uint8Array(16);
    crypto.getRandomValues(data);

    const block = new RawDataBlock(BlockSize.Small, data, pastDate);

    expect(block.dateCreated).toBe(pastDate);
  });

  it('should use numeric comparison for future-date check (not Date object comparison)', () => {
    // A value just barely in the past should succeed
    const justPast: BrightDateTimestamp = brightDateNow() - 0.0001;
    const data = new Uint8Array(16);
    crypto.getRandomValues(data);

    expect(() => {
      new RawDataBlock(BlockSize.Small, data, justPast);
    }).not.toThrow();

    // A value just barely in the future should fail
    const justFuture: BrightDateTimestamp = brightDateNow() + 0.0001;
    const data2 = new Uint8Array(16);
    crypto.getRandomValues(data2);

    expect(() => {
      new RawDataBlock(BlockSize.Small, data2, justFuture);
    }).toThrowType(
      BlockValidationError,
      (error: BlockValidationError) => {
        expect(error.type).toBe(BlockValidationErrorType.FutureCreationDate);
      },
    );
  });
});
