# BrightChain Naming Conventions

## Overview

This document establishes standard terminology and naming conventions for the BrightChain library to ensure consistency across the codebase.

## Core Terminology

### Block Content Terminology

#### `data`
**Usage**: Refers to the complete block data including all headers, content, and padding.

**Examples**:
```typescript
// Full block data
get data(): Uint8Array | Readable;
```

**Rationale**: "Data" is the most general term and should be used for the complete, unprocessed block content.

#### `layerData`
**Usage**: Refers to a specific layer's data including its header and content, but excluding parent layer headers.

**Examples**:
```typescript
// This layer's data (header + content)
get layerData(): Uint8Array;
```

**Rationale**: Qualified with "layer" to indicate scope. Includes the layer's header.

#### `layerPayload`
**Usage**: Refers to the actual content data of a layer, excluding headers and padding.

**Examples**:
```typescript
// The actual content data (no headers, no padding)
get layerPayload(): Uint8Array;
```

**Rationale**: "Payload" is an established term in networking and data structures for "the actual data being carried". The "layer" qualifier makes it clear this is layer-specific. This term is acceptable because:
1. It's qualified with "layer" to indicate scope
2. It clearly distinguishes from `layerData` (which includes headers)
3. It's a well-understood term in the domain
4. It follows the pattern: `data` (everything) → `layerData` (layer with header) → `layerPayload` (layer content only)

#### `layerPayloadSize` / `layerDataSize`
**Usage**: The size in bytes of the corresponding data.

**Examples**:
```typescript
get layerPayloadSize(): number;  // Size of content only
get layerDataSize(): number;      // Size of header + content
```

**Rationale**: Size properties should match their corresponding data property names.

### Overhead vs Header Terminology

#### `overhead`
**Usage**: Refers to any bytes that are not user data, including headers, metadata, encryption data, padding, etc.

**Examples**:
```typescript
interface IOverheadBreakdown {
  baseHeader: number;
  typeSpecificOverhead: number;
  encryptionOverhead: number;
  variableOverhead: number;
}
```

**Rationale**: "Overhead" is more general and accurate than "header" for describing all non-user-data bytes.

#### `header`
**Usage**: Refers specifically to structured metadata at the beginning of a block or layer.

**Examples**:
```typescript
get layerHeaderData(): Uint8Array;  // The header bytes
get fullHeaderData(): Uint8Array;   // All headers concatenated
```

**Rationale**: "Header" should only be used when referring to the actual header structure, not general overhead.

### Message Payload (WebSocket/API Context)

#### `payload`
**Usage**: In WebSocket messages and API contexts, "payload" refers to the message content.

**Examples**:
```typescript
interface IWebSocketMessage<T> {
  type: string;
  payload: T;  // Message content
  timestamp: string;
}
```

**Rationale**: In messaging contexts, "payload" is the standard term and should be retained. This is a different domain from block data structures.

## Naming Patterns

### Property Naming

1. **Descriptive Qualifiers**: Use qualifiers like `layer`, `full`, `base` to indicate scope
   - `layerData` vs `data`
   - `layerHeaderData` vs `fullHeaderData`
   - `baseHeader` vs `typeSpecificOverhead`

2. **Size vs Length Suffixes**: Use semantically appropriate suffixes
   - **"Size"** for structural, categorical, or fixed measurements:
     - `blockSize` (category: Tiny, Small, Medium, etc.)
     - `layerOverheadSize` (structural component size)
     - `tupleSize` (fixed structure size)
     - `size` (metadata field for byte count)
   - **"Length"** for linear, variable, or content measurements:
     - `originalDataLength` (data measurement)
     - `fileNameLength` (string length)
     - `checksumBufferLength` (buffer length)
     - `lengthBeforeEncryption` (pre-transformation measurement)
   - **Rationale**: This distinction provides semantic clarity about what is being measured

3. **Boolean Properties**: Use `can`, `is`, `has` prefixes
   - `canRead`, `canPersist`, `canEncrypt`
   - `isExtendedCbl`, `isEncrypted`
   - `hasSignature`, `hasMetadata`

