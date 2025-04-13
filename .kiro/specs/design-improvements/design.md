# Design Document: BrightChain Design Improvements

## Overview

This design addresses systemic design flaws in the BrightChain library by implementing a unified checksum system, enforcing factory patterns, improving error handling, adding comprehensive validation, and establishing consistent naming conventions. The improvements will be implemented incrementally to minimize disruption while maximizing benefit.

## Architecture

The improvements follow a layered approach:

1. **Foundation Layer**: Unified types and utilities (Checksum, type guards)
2. **Error Layer**: Consistent error hierarchy and handling
3. **Validation Layer**: Comprehensive input validation across all services
4. **Service Layer**: Improved service implementations with proper coupling
5. **Documentation Layer**: Complete interface and API documentation

### Key Design Decisions

- **Backward Compatibility**: Maintain deprecated APIs during migration period
- **Incremental Rollout**: Implement changes in phases to allow testing
- **Type Safety First**: Leverage TypeScript's type system for compile-time safety
- **Fail Fast**: Validate inputs early and throw descriptive errors
- **Clear Migration Path**: Provide tools and documentation for migration

## Components and Interfaces

### 1. Unified Checksum System

**Problem**: Two incompatible checksum types causing conversion issues

**Solution**: Create a `Checksum` class that wraps both representations

```typescript
/**
 * Unified checksum class that handles both Buffer and Uint8Array representations
 */
export class Checksum {
  private readonly data: Uint8Array;
  
  private constructor(data: Uint8Array) {
    if (data.length !== CONSTANTS.CHECKSUM.SHA3_BUFFER_LENGTH) {
      throw new ChecksumError(
        ChecksumErrorType.InvalidLength,
        `Checksum must be ${CONSTANTS.CHECKSUM.SHA3_BUFFER_LENGTH} bytes`
      );
    }
    this.data = data;
  }
  
  /**
   * Create checksum from Buffer
   */
  static fromBuffer(buffer: Buffer): Checksum {
    return new Checksum(new Uint8Array(buffer));
  }
  
  /**
   * Create checksum from Uint8Array
   */
  static fromUint8Array(array: Uint8Array): Checksum {
    return new Checksum(array);
  }
  
  /**
   * Create checksum from hex string
   */
  static fromHex(hex: string): Checksum {
    if (!/^[0-9a-fA-F]+$/.test(hex)) {
      throw new ChecksumError(ChecksumErrorType.InvalidHex, 'Invalid hex string');
    }
    const buffer = Buffer.from(hex, 'hex');
    return Checksum.fromBuffer(buffer);
  }
  
  /**
   * Compare two checksums for equality
   */
  equals(other: Checksum): boolean {
    if (this.data.length !== other.data.length) return false;
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i] !== other.data[i]) return false;
    }
    return true;
  }
  
  /**
   * Convert to Buffer
   */
  toBuffer(): Buffer {
    return Buffer.from(this.data);
  }
  
  /**
   * Convert to Uint8Array
   */
  toUint8Array(): Uint8Array {
    return this.data;
  }
  
  /**
   * Convert to hex string
   */
  toHex(): string {
    return this.toBuffer().toString('hex');
  }
  
  /**
   * Convert to string (alias for toHex)
   */
  toString(): string {
    return this.toHex();
  }
}

/**
 * Type guard for Checksum
 */
export function isChecksum(value: unknown): value is Checksum {
  return value instanceof Checksum;
}

// Deprecated type aliases for migration
/** @deprecated Use Checksum class instead */
export type ChecksumBuffer = Buffer;
/** @deprecated Use Checksum class instead */
export type ChecksumUint8Array = Uint8Array;
```

**Migration Strategy**:
1. Introduce Checksum class alongside existing types
2. Update services to accept both old and new types
3. Deprecate old types with warnings
4. Remove old types in next major version

### 2. Factory Pattern Enforcement

**Problem**: Factory patterns not consistently enforced

**Solution**: Add runtime checks and clear documentation

