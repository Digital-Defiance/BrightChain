# BrightChain Code Examples

This directory contains comprehensive code examples demonstrating key features and patterns in BrightChain v2.0.

## Available Examples

### 1. Checksum Usage (`checksum-usage.ts`)

Demonstrates the unified `Checksum` class for creating, comparing, and converting checksums.

**Topics Covered:**
- Creating checksums from different sources (Buffer, Uint8Array, hex)
- Comparing checksums with the `equals()` method
- Converting between formats (Buffer, Uint8Array, hex, string)
- Using ChecksumService methods
- Error handling for invalid checksums
- Migration from legacy API

**Run:**
```bash
npx ts-node examples/checksum-usage.ts
```

### 2. Error Handling (`error-handling.ts`)

Demonstrates BrightChain's unified error handling system with type guards.

**Topics Covered:**
- Basic error handling with type guards
- Validation error handling
- Factory pattern violation errors
- Comprehensive error handling strategies
- Error context and cause chains
- Async error handling
- Error recovery strategies
- Custom error handling middleware

**Run:**
```bash
npx ts-node examples/error-handling.ts
```

### 3. Factory Patterns (`factory-patterns.ts`)

Demonstrates how to use factory patterns for creating objects with proper validation.

**Topics Covered:**
- Checksum factory methods
- MemberDocument factory method
- Factory pattern enforcement
- Benefits of factory methods
- Multiple factory methods for different input types
- Common factory method patterns
- Migration from direct instantiation
- Best practices

**Run:**
```bash
npx ts-node examples/factory-patterns.ts
```

### 4. Service Validation (`service-validation.ts`)

Demonstrates how BrightChain services validate inputs and provide clear error messages.

**Topics Covered:**
- Block capacity validation
- Multi-recipient encryption validation
- Extended CBL validation
- Using the Validator utility
- Validation error context
- Best practices for validation

**Run:**
```bash
npx ts-node examples/service-validation.ts
```

## Running All Examples

To run all examples at once:

```bash
# Run all examples
npm run examples

# Or run individually
npx ts-node examples/checksum-usage.ts
npx ts-node examples/error-handling.ts
npx ts-node examples/factory-patterns.ts
npx ts-node examples/service-validation.ts
```

## Example Output

Each example produces formatted console output showing:
- ✓ Successful operations
- ✗ Expected errors (for demonstration)
- Detailed error messages and context
- Before/after comparisons
- Best practices

## Integration with Your Code

These examples can be imported and used in your own code:

```typescript
import { createChecksums, compareChecksums } from './examples/checksum-usage';
import { basicErrorHandling } from './examples/error-handling';

// Use example functions in your code
createChecksums();
compareChecksums();
basicErrorHandling();
```

## Learning Path

We recommend exploring the examples in this order:

1. **checksum-usage.ts** - Learn the fundamental Checksum class
2. **factory-patterns.ts** - Understand object creation patterns
3. **error-handling.ts** - Master error handling strategies
4. **service-validation.ts** - Learn input validation patterns

## Additional Resources

- [Migration Guide](../MIGRATION.md) - Migrating from v1.x to v2.0
- [Naming Conventions](../NAMING_CONVENTIONS.md) - Terminology and naming standards
- [API Documentation](../README.md) - Complete API reference
- [Design Document](../.kiro/specs/design-improvements/design.md) - Design decisions and rationale

## Contributing Examples

To add a new example:

1. Create a new `.ts` file in this directory
2. Follow the existing example structure:
   - Header comment explaining the example
   - Multiple focused example functions
   - A `runExamples()` function that runs all examples
   - Export individual example functions
   - Include console output formatting
3. Add the example to this README
4. Update the package.json scripts if needed

## Questions or Issues?

If you have questions about these examples or find issues:

- [GitHub Issues](https://github.com/Digital-Defiance/BrightChain/issues)
- [GitHub Discussions](https://github.com/Digital-Defiance/BrightChain/discussions)
- [Documentation](https://github.com/Digital-Defiance/BrightChain#readme)

---

**BrightChain Examples** - Learn by doing!
