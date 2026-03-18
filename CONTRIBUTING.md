# Contributing to BrightChain

Thank you for your interest in contributing to BrightChain! This guide will help you understand our development practices and how to work with the codebase.

## Table of Contents

- [Getting Started](#getting-started)
- [Repository Structure](#repository-structure)
- [Development Workflow](#development-workflow)
- [Where Does My Code Go?](#where-does-my-code-go)
- [Constants Architecture](#constants-architecture)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Requests](#pull-requests)
- [Digital Burnbag — Trade Secret Notice](#digital-burnbag--trade-secret-notice)

## Getting Started

### Prerequisites

- Docker Desktop (optional)
- NodeJS 20+ (if not using Docker)
- Git
- Yarn 4.x (package manager)

### Setup

1. Fork and clone the repository (including submodules):
   ```bash
   git clone --recurse-submodules https://github.com/Digital-Defiance/BrightChain.git
   ```
2. Open in VSCode
3. For Docker users:
   - Install Dev Container extension
   - Select "Remote-Containers: Reopen in Container"
4. Run `yarn` in the repository root
5. Execute tests: `npx nx test brightchain-lib`

## Repository Structure

BrightChain is an Nx monorepo containing multiple projects organized by domain. Some projects live directly in this repo, while others are included as Git submodules.

### Core Libraries

| Project | Package | Description |
|---------|---------|-------------|
| `brightchain-lib` | `@brightchain/brightchain-lib` | Core library: TUPLE storage, Owner-Free Filesystem, identity management, encryption, BrightTrust governance, voting. Shared across all platforms (browser + Node.js). |
| `brightchain-api-lib` | `@brightchain/brightchain-api-lib` | API library extending Express with blockchain-specific functionality. Node.js-only (depends on Node types). |
| `brightchain-db` | `@brightchain/db` | MongoDB-like document database driver backed by the BrightChain block store. |
| `brightchain-node-express-suite` | `@brightchain/node-express-suite` | Node.js/Express integration layer for BrightChain. |
| `brightchain-test-utils` | `@brightchain/test-utils` | Shared testing utilities and helpers for BrightChain projects. |

### Applications

| Project | Description |
|---------|-------------|
| `brightchain-api` | Express-based REST API server for the BrightChain platform. |
| `brightchain-react` | Main React web application frontend. |
| `brightchain-inituserdb` | Database initialization utility for setting up user data and system keys. |
| `showcase` | Demo/showcase application demonstrating BrightChain capabilities. |

### Storage Providers

| Project | Package | Description |
|---------|---------|-------------|
| `brightchain-azure-store` | `@brightchain/azure-store` | Azure Blob Storage integration for block storage. |
| `brightchain-s3-store` | `@brightchain/s3-store` | AWS S3 integration for block storage. |

### React Component Libraries

| Project | Package | Description |
|---------|---------|-------------|
| `brightchain-react-components` | `@brightchain/brightchain-react-components` | Shared React UI components for the core platform. |

### BrightChat (Encrypted Messaging)

| Project | Package | Description |
|---------|---------|-------------|
| `brightchat-lib` | `@brightchain/brightchat-lib` | Shared library with request interfaces and types for encrypted messaging. |
| `brightchat-react-components` | `@brightchain/brightchat-react-components` | React UI components for real-time chat with Signal-grade encryption. |

### BrightHub (Social Network)

| Project | Package | Description |
|---------|---------|-------------|
| `brighthub-lib` | `@brightchain/brighthub-lib` | Social network library with markdown support, sanitization, and content utilities. |
| `brighthub-react-components` | `@brightchain/brighthub-react-components` | React components for social network features. |

### BrightMail (Email)

| Project | Package | Description |
|---------|---------|-------------|
| `brightmail-lib` | `@brightchain/brightmail-lib` | Shared library with RFC 5322/2045 compliant email types and interfaces. |
| `brightmail-react-components` | `@brightchain/brightmail-react-components` | React UI components for the email interface. |

### BrightPass (Password Manager)

| Project | Package | Description |
|---------|---------|-------------|
| `brightpass-lib` | `@brightchain/brightpass-lib` | Shared library for password manager types and interfaces. |
| `brightpass-react-components` | `@brightchain/brightpass-react-components` | React UI components for the password manager. |

### DigitalBurnbag (Secure File Destruction)

| Project | Package | Description |
|---------|---------|-------------|
| `digitalburnbag-lib` | `@brightchain/digitalburnbag-lib` | Core library for secure file destruction functionality. |
| `digitalburnbag-api-lib` | `@brightchain/digitalburnbag-api-lib` | API library for DigitalBurnbag backend services. |
| `digitalburnbag-react-components` | `@brightchain/digitalburnbag-react-components` | React components for file destruction UI. |
| `digitalburnbag-desktop` | `@brightchain/digitalburnbag-desktop` | Electron-based desktop application for secure file management. |
| `digitalburnbag-sync-client` | `@brightchain/digitalburnbag-sync-client` | Sync client for cross-device file synchronization. |

### End-to-End Tests

| Project | Description |
|---------|-------------|
| `brightchain-api-e2e` | E2E tests for the API server. |
| `brightchain-react-e2e` | E2E tests for the React frontend. |

### Git Submodules

The following projects are included as Git submodules from separate repositories under the [Digital-Defiance](https://github.com/Digital-Defiance) organization:

| Submodule | Repository |
|-----------|------------|
| `brightchat-lib` | [Digital-Defiance/brightchat-lib](https://github.com/Digital-Defiance/brightchat-lib) |
| `brightchat-react-components` | [Digital-Defiance/brightchat-react-components](https://github.com/Digital-Defiance/brightchat-react-components) |
| `brightmail-lib` | [Digital-Defiance/brightmail-lib](https://github.com/Digital-Defiance/brightmail-lib) |
| `brightmail-react-components` | [Digital-Defiance/brightmail-react-components](https://github.com/Digital-Defiance/brightmail-react-components) |
| `brighthub-lib` | [Digital-Defiance/brighthub-lib](https://github.com/Digital-Defiance/brighthub-lib) |
| `brighthub-react-components` | [Digital-Defiance/brighthub-react-components](https://github.com/Digital-Defiance/brighthub-react-components) |
| `brightpass-lib` | [Digital-Defiance/brightpass-lib](https://github.com/Digital-Defiance/brightpass-lib) |
| `brightpass-react-components` | [Digital-Defiance/brightpass-react-components](https://github.com/Digital-Defiance/brightpass-react-components) |
| `digitalburnbag-lib` | [Digital-Defiance/digitalburnbag-lib](https://github.com/Digital-Defiance/digitalburnbag-lib) |
| `digitalburnbag-api-lib` | [Digital-Defiance/digitalburnbag-api-lib](https://github.com/Digital-Defiance/digitalburnbag-api-lib) |
| `digitalburnbag-react-components` | [Digital-Defiance/digitalburnbag-react-components](https://github.com/Digital-Defiance/digitalburnbag-react-components) |
| `digitalburnbag-desktop` | [Digital-Defiance/digitalburnbag-desktop](https://github.com/Digital-Defiance/digitalburnbag-desktop) |
| `digitalburnbag-sync-client` | [Digital-Defiance/digitalburnbag-sync-client](https://github.com/Digital-Defiance/digitalburnbag-sync-client) |
| `reed-solomon-erasure.wasm` | [Digital-Defiance/reed-solomon-erasure.wasm](https://github.com/Digital-Defiance/reed-solomon-erasure.wasm) |

When cloning, use `--recurse-submodules` to pull all submodules. To update submodules later:

```bash
git submodule update --init --recursive
```

### Development Utilities

| Directory | Description |
|-----------|-------------|
| `tools/` | Build scripts and development tooling. |
| `tests/` | Shared test infrastructure. |
| `docs/` | Project documentation (Jekyll-based, published via GitHub Pages). |
| `.devcontainer/` | Docker Dev Container configuration for consistent development environments. |


## Development Workflow

BrightChain uses Nx for monorepo management. Always run tasks through Nx rather than the underlying tooling directly.

```bash
# Run tests for a specific project
npx nx test brightchain-lib
npx nx test brightchain-api-lib

# Build a specific project
npx nx build brightchain-lib
npx nx build brightchain-api-lib

# Run all tests
npx nx run-many -t test

# Build everything
npx nx run-many -t build

# Lint code
npx nx lint brightchain-lib

# Run E2E tests
npx nx e2e brightchain-api-e2e

# Initialize the user database
yarn inituserdb

# Serve the API (development)
yarn serve:api:dev

# Serve the React frontend (development)
yarn serve:dev:stream
```

## Where Does My Code Go?

BrightChain follows a strict separation of concerns across its libraries:

- **`brightchain-lib`** — Shared across everything (client, server, libraries). Interfaces, enums, types, core logic. Even API request/response base interfaces go here so frontend clients can consume them.
- **`brightchain-api-lib`** — Node.js-specific code that depends on Node types or Express. API response types that extend Express `Response` live here, wrapping base interfaces from `brightchain-lib`.
- **`brightchain-react`** / `*-react-components` — Frontend-specific code.
- **`@digitaldefiance/*` libraries** — When functionality is generic enough to be shared across the Digital Defiance ecosystem, consider breaking it out into its own `@digitaldefiance` package.

### Interface Pattern

Use a generic base interface in `brightchain-lib` so both frontend and backend can work with the same data shape:

```typescript
// brightchain-lib: base interface, platform-agnostic
interface IBaseData<TData> {
  something: TData;
}

// brightchain-api-lib: API response extending Express Response
interface IBaseDataAPIResponse extends Response {
  body: IBaseData<GuidV4Buffer>;
}

// Frontend: uses the same interface with string types
type ClientData = IBaseData<string>;
```

Each feature module (BrightChat, BrightMail, BrightPass, BrightHub, BrightDB, DigitalBurnbag) follows the same pattern:
- `*-lib` — Shared types, interfaces, and platform-agnostic logic
- `*-react-components` — React UI components
- `*-api-lib` (where applicable) — Server-side API extensions

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
- Prefer creating `.ts` or `.js` files over executing raw Node statements on the console

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

1. Ensure all tests pass: `npx nx run-many -t test`
2. Run linting: `npx nx run-many -t lint`
3. Update documentation if needed
4. Add tests for new functionality
5. Follow the constants architecture guidelines
6. Ensure submodule changes are committed in the submodule repo first

### Working with Submodules

If your changes touch a submodule (e.g., `brightchat-lib`, `digitalburnbag-lib`):

1. Make changes inside the submodule directory
2. Commit and push in the submodule's own repository
3. Update the submodule reference in the parent repo:
   ```bash
   git add <submodule-path>
   git commit -m "chore: update <submodule> reference"
   ```

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

## Digital Burnbag — Trade Secret Notice

Digital Burnbag is a trade secret feature of Digital Defiance. If you are working on Digital Burnbag branches, you must observe the following:

- All Digital Burnbag development must be confined to the private Digital Burnbag repositories. Do not commit any Digital Burnbag code, documentation, design details, or implementation references to public repositories.
- Limit mentions of the Digital Burnbag name in public code and repos to the bare minimum necessary (e.g., package names and project listings that already exist). Do not add new references in public-facing materials until the feature is officially released.
- Do not discuss Digital Burnbag internals, architecture, or functionality in public issues, pull requests, or discussions.
- Before pushing any commit, review your changes carefully to ensure no Digital Burnbag content has leaked into a public repository. This includes code, comments, commit messages, branch names, and documentation.
- Researchers and contributors granted access to Digital Burnbag branches are expected to take extra precautions to protect this trade secret prior to launch. If you are unsure whether something is safe to commit publicly, ask a maintainer first.

Violation of these guidelines may result in revocation of repository access.

## Questions?

If you have questions about contributing, please:

1. Check existing [documentation](./docs/)
2. Search closed issues
3. Open a new issue with the "question" label

Thank you for contributing to BrightChain!
