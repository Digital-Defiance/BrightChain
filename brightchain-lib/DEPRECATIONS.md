# BrightChain Deprecations

This document lists all deprecated APIs in BrightChain and their recommended replacements.

## Overview

Deprecated APIs are marked with `@deprecated` JSDoc tags and will emit warnings when used. All deprecated APIs will be removed in version 3.0.0.

**Timeline:**
- **v2.0**: Deprecated APIs marked, warnings added
- **v2.x**: Deprecated APIs still functional
- **v3.0**: Deprecated APIs removed (planned Q4 2024)

## Deprecated APIs

### Checksum Types

#### ChecksumBuffer
**Status:** Deprecated in v2.0, will be removed in v3.0

**Old:**
```typescript
import { ChecksumBuffer } from 'brightchain-lib';
const checksum: ChecksumBuffer = Buffer.from(...);
```

**New:**
```typescript
import { Checksum } from 'brightchain-lib';
const checksum = Checksum.fromBuffer(Buffer.from(...));
```

**Reason:** Unified checksum type system provides better type safety and consistent API.

---

#### ChecksumUint8Array
**Status:** Deprecated in v2.0, will be removed in v3.0

**Old:**
```typescript
import { ChecksumUint8Array } from 'brightchain-lib';
const checksum: ChecksumUint8Array = new Uint8Array(...);
```

**New:**
```typescript
import { Checksum } from 'brightchain-lib';
const checksum = Checksum.fromUint8Array(new Uint8Array(...));
```

**Reason:** Unified checksum type system provides better type safety and consistent API.

---

### ChecksumService Methods

#### calculateChecksum()
**Status:** Deprecated in v2.0, will be removed in v3.0

**Old:**
```typescript
const checksum = checksumService.calculateChecksum(data);
```

**New:**
```typescript
const checksum = checksumService.calculateChecksumAsClass(data);
```

**Reason:** New method returns Checksum class instance with helpful methods.

---

#### calculateChecksumForBuffers()
**Status:** Deprecated in v2.0, will be removed in v3.0

**Old:**
```typescript
const checksum = checksumService.calculateChecksumForBuffers(buffers);
```

**New:**
```typescript
const checksum = checksumService.calculateChecksumForBuffersAsClass(buffers);
```

**Reason:** New method returns Checksum class instance with helpful methods.

---

#### calculateChecksumForString()
**Status:** Deprecated in v2.0, will be removed in v3.0

**Old:**
```typescript
const checksum = checksumService.calculateChecksumForString(str);
```

**New:**
```typescript
const checksum = checksumService.calculateChecksumForStringAsClass(str);
```

**Reason:** New method returns Checksum class instance with helpful methods.

---

#### calculateChecksumForFile()
**Status:** Deprecated in v2.0, will be removed in v3.0

**Old:**
```typescript
const checksum = await checksumService.calculateChecksumForFile(file);
```

**New:**
```typescript
const checksum = await checksumService.calculateChecksumForFileAsClass(file);
```

**Reason:** New method returns Checksum class instance with helpful methods.

---

#### calculateChecksumForStream()
**Status:** Deprecated in v2.0, will be removed in v3.0

**Old:**
```typescript
const checksum = await checksumService.calculateChecksumForStream(stream);
```

**New:**
```typescript
const checksum = await checksumService.calculateChecksumForStreamAsClass(stream);
```

**Reason:** New method returns Checksum class instance with helpful methods.

---

### Checksum Utility Functions

#### checksumToBuffer()
**Status:** Deprecated in v2.0, will be removed in v3.0

**Old:**
```typescript
import { checksumToBuffer } from 'brightchain-lib';
const buffer = checksumToBuffer(checksum);
```

**New:**
```typescript
const buffer = checksum.toBuffer();
```

**Reason:** Checksum class provides built-in conversion methods.

---

#### checksumToUint8Array()
**Status:** Deprecated in v2.0, will be removed in v3.0

**Old:**
```typescript
import { checksumToUint8Array } from 'brightchain-lib';
const array = checksumToUint8Array(checksum);
```

**New:**
```typescript
const array = checksum.toUint8Array();
```

**Reason:** Checksum class provides built-in conversion methods.

---

#### checksumToHex()
**Status:** Deprecated in v2.0, will be removed in v3.0

**Old:**
```typescript
import { checksumToHex } from 'brightchain-lib';
const hex = checksumToHex(checksum);
```

**New:**
```typescript
const hex = checksum.toHex();
```

**Reason:** Checksum class provides built-in conversion methods.

---

#### checksumFromHex()
**Status:** Deprecated in v2.0, will be removed in v3.0

**Old:**
```typescript
import { checksumFromHex } from 'brightchain-lib';
const checksum = checksumFromHex(hex);
```

**New:**
```typescript
const checksum = Checksum.fromHex(hex);
```

**Reason:** Checksum class provides built-in factory methods.

---

#### checksumFromBuffer()
**Status:** Deprecated in v2.0, will be removed in v3.0

**Old:**
```typescript
import { checksumFromBuffer } from 'brightchain-lib';
const checksum = checksumFromBuffer(buffer);
```

