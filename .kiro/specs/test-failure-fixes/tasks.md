# Implementation Plan: Test Failure Fixes

## Overview

This plan systematically fixes test compilation errors by updating test code to match current type definitions and API signatures. The approach groups similar fixes together and proceeds from foundational issues to dependent issues.

## Tasks

- [x] 1. Fix ECIES Transform Tests
  - Update eciesDecryptTransform tests to use new ECIES API
  - Update eciesEncryptTransform tests to use new ECIES API
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 1.1 Fix eciesDecryptTransform.unit.test.ts
  - Update encrypt() calls to include encryptionType parameter
  - Update encrypt() calls to pass recipient as IMember
  - Remove unused @ts-expect-error directives
  - _Requirements: 2.1, 2.2_

- [x] 1.2 Fix eciesEncryptTransform.unit.spec.ts
  - Replace decryptSingleWithHeader() with correct method name
  - Update decrypt method calls to match new API
  - _Requirements: 2.2_

- [x] 1.3 Fix eciesDecryptTransform.integration.test.ts
  - Update encrypt() calls in integration tests
  - Remove unused @ts-expect-error directives
  - _Requirements: 2.1, 2.2_

- [x] 2. Fix Checksum Type Issues
  - Update tests to use ChecksumUint8Array consistently
  - Fix Buffer toString() calls
  - Add conversion utilities where needed
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 3.3_

- [x] 2.1 Fix diskBlockAsyncStore.spec.ts
  - Remove 'hex' parameter from toString() calls
  - Use Buffer.from() for checksum conversions
  - _Requirements: 3.1, 3.2_

- [x] 2.2 Fix checksum.service.spec.ts
  - Add equals() method usage or implement comparison
  - Fix stream type compatibility (Readable vs ReadableStream)
  - Update type assertions for ChecksumBuffer/ChecksumUint8Array
  - _Requirements: 1.2, 1.3, 3.2_

- [x] 2.3 Write property test for checksum conversions
  - **Property 1: Checksum Conversion Round Trip**
  - **Validates: Requirements 1.2, 7.1**

- [x] 2.4 Write property test for checksum equality
  - **Property 2: Checksum Equality is Reflexive and Symmetric**
  - **Validates: Requirements 1.3**

- [x] 2.5 Write property test for hex string conversions
  - **Property 3: Hex String Conversion Round Trip**
  - **Validates: Requirements 3.2**

- [x] 2.6 Fix cblStore.spec.ts checksum issues
  - Update ChecksumUint8Array to ChecksumBuffer conversions
  - Fix Buffer.equals() calls with IGuidV4 parameters
  - _Requirements: 1.2, 7.1_

- [x] 2.7 Fix cblStream.spec.ts checksum issues
  - Update function signatures to accept ChecksumUint8Array
  - Fix type compatibility in getWhitenedBlock callbacks
  - _Requirements: 1.2, 7.1_

- [x] 3. Fix Member Creation Issues
  - Update all newMember() calls to include email parameter
  - Fix private constructor usage
  - Update member property access
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 3.1 Fix tuple.service.spec.ts
  - Add email parameter to Member.newMember() calls
  - Fix metadata property access on IEphemeralBlock
  - _Requirements: 4.1, 4.2, 6.2_

- [x] 3.2 Fix sealing.service.spec.ts
  - Add email parameter to all Member.newMember() calls (alice, bob, charlie, david)
  - Fix asShortHexGuid property access on Buffer
  - _Requirements: 4.1, 4.2, 6.3_

- [x] 3.3 Fix document.system.spec.ts
  - Replace direct constructor calls with factory method
  - _Requirements: 4.2_

- [x] 3.4 Fix Member.spec.ts
  - Fix InvalidEmailError import path
  - Fix VotingService type compatibility
  - Fix wallet type conflicts
  - Remove 'hex' parameter from toString() calls
  - Fix SecureBuffer type compatibility
  - _Requirements: 4.4, 9.1, 10.4, 3.1, 7.4_

- [x] 4. Fix Block-Related Type Issues
  - Fix BlockHandle generic type usage
  - Fix block property access
  - Fix block metadata issues
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2_

- [x] 4.1 Fix handle.spec.ts
  - Add type parameter to BlockHandle declarations
  - Use BlockHandle.createFromPath() factory method
  - Fix checksum.toString() calls
  - Ensure BlockHandle is used as type, not value
  - _Requirements: 5.1, 5.2, 5.3, 3.1_

