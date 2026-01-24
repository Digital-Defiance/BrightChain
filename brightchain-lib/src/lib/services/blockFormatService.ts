/**
 * Block Format Detection Service
 *
 * This service provides functionality for detecting and validating block formats
 * based on magic bytes, version, and CRC8 integrity checks.
 *
 * @module services/blockFormatService
 */

import { CrcService, ECIES } from '@digitaldefiance/ecies-lib';
import { BLOCK_HEADER, StructuredBlockType } from '../constants';
import { BlockType } from '../enumerations/blockType';
import { getBrightChainIdProvider, isLibraryInitialized } from '../init';

/**
 * Result of block format detection
 */
export interface BlockFormatResult {
  /**
   * Whether the block format is valid
   */
  isValid: boolean;

  /**
   * The detected block type
   */
  blockType: BlockType | StructuredBlockType;

  /**
   * The header version (for structured blocks)
   */
  version: number;

  /**
   * Error message if format is invalid
   */
  error?: string;

  /**
   * Whether this is a structured block (has 0xBC prefix)
   */
  isStructured?: boolean;

  /**
   * Whether this appears to be encrypted data (has 0x04 ECIES magic)
   */
  isEncrypted?: boolean;
}

/**
 * Get the creator ID length from the ID provider
 * This ensures we use the correct dynamic length instead of hardcoded values
 */
function getCreatorIdLength(): number {
  if (!isLibraryInitialized()) {
    // Default to 16 bytes (GuidV4) if library not initialized
    // This allows tests to work without full initialization
    return 16;
  }
  const idProvider = getBrightChainIdProvider();
  return idProvider.byteLength;
}

/**
 * Detect the format of block data and validate header integrity
 *
 * @param data - The block data to analyze
 * @param creatorIdLength - Optional override for creator ID length (for testing)
 * @returns BlockFormatResult with detection details
 *
 * @remarks
 * Detection logic:
 * - If starts with 0xBC: Structured BrightChain block (validate CRC8)
 * - If starts with 0x04: ECIES encrypted data
 * - Otherwise: Raw/unknown data
 *
 * @see Requirements 9.6, 9.7, 9.8, 9.9
 */
export function detectBlockFormat(
  data: Uint8Array,
  creatorIdLength?: number,
): BlockFormatResult {
  // Get creator ID length from provider if not specified
  const idLength = creatorIdLength ?? getCreatorIdLength();

  // Check minimum length for header prefix
  if (data.length < 4) {
    return {
      isValid: false,
      blockType: BlockType.Unknown,
      version: 0,
      error:
        'Data too short for structured block header (minimum 4 bytes required)',
    };
  }

  // Check for BrightChain structured block magic prefix
  if (data[0] === BLOCK_HEADER.MAGIC_PREFIX) {
    const structuredBlockType = data[1] as StructuredBlockType;
    const version = data[2];
    const storedCrc8 = data[3];

    // Validate block type
    const validTypes = [
      StructuredBlockType.CBL,
      StructuredBlockType.SuperCBL,
      StructuredBlockType.ExtendedCBL,
      StructuredBlockType.MessageCBL,
    ];

    if (!validTypes.includes(structuredBlockType)) {
      return {
        isValid: false,
        blockType: BlockType.Unknown,
        version,
        error: `Invalid structured block type: 0x${structuredBlockType.toString(16).padStart(2, '0')}`,
        isStructured: true,
      };
    }

    // Get header end offset based on block type
    const headerEnd = getHeaderEndOffset(
      data,
      structuredBlockType,
      version,
      idLength,
    );
    if (headerEnd < 0) {
      return {
        isValid: false,
        blockType: mapStructuredToBlockType(structuredBlockType),
        version,
        error: 'Cannot determine header size - data may be truncated',
        isStructured: true,
      };
    }

    // Compute CRC8 over header content (after CRC8 field, before signature)
    // Signature is always the last 64 bytes of the header
    const signatureSize = 64; // ECDSA signature
    const crcData = data.subarray(4, headerEnd - signatureSize);
    const crcService = new CrcService();
    const computedCrc8Buffer = crcService.crc8(crcData);
    const computedCrc8 = computedCrc8Buffer[0];

    if (storedCrc8 !== computedCrc8) {
      return {
        isValid: false,
        blockType: mapStructuredToBlockType(structuredBlockType),
        version,
        error: `CRC8 mismatch - header may be corrupted (expected 0x${computedCrc8.toString(16).padStart(2, '0')}, got 0x${storedCrc8.toString(16).padStart(2, '0')})`,
        isStructured: true,
      };
    }

    // Valid structured block
    return {
      isValid: true,
      blockType: mapStructuredToBlockType(structuredBlockType),
      version,
      isStructured: true,
    };
  }

  // Check if it looks like encrypted data (ECIES format)
  if (data[0] === ECIES.PUBLIC_KEY_MAGIC) {
    return {
      isValid: false,
      blockType: BlockType.Unknown,
      version: 0,
      error: 'Data appears to be ECIES encrypted - decrypt before parsing',
      isEncrypted: true,
    };
  }

  // Unknown format - could be raw data
  return {
    isValid: false,
    blockType: BlockType.Unknown,
    version: 0,
    error: 'Unknown block format - missing 0xBC magic prefix (may be raw data)',
  };
}

/**
 * Map StructuredBlockType to BlockType enum
 */
