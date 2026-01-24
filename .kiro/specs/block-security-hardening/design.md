# Design Document: Block System Testing and Security Hardening

## Overview

This design document outlines the technical approach for completing the security hardening and quality improvements for the BrightChain block system. The work builds on existing infrastructure, particularly the constant-time utilities already implemented in `constantTime.ts`, and addresses remaining security vulnerabilities, correctness issues, and quality gaps identified in the comprehensive code review.

The design prioritizes:
1. **Security**: Eliminating timing attack vectors in XOR operations
2. **Correctness**: Ensuring type safety and cache consistency
3. **Maintainability**: Refactoring circular dependencies and adding structured logging
4. **Quality**: Comprehensive test coverage for all block types

## Architecture

### Current State

```
┌─────────────────────────────────────────────────────────────────┐
│                     Block System Architecture                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  BaseBlock   │───▶│EphemeralBlock│───▶│EncryptedBlock│       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│         │                   │                                    │
│         ▼                   ▼                                    │
│  ┌──────────────┐    ┌──────────────┐                           │
│  │ RawDataBlock │    │   CBLBase    │◀── Circular Dependency    │
│  └──────────────┘    └──────────────┘    Risk (ServiceLocator)  │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────┐    ┌──────────────┐                           │
│  │ RandomBlock  │    │WhitenedBlock │◀── Non-constant-time XOR  │
│  └──────────────┘    └──────────────┘                           │
│                                                                  │
│  Services Layer:                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ XorMultipleTransform │ BlockMetadata │ ServiceLocator    │   │
│  │ (Non-constant-time)  │ (any types)   │ (Direct calls)    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Target State

```
┌─────────────────────────────────────────────────────────────────┐
│                  Hardened Block System Architecture              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Logging Layer                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │   │
│  │  │ BlockLogger │  │StructuredLog│  │  LogLevels  │       │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Security Layer                          │   │
│  │  ┌─────────────────┐  ┌─────────────────┐                │   │
│  │  │ConstantTimeXor  │  │ConstantTimeUtils│ (existing)     │   │
│  │  └─────────────────┘  └─────────────────┘                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Type Safety Layer                       │   │
│  │  ┌─────────────────┐  ┌─────────────────┐                │   │
│  │  │  TypeGuards     │  │  DateUtils      │                │   │
│  │  └─────────────────┘  └─────────────────┘                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Block Layer (Immutable)                │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │   │
│  │  │ BaseBlock   │  │ CBLBase     │  │EncryptedBlk │       │   │
│  │  │ (frozen)    │  │ (refactored)│  │ (frozen)    │       │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Constant-Time XOR Service

**Location**: `brightchain-lib/src/lib/utils/constantTimeXor.ts`

```typescript
/**
 * Constant-time XOR operations to prevent timing attacks.
 * Uses the existing constantTime.ts utilities as foundation.
 */

/**
 * Perform constant-time XOR of two equal-length byte arrays.
 * @param a - First array
 * @param b - Second array
 * @returns XOR result
 * @throws Error if arrays have different lengths
 */
export function constantTimeXor(a: Uint8Array, b: Uint8Array): Uint8Array;

/**
 * Perform constant-time XOR of multiple equal-length byte arrays.
 * @param arrays - Arrays to XOR together
 * @returns XOR result
 * @throws Error if arrays have different lengths or empty input
 */
export function constantTimeXorMultiple(arrays: Uint8Array[]): Uint8Array;
```

### 2. Type Guards for JSON Deserialization

**Location**: `brightchain-lib/src/lib/utils/typeGuards.ts`

```typescript
/**
 * Type guard interfaces for runtime type checking
 */

export interface BlockMetadataJson {
  size: number;
  type: number;
  dataType: number;
  lengthWithoutPadding: number;
  dateCreated: string | number;
}

export interface EphemeralBlockMetadataJson extends BlockMetadataJson {
  creator: string;
}

/**
 * Type guard for BlockMetadataJson
 */
export function isBlockMetadataJson(data: unknown): data is BlockMetadataJson;

/**
 * Type guard for EphemeralBlockMetadataJson
 */
export function isEphemeralBlockMetadataJson(data: unknown): data is EphemeralBlockMetadataJson;

/**
 * Validate and parse JSON with type safety
 */
export function parseBlockMetadataJson(json: string): BlockMetadataJson;
```