```typescript
/**
 * Error thrown when factory pattern is violated
 */
export class FactoryPatternViolationError extends BrightChainError {
  constructor(className: string) {
    super(
      'FactoryPatternViolation',
      `Cannot instantiate ${className} directly. Use factory method instead.`,
      { className }
    );
  }
}

/**
 * Symbol used to verify factory method usage
 */
const FACTORY_TOKEN = Symbol('factory-token');

export class Member {
  private constructor(
    factoryToken: symbol,
    private readonly type: MemberType,
    private readonly name: string,
    private readonly contactEmail: EmailString,
    private readonly email: EmailString
  ) {
    // Verify this was called from factory method
    if (factoryToken !== FACTORY_TOKEN) {
      throw new FactoryPatternViolationError('Member');
    }
  }
  
  /**
   * Factory method to create a new member
   * @param type - The member type
   * @param name - The member name
   * @param contactEmail - The contact email
   * @param email - The email address
   * @returns A new Member instance
   */
  static newMember(
    type: MemberType,
    name: string,
    contactEmail: EmailString,
    email: EmailString
  ): Member {
    // Validation
    if (!name || name.trim().length === 0) {
      throw new ValidationError('name', 'Name cannot be empty');
    }
    
    return new Member(FACTORY_TOKEN, type, name, contactEmail, email);
  }
}
```

### 3. Consistent Error Hierarchy

**Problem**: Inconsistent error types across services

**Solution**: Create a unified error hierarchy

```typescript
/**
 * Base error class for all BrightChain errors
 */
export abstract class BrightChainError extends Error {
  constructor(
    public readonly type: string,
    message: string,
    public readonly context?: Record<string, unknown>,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * Get full error details including context
   */
  toJSON(): object {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      context: this.context,
      cause: this.cause?.message,
      stack: this.stack
    };
  }
}

/**
 * Validation error for invalid inputs
 */
export class ValidationError extends BrightChainError {
  constructor(
    public readonly field: string,
    message: string,
    context?: Record<string, unknown>
  ) {
    super('Validation', message, { field, ...context });
  }
}

/**
 * Checksum-related errors
 */
export class ChecksumError extends BrightChainError {
  constructor(
    public readonly checksumErrorType: ChecksumErrorType,
    message: string,
    context?: Record<string, unknown>
  ) {
    super('Checksum', message, { checksumErrorType, ...context });
  }
}

export enum ChecksumErrorType {
  InvalidLength = 'InvalidLength',
  InvalidHex = 'InvalidHex',
  ConversionFailed = 'ConversionFailed',
  ComparisonFailed = 'ComparisonFailed'
}

/**
 * Type guards for errors
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isChecksumError(error: unknown): error is ChecksumError {
  return error instanceof ChecksumError;
}

export function isBrightChainError(error: unknown): error is BrightChainError {
  return error instanceof BrightChainError;
}
```

### 4. Comprehensive Input Validation

**Problem**: Missing validation in services

**Solution**: Create validation utilities and apply consistently