- [x] 4.2 Fix handleTuple.spec.ts
  - Add type parameter to BlockHandle declarations
  - Fix ChecksumBuffer/ChecksumUint8Array conversions
  - Use BlockHandle as type, not value
  - _Requirements: 5.1, 5.2, 5.3, 1.2_

- [x] 4.3 Fix base.spec.ts
  - Implement missing abstract members (layerOverheadSize, layerData, layerPayload, layerPayloadSize)
  - Fix ChecksumBuffer/ChecksumUint8Array conversions
  - Remove invalid override modifier from payload getter
  - Fix equals() method calls on checksums
  - _Requirements: 8.1, 1.2, 6.1, 1.3_

- [x] 4.4 Fix rawData.spec.ts
  - Fix checksum type casting
  - Remove payload property access (use correct property)
  - Fix ChecksumBuffer/ChecksumUint8Array compatibility
  - _Requirements: 7.1, 6.1, 1.2_

- [x] 4.5 Fix whitened.spec.ts
  - Remove payload property access (use correct property)
  - _Requirements: 6.1_

- [x] 4.6 Fix ephemeral.spec.ts
  - Fix constructor parameter count (remove extra parameter)
  - Fix ChecksumBuffer/ChecksumUint8Array conversions
  - Add email parameter to Member.newMember()
  - Remove payload property access
  - Fix equals() method calls on checksums
  - _Requirements: 8.3, 1.2, 4.1, 6.1, 1.3_

- [x] 4.7 Fix encrypted.spec.ts
  - Fix TestEncryptedBlock class to match base class signature
  - Fix constructor parameter count
  - Fix ChecksumBuffer/ChecksumUint8Array conversions
  - Fix EncryptedBlockMetadata.fromEphemeralBlockMetadata() call
  - Fix equals() method calls on checksums
  - _Requirements: 8.1, 8.3, 1.2, 8.3, 1.3_

- [x] 5. Fix Service and Interface Issues
  - Fix blockCapacity.service.spec.ts interface issues
  - Fix fec.service.spec.ts type casting
  - Fix voting service API usage
  - _Requirements: 6.2, 6.3, 7.3, 10.1_

- [x] 5.1 Fix blockCapacity.service.spec.ts
  - Remove usesStandardEncryption property (not in interface)
  - Replace typeSpecificHeader with typeSpecificOverhead
  - Remove filename and mimetype properties (not in interface)
  - _Requirements: 6.2_

- [x] 5.2 Fix fec.service.spec.ts
  - Fix BaseBlock type casting (convert through 'unknown')
  - _Requirements: 7.3_

- [x] 5.3 Fix interfaces/constants.spec.ts
  - Fix type assignments for HasBackupCodes, HasEncryption, HasKeyring, HasOverhead, HasGuidSize
  - Update to match actual type definitions
  - _Requirements: 6.2_

- [x] 6. Fix CBL Block Tests
  - Fix cbl.spec.ts type and API issues
  - _Requirements: 2.4, 4.2, 4.4, 5.2, 7.1, 10.1_

- [x] 6.1 Fix cbl.spec.ts
  - Fix BlockEncryptionType parameter (use proper type instead of boolean)
  - Fix creator.id.asRawGuidArray property access
  - Fix SecureBuffer type compatibility for private key
  - Fix ChecksumUint8Array to Buffer conversion
  - Fix generateVotingKeyPair() method name
  - Replace direct constructor with factory method
  - Fix Buffer.equals() with IGuidV4 parameter
  - Fix BlockHandle usage (type vs value)
  - Remove 'hex' parameter from toString() calls
  - _Requirements: 2.4, 4.2, 4.4, 5.2, 7.1, 10.1, 3.1_

- [x] 7. Checkpoint - Verify all tests compile
  - Run TypeScript compilation on all test files
  - Ensure no compilation errors remain
  - Document any remaining issues that need production code changes

- [x] 8. Run test suite and fix runtime issues
  - Execute full test suite
  - Fix any runtime errors that appear after compilation succeeds
  - Verify test intent is preserved

- [x] 9. Final checkpoint - Ensure all tests pass
  - All tests now pass (485 passed, 0 skipped, 0 failed)
  - Fixed both previously skipped tests:
    - Fixed encrypted block GUID validation by using `GuidV4.fromBuffer()` instead of constructor
    - Fixed invalid public key test by adding validation to `EciesEncryptTransform` constructor
  - Test suite is now at 100% pass rate

## Notes

- All tasks are required including property-based tests for conversion utilities
- Most fixes are straightforward type updates and API signature changes
- Focus on compilation first, then runtime behavior
- Preserve original test intent while updating implementation
- Group similar fixes together for efficiency