### 3. Date Utilities

**Location**: `brightchain-lib/src/lib/utils/dateUtils.ts`

```typescript
/**
 * Robust date handling utilities with timezone support
 */

/**
 * Parse a date from various formats (ISO 8601, Unix timestamp)
 * @param value - Date string or Unix timestamp
 * @returns Date object in UTC
 * @throws Error if date is invalid
 */
export function parseDate(value: string | number): Date;

/**
 * Serialize a date to ISO 8601 format with UTC timezone
 * @param date - Date to serialize
 * @returns ISO 8601 string
 */
export function serializeDate(date: Date): string;

/**
 * Validate that a date is valid and not in the future
 * @param date - Date to validate
 * @param allowFuture - Whether to allow future dates
 * @returns true if valid
 */
export function isValidDate(date: Date, allowFuture?: boolean): boolean;
```

### 4. Block Logger

**Location**: `brightchain-lib/src/lib/logging/blockLogger.ts`

```typescript
/**
 * Structured logging for block operations
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface BlockLogEntry {
  timestamp: string;
  level: LogLevel;
  operation: string;
  blockId?: string;
  blockType?: string;
  metadata?: Record<string, unknown>;
  error?: {
    type: string;
    message: string;
  };
}

export interface IBlockLogger {
  debug(operation: string, metadata?: Record<string, unknown>): void;
  info(operation: string, metadata?: Record<string, unknown>): void;
  warn(operation: string, metadata?: Record<string, unknown>): void;
  error(operation: string, error: Error, metadata?: Record<string, unknown>): void;
  setLevel(level: LogLevel): void;
}

export class BlockLogger implements IBlockLogger {
  private level: LogLevel = LogLevel.INFO;
  private output: (entry: BlockLogEntry) => void;
  
  constructor(output?: (entry: BlockLogEntry) => void);
}
```

### 5. CBL Refactored Structure

**Changes to**: `brightchain-lib/src/lib/blocks/cblBase.ts`

```typescript
/**
 * Refactored CBL with dependency injection and eliminated circular dependencies
 */

export interface ICBLServices<TID extends PlatformID> {
  checksumService: IChecksumService;
  cblService: ICBLService<TID>;
}

export abstract class CBLBase<TID extends PlatformID = Uint8Array>
  extends EphemeralBlock<TID>
  implements ICBLCore<TID>
{
  // Inject services instead of using ServiceLocator in constructor
  protected readonly services: ICBLServices<TID>;
  
  // Lazy computation without circular dependency risk
  private _addressCount?: number;
  
  constructor(
    data: Uint8Array,
    creator: Member<TID>,
    services: ICBLServices<TID>,
    blockSize?: BlockSize
  );
  
  // Computed lazily, cached immutably
  public get cblAddressCount(): number;
}
```

### 6. Structured Block Header Format

**Affected Libraries**: `brightchain-lib`, `brightchain-api-lib`

Blocks with serialized headers (CBL variants) use a consistent 4-byte prefix for format identification and integrity checking. Raw data blocks do not have this prefix.

#### Structured Header Prefix

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 Structured Block Header Prefix (4 bytes)                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ Offset │ Size │ Field              │ Description                            │
├────────┼──────┼────────────────────┼────────────────────────────────────────┤
│   0    │  1   │ MagicPrefix        │ 0xBC - BrightChain structured block    │
│   1    │  1   │ BlockType          │ Type identifier (see table below)      │
│   2    │  1   │ Version            │ Header format version (currently 0x01) │
│   3    │  1   │ CRC8               │ CRC8 of bytes [4..end of header]       │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Block Type Identifiers

| Value | Block Type | Description |
|-------|------------|-------------|
| 0x02  | CBL        | Constituent Block List |
| 0x03  | SuperCBL   | Hierarchical CBL referencing sub-CBLs |
| 0x04  | ExtendedCBL| CBL with file name and MIME type |
| 0x05  | MessageCBL | CBL for messaging system |

Note: Raw data blocks (RawDataBlock) do not have a header prefix - they are just raw bytes.

#### Format Detection Logic

