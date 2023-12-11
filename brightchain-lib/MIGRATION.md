# BrightChain Migration Guide

This guide documents the breaking changes introduced when deprecated APIs were removed from BrightChain.

## Table of Contents

- [Overview](#overview)
- [Breaking Changes](#breaking-changes)
  - [1. Unified Checksum Type System](#1-unified-checksum-type-system)
  - [2. Checksum Utility Functions Removed](#2-checksum-utility-functions-removed)
  - [3. ChecksumService Methods Updated](#3-checksumservice-methods-updated)
  - [4. Deprecated Type Aliases Removed](#4-deprecated-type-aliases-removed)
  - [5. Deprecated i18n Functions Removed](#5-deprecated-i18n-functions-removed)
  - [6. StringLanguages Removed](#6-stringlanguages-removed)
  - [7. IConstants Interface Removed](#7-iconstants-interface-removed)
  - [8. CBLService Static Property Removed](#8-cblservice-static-property-removed)
- [Getting Help](#getting-help)

## Overview

All deprecated APIs have been removed from BrightChain. This guide helps you update your code to use the current APIs.

**Key Changes:**
- Unified checksum type system with the `Checksum` class only
- Removed all deprecated utility functions
- Simplified ChecksumService API
- Removed deprecated i18n compatibility functions
- Removed deprecated type aliases

## Breaking Changes

### 1. Unified Checksum Type System

**What Changed:**
The `ChecksumBuffer` and `ChecksumUint8Array` type aliases have been completely removed. Only the `Checksum` class is supported.

#### Before

```typescript
import { ChecksumBuffer, ChecksumUint8Array } from 'brightchain-lib';

const checksumBuffer: ChecksumBuffer = Buffer.from(data);
const checksumArray: ChecksumUint8Array = new Uint8Array(checksumBuffer);
```

#### After

```typescript
import { Checksum } from 'brightchain-lib';

const checksum = Checksum.fromBuffer(Buffer.from(data));
// or
const checksum = Checksum.fromUint8Array(new Uint8Array(data));
```

### 2. Checksum Utility Functions Removed

**What Changed:**
All checksum utility functions from `brightchain-lib/utils/checksumUtils` have been removed.

#### Before

```typescript
import {
  checksumToBuffer,
  checksumToUint8Array,
  checksumToHex,
  checksumFromHex,
  checksumFromBuffer,
  checksumFromUint8Array
} from 'brightchain-lib';

const buffer = checksumToBuffer(checksum);
const hex = checksumToHex(checksum);
const newChecksum = checksumFromHex(hexString);
```

#### After

```typescript
import { Checksum } from 'brightchain-lib';

// Use Checksum class methods directly
const buffer = checksum.toBuffer();
const hex = checksum.toHex();
const newChecksum = Checksum.fromHex(hexString);
```

### 3. ChecksumService Methods Updated

**What Changed:**
All ChecksumService methods now return `Checksum` class instances. The `*AsClass` method variants have been removed.

#### Before

```typescript
// Old deprecated methods
const checksum = checksumService.calculateChecksum(data);
const checksum = checksumService.calculateChecksumForBuffers(buffers);
const checksum = checksumService.calculateChecksumForString(str);
const checksum = checksumService.calculateChecksumForFile(file);
const checksum = checksumService.calculateChecksumForStream(stream);

// Or the *AsClass variants
const checksum = checksumService.calculateChecksumAsClass(data);
```

#### After

```typescript
// All methods now return Checksum class
const checksum = checksumService.calculateChecksum(data);
const checksum = checksumService.calculateChecksumForBuffers(buffers);
const checksum = checksumService.calculateChecksumForString(str);
const checksum = checksumService.calculateChecksumForFile(file);
const checksum = checksumService.calculateChecksumForStream(stream);
```

### 4. Deprecated Type Aliases Removed

**What Changed:**
The `types.ts` file containing deprecated type aliases has been removed.

#### Before

```typescript
import { EnumLanguageTranslation, createTranslations } from 'brightchain-lib';
```

#### After

These types are no longer available. If you need similar functionality, implement it in your own codebase.

### 5. Deprecated i18n Functions Removed

**What Changed:**
The `registerTranslation` function has been removed from the i18n module.

#### Before

```typescript
import { registerTranslation } from 'brightchain-lib';

registerTranslation(MyEnum, translations);
```

#### After

This function is no longer available. Use the `@digitaldefiance/i18n-lib` package directly for advanced i18n features.

### 6. StringLanguages Removed

**What Changed:**
The `StringLanguages` enum has been removed.

#### Before

```typescript
import { StringLanguages } from 'brightchain-lib';

const language = StringLanguages.EnglishUS;
```

#### After

```typescript
import { LanguageCodes } from '@digitaldefiance/i18n-lib';

const language = LanguageCodes.EN_US;
```

### 7. IConstants Interface Removed

**What Changed:**
The generic `IConstants` interface has been removed.

#### Before

```typescript
import { IConstants } from 'brightchain-lib';

const constants: IConstants = { ... };
```

#### After

Use specific constant interfaces instead:

```typescript
import { ICBLConsts, IFECConsts, ITupleConsts } from 'brightchain-lib';

const cblConstants: ICBLConsts = { ... };
const fecConstants: IFECConsts = { ... };
```

### 8. CBLService Static Property Removed

**What Changed:**
The static `CreatorLength` property has been removed from CBLService.

#### Before

```typescript
const length = CBLService.CreatorLength;
```

#### After

```typescript
const cblService = new CBLService();
const length = cblService.creatorLength;
```

## Getting Help

If you encounter issues during migration:

1. **Check the documentation:**
   - [API Documentation](./docs/API.md)
   - [Type System Guide](./docs/TYPE_SYSTEM.md)

2. **Search existing issues:**
   - [GitHub Issues](https://github.com/Digital-Defiance/BrightChain/issues)

3. **Ask for help:**
   - [GitHub Discussions](https://github.com/Digital-Defiance/BrightChain/discussions)

---

**Last Updated:** January 2025  
**Applies to:** BrightChain v2.0+

## Table of Contents

- [Overview](#overview)
- [Migration Timeline](#migration-timeline)
- [Breaking Changes](#breaking-changes)
  - [1. Unified Checksum Type System](#1-unified-checksum-type-system)
  - [2. Factory Pattern Enforcement](#2-factory-pattern-enforcement)
  - [3. Generic Type Requirements](#3-generic-type-requirements)
  - [4. Property Name Changes](#4-property-name-changes)
  - [5. Error Handling Updates](#5-error-handling-updates)
- [Deprecated APIs](#deprecated-apis)
- [Automated Migration Tools](#automated-migration-tools)
- [Getting Help](#getting-help)

## Overview

Version 2.0 of BrightChain introduces several design improvements to enhance type safety, consistency, and maintainability. While we've maintained backward compatibility where possible, some changes require code updates.

**Key Improvements:**
- Unified checksum type system with the `Checksum` class
- Enforced factory patterns for object creation
- Complete generic type implementation for `BlockHandle`
- Consistent property naming across interfaces
- Enhanced error handling with rich context

## Migration Timeline

| Version | Status | Timeline | Notes |
|---------|--------|----------|-------|
| 1.x | Current | - | Legacy APIs fully supported |
| 2.0 | Beta | Q1 2024 | New APIs available, deprecation warnings added |
| 2.1 | Stable | Q2 2024 | Recommended for new projects |
| 3.0 | Future | Q4 2024 | Legacy APIs removed |

**Recommendation:** Migrate to new APIs during the 2.x release cycle to avoid breaking changes in 3.0.

## Breaking Changes

### 1. Unified Checksum Type System

**What Changed:**
The separate `ChecksumBuffer` and `ChecksumUint8Array` types have been replaced with a unified `Checksum` class.

**Why:**
- Eliminates manual type conversions
- Provides consistent API across all checksum operations
- Adds helpful methods like `equals()`, `toHex()`, `toString()`

#### Before (v1.x)

```typescript
import { ChecksumBuffer, ChecksumUint8Array } from 'brightchain-lib';

// Manual conversions required
const checksumBuffer: ChecksumBuffer = Buffer.from(data);
const checksumArray: ChecksumUint8Array = new Uint8Array(checksumBuffer);

// Manual comparison
function compareChecksums(a: ChecksumBuffer, b: ChecksumBuffer): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// Manual hex conversion
const hex = checksumBuffer.toString('hex');
```

#### After (v2.0)

```typescript
import { Checksum } from 'brightchain-lib';

// Create from any compatible type
const checksum = Checksum.fromBuffer(buffer);
// or
const checksum = Checksum.fromUint8Array(array);
// or
const checksum = Checksum.fromHex('abc123...');

// Built-in comparison
const isEqual = checksum1.equals(checksum2);

// Built-in hex conversion
const hex = checksum.toHex();
// or
const hex = checksum.toString();

// Convert to other formats when needed
const buffer = checksum.toBuffer();
const array = checksum.toUint8Array();
```

#### Migration Steps

1. **Replace type imports:**
   ```typescript
   // Old
   import { ChecksumBuffer, ChecksumUint8Array } from 'brightchain-lib';
   
   // New
   import { Checksum } from 'brightchain-lib';
   ```

2. **Update variable declarations:**
   ```typescript
   // Old
   let checksum: ChecksumBuffer;
   
   // New
   let checksum: Checksum;
   ```

3. **Use factory methods for creation:**
   ```typescript
   // Old
   const checksum = Buffer.from(data);
   
   // New
   const checksum = Checksum.fromBuffer(Buffer.from(data));
   ```

4. **Replace manual comparisons:**
   ```typescript
   // Old
   if (checksum1.equals(checksum2)) { ... }
   
   // New
   if (checksum1.equals(checksum2)) { ... }  // Same API!
   ```

5. **Update service method calls:**
   ```typescript
   // Old
   const checksum = checksumService.calculateChecksum(data);
   
   // New (preferred)
   const checksum = checksumService.calculateChecksumAsClass(data);
   
   // Old method still works but is deprecated
   const checksum = checksumService.calculateChecksum(data);
   ```

### 2. Factory Pattern Enforcement

**What Changed:**
Classes using factory patterns now enforce their use at runtime, preventing direct constructor calls.

**Why:**
- Ensures proper validation during object creation
- Prevents invalid object states
- Makes factory pattern usage explicit and consistent

#### Before (v1.x)

```typescript
// Direct constructor calls were possible (but discouraged)
const member = new MemberDocument(publicMember, privateMember, ...);
```

#### After (v2.0)

```typescript
// Must use factory method
const member = MemberDocument.create(publicMember, privateMember, ...);

// Direct constructor call throws FactoryPatternViolationError
try {
  const member = new MemberDocument(...);  // ❌ Throws error
} catch (error) {
  if (error instanceof FactoryPatternViolationError) {
    console.error('Use MemberDocument.create() instead');
  }
}
```

#### Migration Steps

1. **Find direct constructor calls:**
   ```bash
   # Search for direct instantiation
   grep -r "new MemberDocument" src/
   grep -r "new.*Block(" src/
   ```

2. **Replace with factory methods:**
   ```typescript
   // Old
   const doc = new MemberDocument(public, private, data);
   
   // New
   const doc = MemberDocument.create(public, private, data);
   ```

3. **Update error handling:**
   ```typescript
   import { FactoryPatternViolationError } from 'brightchain-lib';
   
   try {
     // ... code ...
   } catch (error) {
     if (error instanceof FactoryPatternViolationError) {
       // Handle factory pattern violation
     }
   }
   ```

### 3. Generic Type Requirements

**What Changed:**
`BlockHandle<T>` now requires a type parameter - it cannot be used without one.

**Why:**
- Provides full type safety when working with block handles
- Enables better IDE autocomplete and type checking
- Catches type mismatches at compile time

#### Before (v1.x)

```typescript
// Type parameter was optional
let handle: BlockHandle;  // ⚠️ No type safety
handle = someBlockHandle;
```

#### After (v2.0)

```typescript
// Type parameter is required
let handle: BlockHandle<BaseBlock>;  // ✅ Type safe
handle = someBlockHandle;

// Specific block types
let rawDataHandle: BlockHandle<RawDataBlock>;
let cblHandle: BlockHandle<ConstituentBlockListBlock>;
```

#### Migration Steps

1. **Add type parameters to all BlockHandle declarations:**
   ```typescript
   // Old
   function processHandle(handle: BlockHandle) { ... }
   
   // New
   function processHandle(handle: BlockHandle<BaseBlock>) { ... }
   ```

2. **Update interface definitions:**
   ```typescript
   // Old
   interface MyInterface {
     handle: BlockHandle;
   }
   
   // New
   interface MyInterface {
     handle: BlockHandle<BaseBlock>;
   }
   ```

3. **Fix TypeScript compilation errors:**
   ```bash
   # Run TypeScript compiler to find all missing type parameters
   npx tsc --noEmit
   ```

### 4. Property Name Changes

**What Changed:**
Several properties have been renamed for consistency across the codebase.

**Why:**
- Establishes consistent terminology
- Reduces confusion between similar concepts
- Aligns with industry standards

#### Changes

| Old Name | New Name | Affected Interfaces |
|----------|----------|---------------------|
| `typeSpecificHeader` | `typeSpecificOverhead` | `IOverheadBreakdown` |
| `payload` | `data` | Block interfaces |

#### Before (v1.x)

```typescript
// Using old property names
const overhead = breakdown.typeSpecificHeader;
const content = block.payload;
```

#### After (v2.0)

```typescript
// Using new property names
const overhead = breakdown.typeSpecificOverhead;
const content = block.data;

// Old names still work via deprecated getters (with warnings)
const overhead = breakdown.typeSpecificHeader;  // ⚠️ Deprecated
```

#### Migration Steps

1. **Update property access:**
   ```typescript
   // Old
   const header = breakdown.typeSpecificHeader;
   const payload = block.payload;
   
   // New
   const overhead = breakdown.typeSpecificOverhead;
   const data = block.data;
   ```

2. **Search and replace:**
   ```bash
   # Find all usages
   grep -r "typeSpecificHeader" src/
   grep -r "\.payload" src/
   ```

3. **Update tests:**
   ```typescript
   // Old
   expect(result.typeSpecificHeader).toBe(128);
   
   // New
   expect(result.typeSpecificOverhead).toBe(128);
   ```

### 5. Error Handling Updates

**What Changed:**
All errors now extend from `BrightChainError` base class with consistent structure.

**Why:**
- Provides consistent error handling across the library
- Includes rich context for debugging
- Enables type-safe error handling with type guards

#### Before (v1.x)

```typescript
// Inconsistent error types
try {
  // ... code ...
} catch (error) {
  if (error.message.includes('validation')) {
    // Handle validation error
  }
}
```

#### After (v2.0)

```typescript
import {
  BrightChainError,
  ValidationError,
  ChecksumError,
  isValidationError,
  isChecksumError
} from 'brightchain-lib';

try {
  // ... code ...
} catch (error) {
  if (isValidationError(error)) {
    console.error(`Validation failed for ${error.field}: ${error.message}`);
    console.error('Context:', error.context);
  } else if (isChecksumError(error)) {
    console.error(`Checksum error: ${error.checksumErrorType}`);
  } else if (error instanceof BrightChainError) {
    console.error(`BrightChain error: ${error.type}`);
    console.error('Context:', error.context);
    if (error.cause) {
      console.error('Caused by:', error.cause);
    }
  }
}
```

#### Migration Steps

1. **Import error types and type guards:**
   ```typescript
   import {
     BrightChainError,
     ValidationError,
     ChecksumError,
     isValidationError,
     isChecksumError,
     isBrightChainError
   } from 'brightchain-lib';
   ```

2. **Update error handling:**
   ```typescript
   // Old
   catch (error) {
     console.error(error.message);
   }
   
   // New
   catch (error) {
     if (isBrightChainError(error)) {
       console.error(`${error.type}: ${error.message}`);
       console.error('Context:', error.context);
     } else {
       console.error(error);
     }
   }
   ```

3. **Use type guards for specific errors:**
   ```typescript
   if (isValidationError(error)) {
     // TypeScript knows error is ValidationError here
     console.error(`Field ${error.field} failed validation`);
   }
   ```

## Deprecated APIs

The following APIs are deprecated and will be removed in version 3.0:

### Checksum Types

```typescript
// ❌ Deprecated - will be removed in v3.0
import { ChecksumBuffer, ChecksumUint8Array } from 'brightchain-lib';

// ✅ Use instead
import { Checksum } from 'brightchain-lib';
```

### Checksum Service Methods

```typescript
// ❌ Deprecated - will be removed in v3.0
checksumService.calculateChecksum(data);
checksumService.calculateChecksumForBuffers(buffers);
checksumService.calculateChecksumForString(str);
checksumService.calculateChecksumForFile(file);
checksumService.calculateChecksumForStream(stream);

// ✅ Use instead
checksumService.calculateChecksumAsClass(data);
checksumService.calculateChecksumForBuffersAsClass(buffers);
checksumService.calculateChecksumForStringAsClass(str);
checksumService.calculateChecksumForFileAsClass(file);
checksumService.calculateChecksumForStreamAsClass(stream);
```

### Property Names

```typescript
// ❌ Deprecated - will be removed in v3.0
breakdown.typeSpecificHeader
block.payload

// ✅ Use instead
breakdown.typeSpecificOverhead
block.data
```

## Automated Migration Tools

We provide scripts to help automate common migration tasks:

### Checksum Migration Script

```bash
# Run the checksum migration script
npm run migrate:checksums

# Or manually with Node
node scripts/migrate-checksums.js src/
```

This script will:
- Replace `ChecksumBuffer` and `ChecksumUint8Array` imports with `Checksum`
- Update variable type declarations
- Convert factory method calls to use new `*AsClass` methods

### Property Name Migration Script

```bash
# Run the property name migration script
npm run migrate:properties

# Or manually
node scripts/migrate-properties.js src/
```

This script will:
- Replace `typeSpecificHeader` with `typeSpecificOverhead`
- Replace `.payload` with `.data`
- Update test assertions

### Validation Script

```bash
# Validate your migration
npm run validate:migration
```

This script will:
- Check for remaining deprecated API usage
- Report TypeScript compilation errors
- Suggest fixes for common issues

## Getting Help

If you encounter issues during migration:

1. **Check the documentation:**
   - [API Documentation](./docs/API.md)
   - [Type System Guide](./docs/TYPE_SYSTEM.md)
   - [Error Handling Guide](./docs/ERROR_HANDLING.md)

2. **Search existing issues:**
   - [GitHub Issues](https://github.com/Digital-Defiance/BrightChain/issues)

3. **Ask for help:**
   - [GitHub Discussions](https://github.com/Digital-Defiance/BrightChain/discussions)
   - [Discord Community](https://discord.gg/brightchain)

4. **Report bugs:**
   - [File a bug report](https://github.com/Digital-Defiance/BrightChain/issues/new?template=bug_report.md)

## Migration Checklist

Use this checklist to track your migration progress:

- [ ] Update all checksum type imports to use `Checksum` class
- [ ] Replace direct constructor calls with factory methods
- [ ] Add type parameters to all `BlockHandle` declarations
- [ ] Update property names (`typeSpecificHeader` → `typeSpecificOverhead`, `payload` → `data`)
- [ ] Update error handling to use new error types and type guards
- [ ] Run automated migration scripts
- [ ] Fix all TypeScript compilation errors
- [ ] Update tests to use new APIs
- [ ] Run full test suite
- [ ] Remove all deprecation warnings
- [ ] Update documentation and examples

## Version-Specific Notes

### Migrating from 1.0 to 2.0

- All deprecated APIs still work but emit console warnings
- No breaking changes if you don't use TypeScript strict mode
- Recommended to migrate incrementally, one module at a time

### Migrating from 2.0 to 3.0 (Future)

- All deprecated APIs will be removed
- Must complete migration to new APIs before upgrading
- Breaking changes will be clearly documented in release notes

---

**Last Updated:** January 2024  
**Applies to:** BrightChain v2.0+
