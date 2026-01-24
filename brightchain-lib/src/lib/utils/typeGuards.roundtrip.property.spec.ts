import fc from 'fast-check';
import { BlockMetadata } from '../blockMetadata';
import { EphemeralBlockMetadata } from '../ephemeralBlockMetadata';
import { BlockSize, validBlockSizes } from '../enumerations/blockSize';
import BlockType from '../enumerations/blockType';
import BlockDataType from '../enumerations/blockDataType';
import { Member, MemberType, EmailString, IMemberWithMnemonic, uint8ArrayToHex } from '@digitaldefiance/ecies-lib';
import { ServiceProvider } from '../services/service.provider';
import { initializeTestServices } from '../test/service.initializer.helper';

/**
 * Property-based tests for metadata round-trip serialization
 * Feature: block-security-hardening
 * Validates Requirements 4.1, 4.2
 */

/**
 * Arbitrary for valid BlockSize values
 */
const arbBlockSize = fc.constantFrom(...validBlockSizes);

/**
 * Arbitrary for valid BlockType values (excluding Unknown)
 * BlockType.Unknown (-1) represents uninitialized/invalid blocks and should not be used in metadata
 */
const arbBlockType = fc.constantFrom(
  ...Object.values(BlockType).filter((v) => typeof v === 'number' && v !== BlockType.Unknown),
);

/**
 * Arbitrary for valid BlockDataType values
 */
const arbBlockDataType = fc.constantFrom(
  ...Object.values(BlockDataType).filter((v) => typeof v === 'number'),
);

/**
 * Arbitrary for valid dates (constrained to avoid Invalid Date errors)
 * Filter out NaN dates
 */
const arbDate = fc
  .date({ min: new Date('1970-01-01'), max: new Date('2099-12-31') })
  .filter((d) => !isNaN(d.getTime()));