```typescript
/**
 * Validation utilities for common patterns
 */
export class Validator {
  /**
   * Validate block size
   */
  static validateBlockSize(blockSize: BlockSize, context?: string): void {
    if (!validateBlockSize(blockSize)) {
      throw new ValidationError(
        'blockSize',
        `Invalid block size: ${blockSize}`,
        { blockSize, context }
      );
    }
  }
  
  /**
   * Validate block type
   */
  static validateBlockType(blockType: BlockType, context?: string): void {
    if (!Object.values(BlockType).includes(blockType)) {
      throw new ValidationError(
        'blockType',
        `Invalid block type: ${blockType}`,
        { blockType, context }
      );
    }
  }
  
  /**
   * Validate encryption type
   */
  static validateEncryptionType(
    encryptionType: BlockEncryptionType,
    context?: string
  ): void {
    if (!Object.values(BlockEncryptionType).includes(encryptionType)) {
      throw new ValidationError(
        'encryptionType',
        `Invalid encryption type: ${encryptionType}`,
        { encryptionType, context }
      );
    }
  }
  
  /**
   * Validate recipient count
   */
  static validateRecipientCount(
    recipientCount: number | undefined,
    encryptionType: BlockEncryptionType,
    context?: string
  ): void {
    if (encryptionType === BlockEncryptionType.MultiRecipient) {
      if (recipientCount === undefined || recipientCount < 1) {
        throw new ValidationError(
          'recipientCount',
          'Recipient count must be at least 1 for multi-recipient encryption',
          { recipientCount, encryptionType, context }
        );
      }
      if (recipientCount > ECIES.MULTIPLE.MAX_RECIPIENTS) {
        throw new ValidationError(
          'recipientCount',
          `Recipient count cannot exceed ${ECIES.MULTIPLE.MAX_RECIPIENTS}`,
          { recipientCount, maxRecipients: ECIES.MULTIPLE.MAX_RECIPIENTS, context }
        );
      }
    }
  }
  
  /**
   * Validate required field
   */
  static validateRequired<T>(
    value: T | undefined | null,
    fieldName: string,
    context?: string
  ): asserts value is T {
    if (value === undefined || value === null) {
      throw new ValidationError(
        fieldName,
        `${fieldName} is required`,
        { context }
      );
    }
  }
  
  /**
   * Validate string not empty
   */
  static validateNotEmpty(
    value: string,
    fieldName: string,
    context?: string
  ): void {
    if (!value || value.trim().length === 0) {
      throw new ValidationError(
        fieldName,
        `${fieldName} cannot be empty`,
        { context }
      );
    }
  }
}
```

### 5. Complete Block Type Support

**Problem**: Services silently ignore unsupported block types

**Solution**: Use exhaustive switch statements with TypeScript's never type

```typescript
/**
 * Calculate overhead for a specific block type
 */
private calculateBlockTypeOverhead(
  blockType: BlockType,
  params: IBlockCapacityParams
): number {
  switch (blockType) {
    case BlockType.RawData:
      return 0;
      
    case BlockType.ConstituentBlockList:
    case BlockType.EncryptedConstituentBlockListBlock:
      return CBL.BASE_OVERHEAD + ECIES.SIGNATURE_LENGTH;
      
    case BlockType.ExtendedConstituentBlockListBlock:
    case BlockType.EncryptedExtendedConstituentBlockListBlock:
      Validator.validateRequired(params.cbl, 'cbl', 'ExtendedCBL');
      return CBL.BASE_OVERHEAD + 
             ECIES.SIGNATURE_LENGTH + 
             this.calculateExtendedCBLOverhead(params.cbl.fileName, params.cbl.mimeType);
      
    case BlockType.EncryptedOwnedDataBlock:
      return ENCRYPTION.ENCRYPTION_TYPE_SIZE;
      
    case BlockType.MultiEncryptedBlock:
      return 0; // Overhead calculated separately for encryption
      
    case BlockType.EphemeralBlock:
    case BlockType.WhitenedBlock:
      return 0;
      
    default:
      // TypeScript will error if we haven't handled all cases
      const exhaustiveCheck: never = blockType;
      throw new ValidationError(
        'blockType',
        `Unsupported block type: ${exhaustiveCheck}`,
        { blockType }
      );
  }
}
```

### 6. Service Decoupling

**Problem**: Tight coupling between services

**Solution**: Wrap external errors and use interfaces