```typescript
function detectBlockFormat(data: Uint8Array): BlockFormatResult {
  if (data.length < 4) {
    return { type: 'unknown', reason: 'too short' };
  }
  
  if (data[0] === 0xBC) {
    // Structured BrightChain block with header
    return parseStructuredBlock(data);
  }
  
  if (data[0] === 0x04) {
    // ECIES encrypted data
    return { type: 'encrypted', reason: 'ECIES magic byte' };
  }
  
  // Raw/unknown data - no header format
  return { type: 'raw', reason: 'no recognized prefix' };
}
```

#### Magic Byte Selection

- `0xBC` chosen because:
  - Mnemonic for "BrightChain"
  - Distinct from ECIES public key magic byte (`0x04`)
  - Not a common file format magic byte
  - High bit set, unlikely to appear naturally

#### CRC8 Computation

The CRC8 is computed over all header content AFTER the CRC8 field, excluding any trailing signature:

```typescript
import { CrcService } from '@digitaldefiance/ecies-lib';

function computeBlockHeaderCrc8(headerWithoutSignature: Uint8Array): number {
  // Skip magic prefix (1), block type (1), version (1), and CRC8 field (1) = 4 bytes
  const crcData = headerWithoutSignature.subarray(4);
  const crcBuffer = CrcService.crc8(Buffer.from(crcData));
  return crcBuffer[0];
}
```

### 7. CBL Header Format (extends Universal Header)

**Affected Libraries**: `brightchain-lib`, `brightchain-api-lib`

#### CBL Header Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CBL Header Format                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ Offset │ Size │ Field              │ Description                            │
├────────┼──────┼────────────────────┼────────────────────────────────────────┤
│   0    │  1   │ MagicPrefix        │ 0xBC - BrightChain identifier          │
│   1    │  1   │ BlockType          │ 0x02 (CBL) or 0x04 (ExtendedCBL)       │
│   2    │  1   │ Version            │ Header version (0x01)                  │
│   3    │  1   │ CRC8               │ CRC8 of bytes [4..IsExtendedHeader]    │
│   4    │  16  │ CreatorId          │ Creator's GUID (provider-dependent)    │
│  20    │  8   │ DateCreated        │ Timestamp (high/low 32-bit)            │
│  28    │  4   │ AddressCount       │ Number of block addresses              │
│  32    │  1   │ TupleSize          │ Tuple size for whitening               │
│  33    │  8   │ OriginalDataLength │ Original file size                     │
│  41    │  64  │ OriginalChecksum   │ SHA3-512 of original data              │
│ 105    │  1   │ IsExtendedHeader   │ 0=base, 1=extended, 2=message          │
│ 106    │  64  │ CreatorSignature   │ ECDSA signature                        │
├────────┴──────┴────────────────────┴────────────────────────────────────────┤
│ Extended Header (if IsExtendedHeader=1, BlockType=0x04):                     │
│ 106    │  2   │ FileNameLength     │ Length of file name                    │
│ 108    │  N   │ FileName           │ UTF-8 encoded file name                │
│ 108+N  │  1   │ MimeTypeLength     │ Length of MIME type                    │
│ 109+N  │  M   │ MimeType           │ UTF-8 encoded MIME type                │
│ 109+N+M│  64  │ CreatorSignature   │ ECDSA signature (moved to end)         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8. Binary SuperCBL Format

**Affected Libraries**: `brightchain-lib`, `brightchain-api-lib`

The JSON-based SuperCBL format is removed entirely. SuperCBL uses the universal header format with type-specific fields.

#### SuperCBL Header Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SuperCBL Header Format                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ Offset │ Size │ Field              │ Description                            │
├────────┼──────┼────────────────────┼────────────────────────────────────────┤
│   0    │  1   │ MagicPrefix        │ 0xBC - BrightChain identifier          │
│   1    │  1   │ BlockType          │ 0x03 (SuperCBL)                        │
│   2    │  1   │ Version            │ Header version (0x01)                  │
│   3    │  1   │ CRC8               │ CRC8 of header content                 │
│   4    │  16  │ CreatorId          │ Creator's GUID                         │
│  20    │  8   │ DateCreated        │ Timestamp                              │
│  28    │  4   │ SubCblCount        │ Number of sub-CBL references           │
│  32    │  4   │ TotalBlockCount    │ Total blocks across all sub-CBLs       │
│  36    │  2   │ Depth              │ Hierarchy depth                        │
│  38    │  8   │ OriginalDataLength │ Original file size                     │
│  46    │  64  │ OriginalChecksum   │ SHA3-512 of original data              │
│ 110    │  64  │ CreatorSignature   │ ECDSA signature                        │
├────────┴──────┴────────────────────┴────────────────────────────────────────┤
│ Address Data (after header):                                                 │
│ 174    │ 64*N │ SubCblChecksums    │ SHA3-512 checksums of sub-CBLs         │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Files to Remove (JSON SuperCBL)