describe('Feature: block-security-hardening, Property 6: Block Metadata Round-Trip', () => {
  // Shared test data
  let testCreator: IMemberWithMnemonic;

  beforeAll(() => {
    initializeTestServices();
    const eciesService = ServiceProvider.getInstance().eciesService;
    testCreator = Member.newMember(
      eciesService,
      MemberType.User,
      'Test User',
      new EmailString('test@example.com'),
    );
  });

  afterEach(() => {
    ServiceProvider.resetInstance();
  });

  /**
   * Property 6a: BlockMetadata round-trip preserves all fields
   * For any valid BlockMetadata, serializing to JSON and deserializing should produce
   * an equivalent object with matching fields.
   *
   * Validates Requirements 4.1, 4.2
   */
  it('Property 6a: BlockMetadata round-trip preserves all fields', () => {
    fc.assert(
      fc.property(
        arbBlockSize,
        arbBlockType,
        arbBlockDataType,
        fc.nat(),
        arbDate,
        (size, type, dataType, lengthWithoutPadding, dateCreated) => {
          // Create original metadata
          const original = new BlockMetadata(
            size,
            type,
            dataType,
            lengthWithoutPadding,
            dateCreated,
          );

          // Serialize to JSON
          const json = original.toJson();

          // Deserialize from JSON
          const parsed = BlockMetadata.fromJson(json);

          // Verify all fields match
          expect(parsed.size).toBe(original.size);
          expect(parsed.type).toBe(original.type);
          expect(parsed.dataType).toBe(original.dataType);
          expect(parsed.lengthWithoutPadding).toBe(original.lengthWithoutPadding);
          
          // Date comparison - allow for serialization precision loss
          const originalTime = new Date(original.dateCreated).getTime();
          const parsedTime = new Date(parsed.dateCreated).getTime();
          expect(Math.abs(originalTime - parsedTime)).toBeLessThanOrEqual(1000); // Within 1 second
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 6b: BlockMetadata double round-trip is idempotent
   * For any valid BlockMetadata, serializing twice should produce the same result.
   *
   * Validates Requirements 4.1, 4.2
   */
  it('Property 6b: BlockMetadata double round-trip is idempotent', () => {
    fc.assert(
      fc.property(
        arbBlockSize,
        arbBlockType,
        arbBlockDataType,
        fc.nat(),
        arbDate,
        (size, type, dataType, lengthWithoutPadding, dateCreated) => {
          // Create original metadata
          const original = new BlockMetadata(
            size,
            type,
            dataType,
            lengthWithoutPadding,
            dateCreated,
          );

          // First round-trip
          const json1 = original.toJson();
          const parsed1 = BlockMetadata.fromJson(json1);

          // Second round-trip
          const json2 = parsed1.toJson();
          const parsed2 = BlockMetadata.fromJson(json2);

          // Verify both parsed objects are equivalent
          expect(parsed2.size).toBe(parsed1.size);
          expect(parsed2.type).toBe(parsed1.type);
          expect(parsed2.dataType).toBe(parsed1.dataType);
          expect(parsed2.lengthWithoutPadding).toBe(parsed1.lengthWithoutPadding);
          
          // Date comparison
          const parsed1Time = new Date(parsed1.dateCreated).getTime();
          const parsed2Time = new Date(parsed2.dateCreated).getTime();
          expect(Math.abs(parsed1Time - parsed2Time)).toBeLessThanOrEqual(1000);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 6c: EphemeralBlockMetadata round-trip preserves all fields including creator
   * For any valid EphemeralBlockMetadata, serializing to JSON and deserializing should
   * produce an equivalent object with matching fields including creator.
   *
   * Validates Requirements 4.1, 4.2
   */
  it('Property 6c: EphemeralBlockMetadata round-trip preserves all fields', () => {
    fc.assert(
      fc.property(
        arbBlockSize,
        arbBlockType,
        arbBlockDataType,
        fc.nat(),
        arbDate,
        (size, type, dataType, lengthWithoutPadding, dateCreated) => {
          // Use the test creator
          const creator = testCreator.member;

          // Create original metadata
          const original = new EphemeralBlockMetadata(
            size,
            type,
            dataType,
            lengthWithoutPadding,
            creator,
            dateCreated,
          );

          // Serialize to JSON
          const json = original.toJson();

          // Deserialize from JSON
          const parsed = EphemeralBlockMetadata.fromJson(json);

          // Verify all fields match
          expect(parsed.size).toBe(original.size);
          expect(parsed.type).toBe(original.type);
          expect(parsed.dataType).toBe(original.dataType);
          expect(parsed.lengthWithoutPadding).toBe(original.lengthWithoutPadding);
          
          // Verify creator ID matches using hex comparison
          expect(uint8ArrayToHex(parsed.creator.idBytes)).toBe(
            uint8ArrayToHex(original.creator.idBytes)
          );
          
          // Date comparison
          const originalTime = new Date(original.dateCreated).getTime();
          const parsedTime = new Date(parsed.dateCreated).getTime();
          expect(Math.abs(originalTime - parsedTime)).toBeLessThanOrEqual(1000);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 6d: EphemeralBlockMetadata double round-trip is idempotent
   * For any valid EphemeralBlockMetadata, serializing twice should produce the same result.
   *
   * Validates Requirements 4.1, 4.2
   */
  it('Property 6d: EphemeralBlockMetadata double round-trip is idempotent', () => {
    fc.assert(
      fc.property(
        arbBlockSize,
        arbBlockType,
        arbBlockDataType,
        fc.nat(),
        arbDate,
        (size, type, dataType, lengthWithoutPadding, dateCreated) => {
          // Use the test creator
          const creator = testCreator.member;

          // Create original metadata
          const original = new EphemeralBlockMetadata(
            size,
            type,
            dataType,
            lengthWithoutPadding,
            creator,
            dateCreated,
          );

          // First round-trip
          const json1 = original.toJson();
          const parsed1 = EphemeralBlockMetadata.fromJson(json1);

          // Second round-trip
          const json2 = parsed1.toJson();
          const parsed2 = EphemeralBlockMetadata.fromJson(json2);

          // Verify both parsed objects are equivalent
          expect(parsed2.size).toBe(parsed1.size);
          expect(parsed2.type).toBe(parsed1.type);
          expect(parsed2.dataType).toBe(parsed1.dataType);
          expect(parsed2.lengthWithoutPadding).toBe(parsed1.lengthWithoutPadding);
          
          // Verify creator IDs match using hex comparison
          expect(uint8ArrayToHex(parsed2.creator.idBytes)).toBe(
            uint8ArrayToHex(parsed1.creator.idBytes)
          );
          
          // Date comparison
          const parsed1Time = new Date(parsed1.dateCreated).getTime();
          const parsed2Time = new Date(parsed2.dateCreated).getTime();
          expect(Math.abs(parsed1Time - parsed2Time)).toBeLessThanOrEqual(1000);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 6e: JSON serialization is deterministic for same metadata
   * For any valid BlockMetadata, calling toJson() multiple times should produce
   * the same JSON string (except for date which may vary slightly).
   *
   * Validates Requirements 4.1, 4.2
   */
  it('Property 6e: JSON serialization is deterministic', () => {
    fc.assert(
      fc.property(
        arbBlockSize,
        arbBlockType,
        arbBlockDataType,
        fc.nat(),
        arbDate,
        (size, type, dataType, lengthWithoutPadding, dateCreated) => {
          // Create metadata
          const metadata = new BlockMetadata(
            size,
            type,
            dataType,
            lengthWithoutPadding,
            dateCreated,
          );

          // Serialize multiple times
          const json1 = metadata.toJson();
          const json2 = metadata.toJson();

          // Parse both
          const parsed1 = JSON.parse(json1);
          const parsed2 = JSON.parse(json2);

          // Verify all fields are identical
          expect(parsed2.size).toBe(parsed1.size);
          expect(parsed2.type).toBe(parsed1.type);
          expect(parsed2.dataType).toBe(parsed1.dataType);
          expect(parsed2.lengthWithoutPadding).toBe(parsed1.lengthWithoutPadding);
          expect(parsed2.dateCreated).toEqual(parsed1.dateCreated);
        },
      ),
      { numRuns: 100 },
    );
  });
});
