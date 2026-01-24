/**
 * Property-Based Tests for Block Format Detection Service
 *
 * These tests validate universal properties of the block format detection
 * and structured header format using fast-check for property-based testing.
 *
 * @module services/blockFormatService.property.spec
 */

import { CrcService, ECIES } from '@digitaldefiance/ecies-lib';
import * as fc from 'fast-check';
import { BLOCK_HEADER, StructuredBlockType } from '../constants';
import { detectBlockFormat } from './blockFormatService';

/**
 * Signature size (ECDSA)
 */
const SIGNATURE_SIZE = 64;

/**
 * Header content sizes for different block types (excluding 4-byte prefix and 64-byte signature)
 *
 * CBL: CreatorId(16) + DateCreated(8) + AddressCount(4) + TupleSize(1) +
 *      OriginalDataLength(8) + OriginalChecksum(64) + IsExtendedHeader(1) = 102 bytes
 *
 * SuperCBL: CreatorId(16) + DateCreated(8) + SubCblCount(4) + TotalBlockCount(4) +
 *           Depth(2) + OriginalDataLength(8) + OriginalChecksum(64) = 106 bytes
 *
 * ExtendedCBL and MessageCBL have variable-length fields, so we create properly
 * structured headers with zero-length variable fields for testing.
 */

// Base content size (without IsExtendedHeader flag)
const BASE_CONTENT_SIZE = 16 + 8 + 4 + 1 + 8 + 64; // 101 bytes

// CBL content: base + IsExtendedHeader(1) = 102 bytes
const CBL_CONTENT_SIZE = BASE_CONTENT_SIZE + 1;

// SuperCBL content: CreatorId(16) + DateCreated(8) + SubCblCount(4) + TotalBlockCount(4) + Depth(2) + OriginalDataLength(8) + OriginalChecksum(64) = 106 bytes
const SUPER_CBL_CONTENT_SIZE = 16 + 8 + 4 + 4 + 2 + 8 + 64;

// ExtendedCBL content: base + IsExtendedHeader(1) + FileNameLength(2) + MimeTypeLength(1) = 105 bytes (with empty strings)
const EXTENDED_CBL_CONTENT_SIZE = BASE_CONTENT_SIZE + 1 + 2 + 1;

// MessageCBL content: base + IsMessage(1) + MessageTypeLength(2) + SenderIdLength(2) + RecipientCount(2) + Priority(1) + EncryptionSchemeLength(1) = 110 bytes (with empty strings)
const MESSAGE_CBL_CONTENT_SIZE = BASE_CONTENT_SIZE + 1 + 2 + 2 + 2 + 1 + 1;

/**
 * Get content size for a block type
 */
function getContentSize(blockType: StructuredBlockType): number {
  switch (blockType) {
    case StructuredBlockType.CBL:
      return CBL_CONTENT_SIZE;
    case StructuredBlockType.SuperCBL:
      return SUPER_CBL_CONTENT_SIZE;
    case StructuredBlockType.ExtendedCBL:
      return EXTENDED_CBL_CONTENT_SIZE;
    case StructuredBlockType.MessageCBL:
      return MESSAGE_CBL_CONTENT_SIZE;
    default:
      return CBL_CONTENT_SIZE;
  }
}

/**
 * Get the total header size for a block type (prefix + content + signature)
 */
function getTotalHeaderSize(blockType: StructuredBlockType): number {
  return 4 + getContentSize(blockType) + SIGNATURE_SIZE;
}

/**
 * Helper to create a valid structured header with correct CRC8 for any block type
 *
 * The header structure is:
 * [MagicPrefix(1)][BlockType(1)][Version(1)][CRC8(1)][Content(variable)][Signature(64)]
 *
 * CRC8 is computed over the content (variable bytes), NOT including the signature.
 *
 * For ExtendedCBL and MessageCBL, we create properly structured headers with
 * zero-length variable fields so the parser can correctly determine the header end.
 */