4. **Collection Properties**: Use plural forms
   - `layers`, `addresses`, `recipients`
   - Not: `layerList`, `addressArray`

### Method Naming

1. **Getters**: Use `get` prefix for methods that retrieve data
   - `getFileName()`, `getMimeType()`
   - Not: `fileName()`, `retrieveFileName()`

2. **Validation**: Use `validate` prefix
   - `validateSync()`, `validateAsync()`
   - `validateSignature()`, `validateFormat()`

3. **Conversion**: Use `to` prefix for conversions
   - `toBuffer()`, `toHex()`, `toString()`
   - Not: `asBuffer()`, `convertToHex()`

4. **Factory Methods**: Use `create`, `from`, or `new` prefixes
   - `create()`, `createFrom()`
   - `fromBuffer()`, `fromHex()`
   - `newMember()`, `newBlock()`

### Type Naming

1. **Interfaces**: Prefix with `I`
   - `IBaseBlock`, `IBlockCapacityParams`
   - Not: `BaseBlock` (that's the class)

2. **Enums**: Use singular form, PascalCase
   - `BlockType`, `BlockSize`, `BlockEncryptionType`
   - Not: `BlockTypes`, `BLOCK_TYPE`

3. **Error Types**: Suffix with `Error`
   - `ValidationError`, `ChecksumError`, `BrightChainError`
   - Not: `ValidationException`, `ChecksumFailure`

4. **Type Aliases**: Use descriptive names
   - `ChecksumString`, `ChecksumUint8Array`
   - Not: `CS`, `CUA`

## Domain-Specific Conventions

### Block Types

- **RawData**: Unprocessed data blocks
- **Ephemeral**: Temporary blocks not persisted
- **Encrypted**: Blocks with encryption applied
- **Whitened**: Blocks XORed with random data
- **CBL**: Constituent Block List (list of block references)
- **ExtendedCBL**: CBL with additional metadata (filename, MIME type)

### Encryption Types

- **SingleRecipient**: Encrypted for one recipient
- **MultiRecipient**: Encrypted for multiple recipients
- **Unencrypted**: No encryption applied

### Block Sizes

Use the enum values: `Tiny`, `Small`, `Medium`, `Large`, `Huge`, `Massive`

Not: `TINY`, `tiny`, `TinyBlock`

## Migration Guidelines

### When Renaming Properties

1. **Add Deprecated Getter**: Keep old name with `@deprecated` tag
```typescript
/** @deprecated Use typeSpecificOverhead instead. Will be removed in v2.0.0 */
get typeSpecificHeader(): number {
  return this.typeSpecificOverhead;
}
```

2. **Update Documentation**: Explain the change and migration path
```typescript
/**
 * Type-specific overhead in bytes
 * @remarks Renamed from typeSpecificHeader for consistency
 */
typeSpecificOverhead: number;
```

3. **Provide Type Aliases**: For type renames
```typescript
/** @deprecated Use Checksum class instead. Will be removed in v2.0.0 */
export type ChecksumBuffer = Buffer;
```

### When Adding New Properties

1. **Follow Existing Patterns**: Look at similar properties in the codebase
2. **Use Descriptive Names**: Avoid abbreviations unless well-established
3. **Add JSDoc Comments**: Document purpose, usage, and examples
4. **Consider Scope**: Use qualifiers (`layer`, `full`, `base`) appropriately

## Examples

### Good Naming

```typescript
interface IBlockCapacityResult {
  totalCapacity: number;           // Clear, descriptive
  availableCapacity: number;       // Qualified with "available"
  overhead: number;                // General term for non-data bytes
  details: IOverheadBreakdown;     // Descriptive, not abbreviated
}

interface IOverheadBreakdown {
  baseHeader: number;              // Qualified with "base"
  typeSpecificOverhead: number;    // Qualified, uses "overhead"
  encryptionOverhead: number;      // Qualified, uses "overhead"
  variableOverhead: number;        // Qualified, uses "overhead"
}

class BaseBlock {
  get data(): Uint8Array;          // Full block data
  get layerData(): Uint8Array;     // This layer's data
  get layerPayload(): Uint8Array;  // This layer's content
  get layerPayloadSize(): number;  // Matches layerPayload
}
```

### Poor Naming (Avoid)

```typescript
interface IBlockCapacityResult {
  cap: number;                     // Too abbreviated
  avail: number;                   // Too abbreviated
  hdr: number;                     // Too abbreviated
  dtls: IOverheadBreakdown;        // Too abbreviated
}

interface IOverheadBreakdown {
  header: number;                  // Not qualified (which header?)
  typeHeader: number;              // Inconsistent with "overhead"
  encHdr: number;                  // Abbreviated
  varOH: number;                   // Abbreviated
}

class BaseBlock {
  get blockData(): Uint8Array;     // Redundant "block" prefix
  get thisLayerData(): Uint8Array; // Verbose, "layer" is sufficient
  get content(): Uint8Array;       // Ambiguous
  get contentLen(): number;        // Abbreviated, doesn't match property
}
```

## Rationale

### Why These Conventions?

1. **Consistency**: Predictable names make the codebase easier to navigate
2. **Clarity**: Descriptive names reduce the need for documentation
3. **Maintainability**: Clear patterns make refactoring safer
4. **IDE Support**: Consistent naming improves autocomplete and search
5. **Onboarding**: New developers can understand the code faster
6. **Type Safety**: Clear names help TypeScript infer types correctly

### Why "Payload" is Acceptable in Block Context

The term "payload" is retained in `layerPayload` because:

1. **Domain Appropriateness**: In data structures and networking, "payload" specifically means "the actual data being carried, excluding metadata"
2. **Clear Distinction**: It distinguishes from `layerData` (which includes headers)
3. **Qualified Usage**: The "layer" prefix makes the scope clear
4. **Established Pattern**: The codebase already uses this consistently
5. **Semantic Accuracy**: It accurately describes "the content we're carrying" vs "the structure carrying it"

The hierarchy is clear:
- `data` = everything (all layers, all headers, all content, padding)
- `layerData` = this layer (this layer's header + this layer's content)
- `layerPayload` = this layer's content (just the actual data, no header)

## Review and Updates

This document should be reviewed and updated:
- When adding new major features
- When refactoring existing code
- When inconsistencies are discovered
- At least once per major version

## Quick Reference

### Common Patterns

| Pattern | Example | Use Case |
|---------|---------|----------|
| `I` prefix | `IBaseBlock` | Interfaces |
| `get` prefix | `getFileName()` | Getter methods |
| `validate` prefix | `validateFormat()` | Validation methods |
| `to` prefix | `toBuffer()` | Conversion methods |
| `from` prefix | `fromHex()` | Factory methods |
| `is` prefix | `isEncrypted` | Boolean properties |
| `has` prefix | `hasSignature` | Boolean properties |
| `can` prefix | `canRead` | Capability properties |
| `Error` suffix | `ValidationError` | Error classes |
| `Service` suffix | `ChecksumService` | Service classes |
| `size` suffix | `blockSize` | Structural/categorical measurements |
| `length` suffix | `dataLength` | Linear/variable measurements |

### Terminology Quick Reference

| Term | Meaning | Example |
|------|---------|---------|
| `data` | Complete block data | `get data(): Uint8Array` |
| `layerData` | Layer data with header | `get layerData(): Uint8Array` |
| `layerPayload` | Layer content only | `get layerPayload(): Uint8Array` |
| `overhead` | Non-user-data bytes | `encryptionOverhead: number` |
| `header` | Structured metadata | `baseHeader: number` |
| `capacity` | Available space | `availableCapacity: number` |
| `checksum` | SHA3-512 hash | `checksum: Checksum` |

Last Updated: January 2026
Version: 1.0.0