```typescript
export class BlockCapacityCalculator {
  constructor(
    private readonly cblService: ICBLService, // Interface, not implementation
    private readonly eciesService: IECIESService
  ) {}
  
  public calculateCapacity(params: IBlockCapacityParams): IBlockCapacityResult {
    try {
      // Validation
      Validator.validateBlockSize(params.blockSize, 'calculateCapacity');
      Validator.validateBlockType(params.blockType, 'calculateCapacity');
      
      // ... calculation logic ...
      
      // Validate filename/mimetype if needed
      if (this.requiresCBLData(params.blockType)) {
        Validator.validateRequired(params.cbl, 'cbl', 'calculateCapacity');
        this.validateCBLData(params.cbl);
      }
      
      return result;
    } catch (error) {
      // Wrap external errors
      if (error instanceof ExtendedCblError) {
        throw new BlockCapacityError(
          BlockCapacityErrorType.InvalidExtendedCblData,
          `CBL validation failed: ${error.message}`,
          { originalError: error.type },
          error
        );
      }
      throw error;
    }
  }
  
  /**
   * Validate CBL data (wraps cblService calls)
   */
  private validateCBLData(cbl: { fileName: string; mimeType: string }): void {
    try {
      this.cblService.validateFileNameFormat(cbl.fileName);
      this.cblService.validateMimeTypeFormat(cbl.mimeType);
    } catch (error) {
      // Re-throw as BlockCapacityError
      throw new BlockCapacityError(
        BlockCapacityErrorType.InvalidExtendedCblData,
        error instanceof Error ? error.message : 'CBL validation failed',
        { fileName: cbl.fileName, mimeType: cbl.mimeType },
        error instanceof Error ? error : undefined
      );
    }
  }
}
```

## Data Models

### Type Mapping

| Old Type/Pattern | New Type/Pattern | Migration |
|------------------|------------------|-----------|
| ChecksumBuffer | Checksum | Use Checksum.fromBuffer() |
| ChecksumUint8Array | Checksum | Use Checksum.fromUint8Array() |
| Direct constructor | Factory method | Use static factory methods |
| BlockHandle (no type param) | BlockHandle\<T\> | Add type parameter |
| Service-specific errors | BrightChainError hierarchy | Catch specific error types |
| typeSpecificHeader | typeSpecificOverhead | Rename property |
| block.payload | block.data | Rename property |

### Interface Updates

```typescript
/**
 * Block capacity parameters
 * @interface IBlockCapacityParams
 */
export interface IBlockCapacityParams {
  /** The size of the block */
  blockSize: BlockSize;
  
  /** The type of block */
  blockType: BlockType;
  
  /** Extended CBL data (required for extended CBL blocks) */
  cbl?: {
    /** File name for extended CBL */
    fileName: string;
    /** MIME type for extended CBL */
    mimeType: string;
  };
  
  /** Encryption type for the block */
  encryptionType: BlockEncryptionType;
  
  /** Number of recipients (required for multi-recipient encryption) */
  recipientCount?: number;
}

/**
 * Overhead breakdown details
 * @interface IOverheadBreakdown
 */
export interface IOverheadBreakdown {
  /** Base header overhead */
  baseHeader: number;
  
  /** Type-specific overhead (renamed from typeSpecificHeader) */
  typeSpecificOverhead: number;
  
  /** Encryption overhead */
  encryptionOverhead: number;
  
  /** Variable overhead (e.g., for extended CBL) */
  variableOverhead: number;
}
```

## Error Handling

### Error Wrapping Strategy

1. **Service Boundary**: Each service throws its own error types
2. **Error Wrapping**: When calling other services, wrap their errors
3. **Context Preservation**: Include original error as cause
4. **Type Safety**: Use type guards for error handling

```typescript
try {
  const result = someService.doSomething();
} catch (error) {
  if (isValidationError(error)) {
    // Handle validation error
    console.error(`Validation failed for ${error.field}: ${error.message}`);
  } else if (isChecksumError(error)) {
    // Handle checksum error
    console.error(`Checksum error: ${error.checksumErrorType}`);
  } else if (isBrightChainError(error)) {
    // Handle other BrightChain errors
    console.error(`BrightChain error: ${error.type}`);
  } else {
    // Handle unexpected errors
    throw error;
  }
}
```

## Testing Strategy

### Unit Testing

- Test each component in isolation
- Mock dependencies using interfaces
- Test error conditions thoroughly
- Verify validation logic

### Integration Testing

- Test service interactions
- Verify error wrapping works correctly
- Test migration paths
- Verify backward compatibility