- `brightchain-lib/src/lib/interfaces/storage/superCbl.ts` - Remove entirely
- `brightchain-lib/src/lib/services/superCbl.service.ts` - Remove entirely
- `brightchain-lib/src/lib/services/jsonCblCapacity.service.ts` - Remove if exists

### 9. Block Format Detection

**Location**: `brightchain-lib/src/lib/services/blockFormatService.ts` (new file)

```typescript
/**
 * Detect block format and validate header integrity
 */
export function detectBlockFormat(data: Uint8Array): {
  isValid: boolean;
  blockType: BlockTypeEnum;
  version: number;
  error?: string;
} {
  // Check minimum length for header prefix
  if (data.length < 4) {
    return { isValid: false, blockType: BlockTypeEnum.Unknown, version: 0, error: 'Data too short' };
  }
  
  // Check for BrightChain magic prefix
  if (data[0] === 0xBC) {
    const blockType = data[1] as BlockTypeEnum;
    const version = data[2];
    const storedCrc8 = data[3];
    
    // Get header end offset based on block type
    const headerEnd = getHeaderEndOffset(data, blockType, version);
    if (headerEnd < 0) {
      return { isValid: false, blockType, version, error: 'Cannot determine header size' };
    }
    
    // Compute CRC8 over header content (after CRC8 field, before signature)
    const signatureSize = 64; // ECDSA signature
    const crcData = data.subarray(4, headerEnd - signatureSize);
    const computedCrc8 = CrcService.crc8(Buffer.from(crcData))[0];
    
    if (storedCrc8 !== computedCrc8) {
      return { isValid: false, blockType, version, error: 'CRC8 mismatch - header may be corrupted' };
    }
    
    return { isValid: true, blockType, version };
  }
  
  // Check if it looks like encrypted data (ECIES format)
  if (data[0] === 0x04) {
    return { isValid: false, blockType: BlockTypeEnum.Unknown, version: 0, error: 'Data appears to be ECIES encrypted' };
  }
  
  // Unknown format
  return { isValid: false, blockType: BlockTypeEnum.Unknown, version: 0, error: 'Unknown block format - missing 0xBC magic prefix' };
}
```

## Data Models

### BlockLogEntry Schema

```typescript
{
  timestamp: string;      // ISO 8601 format
  level: LogLevel;        // debug | info | warn | error
  operation: string;      // e.g., "encrypt", "decrypt", "validate"
  blockId?: string;       // Hex-encoded checksum (not sensitive)
  blockType?: string;     // Block type name
  metadata?: {
    recipientCount?: number;
    encryptionType?: string;
    blockSize?: number;
    // Never includes: keys, plaintext, private data
  };
  error?: {
    type: string;         // Error class name
    message: string;      // Error message (sanitized)
  };
}
```

### Type Guard Validation Schema