function createValidStructuredHeader(
  blockType: StructuredBlockType,
  randomBytes: Uint8Array,
  signatureBytes: Uint8Array,
): Uint8Array {
  const contentSize = getContentSize(blockType);

  // Create content buffer
  const content = new Uint8Array(contentSize);

  // Fill with random bytes for the base fields (first 101 bytes)
  content.set(
    randomBytes.subarray(0, Math.min(randomBytes.length, BASE_CONTENT_SIZE)),
  );

  // Set up type-specific fields
  switch (blockType) {
    case StructuredBlockType.CBL:
      // IsExtendedHeader = 0 (not extended)
      content[BASE_CONTENT_SIZE] = 0;
      break;

    case StructuredBlockType.SuperCBL:
      // SuperCBL has different structure, just use random bytes
      // The content is already filled with random bytes
      break;

    case StructuredBlockType.ExtendedCBL:
      // IsExtendedHeader = 1
      content[BASE_CONTENT_SIZE] = 1;
      // FileNameLength = 0 (2 bytes, big-endian)
      content[BASE_CONTENT_SIZE + 1] = 0;
      content[BASE_CONTENT_SIZE + 2] = 0;
      // MimeTypeLength = 0 (1 byte)
      content[BASE_CONTENT_SIZE + 3] = 0;
      break;

    case StructuredBlockType.MessageCBL:
      // IsMessage = 2
      content[BASE_CONTENT_SIZE] = 2;
      // MessageTypeLength = 0 (2 bytes, big-endian)
      content[BASE_CONTENT_SIZE + 1] = 0;
      content[BASE_CONTENT_SIZE + 2] = 0;
      // SenderIdLength = 0 (2 bytes, big-endian)
      content[BASE_CONTENT_SIZE + 3] = 0;
      content[BASE_CONTENT_SIZE + 4] = 0;
      // RecipientCount = 0 (2 bytes, big-endian)
      content[BASE_CONTENT_SIZE + 5] = 0;
      content[BASE_CONTENT_SIZE + 6] = 0;
      // Priority = 0 (1 byte)
      content[BASE_CONTENT_SIZE + 7] = 0;
      // EncryptionSchemeLength = 0 (1 byte)
      content[BASE_CONTENT_SIZE + 8] = 0;
      break;
  }

  // Ensure signature is exactly 64 bytes
  const signature = new Uint8Array(SIGNATURE_SIZE);
  signature.set(
    signatureBytes.subarray(0, Math.min(signatureBytes.length, SIGNATURE_SIZE)),
  );

  // Compute CRC8 over the content (NOT including signature)
  const crcService = new CrcService();
  const crc8Buffer = crcService.crc8(content);
  const crc8 = crc8Buffer[0];

  // Create the full header: prefix(4) + content(variable) + signature(64)
  const totalSize = getTotalHeaderSize(blockType);
  const fullHeader = new Uint8Array(totalSize);
  fullHeader[0] = BLOCK_HEADER.MAGIC_PREFIX;
  fullHeader[1] = blockType;
  fullHeader[2] = BLOCK_HEADER.VERSION;
  fullHeader[3] = crc8;
  fullHeader.set(content, 4);
  fullHeader.set(signature, 4 + contentSize);

  return fullHeader;
}

/**
 * Arbitrary generator for block type with matching content
 */
function blockTypeWithContent(): fc.Arbitrary<{
  blockType: StructuredBlockType;
  randomBytes: Uint8Array;
  signatureBytes: Uint8Array;
}> {
  return fc
    .constantFrom(
      StructuredBlockType.CBL,
      StructuredBlockType.SuperCBL,
      StructuredBlockType.ExtendedCBL,
      StructuredBlockType.MessageCBL,
    )
    .chain((blockType) => {
      return fc.record({
        blockType: fc.constant(blockType),
        // Generate enough random bytes for the base content
        randomBytes: fc.uint8Array({
          minLength: BASE_CONTENT_SIZE,
          maxLength: BASE_CONTENT_SIZE,
        }),
        signatureBytes: fc.uint8Array({
          minLength: SIGNATURE_SIZE,
          maxLength: SIGNATURE_SIZE,
        }),
      });
    });
}

