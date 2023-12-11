# brightchain-api-lib

This library was generated with [Nx](https://nx.dev).

## Overview

`brightchain-api-lib` provides API-specific functionality for BrightChain. It extends base constants from `@digitaldefiance/node-express-suite` and adds API-specific constants.

## Constants Architecture

### Base Constants (from @digitaldefiance/node-express-suite)

The library uses `createExpressConstants()` from `@digitaldefiance/node-express-suite`, which provides:

- **PBKDF2**: Password-based key derivation configuration
- **CHECKSUM**: SHA3 checksum configuration
- **FEC**: Forward error correction settings
- **KEYRING**: Keyring algorithm configuration
- **ENCRYPTION**: Encryption settings
- **Express Configuration**: Express app settings, CORS, CSP, etc.
- **JWT**: Base JWT configuration
- **Session**: Session management settings

### API-Specific Constants

The library defines the following API-specific constants:

#### WRAPPED_KEY
Constants for wrapped key operations:
```typescript
import { Constants } from 'brightchain-api-lib';

Constants.WRAPPED_KEY.SALT_SIZE         // 32
Constants.WRAPPED_KEY.IV_SIZE           // 16
Constants.WRAPPED_KEY.MASTER_KEY_SIZE   // 32
Constants.WRAPPED_KEY.MIN_ITERATIONS    // 100000
```

### Usage Examples

#### Importing Constants
```typescript
import { Constants } from 'brightchain-api-lib';

// Access base constants (from @digitaldefiance/node-express-suite)
const corsOrigin = Constants.CORS.ORIGIN;
const jwtSecret = Constants.JWT.SECRET;

// Access API-specific constants
const saltSize = Constants.WRAPPED_KEY.SALT_SIZE;
```

#### Using with Environment Class
```typescript
import { Environment } from 'brightchain-api-lib';

// Environment class extends BaseEnvironment from @digitaldefiance/node-express-suite
const env = new Environment();

// Access environment variables
const port = env.port;
const nodeEnv = env.nodeEnv;
```

### Environment Class

The `Environment` class extends `BaseEnvironment` from `@digitaldefiance/node-express-suite`, providing:

- Automatic loading of environment variables from `.env` files
- Type-safe access to environment variables
- Validation of required environment variables
- Integration with Constants object

```typescript
import { Environment } from 'brightchain-api-lib';

const env = new Environment('.env');

// BaseEnvironment provides standard variables
console.log(env.port);           // PORT from .env
console.log(env.nodeEnv);        // NODE_ENV from .env
console.log(env.jwtSecret);      // JWT_SECRET from .env

// Add BrightChain-specific variables as needed
```

### Backward Compatibility

The refactored constants maintain full backward compatibility. All previously exported constant names remain accessible.

## Building

Run `nx build brightchain-api-lib` to build the library.

## Running unit tests

Run `nx test brightchain-api-lib` to execute the unit tests via [Jest](https://jestjs.io).

## Migration Guide

If you're updating from a previous version of brightchain-api-lib, see [MIGRATION.md](../.kiro/specs/constants-refactoring/MIGRATION.md) for detailed migration instructions.