```typescript
// BlockMetadataJson validation rules
{
  size: "must be valid BlockSize enum value",
  type: "must be valid BlockType enum value", 
  dataType: "must be valid BlockDataType enum value",
  lengthWithoutPadding: "must be non-negative integer",
  dateCreated: "must be ISO 8601 string or Unix timestamp"
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*



Based on the prework analysis, the following properties have been identified and consolidated to eliminate redundancy:

### Property 1: XOR Operation Correctness (Round-Trip)

*For any* two equal-length byte arrays A and B, XORing A with B and then XORing the result with B again SHALL produce the original array A.

**Validates: Requirements 1.1, 1.2, 1.3, 1.5**

### Property 2: XOR Timing Consistency

*For any* two equal-length byte arrays with different bit patterns (all zeros, all ones, alternating, random), the XOR operation SHALL complete within a consistent time window (±10% variance), demonstrating no early-exit optimization.

**Validates: Requirements 1.2, 1.4**

### Property 3: CBL Address Count Consistency

*For any* valid CBL block, accessing `cblAddressCount` multiple times SHALL return the same value, and the value SHALL match the count derived from parsing the raw address data.

**Validates: Requirements 2.1, 2.3**

### Property 4: CBL Serialization Round-Trip

*For any* valid CBL block, serializing to bytes and reconstructing SHALL produce a CBL with identical `cblAddressCount`, `originalDataLength`, and `addresses`.

**Validates: Requirements 2.5**

### Property 5: JSON Deserialization Type Safety

*For any* JSON object missing required fields or containing invalid types, `fromJson` methods SHALL throw an error with a message indicating which field failed validation.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

### Property 6: Block Metadata Round-Trip

*For any* valid BlockMetadata object, serializing to JSON and deserializing SHALL produce an equivalent object with matching `size`, `type`, `dataType`, `lengthWithoutPadding`, and `dateCreated`.

**Validates: Requirements 4.1, 4.2**

### Property 7: Date Serialization Round-Trip

*For any* valid Date object, serializing to ISO 8601 format and deserializing SHALL produce a Date with the same UTC timestamp (within 1 second tolerance for serialization precision).

**Validates: Requirements 5.1, 5.2, 5.3**

### Property 8: Malformed Date Rejection

*For any* string that is not a valid ISO 8601 date or Unix timestamp, the date parser SHALL throw a descriptive error rather than returning an invalid Date or NaN.

**Validates: Requirements 5.5**

### Property 9: Block Immutability

*For any* block (BaseBlock, EncryptedBlock, CBLBase), after construction, attempting to modify the `data` property or any cached values SHALL either be prevented (frozen object) or have no effect on subsequent reads.

**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

### Property 10: Log Entry Structure

*For any* block operation that triggers logging (encrypt, decrypt, validate), the log entry SHALL be valid JSON containing `timestamp`, `level`, `operation`, and optionally `blockId`, `blockType`, and `metadata`.

**Validates: Requirements 8.1, 8.2, 8.3, 8.4**

### Property 11: Log Level Filtering

*For any* log level setting, only log entries at or above that level SHALL be emitted. Setting level to ERROR SHALL suppress DEBUG, INFO, and WARN entries.

**Validates: Requirements 8.5**

### Property 12: Sensitive Data Exclusion from Logs

*For any* log entry produced by block operations, the entry SHALL NOT contain patterns matching private keys (hex strings > 64 chars in key-related fields), plaintext content, or encryption keys.

**Validates: Requirements 8.6**

### Property 13: Block Magic Byte Detection

*For any* byte array starting with `0xBC`, the block parser SHALL attempt to parse it using the universal header format. *For any* byte array starting with `0x04` (ECIES magic) without `0xBC` prefix, the parser SHALL return an "encrypted data" error, not a parsing error.

**Validates: Requirements 9.1, 9.5, 9.7**

### Property 14: Block Header CRC8 Integrity

*For any* valid block header, the stored CRC8 SHALL match the computed CRC8 over the header content (after CRC8 field, excluding signature). *For any* block with a corrupted header byte, the CRC8 verification SHALL fail.

**Validates: Requirements 9.4, 9.6, 12.4, 12.5**

### Property 15: Block Header Version Round-Trip

*For any* block created with the universal header format, serializing and deserializing SHALL preserve the magic prefix (`0xBC`), block type byte, version byte, and CRC8 value.

**Validates: Requirements 9.2, 9.3, 10.2**

### Property 16: Binary SuperCBL Round-Trip

*For any* SuperCBL created with the binary format, serializing and deserializing SHALL preserve: BlockType (`0x03`), SubCblCount, TotalBlockCount, Depth, and all sub-CBL checksums.

**Validates: Requirements 11.1, 11.2, 11.3, 11.5**

### Property 17: SuperCBL Signature Validity

*For any* SuperCBL created by a member with a private key, the signature SHALL be verifiable using the creator's public key. Modifying any header field SHALL cause signature verification to fail.

**Validates: Requirements 11.4, 11.6**

## Error Handling

### Error Types

| Error Type | Condition | Recovery |
|------------|-----------|----------|
| `XorLengthMismatchError` | Arrays have different lengths | Caller must provide equal-length arrays |
| `InvalidJsonError` | JSON parsing fails | Return descriptive error with parse position |
| `MissingFieldError` | Required field missing in JSON | Return error naming the missing field |
| `InvalidFieldTypeError` | Field has wrong type | Return error with field name and expected type |
| `InvalidDateError` | Date string is malformed | Return error with the invalid value |
| `BlockMutationError` | Attempt to modify frozen block | Operation is no-op or throws |
| `LoggingError` | Log output fails | Fail silently, don't break block operations |
| `InvalidCblMagicByteError` | CBL magic byte is not `0xCB` | Return error indicating invalid format |
| `CblCrc8MismatchError` | CRC8 verification failed | Return error indicating header corruption |
| `EncryptedCblError` | Data appears encrypted (starts with `0x04`) | Return error indicating decryption needed |
| `InvalidCblVersionError` | Unsupported CBL version | Return error with version number |
| `InvalidSuperCblError` | SuperCBL structure invalid | Return error with specific field |

### Error Handling Strategy

1. **XOR Operations**: Validate lengths before processing. Throw immediately on mismatch.
2. **JSON Deserialization**: Validate all fields before constructing objects. Collect all errors for comprehensive feedback.
3. **Date Parsing**: Try ISO 8601 first, then Unix timestamp. Throw if neither works.
4. **Block Immutability**: Use `Object.freeze()` on block data after construction.
5. **Logging**: Wrap all logging in try-catch. Never let logging failures affect block operations.

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across randomly generated inputs

### Property-Based Testing Configuration

- **Library**: fast-check (already used in the project)
- **Iterations**: Minimum 100 per property test
- **Tag format**: `Feature: block-security-hardening, Property {N}: {title}`

### Test Organization

```
brightchain-lib/src/lib/
├── utils/
│   ├── constantTimeXor.spec.ts          # Properties 1, 2
│   ├── constantTimeXor.property.spec.ts # PBT for XOR
│   ├── typeGuards.spec.ts               # Properties 5, 6
│   ├── typeGuards.property.spec.ts      # PBT for type guards
│   └── dateUtils.spec.ts                # Properties 7, 8
├── blocks/
│   ├── cblBase.refactor.spec.ts         # Properties 3, 4
│   ├── immutability.property.spec.ts    # Property 9
│   └── blockCoverage.spec.ts            # Comprehensive coverage
├── services/
│   ├── blockFormatService.spec.ts       # Properties 13, 14, 15
│   ├── blockFormatService.property.spec.ts # PBT for format detection
│   ├── cblService.headerV2.spec.ts      # CBL header with universal format
│   ├── cblService.superCbl.spec.ts      # Properties 16, 17
│   └── cblService.superCbl.property.spec.ts # PBT for SuperCBL
└── logging/
    ├── blockLogger.spec.ts              # Properties 10, 11, 12
    └── blockLogger.property.spec.ts     # PBT for logging

brightchain-api-lib/src/lib/
├── stores/
│   └── diskCBLStore.headerV2.spec.ts    # API-lib CBL header tests
└── transforms/
    └── cblTransform.spec.ts             # Transform tests with new format
```

### Unit Test Focus Areas

1. **Edge Cases**:
   - Empty arrays for XOR
   - Maximum block size arrays
   - Boundary dates (epoch, far future, negative timestamps)
   - Unicode in JSON strings
   - Deeply nested JSON objects

2. **Error Conditions**:
   - All documented error types
   - Error message content verification
   - Error recovery paths

3. **Integration Points**:
   - XOR utilities integrated with WhitenedBlock
   - Type guards integrated with fromJson methods
   - Logger integrated with BlockService

### Property Test Focus Areas

1. **XOR Properties**: Round-trip, timing consistency
2. **Serialization Properties**: JSON round-trip, date round-trip
3. **Immutability Properties**: Frozen objects, cache consistency
4. **Logging Properties**: Structure validation, sensitive data exclusion

### Coverage Requirements

- Minimum 90% line coverage for new code
- 100% coverage for security-critical paths (XOR, type guards)
- All error branches must be tested