describe('Block Format Detection Service - Property Tests', () => {
  describe('Property 13: Block Magic Byte Detection', () => {
    /**
     * Property 13: Block Magic Byte Detection
     *
     * For any byte array starting with 0xBC, the block parser SHALL attempt
     * to parse it using the universal header format. For any byte array
     * starting with 0x04 (ECIES magic) without 0xBC prefix, the parser SHALL
     * return an "encrypted data" error, not a parsing error.
     *
     * Validates: Requirements 9.1, 9.5, 9.7
     */
    it('should detect structured blocks by 0xBC magic prefix', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            StructuredBlockType.CBL,
            StructuredBlockType.SuperCBL,
            StructuredBlockType.ExtendedCBL,
            StructuredBlockType.MessageCBL,
          ),
          fc.uint8Array({ minLength: 100, maxLength: 200 }),
          (blockType, randomData) => {
            // Create a minimal structured header
            const data = new Uint8Array(randomData.length + 4);
            data[0] = BLOCK_HEADER.MAGIC_PREFIX; // 0xBC
            data[1] = blockType;
            data[2] = BLOCK_HEADER.VERSION;
            data[3] = 0; // CRC8 placeholder
            data.set(randomData, 4);

            const result = detectBlockFormat(data);

            // Should recognize it as a structured block
            expect(result.isStructured).toBe(true);
            expect(result.version).toBe(BLOCK_HEADER.VERSION);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should detect ECIES encrypted data by 0x04 magic byte', () => {
      fc.assert(
        fc.property(
          fc.uint8Array({ minLength: 100, maxLength: 200 }),
          (randomData) => {
            // Create data starting with ECIES magic byte
            const data = new Uint8Array(randomData.length + 1);
            data[0] = ECIES.PUBLIC_KEY_MAGIC; // 0x04
            data.set(randomData, 1);

            const result = detectBlockFormat(data);

            // Should recognize it as encrypted
            expect(result.isEncrypted).toBe(true);
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('encrypted');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should reject data without recognized magic bytes', () => {
      fc.assert(
        fc.property(
          fc
            .uint8Array({ minLength: 4, maxLength: 200 })
            .filter(
              (arr) =>
                arr[0] !== BLOCK_HEADER.MAGIC_PREFIX &&
                arr[0] !== ECIES.PUBLIC_KEY_MAGIC,
            ),
          (data) => {
            const result = detectBlockFormat(data);

            // Should not recognize as structured or encrypted
            expect(result.isStructured).toBeUndefined();
            expect(result.isEncrypted).toBeUndefined();
            expect(result.isValid).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 14: Block Header CRC8 Integrity', () => {
    /**
     * Property 14: Block Header CRC8 Integrity
     *
     * For any valid block header, the stored CRC8 SHALL match the computed
     * CRC8 over the header content (after CRC8 field, excluding signature).
     * For any block with a corrupted header byte, the CRC8 verification
     * SHALL fail.
     *
     * Validates: Requirements 9.4, 9.6, 12.4, 12.5
     */
    it('should validate CRC8 matches computed value for valid headers (all block types)', () => {
      fc.assert(
        fc.property(
          blockTypeWithContent(),
          ({ blockType, randomBytes, signatureBytes }) => {
            const data = createValidStructuredHeader(
              blockType,
              randomBytes,
              signatureBytes,
            );
            const result = detectBlockFormat(data);

            // Should validate successfully
            expect(result.isValid).toBe(true);
            expect(result.isStructured).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should detect CRC8 mismatch for corrupted headers (all block types)', () => {
      fc.assert(
        fc.property(
          blockTypeWithContent(),
          ({ blockType, randomBytes, signatureBytes }) => {
            const data = createValidStructuredHeader(
              blockType,
              randomBytes,
              signatureBytes,
            );

            // Corrupt the CRC8 by incrementing it
            const correctCrc8 = data[3];
            data[3] = (correctCrc8 + 1) % 256;

            const result = detectBlockFormat(data);

            // Should detect CRC8 mismatch
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('CRC8 mismatch');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should detect corruption in any header byte (all block types)', () => {
      fc.assert(
        fc.property(
          blockTypeWithContent(),
          fc.integer({ min: 0, max: BASE_CONTENT_SIZE - 1 }), // Corrupt a byte in the base content region
          ({ blockType, randomBytes, signatureBytes }, corruptIndex) => {
            const data = createValidStructuredHeader(
              blockType,
              randomBytes,
              signatureBytes,
            );

            // Corrupt a byte in the header content (after prefix, before signature)
            // The content starts at offset 4, so we corrupt at offset 4 + corruptIndex
            const corruptByteIndex = 4 + corruptIndex;
            data[corruptByteIndex] = (data[corruptByteIndex] + 1) % 256;

            const result = detectBlockFormat(data);

            // Should detect corruption via CRC8 mismatch
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('CRC8 mismatch');
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 15: Block Header Version Round-Trip', () => {
    /**
     * Property 15: Block Header Version Round-Trip
     *
     * For any block created with the universal header format, serializing
     * and deserializing SHALL preserve the magic prefix (0xBC), block type
     * byte, version byte, and CRC8 value.
     *
     * Validates: Requirements 9.2, 9.3, 10.2
     */
    it('should preserve magic prefix, block type, and version through round-trip (all block types)', () => {
      fc.assert(
        fc.property(
          blockTypeWithContent(),
          ({ blockType, randomBytes, signatureBytes }) => {
            // Create a valid structured header
            const data = createValidStructuredHeader(
              blockType,
              randomBytes,
              signatureBytes,
            );

            // Parse the header
            const result = detectBlockFormat(data);

            // Verify all fields are preserved
            expect(data[0]).toBe(BLOCK_HEADER.MAGIC_PREFIX);
            expect(data[1]).toBe(blockType);
            expect(data[2]).toBe(BLOCK_HEADER.VERSION);
            expect(result.version).toBe(BLOCK_HEADER.VERSION);
            expect(result.isStructured).toBe(true);
            expect(result.isValid).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should reject blocks with unsupported version numbers (all block types)', () => {
      fc.assert(
        fc.property(
          blockTypeWithContent(),
          fc.integer({ min: 2, max: 255 }), // Unsupported version (current is 0x01)
          ({ blockType, randomBytes, signatureBytes }, unsupportedVersion) => {
            // Create a valid structured header first
            const data = createValidStructuredHeader(
              blockType,
              randomBytes,
              signatureBytes,
            );

            // Override the version with an unsupported one
            data[2] = unsupportedVersion;

            const result = detectBlockFormat(data);

            // Should fail to determine header size for unsupported version
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('Cannot determine header size');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should reject blocks with invalid block type values', () => {
      fc.assert(
        fc.property(
          fc
            .integer({ min: 0, max: 255 })
            .filter(
              (val) =>
                val !== StructuredBlockType.CBL &&
                val !== StructuredBlockType.SuperCBL &&
                val !== StructuredBlockType.ExtendedCBL &&
                val !== StructuredBlockType.MessageCBL,
            ),
          fc.uint8Array({ minLength: 102, maxLength: 102 }), // Use CBL content size
          fc.uint8Array({
            minLength: SIGNATURE_SIZE,
            maxLength: SIGNATURE_SIZE,
          }),
          (invalidBlockType, contentBytes, signatureBytes) => {
            // Create a header with invalid block type
            const contentSize = 102; // Use CBL content size
            const content = new Uint8Array(contentSize);
            content.set(
              contentBytes.subarray(
                0,
                Math.min(contentBytes.length, contentSize),
              ),
            );

            const signature = new Uint8Array(SIGNATURE_SIZE);
            signature.set(
              signatureBytes.subarray(
                0,
                Math.min(signatureBytes.length, SIGNATURE_SIZE),
              ),
            );

            // Compute CRC8 over the content
            const crcService = new CrcService();
            const crc8Buffer = crcService.crc8(content);
            const crc8 = crc8Buffer[0];

            // Create the header with invalid block type
            const totalSize = 4 + contentSize + SIGNATURE_SIZE;
            const data = new Uint8Array(totalSize);
            data[0] = BLOCK_HEADER.MAGIC_PREFIX;
            data[1] = invalidBlockType;
            data[2] = BLOCK_HEADER.VERSION;
            data[3] = crc8;
            data.set(content, 4);
            data.set(signature, 4 + contentSize);

            const result = detectBlockFormat(data);

            // Should reject invalid block type
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('Invalid structured block type');
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 16: Encrypted Block Detection', () => {
    /**
     * Property 16: Encrypted Block Detection
     *
     * When a structured block is encrypted with ECIES, the entire block
     * (including the 0xBC header) gets encrypted, and the result starts
     * with 0x04 (ECIES public key magic byte). The format detector SHALL
     * correctly identify such data as encrypted and instruct the user to
     * decrypt before parsing.
     *
     * Validates: Requirements 9.7, 9.8, 9.9
     */
    it('should detect encrypted blocks regardless of original block type', () => {
      fc.assert(
        fc.property(
          blockTypeWithContent(),
          fc.uint8Array({ minLength: 32, maxLength: 100 }), // Simulated encrypted payload
          (
            {
              blockType: _blockType,
              randomBytes: _randomBytes,
              signatureBytes: _signatureBytes,
            },
            encryptedPayload,
          ) => {
            // Note: We generate block type data to show that ANY block type, when encrypted,
            // would result in data starting with 0x04 (ECIES magic). The original block type
            // is irrelevant once encrypted - only the 0x04 prefix matters.

            // Simulate encryption: prepend 0x04 magic byte (in real ECIES, the entire
            // block would be encrypted and the result would start with 0x04)
            const encryptedData = new Uint8Array(1 + encryptedPayload.length);
            encryptedData[0] = ECIES.PUBLIC_KEY_MAGIC; // 0x04
            encryptedData.set(encryptedPayload, 1);

            const result = detectBlockFormat(encryptedData);

            // Should recognize it as encrypted
            expect(result.isEncrypted).toBe(true);
            expect(result.isValid).toBe(false);
            expect(result.isStructured).toBeUndefined();
            expect(result.error).toContain('encrypted');
            expect(result.error).toContain('decrypt');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should detect encrypted data with various payload sizes', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 65, max: 1000 }), // ECIES encrypted data is at least 65 bytes (public key)
          fc.uint8Array({ minLength: 65, maxLength: 1000 }),
          (payloadSize, randomData) => {
            // Create encrypted-looking data with 0x04 prefix
            const data = new Uint8Array(
              Math.min(payloadSize, randomData.length),
            );
            data[0] = ECIES.PUBLIC_KEY_MAGIC; // 0x04
            data.set(randomData.subarray(1, data.length), 1);

            const result = detectBlockFormat(data);

            // Should recognize it as encrypted
            expect(result.isEncrypted).toBe(true);
            expect(result.isValid).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should not confuse encrypted data with structured blocks', () => {
      fc.assert(
        fc.property(
          fc.uint8Array({ minLength: 170, maxLength: 500 }),
          (randomData) => {
            // Create data that starts with 0x04 but has structured block data after
            const data = new Uint8Array(randomData.length);
            data[0] = ECIES.PUBLIC_KEY_MAGIC; // 0x04
            // Even if bytes 1-3 happen to look like a valid structured header,
            // the 0x04 prefix should take precedence
            data[1] = BLOCK_HEADER.MAGIC_PREFIX; // 0xBC in position 1
            data.set(randomData.subarray(2), 2);

            const result = detectBlockFormat(data);

            // Should recognize it as encrypted, not structured
            expect(result.isEncrypted).toBe(true);
            expect(result.isStructured).toBeUndefined();
            expect(result.isValid).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should handle minimum-size encrypted data', () => {
      fc.assert(
        fc.property(
          fc.uint8Array({ minLength: 3, maxLength: 3 }), // Just enough for prefix check
          (randomData) => {
            // Create minimal encrypted-looking data
            const data = new Uint8Array(4);
            data[0] = ECIES.PUBLIC_KEY_MAGIC; // 0x04
            data.set(randomData, 1);

            const result = detectBlockFormat(data);

            // Should recognize it as encrypted
            expect(result.isEncrypted).toBe(true);
            expect(result.isValid).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