**New:**
```typescript
const checksum = Checksum.fromBuffer(buffer);
```

**Reason:** Checksum class provides built-in factory methods.

---

#### checksumFromUint8Array()
**Status:** Deprecated in v2.0, will be removed in v3.0

**Old:**
```typescript
import { checksumFromUint8Array } from 'brightchain-lib';
const checksum = checksumFromUint8Array(array);
```

**New:**
```typescript
const checksum = Checksum.fromUint8Array(array);
```

**Reason:** Checksum class provides built-in factory methods.

---

### Other Deprecated APIs

#### IConstants Interface
**Status:** Deprecated in v2.0, will be removed in v3.0

**Old:**
```typescript
import { IConstants } from 'brightchain-lib';
const constants: IConstants = { ... };
```

**New:**
```typescript
import { ICBLConsts, IFECConsts, ITupleConsts } from 'brightchain-lib';
const cblConsts: ICBLConsts = { ... };
```

**Reason:** Specific constant interfaces provide better type safety.

---

#### CBLService.CreatorLength (static)
**Status:** Deprecated in v2.0, will be removed in v3.0

**Old:**
```typescript
const length = CBLService.CreatorLength;
```

**New:**
```typescript
const cblService = new CBLService(...);
const length = cblService.creatorLength;
```

**Reason:** Instance method provides better encapsulation.

---

#### StringLanguages
**Status:** Deprecated in v2.0, will be removed in v3.0

**Old:**
```typescript
import { StringLanguages } from 'brightchain-lib';
const lang = StringLanguages.EN_US;
```

**New:**
```typescript
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
const lang = LanguageCodes.EN_US;
```

**Reason:** Use the canonical i18n-lib implementation.

---

#### registerTranslation()
**Status:** Deprecated in v2.0, will be removed in v3.0

**Old:**
```typescript
import { registerTranslation } from 'brightchain-lib';
registerTranslation(enumObj, translations);
```

**New:**
```typescript
// Use i18n-lib directly for translation management
import { i18n } from '@digitaldefiance/i18n-lib';
```

**Reason:** Stub function, use i18n-lib directly.

---

#### EnumLanguageTranslation Type
**Status:** Deprecated in v2.0, will be removed in v3.0

**Old:**
```typescript
import { EnumLanguageTranslation } from 'brightchain-lib';
type MyTranslation = EnumLanguageTranslation<MyEnum>;
```

**New:**
```typescript
// Use i18n-lib types directly
import { TranslationMap } from '@digitaldefiance/i18n-lib';
```

**Reason:** Stub type, use i18n-lib directly.

---

#### createTranslations()
**Status:** Deprecated in v2.0, will be removed in v3.0

**Old:**
```typescript
import { createTranslations } from 'brightchain-lib';
const translations = createTranslations({ ... });
```

**New:**
```typescript
// Use i18n-lib directly for translation management
import { i18n } from '@digitaldefiance/i18n-lib';
```

**Reason:** Stub function, use i18n-lib directly.

---

## Migration Strategy

### Step 1: Identify Usage
Search your codebase for deprecated API usage:

```bash
# Search for deprecated imports
grep -r "ChecksumBuffer\|ChecksumUint8Array" src/

# Search for deprecated methods
grep -r "calculateChecksum\|checksumTo\|checksumFrom" src/

# Search for deprecated utilities
grep -r "StringLanguages\|registerTranslation" src/
```

### Step 2: Update Imports
Replace deprecated imports with new ones:

```typescript
// Old
import { ChecksumBuffer, ChecksumUint8Array } from 'brightchain-lib';

// New
import { Checksum } from 'brightchain-lib';
```

### Step 3: Update Usage
Replace deprecated API calls with new ones:

```typescript
// Old
const checksum = checksumService.calculateChecksum(data);
const hex = Buffer.from(checksum).toString('hex');

// New
const checksum = checksumService.calculateChecksumAsClass(data);
const hex = checksum.toHex();
```

### Step 4: Test
Run your test suite to ensure everything works:

```bash
npm test
```

### Step 5: Remove Warnings
Verify no deprecation warnings appear in console output.

## Automated Migration

We provide scripts to help automate migration:

```bash
# Run migration scripts
npm run migrate:checksums
npm run migrate:properties

# Validate migration
npm run validate:migration
```

See [MIGRATION.md](./MIGRATION.md) for detailed migration instructions.

## Getting Help

If you need help migrating:

1. Check the [Migration Guide](./MIGRATION.md)
2. Review [Code Examples](./examples/)
3. Search [GitHub Issues](https://github.com/Digital-Defiance/BrightChain/issues)
4. Ask in [GitHub Discussions](https://github.com/Digital-Defiance/BrightChain/discussions)

## Deprecation Policy

BrightChain follows semantic versioning:

- **Minor versions (2.x)**: Deprecations added, old APIs still work
- **Major versions (3.0)**: Deprecated APIs removed

We maintain deprecated APIs for at least one major version to give you time to migrate.

---

**Last Updated:** January 2024  
**Applies to:** BrightChain v2.0+
