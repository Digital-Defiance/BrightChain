# Requirements Document

## Introduction

This document specifies the requirements for completing the Block System Testing and Security Hardening initiative for BrightChain. Following a comprehensive code review documented in `BLOCK_ENCRYPTION_REVIEW.md`, several critical issues were identified. Some have already been addressed (CBL signature validation, Creator ID mismatch handling, constant-time utilities, CBL header verification tests, BaseBlock.parent/layers fixes, and ephemeral.ts comment cleanup). This spec covers the remaining issues that need to be resolved to achieve production-ready security and correctness.

## Glossary

- **XOR_Service**: The service responsible for performing XOR operations on byte arrays for whitening/brightening operations
- **Constant_Time_Operation**: An operation that takes the same amount of time regardless of input values, preventing timing attacks
- **CBL**: Constituent Block List - a block type that contains references to other blocks
- **SuperCBL**: A hierarchical CBL that references other CBLs (sub-CBLs) to handle files too large for a single CBL
- **Whitening**: The process of XORing data with random blocks to obscure content (Owner-Free Filesystem concept)
- **Timing_Attack**: A side-channel attack that exploits variations in execution time to extract secret information
- **Type_Guard**: A TypeScript function that narrows the type of a value through runtime checks
- **Cache_Invalidation**: The process of marking cached data as stale when underlying data changes
- **Magic_Byte**: A fixed byte value at the start of a data structure used to identify its format
- **CRC8**: An 8-bit cyclic redundancy check used for data integrity verification

## Requirements

### Requirement 1: Constant-Time XOR Operations

**User Story:** As a security engineer, I want XOR operations to use constant-time algorithms so that timing attacks are prevented.

#### Acceptance Criteria

1. WHEN the XOR_Service performs XOR operations on byte arrays, THE XOR_Service SHALL use constant-time comparison utilities from `constantTime.ts`
2. WHEN whitening operations XOR data with random blocks, THE Whitening_System SHALL complete in consistent time regardless of input byte values
3. WHEN the XorMultipleTransformStream processes streaming XOR operations, THE XorMultipleTransformStream SHALL use constant-time XOR implementations
4. THE XOR_Service SHALL NOT use early-exit optimizations that could leak timing information
5. WHEN XOR operations are performed in the showcase SessionIsolatedMemoryBlockStore, THE SessionIsolatedMemoryBlockStore SHALL use constant-time XOR utilities

### Requirement 2: CBL Circular Dependency Refactoring

**User Story:** As a developer, I want the CBL validation system to be free of circular dependencies so that validation runs correctly and code is maintainable.

#### Acceptance Criteria

1. WHEN CBLBase validates its structure, THE CBLBase SHALL NOT rely on cached values to break circular dependency chains
2. THE CBLBase SHALL use dependency injection for services instead of direct ServiceLocator calls during construction
3. WHEN `_cachedAddressCount` is accessed, THE CBLBase SHALL compute it lazily without risk of circular calls
4. THE CBLBase SHALL separate header parsing from validation to eliminate circular validation paths
5. WHEN the CBL header cache is used, THE CBL_System SHALL ensure cache keys work correctly across serialization boundaries

### Requirement 3: Test Environment Validation Consistency

**User Story:** As a QA engineer, I want validation to run consistently in all environments so that tests catch real issues.

#### Acceptance Criteria

1. THE Block_System SHALL NOT skip validation based on environment detection (test vs production)
2. WHEN validation is needed for testing, THE Test_Framework SHALL use explicit mocking instead of environment-based skipping
3. IF validation must be conditionally disabled, THEN THE Block_System SHALL use explicit configuration flags rather than environment detection
4. THE Block_System SHALL log warnings when validation is explicitly disabled for debugging purposes

### Requirement 4: Type-Safe JSON Deserialization

**User Story:** As a developer, I want JSON deserialization to use proper type guards so that TypeScript safety is maintained at runtime.

#### Acceptance Criteria