### Property-Based Testing

Property-based tests will verify universal properties across the improvements:

**Property 1: Checksum Round Trip**
*For any* valid byte array, creating a Checksum and converting back should produce equivalent data
**Validates: Requirements 1.2, 1.5, 11.1, 11.2**

**Property 2: Checksum Equality is Reflexive and Symmetric**
*For any* two checksums, if A equals B, then B equals A, and A equals A
**Validates: Requirements 1.3**

**Property 3: Checksum Hex Conversion Round Trip**
*For any* valid checksum, converting to hex and back should produce an equal checksum
**Validates: Requirements 1.4, 11.3, 11.4**

**Property 4: Factory Pattern Enforcement**
*For any* attempt to bypass factory methods, the system should throw FactoryPatternViolationError
**Validates: Requirements 2.2**

**Property 5: Validation Consistency**
*For any* invalid input, all services should reject it with appropriate ValidationError
**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

**Property 6: Error Context Preservation**
*For any* wrapped error, the original error should be accessible via the cause property
**Validates: Requirements 4.3, 13.1, 13.2, 13.3**

**Property 7: Block Type Exhaustiveness**
*For any* valid BlockType enum value, services should either handle it or throw UnsupportedBlockTypeError
**Validates: Requirements 6.1, 6.2, 6.5**

**Property 8: Type Guard Correctness**
*For any* value, type guards should correctly identify the type and enable proper TypeScript narrowing
**Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5**

## Migration Strategy

### Phase 1: Foundation (Week 1-2)
- Implement Checksum class
- Implement error hierarchy
- Implement Validator utilities
- Add type guards
- Update documentation

### Phase 2: Service Updates (Week 3-4)
- Update BlockCapacityCalculator
- Update ChecksumService
- Update ECIESService integration
- Add validation to all services
- Wrap external errors

### Phase 3: Factory Pattern (Week 5)
- Add factory pattern enforcement
- Update Member
- Update other factory classes
- Add runtime checks

### Phase 4: Naming Consistency (Week 6)
- Rename typeSpecificHeader → typeSpecificOverhead
- Rename payload → data
- Add deprecated aliases
- Update all references

### Phase 5: Documentation (Week 7)
- Complete JSDoc for all interfaces
- Write migration guide
- Create code examples
- Update README

### Phase 6: Deprecation (Week 8+)
- Mark old APIs as deprecated
- Add deprecation warnings
- Monitor usage
- Plan removal for next major version

## Backward Compatibility

### Deprecated API Support

```typescript
// Maintain old types with deprecation warnings
/** @deprecated Use Checksum class instead. Will be removed in v2.0.0 */
export type ChecksumBuffer = Buffer;

/** @deprecated Use Checksum class instead. Will be removed in v2.0.0 */
export type ChecksumUint8Array = Uint8Array;

// Provide conversion utilities
/** @deprecated Use Checksum.fromBuffer() instead */
export function checksumToBuffer(checksum: Checksum | ChecksumBuffer): Buffer {
  if (checksum instanceof Checksum) {
    return checksum.toBuffer();
  }
  return checksum;
}

// Maintain old property names with getters
export interface IOverheadBreakdown {
  typeSpecificOverhead: number;
  
  /** @deprecated Use typeSpecificOverhead instead */
  get typeSpecificHeader(): number {
    return this.typeSpecificOverhead;
  }
}
```

## Performance Considerations

- Checksum class uses Uint8Array internally for efficiency
- Validation is performed once at service boundaries
- Error creation includes minimal context to avoid overhead
- Type guards use instanceof for O(1) checks

## Security Considerations

- Sanitize sensitive data before including in errors
- Validate all inputs to prevent injection attacks
- Use factory patterns to enforce invariants
- Fail fast on invalid inputs

## Documentation Requirements

All new code must include:
- JSDoc comments on all public APIs
- Parameter descriptions
- Return value descriptions
- Throws documentation
- Usage examples
- Migration notes for breaking changes