function mapStructuredToBlockType(
  structuredType: StructuredBlockType,
): BlockType {
  switch (structuredType) {
    case StructuredBlockType.CBL:
      return BlockType.ConstituentBlockList;
    case StructuredBlockType.ExtendedCBL:
      return BlockType.ExtendedConstituentBlockListBlock;
    case StructuredBlockType.MessageCBL:
      // MessageCBL doesn't have a direct BlockType mapping yet
      // Return CBL as the base type
      return BlockType.ConstituentBlockList;
    case StructuredBlockType.SuperCBL:
      // SuperCBL doesn't have a BlockType enum value yet
      // Return CBL as the base type
      return BlockType.ConstituentBlockList;
    default:
      return BlockType.Unknown;
  }
}

/**
 * Get the end offset of the header based on block type and version
 *
 * @param data - The block data
 * @param blockType - The structured block type
 * @param version - The header version
 * @param idLength - The creator ID length from the ID provider
 * @returns The offset where the header ends, or -1 if cannot be determined
 */
function getHeaderEndOffset(
  data: Uint8Array,
  blockType: StructuredBlockType,
  version: number,
  idLength: number,
): number {
  // Version check
  if (version !== BLOCK_HEADER.VERSION) {
    // Unknown version - cannot determine header size
    return -1;
  }

  // Calculate base header size dynamically using ID provider length
  // Prefix(4) + CreatorId(idLength) + DateCreated(8) + AddressCount(4) + TupleSize(1) +
  // OriginalDataLength(8) + OriginalChecksum(64) + IsExtendedHeader(1) + Signature(64)
  const baseHeaderSize = 4 + idLength + 8 + 4 + 1 + 8 + 64 + 1 + 64;

  // Minimum header check
  if (data.length < baseHeaderSize) {
    return -1;
  }

  switch (blockType) {
    case StructuredBlockType.CBL:
      // Base CBL header with dynamic creator ID length
      return baseHeaderSize;

    case StructuredBlockType.ExtendedCBL:
      // Extended CBL has variable-length file name and MIME type
      return parseExtendedHeaderEnd(data, idLength);

    case StructuredBlockType.MessageCBL:
      // Message CBL has variable-length fields
      return parseMessageHeaderEnd(data, idLength);

    case StructuredBlockType.SuperCBL:
      // SuperCBL header structure
      // Prefix(4) + CreatorId(idLength) + DateCreated(8) + SubCblCount(4) + TotalBlockCount(4) +
      // Depth(2) + OriginalDataLength(8) + OriginalChecksum(64) + Signature(64)
      return 4 + idLength + 8 + 4 + 4 + 2 + 8 + 64 + 64;

    default:
      return -1;
  }
}

/**
 * Parse extended CBL header to find the end offset
 */
function parseExtendedHeaderEnd(data: Uint8Array, idLength: number): number {
  try {
    // Base header ends at offset where extended fields start (before signature)
    // Prefix(4) + CreatorId(idLength) + DateCreated(8) + AddressCount(4) + TupleSize(1) +
    // OriginalDataLength(8) + OriginalChecksum(64) + IsExtendedHeader(1)
    const baseHeaderEnd = 4 + idLength + 8 + 4 + 1 + 8 + 64 + 1;

    if (data.length < baseHeaderEnd + 2) {
      return -1;
    }

    // Read file name length (2 bytes, big-endian)
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const fileNameLength = view.getUint16(baseHeaderEnd, false);

    const fileNameEnd = baseHeaderEnd + 2 + fileNameLength;
    if (data.length < fileNameEnd + 1) {
      return -1;
    }

    // Read MIME type length (1 byte)
    const mimeTypeLength = data[fileNameEnd];

    const mimeTypeEnd = fileNameEnd + 1 + mimeTypeLength;
    if (data.length < mimeTypeEnd + 64) {
      return -1;
    }

    // Signature is at the end
    return mimeTypeEnd + 64;
  } catch {
    return -1;
  }
}

/**
 * Parse message CBL header to find the end offset
 */
function parseMessageHeaderEnd(data: Uint8Array, idLength: number): number {
  try {
    // Base header ends at offset where message fields start
    // Prefix(4) + CreatorId(idLength) + DateCreated(8) + AddressCount(4) + TupleSize(1) +
    // OriginalDataLength(8) + OriginalChecksum(64) + IsExtendedHeader(1)
    const baseHeaderEnd = 4 + idLength + 8 + 4 + 1 + 8 + 64 + 1;

    if (data.length < baseHeaderEnd + 2) {
      return -1;
    }

    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let offset = baseHeaderEnd;

    // Skip message type (2-byte length + content)
    const messageTypeLength = view.getUint16(offset, false);
    offset += 2 + messageTypeLength;

    if (data.length < offset + 2) {
      return -1;
    }

    // Skip sender ID (2-byte length + content)
    const senderIdLength = view.getUint16(offset, false);
    offset += 2 + senderIdLength;

    if (data.length < offset + 2) {
      return -1;
    }

    // Skip recipients (2-byte count + variable-length entries)
    const recipientCount = view.getUint16(offset, false);
    offset += 2;

    for (let i = 0; i < recipientCount; i++) {
      if (data.length < offset + 2) {
        return -1;
      }
      const recipientLength = view.getUint16(offset, false);
      offset += 2 + recipientLength;
    }

    if (data.length < offset + 1) {
      return -1;
    }

    // Skip priority (1 byte)
    offset += 1;

    if (data.length < offset + 1) {
      return -1;
    }

    // Skip encryption scheme (1-byte length + content)
    const encryptionSchemeLength = data[offset];
    offset += 1 + encryptionSchemeLength;

    if (data.length < offset + 64) {
      return -1;
    }

    // Signature is at the end
    return offset + 64;
  } catch {
    return -1;
  }
}
