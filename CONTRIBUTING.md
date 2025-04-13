# Contributing to BrightChain

Thank you for your interest in contributing to BrightChain! This guide will help you understand our development practices and how to work with the codebase.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Constants Architecture](#constants-architecture)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Requests](#pull-requests)

## Getting Started

### Prerequisites

- Docker Desktop (optional)
- NodeJS 20+ (if not using Docker)
- Git

### Setup

1. Fork and clone the repository
2. Open in VSCode
3. For Docker users:
   - Install Dev Container extension
   - Select "Remote-Containers: Reopen in Container"
4. Run `yarn` in repository root
5. Run `yarn` in brightchain-lib
6. Execute tests: `npx nx test brightchain-lib`

## Development Workflow

BrightChain uses Nx for monorepo management. Key commands:

```bash
# Run tests for a specific project
npx nx test brightchain-lib
npx nx test brightchain-api-lib

# Build a specific project
npx nx build brightchain-lib
npx nx build brightchain-api-lib

# Run all tests
npx nx run-many -t test

# Lint code
npx nx lint brightchain-lib
```

## Constants Architecture

BrightChain follows a layered constants architecture to avoid duplication and maintain consistency with the @digitaldefiance ecosystem.

### Architecture Overview

```
@digitaldefiance/ecies-lib (base cryptographic constants)
  ↓
brightchain-lib (adds blockchain-specific constants)
  ↓
@digitaldefiance/node-express-suite (Express/API constants)
  ↓
brightchain-api-lib (adds API-specific constants)
  ↓
brightchain-api (application)
```

### Working with Constants

#### brightchain-lib Constants

**DO:**
- Import base constants from `@digitaldefiance/ecies-lib`
- Only define BrightChain-specific constants (CBL, FEC, TUPLE, SEALING, etc.)
- Extend the `IConstants` interface from `@digitaldefiance/ecies-lib`
- Use the spread operator to include base constants

**DON'T:**
- Duplicate constants that exist in `@digitaldefiance/ecies-lib`
- Define cryptographic constants locally (PBKDF2, ECIES, CHECKSUM, etc.)
- Create new constant interfaces for base cryptographic concepts

**Example:**
```typescript
// ✅ GOOD: Import base constants
import { Constants as BaseConstants } from '@digitaldefiance/ecies-lib';

// ✅ GOOD: Define BrightChain-specific constants
export const CBL: ICBLConsts = {
  MAX_FILE_NAME_LENGTH: 255,
  MAX_MIME_TYPE_LENGTH: 127,
  // ... other CBL-specific constants
};

// ✅ GOOD: Spread base constants and add BrightChain-specific
export const CONSTANTS: IConstants = {
  ...BaseConstants,
  CBL,
  FEC,
  TUPLE,
  // ... other BrightChain-specific constants
};

// ❌ BAD: Don't duplicate base constants
export const PBKDF2 = {
  ITERATIONS: 100000,  // This exists in @digitaldefiance/ecies-lib
};
```

#### brightchain-api-lib Constants

**DO:**
- Use `createExpressConstants()` from `@digitaldefiance/node-express-suite`
- Only define API-specific constants (WRAPPED_KEY, etc.)
- Extend `BaseEnvironment` for environment variable handling

**DON'T:**
- Duplicate Express/API constants from `@digitaldefiance/node-express-suite`
- Manually implement environment variable loading

**Example:**
```typescript
// ✅ GOOD: Use createExpressConstants
import { createExpressConstants } from '@digitaldefiance/node-express-suite';

export const Constants: IApiConstants = {
  ...createExpressConstants('brightchain.io', 'brightchain.io'),
  WRAPPED_KEY: {
    SALT_SIZE: 32,
    // ... API-specific constants
  },
};

// ✅ GOOD: Extend BaseEnvironment
import { Environment as BaseEnvironment } from '@digitaldefiance/node-express-suite';

export class Environment extends BaseEnvironment {
  constructor(path?: string) {
    super(path, false, true, Constants);
    // Add BrightChain-specific environment variables
  }
}
```

### Adding New Constants

When adding new constants, follow this decision tree:

1. **Is this a cryptographic constant?**
   - Yes → Should it be in `@digitaldefiance/ecies-lib`?
     - Yes → Contribute to @digitaldefiance/ecies-lib
     - No → Add to brightchain-lib
   - No → Continue to step 2

2. **Is this an Express/API constant?**
   - Yes → Should it be in `@digitaldefiance/node-express-suite`?
     - Yes → Contribute to @digitaldefiance/node-express-suite
     - No → Add to brightchain-api-lib
   - No → Continue to step 3

3. **Is this blockchain-specific?**
   - Yes → Add to brightchain-lib
   - No → Consider if it belongs in the application layer

### Constant Naming Conventions

- Use SCREAMING_SNAKE_CASE for constant names
- Group related constants in objects (CBL, FEC, TUPLE, etc.)
- Use descriptive names that indicate purpose
- Add JSDoc comments explaining the constant's purpose

**Example:**
```typescript
/**
 * Constants for CBL (Constituent Block List) operations
 */
export const CBL: ICBLConsts = {
  /**
   * Maximum length for file names in the CBL
   */
  MAX_FILE_NAME_LENGTH: 255,
  
  /**
   * Regex pattern for validating file names
   */
  FILE_NAME_PATTERN: /^[^<>:"/\\|?*]+$/,
};
```

## Code Style

- Follow TypeScript best practices
- Use ESLint and Prettier (configured in the project)
- Write meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused

### TypeScript Guidelines

- Use explicit types for function parameters and return values
- Prefer `const` over `let`
- Use `readonly` for immutable properties
- Leverage TypeScript's type system for safety

## Testing

### Unit Tests

- Write unit tests for all new functionality
- Place tests next to the code they test (`.spec.ts` files)
- Use descriptive test names
- Follow the Arrange-Act-Assert pattern

**Example:**
```typescript
describe('CBL Constants', () => {
  it('should have valid file name pattern', () => {
    // Arrange
    const validFileName = 'document.txt';
    const invalidFileName = 'doc<ument.txt';
    
    // Act & Assert
    expect(CBL.FILE_NAME_PATTERN.test(validFileName)).toBe(true);
    expect(CBL.FILE_NAME_PATTERN.test(invalidFileName)).toBe(false);
  });
});
```

### Property-Based Tests

For universal properties, use property-based testing:

```typescript
import fc from 'fast-check';

describe('Constants Backward Compatibility', () => {
  it('should maintain all constant names', () => {
    fc.assert(
      fc.property(fc.constantFrom(...Object.keys(CONSTANTS)), (key) => {
        expect(CONSTANTS).toHaveProperty(key);
      })
    );
  });
});
```

### Running Tests

```bash
# Run all tests
npx nx run-many -t test

# Run tests for specific project
npx nx test brightchain-lib

# Run tests in watch mode
npx nx test brightchain-lib --watch

# Run tests with coverage
npx nx test brightchain-lib --coverage
```

## Pull Requests

### Before Submitting

1. Ensure all tests pass
2. Run linting: `npx nx lint brightchain-lib`
3. Update documentation if needed
4. Add tests for new functionality
5. Follow the constants architecture guidelines

### PR Guidelines

- Write a clear title and description
- Reference any related issues
- Keep PRs focused on a single concern
- Respond to review feedback promptly
- Ensure CI passes

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] All tests pass
- [ ] Manual testing performed

## Checklist
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Constants architecture followed
```

## Questions?

If you have questions about contributing, please:

1. Check existing documentation
2. Search closed issues
3. Open a new issue with the "question" label

Thank you for contributing to BrightChain!