1. WHEN `fromJson` methods parse JSON data, THE Metadata_Classes SHALL use type guard functions instead of `any` type
2. THE BlockMetadata.fromJson SHALL validate all required fields with proper type checking before construction
3. THE EphemeralBlockMetadata.fromJson SHALL validate creator information with type guards
4. WHEN JSON data fails type validation, THE Deserialization_System SHALL throw descriptive errors indicating which field failed
5. THE Type_Guards SHALL be exported for reuse in external code that deserializes block metadata

### Requirement 5: Robust Date Handling

**User Story:** As a developer, I want date handling to be robust across timezones so that block timestamps are consistent globally.

#### Acceptance Criteria

1. WHEN dates are serialized to JSON, THE Serialization_System SHALL use ISO 8601 format with timezone information
2. WHEN dates are deserialized from JSON, THE Deserialization_System SHALL handle both ISO 8601 strings and Unix timestamps
3. THE Block_System SHALL store all dates in UTC internally
4. WHEN displaying dates to users, THE Display_System SHALL convert from UTC to local timezone
5. IF a date string is malformed, THEN THE Deserialization_System SHALL throw a descriptive error rather than creating an invalid Date

### Requirement 6: Cache Staleness Prevention

**User Story:** As a developer, I want cached values to remain consistent with underlying data so that stale data is never returned.

#### Acceptance Criteria

1. WHEN `_cachedEncryptionDetails` is accessed after block modification, THE EncryptedBlock SHALL return current values
2. WHEN `_cachedAddressCount` is accessed after CBL modification, THE CBLBase SHALL return current values
3. THE Block_System SHALL either make blocks truly immutable or implement cache invalidation on modification
4. IF blocks are immutable, THEN THE Block_System SHALL prevent modification methods from being called after construction
5. THE Cache_System SHALL document which values are cached and under what conditions they may become stale

### Requirement 7: Comprehensive Block Test Coverage

**User Story:** As a QA engineer, I want all block types to have comprehensive test coverage so that edge cases and error conditions are verified.

#### Acceptance Criteria

1. THE Test_Suite SHALL include property-based tests for all block type constructors
2. THE Test_Suite SHALL include edge case tests for boundary conditions (empty data, maximum size, invalid checksums)
3. THE Test_Suite SHALL include error condition tests for all documented error types
4. WHEN a new block type is added, THE Test_Suite SHALL require corresponding test coverage before merge
5. THE Test_Suite SHALL achieve at least 90% code coverage for block-related code paths

### Requirement 8: Structured Logging for Block Operations

**User Story:** As an operations engineer, I want structured logging for block operations so that I can debug issues and audit security-sensitive operations.

#### Acceptance Criteria

1. WHEN a block is encrypted, THE Logging_System SHALL log the operation with block ID, block type, and recipient count (not sensitive data)
2. WHEN a block is decrypted, THE Logging_System SHALL log the operation with block ID and success/failure status
3. WHEN validation fails, THE Logging_System SHALL log the failure with error type and block metadata
4. THE Logging_System SHALL use structured JSON format for machine-parseable logs
5. THE Logging_System SHALL support configurable log levels (debug, info, warn, error)
6. THE Logging_System SHALL NOT log sensitive data such as encryption keys, plaintext content, or private keys


### Requirement 9: Structured Block Header Format

**User Story:** As a developer, I want blocks with serialized headers to have a consistent format with magic bytes and CRC8 so that block types can be reliably identified and corruption detected.

#### Acceptance Criteria

1. BLOCKS with serialized headers (CBL, SuperCBL, ExtendedCBL, MessageCBL) SHALL begin with a magic prefix that identifies the block type
2. THE magic bytes SHALL be:
   - `0xBC` - BrightChain structured block prefix (common to all)
   - Second byte identifies block type: `0x02`=CBL, `0x03`=SuperCBL, `0x04`=ExtendedCBL, `0x05`=MessageCBL
3. RAW data blocks (RawDataBlock) SHALL NOT have a header prefix - they remain as raw bytes
4. ALL structured block headers SHALL include a version byte (third byte) to support future format changes
5. ALL structured block headers SHALL include a CRC8 check digit (fourth byte) computed over the header content after the CRC8 field
6. WHEN parsing block data, THE Block_System SHALL check for `0xBC` prefix to determine if it's a structured block
7. WHEN parsing structured block headers, THE Block_System SHALL verify the CRC8 matches the computed value
8. IF data starts with `0x04` (ECIES magic) without `0xBC` prefix, THE Block_System SHALL identify it as encrypted data
9. IF data lacks `0xBC` prefix and is not encrypted, THE Block_System SHALL treat it as raw/unknown data
10. THE structured header prefix format SHALL be: `[MagicPrefix(1)][BlockType(1)][Version(1)][CRC8(1)][...type-specific header...]`

### Requirement 10: CBL Header Format (extends Requirement 9)

**User Story:** As a developer, I want CBL headers to follow the universal format so that CBL data is not mistakenly parsed as encrypted data.

#### Acceptance Criteria

1. THE CBL_Header SHALL use magic bytes `0xBC 0x02` to identify CBL format
2. THE CBL_Header format SHALL be: `[0xBC][0x02][Version(1)][CRC8(1)][CreatorId][DateCreated][AddressCount][TupleSize][OriginalDataLength][OriginalDataChecksum][IsExtendedHeader][CreatorSignature]`
3. THE CRC8 SHALL be computed over header content from CreatorId through IsExtendedHeader (excluding signature)
4. WHEN data starts with `0x04` (ECIES magic) without `0xBC` prefix, THE CBL_System SHALL return "encrypted data" error, not parsing error

### Requirement 11: Unified Binary SuperCBL Format

**User Story:** As a developer, I want SuperCBL to use the same binary format as regular CBL so that all CBL types are consistent, signed, and size-efficient.

#### Acceptance Criteria

1. THE SuperCBL SHALL use magic bytes `0xBC 0x03` to identify SuperCBL format
2. THE SuperCBL_Header SHALL follow the universal header format with type-specific fields
3. THE SuperCBL SHALL store sub-CBL references as checksums (same as regular CBL addresses) rather than magnet URL strings
4. THE SuperCBL SHALL include a cryptographic signature from the creator
5. THE SuperCBL SHALL include metadata fields: depth, subCblCount, totalBlockCount
6. WHEN creating a SuperCBL, THE CBL_System SHALL use the same signing mechanism as regular CBLs
7. THE JSON-based SuperCBL format SHALL be removed (not deprecated)
8. THE SuperCBL SHALL support hierarchical nesting (SuperCBL referencing other SuperCBLs)

### Requirement 12: CRC8 Integration from ecies-lib

**User Story:** As a developer, I want to use the existing CRC8 utility from ecies-lib so that block headers can include integrity check digits without duplicating code.

#### Acceptance Criteria

1. THE Block_System SHALL use `CrcService.crc8()` from `@digitaldefiance/ecies-lib` for CRC8 calculations
2. THE Block_System SHALL use `CrcService.verifyCrc8()` from `@digitaldefiance/ecies-lib` for CRC8 verification
3. THE CRC8 integration SHALL be available in both `brightchain-lib` and `brightchain-api-lib`
4. ALL block header creation SHALL compute CRC8 over header content (after the CRC8 field, excluding signatures)
5. ALL block header parsing SHALL verify CRC8 before processing header fields

### Requirement 13: Affected Libraries

**User Story:** As a developer, I want clarity on which libraries are affected by the block header format changes so that all necessary updates are made consistently.

#### Acceptance Criteria

1. THE `brightchain-lib` SHALL be updated with the new universal block header format
2. THE `brightchain-api-lib` SHALL be updated to use the new block header format
3. THE CBLService in both libraries SHALL be updated to create and parse the new header format
4. THE SuperCBL JSON implementation SHALL be removed from both libraries
5. ALL existing tests SHALL be updated to work with the new header format
